import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import { scene, trackCoordinate } from "./components/scene";
import { arrivals, comparison } from "./components/timing";
import { messages, type Messages } from "./locales/messages";
import {
  clamp,
  duration,
  limits,
  makeTrial,
  motions,
  parameterValue,
  playbackScale,
  soundSpeed,
  type Motion,
  type Mover,
  type Parameter,
  type Parameters,
  type Trial,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Observation,
  type Rate,
  type Snapshot,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const equation = String.raw`f_{\mathrm r}=f_{\mathrm s}\frac{c-v_{\mathrm o}}{c-v_{\mathrm s}}`;
const observations: Observation[] = ["arrivals", "comparison"];
const movers: Mover[] = ["source", "observer"];
const milliseconds = (time: number) => (time * 1000).toFixed(2);

export class DopplerExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    playing: { state: true },
    data: { state: true },
  };
  declare locale: Locale;
  declare private playing: boolean;
  declare private data: Snapshot;
  private context?: ExperimentContext;
  private readonly controls = document.createElement("div");
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;
  private frame?: number;
  private previousFrame?: number;
  private pointer?: { id: number; coordinate: number; time: number };
  private modelCache?: { parameters: Parameters; trial: Trial };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.playing = false;
    this.controls.style.cssText = "display:flex;align-items:center;gap:8px";
    this.help.attachShadow({ mode: "open" });
  }

  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
    this.persist();
  }

  snapshot(): Snapshot {
    return structuredClone(this.data);
  }

  private get trial() {
    const { parameters } = this.data;
    if (this.modelCache?.parameters !== parameters)
      this.modelCache = { parameters, trial: makeTrial(parameters) };
    return this.modelCache.trial;
  }

  connectedCallback() {
    super.connectedCallback();
    this.context?.toolbar?.setControls(this.controls);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.onHide);
  }

  disconnectedCallback() {
    this.pause();
    this.dialog?.close();
    render(nothing, this.help.shadowRoot!);
    this.context?.toolbar?.setControls(null);
    render(nothing, this.controls);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.onHide);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    const previous = changed.get("data") as Snapshot | undefined;
    if (
      !previous ||
      previous.rate !== this.data.rate ||
      changed.has("playing") ||
      changed.has("locale")
    )
      render(this.playback(), this.controls);
    if (this.dialog && changed.has("locale")) this.updateHelp();
  }

  private persist() {
    this.context?.storage.write(this.snapshot());
  }

  private set(patch: Partial<Snapshot>) {
    this.data = { ...this.data, ...patch };
    this.persist();
  }

  private visibility = () => {
    if (document.hidden) this.pause();
  };

  private onHide = () => this.pause();

  private stop() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.previousFrame = undefined;
    this.playing = false;
  }

  pause() {
    this.pointer = undefined;
    this.stop();
    this.persist();
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    const elapsed =
      this.previousFrame === undefined ? 0 : (now - this.previousFrame) / 1000;
    this.previousFrame = now;
    const time = Math.min(
      duration,
      this.data.time + elapsed * playbackScale * this.data.rate,
    );
    this.data = { ...this.data, time };
    if (time === duration) this.pause();
    else this.frame = requestAnimationFrame(this.tick);
  };

  private toggle = () => {
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.data.time >= duration) this.set({ time: 0 });
    this.playing = true;
    this.frame = requestAnimationFrame(this.tick);
  };

  private seek(time: number) {
    this.stop();
    this.set({ time: clamp(time, 0, duration) });
  }

  private configure(patch: Partial<Parameters>) {
    this.pointer = undefined;
    this.stop();
    this.set({ parameters: { ...this.data.parameters, ...patch }, time: 0 });
  }

  private get moverVelocity() {
    return this.trial.velocity[this.data.parameters.mover];
  }

  private scrub = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.pointer || this.moverVelocity === 0)
        return;
      const coordinate = trackCoordinate(event);
      if (coordinate === null) return;
      this.pause();
      this.pointer = { id: event.pointerId, coordinate, time: this.data.time };
      (event.currentTarget as SVGGraphicsElement).setPointerCapture(
        event.pointerId,
      );
    },
    move: (event: PointerEvent) => {
      const pointer = this.pointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      const coordinate = trackCoordinate(event);
      if (coordinate !== null)
        this.seek(
          pointer.time + (coordinate - pointer.coordinate) / this.moverVelocity,
        );
    },
    end: (event: PointerEvent) => {
      if (this.pointer?.id === event.pointerId) this.pointer = undefined;
    },
    key: (event: KeyboardEvent) => {
      const step =
        (event.shiftKey ? 0.01 : 0.002) * Math.sign(this.moverVelocity);
      const next =
        event.key === "ArrowRight"
          ? this.data.time + step
          : event.key === "ArrowLeft"
            ? this.data.time - step
            : event.key === "ArrowUp"
              ? this.data.time + Math.abs(step)
              : event.key === "ArrowDown"
                ? this.data.time - Math.abs(step)
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? duration
                    : null;
      if (next === null) return;
      event.preventDefault();
      this.seek(next);
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button variant="primary" @click=${this.toggle}
        >${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}>${t.reset}</phy-button>
      <phy-select
        .label=${t.rate}
        .value=${String(this.data.rate)}
        .options=${[1, 0.5, 0.25].map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        @change=${(event: Event) => {
          this.previousFrame = undefined;
          this.set({
            rate: Number((event.currentTarget as SelectElement).value) as Rate,
          });
        }}
      ></phy-select>`;
  }

  private parameter(key: Parameter, t: Messages) {
    const { min, max, step, unit } = limits[key];
    const value = this.data.parameters[key];
    const label = `${value} ${unit}`;
    return html`<div class="parameter">
      <div class="parameter-label">
        <span>${t[key]}</span><output>${label}</output>
      </div>
      <phy-slider
        .label=${t[key]}
        .valueText=${label}
        .value=${value}
        .min=${min}
        .max=${max}
        .step=${step}
        @input=${(event: Event) => {
          const next = parameterValue(
            key,
            (event.currentTarget as SliderElement).value,
          );
          if (next !== value) this.configure({ [key]: next });
        }}
      ></phy-slider>
      <div class="limits" aria-hidden="true">
        <span>${min}</span><span>${max} ${unit}</span>
      </div>
    </div>`;
  }

  private updateHelp() {
    const t = messages(this.locale);
    render(
      html`<style>
          p {
            color: var(--text);
            line-height: 1.65;
            margin: 0 0 12px;
          }
          p:last-child {
            margin-bottom: 0;
          }
        </style>
        ${t.helpBody.map((paragraph) => html`<p>${paragraph}</p>`)}`,
      this.help.shadowRoot!,
    );
    this.dialog?.update({ title: t.help });
  }

  private openHelp = (event: Event) => {
    if (!this.context || this.dialog) return;
    this.pause();
    this.updateHelp();
    const dialog = this.context.dialog.open({
      title: messages(this.locale).help,
      content: this.help,
      width: "md",
      returnFocus: event.currentTarget as HTMLElement,
    });
    this.dialog = dialog;
    void dialog.closed.then(() => {
      if (this.dialog === dialog) this.dialog = undefined;
    });
  };

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, wavefronts, observation } = this.data;
    const trial = this.trial;
    const sample = trial.at(time);
    const hint =
      trial.motion === "rest"
        ? t.restHint
        : parameters.mover === "source"
          ? t.sourceHint
          : t.observerHint;
    const readouts = [
      {
        key: "emitted",
        label: t.emitted,
        value: trial.emitted.toFixed(2),
        unit: "Hz",
      },
      {
        key: "received",
        label: t.received,
        value: trial.received.toFixed(2),
        unit: "Hz",
      },
      {
        key: "shift",
        label: t.shift,
        value: `${trial.shift > 0 ? "+" : ""}${trial.shift.toFixed(2)}`,
        unit: "Hz",
      },
      {
        key: "wavelength",
        label: t.wavelength,
        value: trial.toward.toFixed(3),
        unit: "m",
      },
    ];
    return html`<header class="heading">
        <h1>${t.title}</h1>
        <p>${t.subtitle}</p>
        ${this.context?.toolbar ? nothing : html`<div class="fallback-controls">${this.playback()}</div>`}
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.settings}>
          <div class="panel-heading"><h2>${t.settings}</h2></div>
          <div class="parameters">
            <div class="field-label">
              <span>${t.mover}</span>
              <phy-select
                .label=${t.mover}
                .value=${parameters.mover}
                .options=${movers.map((value) => ({ value, label: value === "source" ? t.sourceMoves : t.observerMoves }))}
                @change=${(event: Event) => this.configure({ mover: (event.currentTarget as SelectElement).value as Mover })}
              ></phy-select>
            </div>
            <div class="field-label">
              <span>${t.motion}</span>
              <phy-select
                .label=${t.motion}
                .value=${parameters.motion}
                .options=${motions.map((value) => ({ value, label: t[value] }))}
                @change=${(event: Event) => this.configure({ motion: (event.currentTarget as SelectElement).value as Motion })}
              ></phy-select>
            </div>
            ${this.parameter("speed", t)} ${this.parameter("frequency", t)}
          </div>
          <div class="medium">
            <span>${t.medium}</span><output>${soundSpeed} m/s</output>
          </div>
          <div class="footer">
            <p>${t.resetHint}</p>
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.waveView}>
          <div class="panel-heading">
            <h2>${t.waveView}</h2>
            <small class="motion-status"
              >${t[trial.motion]} · ${Math.abs(this.moverVelocity)} m/s</small
            >
            <phy-checkbox
              .checked=${wavefronts}
              @change=${(event: Event) => this.set({ wavefronts: (event.currentTarget as CheckboxElement).checked })}
              >${t.wavefronts}</phy-checkbox
            >
          </div>
          <div class="scene-wrap">
            ${scene(trial, sample, time, wavefronts, this.scrub, t)}
          </div>
          <div class="readouts">
            ${readouts.map(
              ({ key, label, value, unit }) =>
                html`<div class=${key}>
                  <span>${label}</span
                  ><output data-readout=${key}
                    >${value} <small>${unit}</small></output
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <div class="time-label">
              <span>${t.timeline}</span><small>${t.slowScale}</small>
              <output data-time=${time}
                >${milliseconds(time)} / ${duration * 1000} ms</output
              >
            </div>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${milliseconds(time)} ms`}
              .min=${0}
              .max=${duration * 1000}
              .step=${0.1}
              .value=${Math.round(time * 10000) / 10}
              @input=${(event: Event) => this.seek((event.currentTarget as SliderElement).value / 1000)}
            ></phy-slider>
            <div class="moments">
              <phy-button @click=${() => this.seek(trial.nextArrival(0))}
                >${t.first}</phy-button
              >
              <phy-button
                @click=${() => this.seek(trial.nextArrival(this.data.time))}
                >${t.next}</phy-button
              >
              <phy-button @click=${() => this.seek(duration)}
                >${t.end}</phy-button
              >
            </div>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.observe}>
          <phy-tabs
            class="observation-tabs"
            .label=${t.observe}
            .value=${observation}
            .items=${observations.map((value) => ({ value, label: t[value] }))}
            @change=${(event: Event) => {
              if (event.target === event.currentTarget)
                this.set({
                  observation: (event.currentTarget as TabsElement)
                    .value as Observation,
                });
            }}
          >
            <div class="observation" slot=${observation}>
              ${observation === "arrivals" ? arrivals(trial, sample, time, t) : comparison(parameters, t)}
              <section class="model-formula">
                <phy-math .source=${equation}></phy-math>
                <p>${hint}</p>
              </section>
            </div>
          </phy-tabs>
        </phy-box>
      </div>`;
  }
}

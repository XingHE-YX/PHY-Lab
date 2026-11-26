import { html, LitElement, render, nothing, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import {
  chart,
  chartWindow,
  paths,
  pointerFraction,
  type Window,
} from "./components/chart";
import { scene } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  at,
  derive,
  envelope,
  limits,
  nextMoment,
  parameterValue,
  presets,
  type Moment,
  type Parameter,
  type Parameters,
  type Preset,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Observation,
  type Rate,
  type Snapshot,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const timelineSteps = 4000;
const display = (value: number, digits = 2) =>
  (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);

export class BeatsExperiment extends LitElement {
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
  private drag?: { pointer: number; window: Window };
  private traceCache?: {
    parameters: Parameters;
    observation: Observation;
    window: Window;
    traces: ReturnType<typeof paths>;
  };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.playing = false;
    this.data = normalizeSnapshot(null);
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

  connectedCallback() {
    super.connectedCallback();
    this.context?.toolbar?.setControls(this.controls);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.onHide);
  }

  disconnectedCallback() {
    this.pause();
    this.drag = undefined;
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
    this.stop();
    this.persist();
  }

  private step = (now: number) => {
    if (!this.playing) return;
    const elapsed =
      this.previousFrame === undefined ? 0 : (now - this.previousFrame) / 1000;
    this.previousFrame = now;
    const { duration } = derive(this.data.parameters);
    const time = Math.min(duration, this.data.time + elapsed * this.data.rate);
    this.data = { ...this.data, time };
    if (time >= duration) this.pause();
    else this.frame = requestAnimationFrame(this.step);
  };

  private togglePlayback = () => {
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.data.time >= derive(this.data.parameters).duration)
      this.set({ time: 0 });
    this.playing = true;
    this.frame = requestAnimationFrame(this.step);
  };

  private seek(time: number) {
    this.stop();
    this.set({
      time: Math.max(0, Math.min(time, derive(this.data.parameters).duration)),
    });
  }

  private load(parameters: Parameters) {
    this.stop();
    this.drag = undefined;
    this.set({ parameters: { ...parameters }, time: 0 });
  }

  private jump(moment: Moment) {
    const time = nextMoment(this.data.parameters, moment, this.data.time);
    if (time !== null) this.seek(time);
  }

  private chartDrag = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.drag) return;
      const fraction = pointerFraction(event);
      if (fraction === null || fraction < 0 || fraction > 1) return;
      const window = chartWindow(
        this.data.parameters,
        this.data.observation,
        this.data.time,
      );
      this.drag = { pointer: event.pointerId, window };
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.seek(window.start + fraction * (window.end - window.start));
    },
    move: (event: PointerEvent) => {
      if (this.drag?.pointer !== event.pointerId) return;
      const fraction = pointerFraction(event);
      if (fraction === null) return;
      const { start, end } = this.drag.window;
      this.seek(start + Math.max(0, Math.min(1, fraction)) * (end - start));
    },
    end: (event: PointerEvent) => {
      if (this.drag?.pointer !== event.pointerId) return;
      this.drag = undefined;
      this.requestUpdate();
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button variant="primary" @click=${this.togglePlayback}
        >${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}>${t.reset}</phy-button>
      <phy-select
        .label=${t.rate}
        .options=${[1, 0.5, 0.25].map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        .value=${String(this.data.rate)}
        @change=${(event: Event) => {
          this.previousFrame = undefined;
          this.set({
            rate: Number((event.currentTarget as SelectElement).value) as Rate,
          });
        }}
      ></phy-select>`;
  }

  private parameter(name: Parameter, t: Messages) {
    const { min, max, step, unit, digits } = limits[name];
    const text = `${display(this.data.parameters[name], digits)} ${unit}`;
    return html`<div class="parameter">
      <div class="parameter-label">
        <span>${t[name]}</span><output>${text}</output>
      </div>
      <phy-slider
        .label=${t[name]}
        .valueText=${text}
        .min=${min}
        .max=${max}
        .step=${step}
        .value=${this.data.parameters[name]}
        @input=${(event: Event) => {
          const value = parameterValue(
            name,
            (event.currentTarget as SliderElement).value,
          );
          if (value !== this.data.parameters[name])
            this.load({ ...this.data.parameters, [name]: value });
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

  private observation(t: Messages, hint: string) {
    const { observation, parameters, time } = this.data;
    const window =
      this.drag?.window ?? chartWindow(parameters, observation, time);
    const cached = this.traceCache;
    if (
      cached?.parameters !== parameters ||
      cached.observation !== observation ||
      cached.window.start !== window.start ||
      cached.window.end !== window.end
    )
      this.traceCache = {
        parameters,
        observation,
        window,
        traces: paths(parameters, observation, window),
      };
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.modes}
      .value=${observation}
      .items=${[
        { value: "waves", label: t.waves },
        { value: "envelope", label: t.envelope },
      ]}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.drag = undefined;
        this.set({
          observation: (event.currentTarget as TabsElement)
            .value as Observation,
        });
      }}
    >
      <div class="observation" slot=${observation}>
        <p class="legend">
          ${
            observation === "waves"
              ? html`<span class="first">x₁ · ${t.first}</span
                  ><span class="second">x₂ · ${t.second}</span>`
              : html`<span class="bound">±R · ${t.amplitude}</span>`
          }
          <span class="sum">x · ${t.sum}</span>
        </p>
        <div class="chart-wrap">
          ${chart(parameters, observation, window, time, this.traceCache!.traces, this.chartDrag, t)}
        </div>
        <p class="chart-hint">
          ${observation === "waves" ? t.waveHint : t.envelopeHint}
        </p>
        <section class="model-formula">
          <phy-math
            .source=${
              observation === "waves"
                ? String.raw`x=x_1+x_2,\quad x_i=A_i\cos(2\pi f_i t+\varphi_i)`
                : String.raw`R^2=(A_1-A_2)^2+4A_1 A_2\cos^2(\Delta\varphi/2)`
            }
          ></phy-math>
          <p>${hint}</p>
        </section>
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, vectors } = this.data;
    const derived = derive(parameters);
    const state = at(parameters, time);
    const hint = !derived.active
      ? t.singleHint
      : derived.gap === 0
        ? t.equalHint
        : t.variableHint;
    const readouts = [
      { kind: "first", label: "x₁", value: state.firstX },
      { kind: "second", label: "x₂", value: state.secondX },
      { kind: "sum", label: "x₁ + x₂", value: state.sumX },
      {
        kind: "bound",
        label: `R · ${t.amplitude}`,
        value: envelope(parameters, time),
      },
    ];
    return html`<header class="heading">
        <h1>${t.title}</h1>
        <p>${t.subtitle}</p>
        ${this.context?.toolbar ? nothing : html`<div class="fallback-controls">${this.playback()}</div>`}
      </header>
      <div class="lab">
        <phy-box
          class="panel sources"
          role="complementary"
          aria-label=${t.parameters}
        >
          <div class="panel-heading"><h2>${t.parameters}</h2></div>
          <div class="parameter-groups">
            <section class="source-group">
              <h3>${t.first}</h3>
              ${this.parameter("amplitudeFirst", t)}${this.parameter("frequencyFirst", t)}
            </section>
            <section class="source-group">
              <h3>${t.second}</h3>
              ${this.parameter("amplitudeSecond", t)}${this.parameter("frequencySecond", t)}${this.parameter("phaseSecond", t)}
            </section>
          </div>
          <div class="derived">
            <div>
              <span>${t.gap} Δf</span
              ><output data-derived="gap">${display(derived.gap)} Hz</output>
            </div>
            <div>
              <span>${t.beatPeriod}</span
              ><output data-derived="beat"
                >${derived.beatPeriod === null ? "—" : `${display(derived.beatPeriod)} s`}</output
              >
            </div>
          </div>
          <div class="source-footer">
            <p>${t.resetHint}</p>
            <phy-select
              .label=${t.preset}
              .value=${""}
              .options=${[{ value: "", label: t.preset, disabled: true }, ...(Object.keys(presets) as Preset[]).map((key) => ({ value: key, label: t[key] }))]}
              @change=${(event: Event) => {
                const control = event.currentTarget as SelectElement;
                const preset = presets[control.value as Preset];
                if (preset) this.load(preset);
                control.value = "";
              }}
            ></phy-select>
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.scene}>
          <div class="panel-heading">
            <h2>${t.scene}</h2>
            <phy-checkbox
              .checked=${vectors}
              @change=${(event: Event) => this.set({ vectors: (event.currentTarget as CheckboxElement).checked })}
              >${t.vectors}</phy-checkbox
            >
          </div>
          <div class="scene-wrap">${scene(state, vectors, t)}</div>
          <div class="readouts">
            ${readouts.map(
              ({ kind, label, value }) =>
                html`<div class=${kind}>
                  <span>${label}</span
                  ><output data-readout=${kind}
                    >${display(value)} <small>cm</small></output
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <div class="time-label">
              <label>${t.timeline}</label
              ><output data-time=${time}
                >${display(time)} / ${display(derived.duration)} s</output
              >
            </div>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${display(time)} s`}
              .min=${0}
              .max=${timelineSteps}
              .step=${1}
              .value=${Math.round((timelineSteps * time) / derived.duration)}
              @input=${(event: Event) => this.seek(((event.currentTarget as SliderElement).value / timelineSteps) * derived.duration)}
            ></phy-slider>
            <div class="moments">
              <phy-button
                ?disabled=${derived.beatPeriod === null}
                @click=${() => this.jump("reinforce")}
                >${t.reinforce}</phy-button
              >
              <phy-button
                ?disabled=${derived.beatPeriod === null}
                @click=${() => this.jump("cancel")}
                >${t.cancel}</phy-button
              >
            </div>
          </div>
        </phy-box>
        <phy-box class="panel right" role="region" aria-label=${t.modes}
          >${this.observation(t, hint)}</phy-box
        >
      </div>`;
  }
}

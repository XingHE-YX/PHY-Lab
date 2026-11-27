import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  RadioGroupElement,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import { scene, trackCoordinate } from "./components/scene";
import { arrivals, chartTimeFromEvent, comparison } from "./components/timing";
import { messages, type Messages } from "./locales/messages";
import {
  clamp,
  defaults,
  duration,
  limits,
  makeTrial,
  motions,
  parameterValue,
  playbackScale,
  scenarios,
  soundSpeed,
  type Motion,
  type Mover,
  type Parameter,
  type Parameters,
  type ScenarioPreset,
  type Trial,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Observation,
  type Rate,
  type Snapshot,
  type Support,
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
    chartHeight: { state: true },
  };
  declare locale: Locale;
  declare private playing: boolean;
  declare private data: Snapshot;
  declare private chartHeight: number;
  private context?: ExperimentContext;
  private readonly controls = document.createElement("div");
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;
  private frame?: number;
  private previousFrame?: number;
  private pointer?: { id: number; coordinate: number; time: number };
  private chartPointer?: { id: number; windowStart: number };
  private chartObserver?: ResizeObserver;
  private observedChartWrap?: Element;
  private modelCache?: { parameters: Parameters; trial: Trial };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.playing = false;
    this.chartHeight = 220;
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
    this.chartObserver?.disconnect();
    this.chartObserver = undefined;
    this.observedChartWrap = undefined;
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
    this.syncChartObserver();
  }

  private syncChartObserver() {
    const wrap = this.renderRoot.querySelector(".chart-wrap");
    if (wrap === this.observedChartWrap) return;
    this.chartObserver?.disconnect();
    this.observedChartWrap = wrap ?? undefined;
    if (!wrap) return;
    this.chartObserver = new ResizeObserver((entries) => {
      const height = Math.round(entries[0]?.contentRect.height ?? 0);
      if (height >= 120 && Math.abs(height - this.chartHeight) > 2)
        this.chartHeight = height;
    });
    this.chartObserver.observe(wrap);
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
    this.chartPointer = undefined;
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
    this.chartPointer = undefined;
    this.stop();
    this.set({ parameters: { ...this.data.parameters, ...patch }, time: 0 });
  }

  private restoreDefaults = () => {
    this.pointer = undefined;
    this.chartPointer = undefined;
    this.stop();
    this.set({ parameters: { ...defaults }, time: 0 });
  };

  private loadScenario(preset: ScenarioPreset) {
    this.pointer = undefined;
    this.chartPointer = undefined;
    this.stop();
    this.set({
      parameters: { ...preset.parameters },
      time: 0,
      observation: preset.observation,
      support: "formula",
    });
    void this.updateComplete.then(() => {
      (
        this.renderRoot.querySelector(".observation-tabs") as HTMLElement | null
      )?.focus?.();
    });
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

  private chartScrub = {
    start: (event: PointerEvent, windowStart: number) => {
      if (event.button !== 0 || this.chartPointer) return;
      const next = chartTimeFromEvent(event, windowStart);
      if (next === null) return;
      this.pause();
      this.chartPointer = { id: event.pointerId, windowStart };
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.seek(next);
    },
    move: (event: PointerEvent) => {
      const pointer = this.chartPointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      const next = chartTimeFromEvent(event, pointer.windowStart);
      if (next !== null) this.seek(next);
    },
    end: (event: PointerEvent) => {
      if (this.chartPointer?.id === event.pointerId)
        this.chartPointer = undefined;
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button variant="primary" @click=${this.toggle}
        ><span aria-hidden="true">${this.playing ? "Ⅱ" : "▷"}</span>
        ${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}
        ><span aria-hidden="true">↺</span> ${t.reset}</phy-button
      >
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
    const restSpeed = key === "speed" && this.data.parameters.motion === "rest";
    return html`<div class=${restSpeed ? "parameter muted-param" : "parameter"}>
      <div class="parameter-label">
        <span>${t[key]}</span
        ><output
          >${label}${
            restSpeed
              ? html`<span class="rest-tag">(${t.speedCompareOnly})</span>`
              : nothing
          }</output
        >
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

  private observationPanel(
    t: Messages,
    trial: Trial,
    sample: ReturnType<Trial["at"]>,
  ) {
    const { parameters, time, observation, support } = this.data;
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observe}
      .value=${observation}
      .items=${observations.map((value) => ({ value, label: t[value] }))}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          observation: (event.currentTarget as TabsElement)
            .value as Observation,
          support: "formula",
        });
      }}
      @activate=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        if (this.data.support !== "formula") this.set({ support: "formula" });
      }}
    >
      ${
        support === "formula"
          ? html`<div class="observation" slot=${observation}>
              ${
                observation === "arrivals"
                  ? arrivals(
                      trial,
                      sample,
                      time,
                      this.chartHeight,
                      this.chartScrub,
                      t,
                    )
                  : comparison(
                      parameters,
                      (motion: Motion) => this.configure({ motion }),
                      () =>
                        this.configure({
                          mover:
                            parameters.mover === "source"
                              ? "observer"
                              : "source",
                        }),
                      t,
                    )
              }
            </div>`
          : nothing
      }
    </phy-tabs>`;
  }

  private supportPanel(t: Messages, trial: Trial) {
    const { parameters, support } = this.data;
    const hint =
      trial.motion === "rest"
        ? t.restHint
        : parameters.mover === "source"
          ? t.sourceHint
          : t.observerHint;
    return html`<phy-tabs
      class="support support-tabs"
      variant="segmented"
      .label=${t.supportLabel}
      .value=${support}
      .items=${[
        { value: "formula", label: t.formulaTab },
        { value: "explore", label: t.exploreTab },
      ]}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          support: (event.currentTarget as TabsElement).value as Support,
        });
      }}
    >
      <div class="support-body" slot=${support}>
        ${
          support === "formula"
            ? html`<section class="model-formula">
                <phy-math .source=${equation}></phy-math>
                <p>${hint}</p>
              </section>`
            : html`<div class="explore-content">
                <p class="explore-hint">${t.exploreHint}</p>
                <div class="scenario-grid">
                  ${scenarios.map((preset) => {
                    const copy = t.scenarios[preset.id];
                    return html`<article class="scenario-card">
                      <h3>${copy.title}</h3>
                      <p>${copy.detail}</p>
                      <button
                        type="button"
                        data-scenario=${preset.id}
                        @click=${() => this.loadScenario(preset)}
                      >
                        ${t.loadScenario}
                      </button>
                    </article>`;
                  })}
                </div>
              </div>`
        }
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, wavefronts, wavelengthGuide, vectors, support } =
      this.data;
    const trial = this.trial;
    const sample = trial.at(time);
    const firstArrival = trial.nextArrival(0);
    const periodMs = (1000 / trial.received).toFixed(2);
    const activeSpeed = Math.abs(this.moverVelocity);
    const mach = activeSpeed / soundSpeed;
    const freqRatio = trial.received / trial.emitted;
    const isAtFirst = Math.abs(time - firstArrival) < 1e-6;
    const isAtEnd = Math.abs(time - duration) < 1e-6;
    const isAtCrest = !isAtFirst && !isAtEnd && sample.phase < 0.04;

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

    const isDefault =
      parameters.mover === defaults.mover &&
      parameters.motion === defaults.motion &&
      parameters.speed === defaults.speed &&
      parameters.frequency === defaults.frequency;

    return html`<header class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        ${
          this.context?.toolbar
            ? html`<span class="model-note">${t.modelNote}</span>`
            : html`<div class="fallback-controls">${this.playback()}</div>`
        }
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.settings}>
          <div class="panel-heading">
            <h2>${t.settings}</h2>
            <span class=${this.playing ? "status active" : "status"}
              >${this.playing ? t.running : t.paused}</span
            >
          </div>
          <div class="parameters">
            <div class="segmented-field">
              <span>${t.mover}</span>
              <phy-radio-group
                variant="segmented"
                .label=${t.mover}
                .value=${parameters.mover}
                .options=${movers.map((value) => ({ value, label: t[value] }))}
                @change=${(event: Event) =>
                  this.configure({
                    mover: (event.currentTarget as RadioGroupElement)
                      .value as Mover,
                  })}
              ></phy-radio-group>
            </div>
            <div class="segmented-field">
              <span>${t.motion}</span>
              <phy-radio-group
                variant="segmented"
                .label=${t.motion}
                .value=${parameters.motion}
                .options=${motions.map((value) => ({ value, label: t[value] }))}
                @change=${(event: Event) =>
                  this.configure({
                    motion: (event.currentTarget as RadioGroupElement)
                      .value as Motion,
                  })}
              ></phy-radio-group>
            </div>
            ${this.parameter("speed", t)} ${this.parameter("frequency", t)}
          </div>
          <div class="derived-metrics">
            <div>
              <span>${t.medium}</span><output>${soundSpeed} m/s</output>
            </div>
            <div><span>${t.mach}</span><output>${mach.toFixed(2)}</output></div>
            <div>
              <span>${t.behindWavelength}</span
              ><output>${trial.behind.toFixed(3)} m</output>
            </div>
            <div>
              <span>${t.freqRatio}</span
              ><output>${freqRatio.toFixed(2)}×</output>
            </div>
          </div>
          <div class="parameter-footer">
            <phy-button
              ?disabled=${isDefault && time === 0}
              @click=${this.restoreDefaults}
              >${t.restoreDefaults}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
            <small>${t.resetHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.waveView}>
          <div class="panel-heading">
            <h2>${t.waveView}</h2>
            <small class="motion-status mono"
              >${t[trial.motion]} · ${activeSpeed} m/s</small
            >
          </div>
          <div class="scene-wrap">
            ${scene(
              trial,
              sample,
              time,
              { wavefronts, wavelengthGuide, vectors },
              this.scrub,
              t,
            )}
          </div>
          <div class="layer-controls">
            <div>
              <phy-checkbox
                .checked=${wavefronts}
                @change=${(event: Event) => this.set({ wavefronts: (event.currentTarget as CheckboxElement).checked })}
                >${t.wavefronts}</phy-checkbox
              >
              <phy-checkbox
                .checked=${wavelengthGuide}
                @change=${(event: Event) => this.set({ wavelengthGuide: (event.currentTarget as CheckboxElement).checked })}
                >${t.wavelengthGuide}</phy-checkbox
              >
              <phy-checkbox
                .checked=${vectors}
                @change=${(event: Event) => this.set({ vectors: (event.currentTarget as CheckboxElement).checked })}
                >${t.vectors}</phy-checkbox
              >
            </div>
            <span class="layer-hint"
              >${activeSpeed > 0 ? t.drag : t.dragDisabled}</span
            >
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
            <span>0 ms</span>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${milliseconds(time)} ms`}
              .min=${0}
              .max=${duration * 1000}
              .step=${0.1}
              .value=${Math.round(time * 10000) / 10}
              @input=${(event: Event) => this.seek((event.currentTarget as SliderElement).value / 1000)}
            ></phy-slider>
            <span>${duration * 1000} ms</span>
            <output class="time-label" data-time=${time}
              >t = ${milliseconds(time)} ms</output
            >
          </div>
          <div class="moments">
            <button
              type="button"
              class=${isAtFirst ? "selected" : ""}
              @click=${() => this.seek(firstArrival)}
            >
              ${t.first}<small aria-hidden="true"
                >${milliseconds(firstArrival)} ms</small
              >
            </button>
            <button
              type="button"
              class=${isAtCrest ? "selected" : ""}
              @click=${() => this.seek(trial.nextArrival(this.data.time))}
            >
              ${t.next}<small aria-hidden="true">+${periodMs} ms</small>
            </button>
            <button
              type="button"
              class=${isAtEnd ? "selected" : ""}
              @click=${() => this.seek(duration)}
            >
              ${t.end}<small aria-hidden="true">${duration * 1000}.00 ms</small>
            </button>
          </div>
        </phy-box>
        <phy-box
          class=${"panel right" + (support === "explore" ? " exploring" : "")}
          role="region"
          aria-label=${t.observe}
        >
          ${this.observationPanel(t, trial, sample)}
          ${this.supportPanel(t, trial)}
        </phy-box>
      </div>`;
  }
}

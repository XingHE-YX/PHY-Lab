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
import { chart, chartData } from "./components/chart";
import { dragAngle, scene } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  limits,
  makePendulum,
  parameterValue,
  presets,
  radians,
  type Parameter,
  type Parameters,
  type Pendulum,
  type Preset,
  type Sample,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Observation,
  type Rate,
  type Snapshot,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const timelineSteps = 4000;
const observations: Observation[] = ["period", "motion", "energy"];
const equations: Record<Observation, string> = {
  period: String.raw`T_0=2\pi\sqrt{L/g},\quad T=T_0\,\frac{2K(k)}{\pi}`,
  motion: String.raw`\ddot\theta=-\frac{g}{L}\sin\theta`,
  energy: String.raw`\frac{E}{m}=\frac{L^2\dot\theta^2}{2}+gL(1-\cos\theta)`,
};
const display = (value: number, digits = 2) =>
  (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);

export class PendulumExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    data: { state: true },
    playing: { state: true },
  };
  declare locale: Locale;
  declare private data: Snapshot;
  declare private playing: boolean;
  private context?: ExperimentContext;
  private readonly controls = document.createElement("div");
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;
  private frame?: number;
  private previousFrame?: number;
  private pointer?: number;
  private modelCache?: { parameters: Parameters; model: Pendulum };
  private chartCache?: {
    model: Pendulum;
    observation: Observation;
    data: ReturnType<typeof chartData>;
  };

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

  snapshot() {
    return structuredClone(this.data);
  }

  private get model() {
    const { parameters } = this.data;
    if (this.modelCache?.parameters !== parameters)
      this.modelCache = { parameters, model: makePendulum(parameters) };
    return this.modelCache.model;
  }

  connectedCallback() {
    super.connectedCallback();
    this.context?.toolbar?.setControls(this.controls);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.onHide);
  }

  disconnectedCallback() {
    this.pause();
    this.pointer = undefined;
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
      (previous.parameters.angle === 0) !==
        (this.data.parameters.angle === 0) ||
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
    const { duration } = this.model;
    const time = Math.min(duration, this.data.time + elapsed * this.data.rate);
    this.data = { ...this.data, time };
    if (time >= duration) this.pause();
    else this.frame = requestAnimationFrame(this.step);
  };

  private togglePlayback = () => {
    if (this.model.period === null) return;
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.data.time >= this.model.duration) this.set({ time: 0 });
    this.playing = true;
    this.frame = requestAnimationFrame(this.step);
  };

  private seek = (time: number) => {
    this.stop();
    this.set({
      time:
        this.model.period === null
          ? 0
          : Math.max(0, Math.min(time, this.model.duration)),
    });
  };

  private load(parameters: Parameters) {
    this.stop();
    this.set({ parameters, time: 0 });
  }

  private changeParameter(key: Parameter, input: number) {
    const value = parameterValue(key, input);
    if (value !== this.data.parameters[key])
      this.load({ ...this.data.parameters, [key]: value });
  }

  private drag = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.pointer !== undefined) return;
      this.pause();
      this.pointer = event.pointerId;
      const handle = event.currentTarget as SVGGraphicsElement;
      handle.setPointerCapture(event.pointerId);
    },
    move: (event: PointerEvent) => {
      if (this.pointer !== event.pointerId) return;
      const angle = dragAngle(event);
      if (angle !== null) this.changeParameter("angle", angle);
    },
    end: (event: PointerEvent) => {
      if (this.pointer === event.pointerId) this.pointer = undefined;
    },
    key: (event: KeyboardEvent) => {
      const step = event.shiftKey ? 10 : 1;
      const angle =
        event.key === "ArrowLeft"
          ? this.data.parameters.angle - step
          : event.key === "ArrowRight"
            ? this.data.parameters.angle + step
            : event.key === "Home"
              ? 0
              : null;
      if (angle === null) return;
      event.preventDefault();
      this.changeParameter("angle", angle);
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html` <phy-button
        variant="primary"
        ?disabled=${this.data.parameters.angle === 0}
        @click=${this.togglePlayback}
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
    const { min, max, step, unit, digits } = limits[key];
    const value = this.data.parameters[key];
    const text = `${display(value, digits)} ${unit}`;
    return html`<div class="parameter">
      <div class="parameter-label">
        <span>${t[key]}</span><output>${text}</output>
      </div>
      <phy-slider
        .label=${t[key]}
        .valueText=${text}
        .min=${min}
        .max=${max}
        .step=${step}
        .value=${value}
        @input=${(event: Event) => this.changeParameter(key, (event.currentTarget as SliderElement).value)}
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

  private timing(t: Messages) {
    const { approximate, period, ratio } = this.model;
    return html`<dl class="periods">
      <div>
        <dt>${t.approximate} T₀</dt>
        <dd>
          <output data-period="approximate"
            >${display(approximate, 3)} s</output
          >
        </dd>
      </div>
      <div>
        <dt>${t.actual} T</dt>
        <dd>
          <output data-period="actual"
            >${period === null ? "—" : `${display(period, 3)} s`}</output
          >
        </dd>
      </div>
      <div class="period-increase">
        <dt>${t.increase}</dt>
        <dd>
          <output data-period="increase"
            >${period === null ? "—" : `+${display((ratio - 1) * 100)}%`}</output
          >
        </dd>
      </div>
    </dl>`;
  }

  private observation(t: Messages, model: Pendulum, sample: Sample) {
    const { observation, parameters, time } = this.data;
    const amplitude = Math.abs(parameters.angle);
    if (
      this.chartCache?.model !== model ||
      this.chartCache.observation !== observation
    )
      this.chartCache = {
        model,
        observation,
        data: chartData(model, observation, amplitude),
      };
    const legend =
      observation === "energy"
        ? [
            { kind: "potential", label: t.potential },
            { kind: "kinetic", label: t.kinetic },
            { kind: "total", label: t.total },
          ]
        : [
            { kind: "actual", label: t.nonlinear },
            { kind: "approximation", label: t.linear },
          ];
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observation}
      .value=${observation}
      .items=${observations.map((mode) => ({ value: mode, label: t[mode] }))}
      @change=${(event: Event) => {
        if (event.target === event.currentTarget)
          this.set({
            observation: (event.currentTarget as TabsElement)
              .value as Observation,
          });
      }}
    >
      <div class="plot-panel" slot=${observation}>
        <p class="legend">
          ${legend.map(({ kind, label }) => html`<span class=${kind}>${label}</span>`)}
        </p>
        <div class="chart-wrap">
          ${chart(this.chartCache.data, model, observation, amplitude, time, sample, this.seek, t)}
        </div>
        <section class="model-formula">
          <phy-math .source=${equations[observation]}></phy-math>
          <p>${model.period === null ? t.atRest : t[`${observation}Hint`]}</p>
        </section>
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, comparison } = this.data;
    const model = this.model;
    const sample = model.at(time);
    const stationary = model.period === null;
    const readouts = [
      {
        kind: "actual",
        label: t.currentAngle,
        value: sample.angle / radians,
        unit: "°",
      },
      {
        kind: "approximation",
        label: t.linearAngle,
        value: sample.angleLinear / radians,
        unit: "°",
      },
      {
        kind: "kinetic",
        label: t.signedSpeed,
        value: sample.speed,
        unit: "m/s",
      },
      {
        kind: "acceleration-value",
        label: t.tangential,
        value: sample.tangentialAcceleration,
        unit: "m/s²",
      },
    ];
    const moments = [
      { label: t.bottom, time: (model.period ?? 0) / 4 },
      { label: t.opposite, time: (model.period ?? 0) / 2 },
      { label: t.linearReturn, time: model.approximate },
      { label: t.full, time: model.period ?? 0 },
    ];
    return html` <header class="heading">
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
          <div class="parameters">
            ${this.parameter("angle", t)}${this.parameter("length", t)}${this.parameter("gravity", t)}
          </div>
          ${this.timing(t)}
          <div class="source-footer">
            <p>${t.resetHint}</p>
            <phy-select
              .label=${t.preset}
              .value=${""}
              .options=${[{ value: "", label: t.preset, disabled: true }, ...(Object.keys(presets) as Preset[]).map((key) => ({ value: key, label: t[key] }))]}
              @change=${(event: Event) => {
                const control = event.currentTarget as SelectElement;
                const preset = presets[control.value as Preset];
                if (preset) this.load({ ...preset });
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
              .checked=${comparison}
              @change=${(event: Event) => this.set({ comparison: (event.currentTarget as CheckboxElement).checked })}
              >${t.comparison}</phy-checkbox
            >
          </div>
          <div class="scene-wrap">
            ${scene(parameters, sample, comparison, this.drag, t)}
          </div>
          <div class="readouts">
            ${readouts.map(
              ({ kind, label, value, unit }) =>
                html`<div class=${kind}>
                  <span>${label}</span
                  ><output data-readout=${kind}
                    >${display(value)} <small>${unit}</small></output
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <div class="time-label">
              <span>${t.timeline}</span
              ><output data-time=${time}
                >${display(time)} /
                ${stationary ? "—" : display(model.duration)} s</output
              >
            </div>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${display(time)} s`}
              .min=${0}
              .max=${timelineSteps}
              .step=${1}
              .value=${Math.round((timelineSteps * time) / model.duration)}
              ?disabled=${stationary}
              @input=${(event: Event) => this.seek(((event.currentTarget as SliderElement).value / timelineSteps) * model.duration)}
            ></phy-slider>
            <div class="moments">
              ${moments.map(({ label, time }) => html`<phy-button ?disabled=${stationary} @click=${() => this.seek(time)}>${label}</phy-button>`)}
            </div>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.observation}
          >${this.observation(t, model, sample)}</phy-box
        >
      </div>`;
  }
}

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
import {
  chart,
  chartData,
  chartFraction,
  defaultChartHeight,
  viewWidth,
} from "./components/chart";
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
  type Support,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const timelineSteps = 4000;
const observations: Observation[] = ["period", "motion", "energy"];
const equations: Record<Observation, string> = {
  period: String.raw`T_0=2\pi\sqrt{L/g},\quad T=T_0\,\frac{2K(k)}{\pi}`,
  motion: String.raw`\ddot\theta=-\frac{g}{L}\sin\theta`,
  energy: String.raw`\frac{E}{m}=\frac{L^2\dot\theta^2}{2}+gL(1-\cos\theta)`,
};
const taskDefinitions: {
  preset: Preset;
  titleKey: "small" | "large" | "extreme" | "lunar";
  descKey: "taskSmall" | "taskLarge" | "taskExtreme" | "taskLunar";
  observation: Observation;
}[] = [
  {
    preset: "small",
    titleKey: "small",
    descKey: "taskSmall",
    observation: "period",
  },
  {
    preset: "large",
    titleKey: "large",
    descKey: "taskLarge",
    observation: "period",
  },
  {
    preset: "extreme",
    titleKey: "extreme",
    descKey: "taskExtreme",
    observation: "motion",
  },
  {
    preset: "lunar",
    titleKey: "lunar",
    descKey: "taskLunar",
    observation: "period",
  },
];

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
  private chartPointer?: number;
  private chartObserver?: ResizeObserver;
  private chartNode?: Element;
  private chartHeight = defaultChartHeight;
  private modelCache?: { parameters: Parameters; model: Pendulum };
  private chartCache?: {
    model: Pendulum;
    observation: Observation;
    height: number;
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
    this.chartPointer = undefined;
    this.chartObserver?.disconnect();
    this.chartObserver = undefined;
    this.chartNode = undefined;
    this.dialog?.close();
    render(nothing, this.help.shadowRoot!);
    this.context?.toolbar?.setControls(null);
    render(nothing, this.controls);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.onHide);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    if (!this.chartObserver)
      this.chartObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = Math.max(1, entry.contentRect.width);
          const height = Math.max(
            165,
            Math.min(
              380,
              Math.round((entry.contentRect.height * viewWidth) / width),
            ),
          );
          if (Math.abs(height - this.chartHeight) > 2) {
            this.chartHeight = height;
            this.requestUpdate();
          }
        }
      });
    const nextChart = this.renderRoot.querySelector(".chart-wrap");
    if (nextChart !== this.chartNode) {
      if (this.chartNode) this.chartObserver.unobserve(this.chartNode);
      if (nextChart) this.chartObserver.observe(nextChart);
      this.chartNode = nextChart ?? undefined;
    }

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

  private load(parameters: Parameters, extra: Partial<Snapshot> = {}) {
    this.stop();
    this.set({ ...extra, parameters: { ...parameters }, time: 0 });
  }

  private async loadTask(preset: Preset, observation: Observation) {
    this.load(presets[preset], { observation, support: "formula" });
    await this.updateComplete;
    this.renderRoot.querySelector<TabsElement>(".observation-tabs")?.focus();
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
        event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? this.data.parameters.angle - step
          : event.key === "ArrowRight" || event.key === "ArrowUp"
            ? this.data.parameters.angle + step
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? limits.angle.max
                : null;
      if (angle === null) return;
      event.preventDefault();
      this.changeParameter("angle", angle);
    },
  };

  private applyChartPointer(event: PointerEvent) {
    const raw = chartFraction(event);
    if (raw === null) return;
    const fraction = Math.max(0, Math.min(1, raw));
    if (this.data.observation === "period") {
      const sign = this.data.parameters.angle < 0 ? -1 : 1;
      this.changeParameter("angle", sign * fraction * limits.angle.max);
    } else if (this.model.period !== null) {
      this.seek(fraction * this.model.duration);
    }
  }

  private chartInteractions = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.chartPointer !== undefined) return;
      const raw = chartFraction(event);
      if (raw === null || raw < 0 || raw > 1) return;
      this.chartPointer = event.pointerId;
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.applyChartPointer(event);
    },
    move: (event: PointerEvent) => {
      if (this.chartPointer !== event.pointerId) return;
      this.applyChartPointer(event);
    },
    end: (event: PointerEvent) => {
      if (this.chartPointer === event.pointerId) this.chartPointer = undefined;
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button
        variant="primary"
        ?disabled=${this.data.parameters.angle === 0}
        @click=${this.togglePlayback}
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

  private timing(t: Messages, totalEnergy: number) {
    const { approximate, period, ratio } = this.model;
    return html`<dl class="periods">
      <div>
        <dt>${t.approximate}</dt>
        <dd>
          <output data-period="approximate"
            >${display(approximate, 3)} s</output
          >
        </dd>
      </div>
      <div>
        <dt>${t.actual}</dt>
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
      <div>
        <dt>${t.totalEnergy}</dt>
        <dd>
          <output data-period="energy">${display(totalEnergy)} J/kg</output>
        </dd>
      </div>
    </dl>`;
  }

  private observationPanel(t: Messages, model: Pendulum, sample: Sample) {
    const { observation, parameters, time, support } = this.data;
    const amplitude = Math.abs(parameters.angle);
    if (
      this.chartCache?.model !== model ||
      this.chartCache.observation !== observation ||
      this.chartCache.height !== this.chartHeight
    )
      this.chartCache = {
        model,
        observation,
        height: this.chartHeight,
        data: chartData(model, observation, amplitude, this.chartHeight),
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
    const potentialShare =
      sample.total > 1e-12 ? (sample.potential / sample.total) * 100 : 0;
    const kineticShare =
      sample.total > 1e-12 ? (sample.kinetic / sample.total) * 100 : 0;

    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observation}
      .value=${observation}
      .items=${observations.map((mode) => ({ value: mode, label: t[mode] }))}
      @activate=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          observation: (event.currentTarget as TabsElement)
            .value as Observation,
          support: "formula",
        });
      }}
    >
      ${
        support === "formula"
          ? html`<div class="plot-panel" slot=${observation}>
              <p class="legend">
                ${legend.map(({ kind, label }) => html`<span class=${kind}>${label}</span>`)}
              </p>
              <div class="chart-wrap">
                ${chart(this.chartCache.data, model, observation, amplitude, time, sample, this.chartInteractions, t, this.chartHeight)}
              </div>
              ${
                observation === "energy"
                  ? html`<div class="energy-strip">
                      <div class="energy-values">
                        <span class="potential"
                          >Eₚ ${display(sample.potential)}</span
                        >
                        <span class="kinetic"
                          >Eₖ ${display(sample.kinetic)}</span
                        >
                        <span class="total"
                          >E ${display(sample.total)} J/kg</span
                        >
                      </div>
                      <div class="energy-bar" aria-hidden="true">
                        <div
                          class="potential-fill"
                          style=${`width:${potentialShare.toFixed(1)}%`}
                        ></div>
                        <div
                          class="kinetic-fill"
                          style=${`width:${kineticShare.toFixed(1)}%`}
                        ></div>
                      </div>
                    </div>`
                  : nothing
              }
              <p class="chart-hint">
                ${observation === "period" ? t.periodDragHint : t.chartDragHint}
              </p>
            </div>`
          : nothing
      }
    </phy-tabs>`;
  }

  private supportPanel(t: Messages, model: Pendulum) {
    const { observation, support } = this.data;
    return html`<phy-tabs
      class="support support-tabs"
      variant="segmented"
      .label=${t.supportLabel}
      .value=${support}
      .items=${[
        { value: "formula", label: t.formulaTab },
        { value: "tasks", label: t.tasksTab },
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
                <phy-math .source=${equations[observation]}></phy-math>
                <p>
                  ${model.period === null ? t.atRest : t[`${observation}Hint`]}
                </p>
              </section>`
            : html`<div class="task-content">
                <p class="tasks-hint">${t.tasksHint}</p>
                <div class="task-grid">
                  ${taskDefinitions.map(
                    ({ preset, titleKey, descKey, observation: mode }) =>
                      html`<article class="task">
                        <h3>${t[titleKey]}</h3>
                        <p>${t[descKey]}</p>
                        <button
                          type="button"
                          data-preset=${preset}
                          @click=${() => void this.loadTask(preset, mode)}
                        >
                          ${t.loadPreset}
                        </button>
                      </article>`,
                  )}
                </div>
              </div>`
        }
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, comparison, velocity, acceleration, support } =
      this.data;
    const model = this.model;
    const sample = model.at(time);
    const stationary = model.period === null;
    const angleDeg = sample.angle / radians;
    const linearDeg = sample.angleLinear / radians;
    const lagDeg = angleDeg - linearDeg;

    const readouts = [
      {
        kind: "actual",
        label: t.currentAngle,
        value: angleDeg,
        unit: "°",
      },
      {
        kind: "approximation",
        label: t.linearAngle,
        value: linearDeg,
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
      { label: t.bottom, mark: "T/4", time: (model.period ?? 0) / 4 },
      { label: t.opposite, mark: "T/2", time: (model.period ?? 0) / 2 },
      { label: t.linearReturn, mark: "T₀", time: model.approximate },
      { label: t.full, mark: "T", time: model.period ?? 0 },
    ];
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
        <phy-box
          class="panel sources"
          role="complementary"
          aria-label=${t.parameters}
        >
          <div class="panel-heading">
            <h2>${t.parameters}</h2>
            <small class=${this.playing ? "status running" : "status"}
              >${this.playing ? t.playingStatus : t.pausedStatus}</small
            >
          </div>
          <div class="parameters">
            ${this.parameter("angle", t)}${this.parameter("length", t)}${this.parameter("gravity", t)}
          </div>
          ${this.timing(t, sample.total)}
          <div class="parameter-footer">
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
            <small>${t.resetHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.scene}>
          <div class="panel-heading">
            <h2>${t.scene}</h2>
            <small class="mono" data-angle-summary
              >θ = ${display(angleDeg, 1)}° · ${t.phaseLag}
              ${lagDeg >= 0 ? "+" : ""}${display(lagDeg, 1)}°</small
            >
          </div>
          <div class="scene-wrap">
            ${scene(parameters, sample, { comparison, velocity, acceleration }, this.drag, t)}
            <span class="scene-scale">L = ${display(parameters.length)} m</span>
          </div>
          <div class="layer-controls">
            <div>
              <phy-checkbox
                .checked=${comparison}
                @change=${(event: Event) => this.set({ comparison: (event.currentTarget as CheckboxElement).checked })}
                >${t.comparison}</phy-checkbox
              >
              <phy-checkbox
                .checked=${velocity}
                @change=${(event: Event) => this.set({ velocity: (event.currentTarget as CheckboxElement).checked })}
                >${t.velocityArrow}</phy-checkbox
              >
              <phy-checkbox
                .checked=${acceleration}
                @change=${(event: Event) => this.set({ acceleration: (event.currentTarget as CheckboxElement).checked })}
                >${t.accelerationArrow}</phy-checkbox
              >
            </div>
            <span class="layer-hint">${t.dragHint}</span>
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
            <span>0.0 s</span>
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
            <span>${stationary ? "—" : `${display(model.duration, 1)} s`}</span>
            <output class="time-label" data-time=${time}
              >t = ${display(time)} s</output
            >
          </div>
          <div class="moments" role="group" aria-label=${t.momentsLabel}>
            ${moments.map(({ label, mark, time: target }) => {
              const selected = !stationary && Math.abs(time - target) < 1e-3;
              return html`<button
                type="button"
                class=${selected ? "selected" : ""}
                ?disabled=${stationary}
                @click=${() => this.seek(target)}
              >
                ${label}<small>${mark}</small>
              </button>`;
            })}
          </div>
        </phy-box>
        <phy-box
          class=${"panel right" + (support === "tasks" ? " exploring" : "")}
          role="region"
          aria-label=${t.observation}
        >
          ${this.observationPanel(t, model, sample)}
          ${this.supportPanel(t, model)}
        </phy-box>
      </div>`;
  }
}

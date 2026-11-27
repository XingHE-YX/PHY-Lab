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
import { chart, chartData, plotValue, units } from "./components/chart";
import { dragTarget, pointerPosition, scene } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  advance,
  boundDistance,
  clamp,
  demonstration,
  demoPath,
  distances,
  limits,
  maxSteps,
  parameterValue,
  sampleAt,
  stepSeconds,
  withStop,
  type Control,
  type Parameters,
  type Sample,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Observation,
  type Rate,
  type Snapshot,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

type Driver = "idle" | "pointer" | "keyboard" | "replay";
const observations: Observation[] = ["flux", "emf", "current"];
const equations: Record<Observation, string> = {
  flux: String.raw`\Phi=\int_S\mathbf{B}\cdot\hat{\mathbf n}\,\mathrm{d}A`,
  emf: String.raw`\mathcal{E}=-N\,\frac{\mathrm{d}\Phi}{\mathrm{d}t}`,
  current: String.raw`I=\mathcal{E}/R`,
};
const keyboardSpeed = 0.12;

function display(value: number, digits: number) {
  if (value !== 0 && Math.abs(value) < 10 ** -digits)
    return value.toExponential(1);
  return value.toFixed(digits);
}

export class InductionExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    data: { state: true },
    driver: { state: true },
  };
  declare locale: Locale;
  declare private data: Snapshot;
  declare private driver: Driver;
  private context?: ExperimentContext;
  private readonly controls = document.createElement("div");
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;
  private frame?: number;
  private previousFrame?: number;
  private accumulator = 0;
  private target: number = distances.initial;
  private drag?: { id: number; coordinate: number; distance: number };
  private trace?: {
    path: Snapshot["path"];
    parameters: Parameters;
    metric: Observation;
    data: ReturnType<typeof chartData>;
  };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.driver = "idle";
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

  private get end() {
    return this.data.path.length - 1;
  }

  private get sample() {
    return sampleAt(this.data.parameters, this.data.path, this.data.cursor);
  }

  private get full() {
    return this.data.path.length >= maxSteps;
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
      previous.path.length > 1 !== this.end > 0 ||
      changed.has("driver") ||
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

  pause() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.previousFrame = undefined;
    this.accumulator = 0;
    this.drag = undefined;
    if (this.driver === "pointer" || this.driver === "keyboard") {
      const path = withStop(this.data.path);
      this.data = { ...this.data, path, cursor: path.length - 1 };
    }
    this.driver = "idle";
    this.persist();
  }

  private start(driver: Exclude<Driver, "idle">) {
    this.driver = driver;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (this.driver === "idle") return;
    const elapsed =
      this.previousFrame === undefined
        ? 0
        : Math.min(0.1, (now - this.previousFrame) / 1000);
    this.previousFrame = now;
    if (this.driver === "replay") {
      const cursor = Math.min(
        this.end,
        this.data.cursor + (elapsed * this.data.rate) / stepSeconds,
      );
      this.data = { ...this.data, cursor };
      if (cursor >= this.end) {
        this.pause();
        return;
      }
    } else {
      this.accumulator += elapsed;
      const count = Math.floor((this.accumulator + 1e-10) / stepSeconds);
      if (count > 0) {
        this.accumulator = Math.max(0, this.accumulator - count * stepSeconds);
        const path = [...this.data.path];
        const keyboard = this.driver === "keyboard";
        let reached = false;
        for (let index = 0; index < count && path.length < maxSteps; index++) {
          const previous = path.at(-1)!;
          path.push(
            advance(
              previous,
              this.target,
              keyboard ? keyboardSpeed : undefined,
            ),
          );
          if (keyboard && previous === this.target) {
            reached = true;
            break;
          }
        }
        this.data = { ...this.data, path, cursor: path.length - 1 };
        if (reached || this.full) {
          this.pause();
          return;
        }
      }
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private toggle = () => {
    if (this.driver !== "idle") {
      this.pause();
      return;
    }
    if (this.end <= 0) return;
    if (this.data.cursor >= this.end) this.set({ cursor: 0 });
    this.start("replay");
  };

  private seek = (cursor: number) => {
    this.pause();
    this.set({ cursor: clamp(cursor, 0, this.end) });
  };

  private clear = () => {
    const { distance } = this.sample;
    this.pause();
    this.set({ path: [distance], cursor: 0, recording: "manual" });
  };

  private updateParameters(parameters: Parameters) {
    const { distance } = this.sample;
    this.pause();
    this.set({ parameters, path: [distance], cursor: 0, recording: "manual" });
  }

  private demo = () => {
    this.pause();
    this.set({ path: demoPath(), cursor: 0, recording: "demo" });
    this.start("replay");
  };

  private beginManual(driver: "pointer" | "keyboard") {
    const { distance } = this.sample;
    this.pause();
    if (this.data.cursor < this.end || this.data.recording === "demo")
      this.set({ path: [distance], cursor: 0, recording: "manual" });
    if (this.full) return false;
    this.target = distance;
    this.start(driver);
    return true;
  }

  private input = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.drag) return;
      const coordinate = pointerPosition(event);
      if (coordinate === null || !this.beginManual("pointer")) return;
      this.drag = {
        id: event.pointerId,
        coordinate,
        distance: this.sample.distance,
      };
      (event.currentTarget as SVGGraphicsElement).setPointerCapture(
        event.pointerId,
      );
    },
    move: (event: PointerEvent) => {
      const drag = this.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const coordinate = pointerPosition(event);
      if (coordinate !== null)
        this.target = dragTarget(drag.distance, coordinate - drag.coordinate);
    },
    end: (event: PointerEvent) => {
      if (this.drag?.id === event.pointerId) this.pause();
    },
    key: (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        this.pause();
        return;
      }
      if (this.driver === "pointer") return;
      const distance =
        this.driver === "keyboard" ? this.target : this.sample.distance;
      const step = event.shiftKey ? 0.05 : 0.02;
      const next =
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? distance + step
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? distance - step
            : event.key === "Home"
              ? distances.min
              : event.key === "End"
                ? distances.max
                : null;
      if (next === null) return;
      event.preventDefault();
      if (this.driver === "keyboard" || this.beginManual("keyboard"))
        this.target = boundDistance(next);
    },
  };

  private playback() {
    const t = messages(this.locale);
    const label =
      this.driver === "replay"
        ? t.pause
        : this.driver === "idle"
          ? t.play
          : t.stop;
    return html`<phy-button
        variant="primary"
        ?disabled=${this.end === 0 && this.driver === "idle"}
        @click=${this.toggle}
        >${label}</phy-button
      >
      <phy-button @click=${this.clear}>${t.reset}</phy-button>
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

  private parameter(control: Control, t: Messages) {
    const bound = limits[control];
    const suffix = control === "resistance" ? " Ω" : "";
    const value = this.data.parameters[control];
    return html`<div class="parameter">
      <div class="parameter-label">
        <span>${t[control]}</span><output>${value}${suffix}</output>
      </div>
      <phy-slider
        .label=${t[control]}
        .valueText=${`${value}${suffix}`}
        .min=${bound.min}
        .max=${bound.max}
        .step=${bound.step}
        .value=${value}
        @input=${(event: Event) => {
          const next = parameterValue(
            control,
            (event.currentTarget as SliderElement).value,
          );
          if (next !== value)
            this.updateParameters({ ...this.data.parameters, [control]: next });
        }}
      ></phy-slider>
      <div class="limits" aria-hidden="true">
        <span>${bound.min}</span><span>${bound.max}${suffix}</span>
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

  private observation(t: Messages, sample: Sample) {
    const { observation: metric, path, parameters, cursor } = this.data;
    if (
      this.trace?.path !== path ||
      this.trace.parameters !== parameters ||
      this.trace.metric !== metric
    )
      this.trace = {
        path,
        parameters,
        metric,
        data: chartData(parameters, path, metric),
      };
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observe}
      .value=${metric}
      .items=${observations.map((value) => ({ value, label: t[value] }))}
      @change=${(event: Event) => {
        if (event.target === event.currentTarget)
          this.set({
            observation: (event.currentTarget as TabsElement)
              .value as Observation,
          });
      }}
    >
      <div class="plot-panel" slot=${metric}>
        <div class="chart-wrap">
          ${chart(this.trace.data, metric, cursor, sample, this.end, this.seek, t)}
        </div>
        <section class="model-formula">
          <phy-math .source=${equations[metric]}></phy-math>
          <p>${t[`${metric}Hint`]}</p>
        </section>
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, cursor, fields, recording } = this.data;
    const sample = this.sample;
    const moments =
      recording === "demo"
        ? (["approach", "hold", "retreat"] as const).map((key) => ({
            label: t[key],
            cursor: Math.round(demonstration[key] / stepSeconds),
          }))
        : [
            { label: t.start, cursor: 0 },
            { label: t.end, cursor: this.end },
          ];
    const status =
      this.driver === "replay"
        ? t.playing
        : this.driver !== "idle"
          ? t.recording
          : this.full
            ? t.full
            : this.end > 0
              ? cursor < this.end
                ? t.paused
                : t.recorded
              : t.ready;
    return html`<header class="heading">
        <h1>${t.title}</h1>
        <p>${t.subtitle}</p>
        ${this.context?.toolbar ? nothing : html`<div class="fallback-controls">${this.playback()}</div>`}
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.parameters}>
          <div class="panel-heading"><h2>${t.parameters}</h2></div>
          <div class="parameters">
            ${this.parameter("turns", t)}${this.parameter("resistance", t)}
            <div class="polarity">
              <span>${t.polarity}</span>
              <phy-select
                .label=${t.polarity}
                .value=${String(parameters.polarity)}
                .options=${[
                  { value: "1", label: t.north },
                  { value: "-1", label: t.south },
                ]}
                @change=${(event: Event) => this.updateParameters({ ...parameters, polarity: (event.currentTarget as SelectElement).value === "-1" ? -1 : 1 })}
              >
              </phy-select>
            </div>
          </div>
          <div class="position">
            <div>
              <span>${t.distance} d</span
              ><output>${(sample.distance * 100).toFixed(1)} cm</output>
            </div>
            <div>
              <span>${t.speed}</span
              ><output>${(sample.velocity * 100).toFixed(1)} cm/s</output>
            </div>
          </div>
          <div class="source-footer">
            <p>${t.resetHint}</p>
            <phy-button @click=${this.demo}>${t.demo}</phy-button>
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.bench}>
          <div class="panel-heading">
            <h2>${t.bench}</h2>
            <phy-checkbox
              .checked=${fields}
              @change=${(event: Event) => this.set({ fields: (event.currentTarget as CheckboxElement).checked })}
              >${t.fields}</phy-checkbox
            >
          </div>
          <div class="scene-wrap">
            ${scene(parameters, sample, fields, this.input, t)}
          </div>
          <div class="readouts">
            ${observations.map(
              (metric) =>
                html`<div class=${metric}>
                  <span>${metric === "flux" ? t.fluxReadout : t[metric]}</span>
                  <output data-readout=${metric}
                    >${display(plotValue(sample, metric), 3)}
                    <small>${units[metric]}</small></output
                  >
                </div>`,
            )}
            <div class="direction">
              <span>${t[sample.motion]}</span>
              <output data-direction=${sample.direction}
                >${t[sample.direction]}</output
              >
            </div>
          </div>
          <div class="timeline">
            <div class="time-label">
              <span>${t.timeline} · ${status}</span>
              <output data-cursor=${cursor}
                >${(cursor * stepSeconds).toFixed(2)} /
                ${(this.end * stepSeconds).toFixed(2)} s</output
              >
            </div>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${(cursor * stepSeconds).toFixed(2)} s`}
              .min=${0}
              .max=${Math.max(1, this.end)}
              .step=${1}
              .value=${Math.round(cursor)}
              ?disabled=${this.end === 0 || this.driver === "pointer" || this.driver === "keyboard"}
              @input=${(event: Event) => this.seek((event.currentTarget as SliderElement).value)}
            ></phy-slider>
            <div class="moments">
              ${moments.map(
                (moment) =>
                  html`<phy-button
                    ?disabled=${this.end === 0}
                    @click=${() => this.seek(moment.cursor)}
                    >${moment.label}</phy-button
                  >`,
              )}
            </div>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.observe}
          >${this.observation(t, sample)}</phy-box
        >
      </div>`;
  }
}

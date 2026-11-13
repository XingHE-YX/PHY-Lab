import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type {
  TabsElement,
  RadioGroupElement,
  SliderElement,
  SelectElement,
  CheckboxElement,
} from "../../src/infra/platform/protocols/v2/components";
import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/protocols/v2";
import { format, clamp, TAU, phaseAt, timeAtPhase } from "./model/physics";
import {
  parameters,
  stateAt,
  motionAt,
  momentTime,
  timeWindow,
  coefficients,
  regime,
  responseAt,
  resonanceRatio,
  type OscillatorParameters as Parameters,
  type OscillatorState as PhysicsState,
  type PhysicalModel,
} from "./model/dynamics";
import { responseChart, type ResponseView } from "./components/response";
import { labTexts } from "./locales/dynamics";
import { chart, type Metric } from "./components/chart";
import { renderScene } from "./components/scene";
import { sceneFrame } from "./model/scene";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import {
  meetsChallenge,
  type Challenge,
  type ChallengeIndex,
} from "./model/exploration";
import {
  normalizeSnapshot,
  restoreSnapshot,
  type Snapshot,
} from "./model/snapshot";
export type { Snapshot } from "./model/snapshot";
export class SpringExperiment extends LitElement {
  static properties = {
    locale: { type: String },
    params: { state: true },
    time: { state: true },
    playing: { state: true },
    speed: { state: true },
    dragging: { state: true },
    dragX: { state: true },
    velocity: { state: true },
    acceleration: { state: true },
    phasor: { state: true },
    mode: { state: true },
    previous: { state: true },
    moment: { state: true },
    curves: { state: true },
    supportTab: { state: true },
    parameterTab: { state: true },
    energyView: { state: true },
    helpOpen: { state: true },
    responseView: { state: true },
    completedTasks: { state: true },
    activeChallenge: { state: true },
  };
  static styles = styles;
  declare parameterTab: "structure" | "initial" | "drive";
  declare energyView: "split" | "balance";
  declare helpOpen: boolean;
  declare responseView: ResponseView;
  declare completedTasks: boolean[];
  declare activeChallenge: Challenge | null;
  declare supportTab: "formula" | "tasks";
  declare locale: Locale;
  declare params: Parameters;
  declare time: number;
  declare playing: boolean;
  declare speed: number;
  declare dragging: boolean;
  declare dragX: number;
  declare velocity: boolean;
  declare acceleration: boolean;
  declare phasor: boolean;
  declare mode: Snapshot["mode"];
  declare previous: Parameters | null;
  declare moment: string;
  declare curves: Record<Metric, boolean>;
  context!: ExperimentContext;
  private helpHandle?: DialogHandle;
  private readonly helpContent = document.createElement("div");
  private toolbarControls?: HTMLDivElement;
  private frame = 0;
  private last = 0;
  private editing = false;
  private phaseDragging = false;
  private plotObserver?: ResizeObserver;
  private observedPlot?: Element;
  private chartHeight = 210;
  constructor() {
    super();
    const saved = normalizeSnapshot(null);
    this.completedTasks = saved.exploration.completed;
    this.activeChallenge = saved.exploration.active;
    this.supportTab = saved.supportTab;
    this.locale = "zh-CN";
    this.params = saved.params;
    this.parameterTab = saved.parameterTab;
    this.energyView = saved.energyView;
    this.helpOpen = false;
    this.responseView = saved.responseView;
    this.time = 0;
    this.playing = false;
    this.speed = 1;
    this.dragging = false;
    this.dragX = 0;
    this.velocity = true;
    this.acceleration = true;
    this.phasor = false;
    this.mode = "motion";
    this.previous = null;
    this.moment = "";
    this.curves = saved.curves;
  }
  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    const saved = restoreSnapshot(context.storage);
    this.params = saved.params;
    this.time = saved.time;
    this.speed = saved.speed;
    this.mode = saved.mode;
    this.velocity = saved.velocity;
    this.acceleration = saved.acceleration;
    this.phasor = saved.phasor;
    this.previous = saved.previous;
    this.curves = saved.curves;
    this.parameterTab = saved.parameterTab;
    this.energyView = saved.energyView;
    this.responseView = saved.responseView;
    this.supportTab = saved.supportTab;
    this.completedTasks = saved.exploration.completed;
    this.activeChallenge = saved.exploration.active;
  }
  updated(changed: Map<PropertyKey, unknown>) {
    const plot = this.renderRoot.querySelector(".chart-stack");
    if (plot !== this.observedPlot) {
      this.plotObserver?.disconnect();
      this.observedPlot = plot ?? undefined;
      if (plot) {
        this.plotObserver = new ResizeObserver(([entry]) => {
          const count = Math.max(1, plot.querySelectorAll(".chart").length);
          const next = Math.max(
            90,
            Math.round(
              (entry.contentRect.height * 420) /
                Math.max(1, entry.contentRect.width) /
                count,
            ),
          );
          if (Math.abs(next - this.chartHeight) > 1) {
            this.chartHeight = next;
            this.requestUpdate();
          }
        });
        this.plotObserver.observe(plot);
      }
    }
    if (
      this.params.model === "ideal" &&
      this.activeChallenge &&
      !changed.has("activeChallenge") &&
      (changed.has("params") ||
        changed.has("time") ||
        changed.has("dragging")) &&
      meetsChallenge(
        this.activeChallenge,
        this.params,
        this.time,
        this.dragging,
      )
    ) {
      const index = this.activeChallenge.index;
      this.activeChallenge = null;
      this.completedTasks = this.completedTasks.map(
        (done, i) => i === index || done,
      );
      this.pause();
    }
    if (changed.has("helpOpen") || changed.has("locale")) this.syncHelp();
    if (!this.context?.toolbar) return;
    if (!this.toolbarControls) {
      this.toolbarControls = document.createElement("div");
      this.toolbarControls.style.cssText =
        "display:flex;align-items:center;gap:8px";
      this.context.toolbar.setControls(this.toolbarControls);
    }
    if (
      changed.has("playing") ||
      changed.has("dragging") ||
      changed.has("locale") ||
      changed.has("speed")
    )
      render(this.playbackButtons(), this.toolbarControls);
  }
  playbackButtons() {
    const t = texts(this.locale);
    return html`<phy-button
        variant="primary"
        ?disabled=${this.dragging}
        @click=${() => (this.playing ? this.pause() : this.play())}
        >${this.playing ? "Ⅱ" : "▷"}
        ${this.playing ? t.pause : t.play}</phy-button
      ><phy-button @click=${() => this.restart()}>↺ ${t.reset}</phy-button>
      <phy-select
        label=${t.speed}
        .value=${String(this.speed)}
        .options=${[
          { value: "1", label: "1×" },
          { value: "0.5", label: "0.5×" },
          { value: "0.25", label: "0.25×" },
        ]}
        @change=${(event: Event) => {
          this.speed = Number((event.target as SelectElement).value);
          this.last = 0;
          this.persist();
        }}
      ></phy-select>`;
  }
  get effectiveParameters(): Parameters {
    return this.dragging
      ? {
          ...this.params,
          A: Math.abs(this.dragX),
          phi: this.dragX < 0 ? Math.PI : 0,
          x0: this.dragX,
          v0: 0,
        }
      : this.params;
  }
  get state(): PhysicsState {
    return stateAt(this.effectiveParameters, this.dragging ? 0 : this.time);
  }
  snapshot(): Snapshot {
    return {
      version: 2,
      params: { ...this.params },
      time: this.time,
      speed: this.speed,
      mode: this.mode,
      velocity: this.velocity,
      acceleration: this.acceleration,
      phasor: this.phasor,
      previous: this.previous,
      curves: this.curves,
      parameterTab: this.parameterTab,
      energyView: this.energyView,
      responseView: this.responseView,
      supportTab: this.supportTab,
      exploration: {
        version: 1,
        completed: [...this.completedTasks],
        active: this.activeChallenge
          ? {
              index: this.activeChallenge.index,
              baseline: { ...this.activeChallenge.baseline },
            }
          : null,
      },
    };
  }
  persist() {
    this.context?.storage.write(this.snapshot());
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.saveOnHide);
  }
  disconnectedCallback() {
    this.pause();
    this.plotObserver?.disconnect();
    this.persist();
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.saveOnHide);
    if (this.toolbarControls) render(null, this.toolbarControls);
    this.toolbarControls = undefined;
    super.disconnectedCallback();
  }
  private visibility = () => {
    if (document.hidden) this.pause();
  };
  private saveOnHide = () => {
    this.pause();
    this.persist();
  };
  pause() {
    this.playing = false;
    this.phaseDragging = false;
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  play() {
    if (this.playing || this.dragging || this.phaseDragging) return;
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) this.time += ((now - this.last) / 1000) * this.speed;
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  restart() {
    this.pause();
    this.time = 0;
    this.moment = "";
    this.persist();
  }
  setParameter(name: Exclude<keyof Parameters, "model">, value: number) {
    this.pause();
    this.previous = { ...this.params };
    this.params = parameters({ ...this.params, [name]: value });
    this.time = 0;
    this.moment = "";
    this.persist();
  }
  private beginDrag(event: PointerEvent) {
    const x = this.state.x;
    this.pause();
    this.dragX = x;
    this.time = 0;
    this.dragging = true;
    (event.currentTarget as SVGCircleElement).setPointerCapture(
      event.pointerId,
    );
    this.moveDrag(event);
  }
  private moveDrag(event: PointerEvent) {
    if (!this.dragging) return;
    const scene = this.renderRoot.querySelector<SVGSVGElement>(".scene");
    const matrix = scene?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    this.dragX = clamp(
      (point.x - sceneFrame.originX) / this.sceneMetrics.scale,
      -0.8,
      0.8,
    );
  }
  private release() {
    if (!this.dragging) return;
    this.previous = { ...this.params };
    this.params = {
      ...this.params,
      A: Math.abs(this.dragX),
      phi: this.dragX < 0 ? Math.PI : 0,
      x0: this.dragX,
      v0: 0,
    };
    this.dragging = false;
    this.time = 0;
    this.moment = "";
    this.persist();
    if (this.params.A > 0 || this.params.model === "driven") this.play();
  }
  private keyDrag(event: KeyboardEvent) {
    if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) {
      event.preventDefault();
      const x = this.state.x;
      this.pause();
      this.time = 0;
      this.dragging = true;
      this.dragX =
        event.key === "Home"
          ? 0
          : clamp(
              x +
                (event.key === "ArrowRight" ? 1 : -1) *
                  (event.shiftKey ? 0.05 : 0.02),
              -0.8,
              0.8,
            );
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.release();
    }
  }
  private beginPhaseDrag(event: PointerEvent) {
    if (this.dragging || this.params.A === 0 || !this.phasor) return;
    this.pause();
    this.phaseDragging = true;
    (event.currentTarget as SVGCircleElement).setPointerCapture(
      event.pointerId,
    );
    this.movePhaseDrag(event);
  }
  private movePhaseDrag(event: PointerEvent) {
    if (!this.phaseDragging) return;
    const matrix = this.renderRoot
      .querySelector<SVGSVGElement>(".scene")
      ?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    const dx = point.x - sceneFrame.originX;
    const dy = sceneFrame.originY - point.y;
    if (Math.hypot(dx, dy) < 8) return;
    this.time = timeAtPhase(this.params, Math.atan2(dy, dx), this.time);
    this.moment = "";
  }
  private endPhaseDrag() {
    this.phaseDragging = false;
    this.persist();
  }
  private keyPhase(event: KeyboardEvent) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
        event.key,
      )
    )
      return;
    event.preventDefault();
    this.pause();
    const step = ((event.shiftKey ? 15 : 5) * Math.PI) / 180;
    const angle = phaseAt(this.params, this.time);
    const phase =
      event.key === "Home"
        ? 0
        : angle +
          (["ArrowRight", "ArrowUp"].includes(event.key) ? step : -step);
    this.time = timeAtPhase(this.params, phase, this.time);
    this.moment = "";
    this.persist();
  }
  scene() {
    return renderScene({
      params: this.effectiveParameters,
      time: this.dragging ? 0 : this.time,
      state: this.state,
      locale: this.locale,
      velocity: this.velocity,
      acceleration: this.acceleration,
      phasor: this.phasor && this.params.model === "ideal",
      scale: this.sceneMetrics.scale,
      peaks: this.sceneMetrics,
      phasePointerDown: (event) => this.beginPhaseDrag(event),
      phasePointerMove: (event) => this.movePhaseDrag(event),
      phaseRelease: () => this.endPhaseDrag(),
      phaseKeyboard: (event) => this.keyPhase(event),
      pointerDown: (event) => this.beginDrag(event),
      pointerMove: (event) => this.moveDrag(event),
      release: () => this.release(),
      cancel: () => {
        this.dragging = false;
        this.persist();
      },
      keyboard: (event) => this.keyDrag(event),
    });
  }
  private get observationModes(): Snapshot["mode"][] {
    return this.params.model === "driven"
      ? ["motion", "changes", "energy", "resonance"]
      : ["motion", "changes", "energy"];
  }
  parameter(
    name: Exclude<keyof Parameters, "model">,
    label: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) {
    return html`<div class="parameter">
      <label for=${name}
        ><span
          >${label}
          <span class="muted"
            >${({ phi: "φ", zeta: "ζ", ratio: "Ω/ω₀", x0: "x₀", v0: "v₀", force: "F₀" } as Record<string, string>)[name] ?? name}</span
          ></span
        ><span class="val"
          >${format(this.params[name], name === "k" ? 0 : 2)} ${unit}</span
        ></label
      ><phy-slider
        id=${name}
        label=${label}
        min=${min}
        max=${max}
        step=${step}
        .value=${this.params[name]}
        @input=${(e: Event) => {
          if (!this.editing) {
            this.pause();
            this.previous = { ...this.params };
            this.editing = true;
          }
          this.params = parameters({
            ...this.params,
            [name]: Number((e.target as SliderElement).value),
          });
          this.time = 0;
          this.moment = "";
        }}
        @change=${() => {
          this.editing = false;
          this.persist();
        }}
      ></phy-slider>
      <div class="limits mono">
        <span>${min} ${unit}</span
        ><span>${name === "phi" ? "2π" : max} ${unit}</span>
      </div>
    </div>`;
  }
  locate(moment: "right" | "left" | "equilibrium" | "equal") {
    this.pause();
    this.dragging = false;
    const time = momentTime(
      this.params,
      moment,
      this.params.model === "ideal" ? 0 : this.time,
    );
    if (time === null) this.moment = "unavailable";
    else {
      this.time = time;
      this.moment = moment;
    }
    this.persist();
  }
  seek = (time: number) => {
    this.pause();
    this.dragging = false;
    this.time = time;
    this.moment = "";
    this.persist();
  };
  private metricKey = "";
  private metricCache = {
    extent: 0.8,
    scale: 300,
    velocity: 1,
    acceleration: 1,
  };
  get sceneMetrics() {
    const p = this.effectiveParameters,
      { start, end } = timeWindow(p, this.dragging ? 0 : this.time);
    const key = JSON.stringify([p, start]);
    if (key !== this.metricKey) {
      let extent = 0.8,
        velocity = 0.01,
        acceleration = 0.01;
      for (let i = 0; i <= 240; i++) {
        const s = motionAt(p, start + ((end - start) * i) / 240);
        extent = Math.max(extent, Math.abs(s.x) * 1.08);
        velocity = Math.max(velocity, Math.abs(s.v));
        acceleration = Math.max(acceleration, Math.abs(s.a));
      }
      this.metricKey = key;
      this.metricCache = {
        extent,
        scale: 240 / extent,
        velocity,
        acceleration,
      };
    }
    return this.metricCache;
  }
  changeModel(model: PhysicalModel) {
    if (model === this.params.model) return;
    this.pause();
    this.dragging = false;
    this.editing = false;
    this.previous = { ...this.params };
    this.params = parameters({ ...this.params, model });
    this.time = 0;
    this.moment = "";
    this.parameterTab = "structure";
    this.activeChallenge = null;
    this.supportTab = "formula";
    if (this.mode === "resonance" && model !== "driven") this.mode = "motion";
    this.persist();
  }
  parameterPanel() {
    const p = this.params,
      t = texts(this.locale),
      l = labTexts(this.locale),
      c = coefficients(p);
    const inputs =
      p.model === "ideal"
        ? html`${this.parameter("A", t.amplitude, 0, 0.8, 0.01, "m")}${this.parameter("m", t.mass, 0.2, 5, 0.1, "kg")}${this.parameter("k", t.stiffness, 1, 50, 1, "N/m")}${this.parameter("phi", t.phase, 0, TAU, 0.01, "rad")}`
        : this.parameterTab === "initial"
          ? html`${this.parameter("x0", l.x0, -0.8, 0.8, 0.01, "m")}${this.parameter("v0", l.v0, -3, 3, 0.05, "m/s")}
              <p class="parameter-note">${l.helpIntro}</p>`
          : this.parameterTab === "drive" && p.model === "driven"
            ? html`${this.parameter("force", l.force, 0, 5, 0.05, "N")}${this.parameter("ratio", l.ratio, 0, 3, 0.005, "")}
                <div class="derived-row">
                  <span>${l.drivingFrequency}</span
                  ><span>${format(c.frequency)} rad/s</span>
                </div>
                ${p.ratio === 0 ? html`<p class="parameter-note">${l.zeroDrive}</p>` : ""}`
            : html`${this.parameter("m", t.mass, 0.2, 5, 0.1, "kg")}${this.parameter("k", t.stiffness, 1, 50, 1, "N/m")}${this.parameter("zeta", l.zeta, 0, 2, 0.01, "")}
                <div class="presets" role="group" aria-label=${l.preset}>
                  ${(
                    [
                      [0.15, l.shortUnder],
                      [1, l.critical],
                      [2, l.shortOver],
                    ] as const
                  ).map(
                    ([value, label]) =>
                      html`<button
                        class=${p.zeta === value ? "selected" : ""}
                        @click=${() => this.setParameter("zeta", value)}
                      >
                        ${label}
                      </button>`,
                  )}
                </div>
                <div class="derived-row">
                  <span>${l.damping}</span><span>${format(c.b)} N·s/m</span>
                </div>`;
    return html`${inputs}
      <div class="derived">
        ${[
          [
            p.model === "ideal" ? t.omega : l.natural,
            `${format(c.omega)} rad/s`,
          ],
          [
            p.model === "ideal" ? t.period : l.naturalPeriod,
            `${format(TAU / c.omega)} s`,
          ],
        ].map(
          ([label, value]) =>
            html`<div class="derived-row">
              <span>${label}</span><span>${value}</span>
            </div>`,
        )}
      </div>`;
  }
  private editFrequency = (ratio: number) => {
    if (!this.editing) {
      this.pause();
      this.previous = { ...this.params };
      this.editing = true;
    }
    this.params = parameters({
      ...this.params,
      ratio: Math.round(ratio * 1000) / 1000,
    });
    this.time = 0;
    this.moment = "";
  };
  private commitFrequency = () => {
    this.editing = false;
    this.persist();
  };
  resonancePanel() {
    const p = this.params,
      l = labTexts(this.locale),
      r = responseAt(p),
      peak = resonanceRatio(p);
    return html`<phy-radio-group
        class="energy-tabs"
        variant="segmented"
        label=${l.responseType}
        .value=${this.responseView}
        .options=${[
          { value: "amplitude", label: l.amplitudeResponse },
          { value: "phase", label: l.phaseResponse },
        ]}
        @change=${(event: Event) => {
          this.responseView = (event.currentTarget as RadioGroupElement)
            .value as ResponseView;
          this.persist();
        }}
      ></phy-radio-group>
      <label class="response-frequency"
        ><span>${l.ratio}<b class="mono">${format(p.ratio, 3)}</b></span
        ><phy-slider
          min="0"
          max="3"
          step=".001"
          .value=${p.ratio}
          label=${l.sweepFrequency}
          @input=${(e: Event) => this.editFrequency(Number((e.target as SliderElement).value))}
          @change=${this.commitFrequency}
        ></phy-slider
      ></label>
      <div class="chart-stack">
        ${responseChart(p, this.responseView, this.locale, this.chartHeight, this.editFrequency, this.commitFrequency)}
      </div>
      <div class="response-values">
        <div>
          <small>${l.steadyAmplitude}</small
          ><strong
            >${r.amplitude === null ? l.noSteady : format(r.amplitude, 3) + " m"}</strong
          >
        </div>
        <div>
          <small>${l.phaseLag}</small
          ><strong
            >${r.phase === null ? l.noPhase : format((r.phase * 180) / Math.PI, 1) + "°"}</strong
          >
        </div>
      </div>
      <p class="response-peak">
        ${l.peakFrequency}: ${peak === null ? l.noPeak : format(peak, 3)}
      </p>
      <p class="observation-note">
        ${r.amplitude === null ? l.resonanceHint : p.force === 0 ? l.driveZero : p.zeta === 0 ? l.undampedResponse : l.transient}
      </p>
      <p class="response-hint">${l.responseHint}</p>`;
  }
  plotPanel() {
    if (this.mode === "resonance") return this.resonancePanel();
    const t = texts(this.locale),
      l = labTexts(this.locale),
      p = this.effectiveParameters,
      s = this.state;
    const time = this.dragging ? 0 : this.time;
    const labels: Record<Metric, string> = {
      x: t.position,
      v: l.velocityValue,
      a: l.accelerationValue,
      kinetic: t.kinetic,
      potential: t.potential,
      total: p.model === "ideal" ? t.total : l.mechanical,
      dissipated: l.dissipated,
      work: l.work,
    };
    const keys: Metric[] =
      this.mode === "motion"
        ? ["x"]
        : this.mode === "changes"
          ? ["x", "v", "a"]
          : this.energyView === "balance" && p.model !== "ideal"
            ? ["total", "dissipated", "work"]
            : ["kinetic", "potential", "total"];
    const plot = (metrics: Metric[], label: string, unit: string) =>
      chart(
        p,
        this.previous,
        time,
        metrics,
        label,
        unit,
        this.seek,
        this.chartHeight,
      );
    const ratio = s.total > 0 ? s.kinetic / s.total : 0;
    return html`<div class="plot-top">
        ${
          this.mode !== "motion"
            ? html`<div class="toggles">
                ${keys.map(
                  (key) =>
                    html`<phy-checkbox
                      .checked=${this.curves[key]}
                      @change=${(e: Event) => {
                        this.curves = {
                          ...this.curves,
                          [key]: (e.target as CheckboxElement).checked,
                        };
                        this.persist();
                      }}
                      >${labels[key]}</phy-checkbox
                    >`,
                )}
              </div>`
            : ""
        }<span class="mono plot-time">t = ${format(time)} s</span>
      </div>
      ${
        this.mode === "energy" && p.model !== "ideal"
          ? html`<phy-radio-group
              class="energy-tabs"
              variant="segmented"
              label=${l.balance}
              .value=${this.energyView}
              .options=${[
                { value: "split", label: t.energy },
                { value: "balance", label: l.balance },
              ]}
              @change=${(event: Event) => {
                this.energyView = (event.currentTarget as RadioGroupElement)
                  .value as typeof this.energyView;
                this.persist();
              }}
            ></phy-radio-group>`
          : ""
      }
      <div class=${"chart-stack " + this.mode}>
        ${
          this.mode === "changes"
            ? keys
                .filter((key) => this.curves[key])
                .map((key) =>
                  plot(
                    [key],
                    labels[key],
                    key === "x" ? "m" : key === "v" ? "m/s" : "m/s²",
                  ),
                )
            : plot(
                keys.filter((key) => this.curves[key]),
                this.mode === "energy" ? t.energy : t.position,
                this.mode === "energy" ? "J" : "m",
              )
        }
      </div>
      ${
        this.mode === "energy"
          ? html`<div class="energy-values">
                ${keys.map(
                  (key) =>
                    html`<div>
                      <small>${labels[key]}</small
                      ><strong
                        >${format(s[key], 3)}<span class="unit">J</span></strong
                      >
                    </div>`,
                )}
              </div>
              <div class="energy-bar" aria-label=${l.split}>
                <div
                  style=${`width:${ratio * 100}%;background:var(--green)`}
                ></div>
                <div
                  style=${`width:${s.total > 0 ? (1 - ratio) * 100 : 0}%;background:var(--blue)`}
                ></div>
              </div>
              <div class="energy-caption">
                <span>${t.kinetic} ${format(ratio * 100, 0)}%</span
                ><span
                  >${t.potential}
                  ${format(s.total > 0 ? (1 - ratio) * 100 : 0, 0)}%</span
                >
              </div>`
          : this.mode === "motion"
            ? html`<div class="mini-stats">
                <span
                  >${p.model === "ideal" ? t.amplitude : l.x0}
                  <b class="mono"
                    >${format(p.model === "ideal" ? p.A : p.x0)} m</b
                  ></span
                ><span
                  >${p.model === "ideal" ? t.period : l.naturalPeriod}
                  <b class="mono">${format(s.period)} s</b></span
                >
              </div>`
            : ""
      }
      <p class="observation-note">
        ${this.mode === "energy" ? (p.model === "ideal" ? t.energyExplain : l.energyExplain) : this.mode === "changes" ? (p.model === "ideal" ? t.velocityExplain : l.changesExplain) : l.motionExplain}
      </p>
      ${
        this.previous
          ? html`<div class="compare">
              <span>┄ ${l.previous}</span
              ><button
                @click=${() => {
                  this.previous = null;
                  this.persist();
                }}
              >
                ${t.clearCompare}
              </button>
            </div>`
          : ""
      }`;
  }
  dynamicEquations() {
    const p = this.params,
      l = labTexts(this.locale);
    const formula =
      this.mode === "resonance"
        ? this.responseView === "amplitude"
          ? String.raw`X=\frac{F_0/k}{\sqrt{(1-r^2)^2+(2\zeta r)^2}}`
          : String.raw`\delta=\operatorname{atan2}(2\zeta r,1-r^2)`
        : this.mode === "energy"
          ? String.raw`E_k+E_p+E_d=E_0+W`
          : String.raw`m\ddot{x}+b\dot{x}+kx=${p.model === "driven" ? String.raw`F_0\cos(\Omega t)` : "0"}`;
    return html`<section class="theory">
      <div class="equation"><phy-math .source=${formula}></phy-math></div>
      <p class="explanation">
        ${this.mode === "energy" ? l.energyExplain : p.model === "driven" ? l.drivenExplain : l.dampingExplain}
      </p>
    </section>`;
  }
  private syncHelp() {
    if (!this.helpOpen) {
      this.helpHandle?.close();
      return;
    }
    const l = labTexts(this.locale);
    const root =
      this.helpContent.shadowRoot ??
      this.helpContent.attachShadow({ mode: "open" });
    render(
      html`<style>
          :host {
            color: var(--muted);
          }
          p {
            margin: 0 0 16px;
          }
          .derivation-steps {
            display: grid;
            gap: 20px;
            margin-top: 24px;
            font-size: 15px;
          }
        </style>
        <p>${l.helpIntro}</p>
        <p>${l.helpDamping}</p>
        <p>${l.helpDriven}</p>
        <p>${l.phasorOnly}</p>
        <div class="derivation-steps">
          ${[String.raw`m\ddot{x}+b\dot{x}+kx=F_0\cos(\Omega t)`, String.raw`\omega_0=\sqrt{k/m},\quad \zeta=\frac{b}{2\sqrt{mk}}`, String.raw`T_0=2\pi\sqrt{m/k}`, String.raw`X=\frac{F_0/k}{\sqrt{(1-r^2)^2+(2\zeta r)^2}},\quad r=\Omega/\omega_0`].map((source) => html`<div><phy-math .source=${source}></phy-math></div>`)}
        </div> `,
      root,
    );
    if (this.helpHandle) this.helpHandle.update({ title: l.help });
    else {
      const handle = this.context.dialog.open({
        title: l.help,
        content: this.helpContent,
        width: "md",
        returnFocus:
          this.renderRoot.querySelector<HTMLElement>(
            ".parameter-footer button",
          ) ?? undefined,
      });
      this.helpHandle = handle;
      void handle.closed.then(() => {
        if (this.helpHandle === handle) {
          this.helpHandle = undefined;
          this.helpOpen = false;
        }
      });
    }
  }
  equations() {
    const t = texts(this.locale),
      zh = this.locale === "zh-CN",
      p = this.effectiveParameters,
      s = this.state;
    if (p.model !== "ideal") return this.dynamicEquations();
    const formulas =
      this.mode === "motion"
        ? [[String.raw`x = A\cos(\omega t + \varphi)`, "var(--blue)"]]
        : this.mode === "changes"
          ? [
              [
                String.raw`v = -A\omega\sin(\omega t + \varphi)`,
                "var(--green)",
              ],
              [String.raw`a = -\omega^2 x`, "var(--red)"],
            ]
          : [
              [String.raw`E_{\mathrm{k}} = \frac{1}{2}mv^2`, "var(--green)"],
              [String.raw`E_{\mathrm{p}} = \frac{1}{2}kx^2`, "var(--blue)"],
            ];
    return html`<section class="theory">
      <div class="formula-main">
        <div class="equation">
          ${formulas.map(([source, color]) => html`<span style=${"color:" + color}><phy-math .source=${source}></phy-math></span>`)}
        </div>
        ${this.mode === "energy" ? html`<div class="conservation"><phy-math .source=${String.raw`E = E_{\mathrm{k}} + E_{\mathrm{p}} = \frac{1}{2}kA^2`}></phy-math></div>` : ""}
        <p class="explanation">
          ${this.mode === "motion" ? t.positionExplain : this.mode === "changes" ? t.velocityExplain : t.energyExplain}
        </p>
      </div>
      <button class="derivation" @click=${() => (this.helpOpen = true)}>
        ${t.derive}
      </button>
    </section>`;
  }
  moments() {
    const t = texts(this.locale);
    const hint =
      this.params.model !== "ideal"
        ? this.moment === "unavailable"
          ? labTexts(this.locale).noMoment
          : this.moment
            ? labTexts(this.locale).momentHint
            : ""
        : this.params.A === 0
          ? t.zero
          : this.moment === "right"
            ? t.rightHint
            : this.moment === "left"
              ? t.leftHint
              : this.moment === "equilibrium"
                ? t.centerHint
                : this.moment === "equal"
                  ? t.equalHint
                  : "";
    return html`<section class="moments">
      <h2 class="section-title">${t.moments}</h2>
      <div class="moment-buttons">
        ${[
          ["right", t.right],
          [
            "equilibrium",
            this.params.model === "driven"
              ? labTexts(this.locale).crossZero
              : t.center,
          ],
          ["left", t.left],
          ["equal", t.equal],
        ].map(
          ([key, label]) =>
            html`<button
              class=${this.moment === key ? "selected" : ""}
              @click=${() => this.locate(key as "right" | "equilibrium" | "left" | "equal")}
            >
              ${label}
            </button>`,
        )}
      </div>
      ${hint ? html`<p class="moment-hint" title=${hint}>${hint}</p>` : ""}
      <div class="toggles">
        <div class="toggle-group">
          <phy-checkbox
            .checked=${this.velocity}
            @change=${(e: Event) => {
              this.velocity = (e.target as CheckboxElement).checked;
              this.persist();
            }}
            >${t.velocity}</phy-checkbox
          ><phy-checkbox
            .checked=${this.acceleration}
            @change=${(e: Event) => {
              this.acceleration = (e.target as CheckboxElement).checked;
              this.persist();
            }}
            >${t.acceleration}</phy-checkbox
          >
        </div>
      </div>
    </section>`;
  }
  private startChallenge(index: ChallengeIndex) {
    this.pause();
    this.dragging = false;
    if (index === 2) this.restart();
    this.mode = index === 1 ? "energy" : "motion";
    this.completedTasks = this.completedTasks.map((done, i) =>
      i === index ? false : done,
    );
    this.activeChallenge = { index, baseline: { ...this.params } };
    this.persist();
  }
  tasks() {
    const t = texts(this.locale),
      zh = this.locale === "zh-CN";
    const state = this.state;
    return html`<div class="task-grid">
      ${([0, 1, 2] as const).map((index) => {
        const active = this.activeChallenge?.index === index;
        const baseline = active ? this.activeChallenge!.baseline : this.params;
        const target = 2 * stateAt(parameters(baseline), 0).period;
        const unavailable =
          this.dragging ||
          this.params.A === 0 ||
          (index === 0 && this.params.m > 1.25);
        const status = active
          ? index === 0
            ? zh
              ? `目标 T = ${format(target)} s · 当前 ${format(state.period)} s`
              : `Target T = ${format(target)} s · Current ${format(state.period)} s`
            : index === 1
              ? zh
                ? `目标各占 50% · 当前动能 ${state.total > 0 ? format((state.kinetic / state.total) * 100, 0) : "0"}%`
                : `Target 50% each · Current kinetic ${state.total > 0 ? format((state.kinetic / state.total) * 100, 0) : "0"}%`
              : zh
                ? `初始位移 ${format(stateAt(this.params, 0).x, 3)} m · 请在 t = 0 调整初相位`
                : `Initial position ${format(stateAt(this.params, 0).x, 3)} m · Adjust phase at t = 0`
          : this.params.A === 0
            ? zh
              ? "先设置非零振幅"
              : "Set a nonzero amplitude first"
            : index === 0 && this.params.m > 1.25
              ? zh
                ? "先将质量调至不超过 1.25 kg，再记录基准"
                : "Set mass to at most 1.25 kg before recording the baseline"
              : zh
                ? "开始后记录当前参数作为基准"
                : "Starting records the current parameters as a baseline";
        const requirements = [
          t.challenge1Hint,
          t.challenge2Hint,
          t.challenge3Hint,
        ];
        const answers = [t.answer1, t.answer2, t.answer3];
        const titles = [t.task1, t.task2, t.task3];
        return html`<article
          class=${"task" + (this.completedTasks[index] ? " completed" : active ? " active-task" : "")}
        >
          <h3 class="task-title">
            ${this.completedTasks[index] ? html`<span class="task-check">✓</span> ${zh ? "探索完成" : "Completed"}` : titles[index]}
          </h3>
          <p class="task-description">
            ${this.completedTasks[index] ? answers[index] : requirements[index]}
          </p>
          <div class="task-status">
            ${this.completedTasks[index] ? (zh ? "已达到目标并验证" : "Target reached and verified") : status}
          </div>
          <div class="task-actions">
            <button
              ?disabled=${this.completedTasks[index] ? this.dragging : unavailable}
              @click=${() => {
                if (this.completedTasks[index]) {
                  this.completedTasks = this.completedTasks.map((done, i) =>
                    i === index ? false : done,
                  );
                  if (this.activeChallenge?.index === index)
                    this.activeChallenge = null;
                  this.persist();
                } else this.startChallenge(index);
              }}
            >
              ${this.completedTasks[index] ? (zh ? "重新探索" : "Try again") : active ? (zh ? "重设基准" : "Reset baseline") : zh ? "开始探索" : "Start challenge"}
            </button>
            ${active ? html`<span>${zh ? "进行中" : "In progress"}</span>` : ""}
          </div>
        </article>`;
      })}
    </div>`;
  }
  supportPanel() {
    const zh = this.locale === "zh-CN";
    return html`<phy-tabs
      class="panel support support-tabs"
      variant="segmented"
      label=${zh ? "公式与探索" : "Equations and exploration"}
      .value=${this.supportTab}
      .items=${[
        { value: "formula", label: zh ? "公式" : "Equations" },
        { value: "tasks", label: texts(this.locale).tasks },
      ]}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.supportTab = (event.currentTarget as TabsElement)
          .value as typeof this.supportTab;
        this.persist();
      }}
    >
      <div id="support-content" slot=${this.supportTab}>
        ${this.supportTab === "formula" ? this.equations() : this.params.model === "ideal" ? this.tasks() : html`<p class="explore-copy">${this.params.model === "damped" ? labTexts(this.locale).dampingTasks : labTexts(this.locale).drivenTasks}</p>`}
      </div>
    </phy-tabs>`;
  }
  render() {
    const t = texts(this.locale),
      l = labTexts(this.locale),
      s = this.state,
      p = this.effectiveParameters;
    const { start, end } = timeWindow(p, this.time);
    const ideal = p.model === "ideal";
    return html`<div class="heading">
        <div class="heading-copy">
          <h1>${t.title}</h1>
          <p class="intro">
            ${ideal ? t.model : p.model === "damped" ? l.dampingModel : l.drivenModel}
          </p>
        </div>
        <phy-radio-group
          class="model-switch"
          variant="segmented"
          label=${l.physicalModel}
          .value=${p.model}
          .options=${(["ideal", "damped", "driven"] as const).map((value) => ({ value, label: l[value] }))}
          @change=${(event: Event) => this.changeModel((event.currentTarget as RadioGroupElement).value as PhysicalModel)}
        ></phy-radio-group>
      </div>
      <div class="lab-grid bench">
        <phy-box role="complementary" class="panel parameters">
          <div class="panel-heading">
            ${t.parameters}<span
              class=${"status " + (this.playing ? "running" : "")}
              >${this.dragging ? t.holding : this.playing ? t.play : t.pause}</span
            >
          </div>
          ${
            ideal
              ? html`<div class="parameter-body">${this.parameterPanel()}</div>`
              : html` <phy-tabs
                  class="parameter-tabs"
                  variant="segmented"
                  label=${l.parameterGroup}
                  .value=${this.parameterTab}
                  .items=${(["structure", "initial", ...(p.model === "driven" ? ["drive" as const] : [])] as const).map((value) => ({ value, label: l[value] }))}
                  @change=${(event: Event) => {
                    if (event.target !== event.currentTarget) return;
                    this.parameterTab = (event.currentTarget as TabsElement)
                      .value as typeof this.parameterTab;
                    this.persist();
                  }}
                >
                  <div class="parameter-body" slot=${this.parameterTab}>
                    ${this.parameterPanel()}
                  </div>
                </phy-tabs>`
          }
          <div class="parameter-footer">
            <button @click=${() => (this.helpOpen = true)}>${l.help}</button
            ><small>${ideal ? t.conserved : l[regime(p)]}</small>
          </div>
        </phy-box>
        <phy-box class="panel stage">
          <div class="scene-header">
            <phy-switch
              class="phasor-toggle"
              title=${ideal ? t.projection : l.phasorOnly}
              ?disabled=${!ideal}
              .checked=${ideal && this.phasor}
              @change=${(event: Event) => {
                this.phasor = (event.target as CheckboxElement).checked;
                this.phaseDragging = false;
                this.persist();
              }}
              ><span>${t.phasor}</span></phy-switch
            >
            <span class="mono phase-readout"
              >${ideal ? `θ = ${format((phaseAt(p, this.dragging ? 0 : this.time) / TAU) * 360, 1)}°` : `${l.displacementRange} ±${format(this.sceneMetrics.extent)} m`}</span
            >
          </div>
          <div class="scene-wrap">
            <div class="scene-instruction">
              ${this.dragging ? t.holding : t.drag}
            </div>
            ${this.scene()}
            <div class="scene-scale mono">
              ${ideal ? (p.A === 0 ? t.zero : this.phasor ? t.projection : "−A ← 0 → +A") : l.finiteScene}
            </div>
          </div>
          ${!ideal ? html`<div class="force-readouts mono" aria-label=${l.forces}><span>${l.springForce} ${format(s.springForce)} N</span><span>${l.dampingForce} ${format(s.dampingForce)} N</span>${p.model === "driven" ? html`<span>${l.drivingForce} ${format(s.drivingForce)} N</span>` : ""}</div>` : ""}
          <div class="readouts">
            ${[
              [t.position, s.x, "m", "var(--blue)"],
              [l.velocityValue, s.v, "m/s", "var(--green)"],
              [l.accelerationValue, s.a, "m/s²", "var(--red)"],
            ].map(
              ([label, value, unit, color]) =>
                html`<div class="readout">
                  <div class="label">${label}</div>
                  <span class="value" style=${"color:" + color}
                    >${format(Number(value), 3)}</span
                  ><span class="unit">${unit}</span>
                </div>`,
            )}
          </div>
          ${this.context.toolbar ? "" : this.playbackButtons()}
          <div class="timeline">
            <span>${format(start, 1)}s</span
            ><phy-slider
              min=${start}
              max=${end}
              step=".001"
              .value=${this.time}
              label=${t.timeline}
              @input=${(e: Event) => this.seek(Number((e.target as SliderElement).value))}
            ></phy-slider
            ><span>${format(end, 1)}s</span
            ><span class="time-label" aria-label=${t.time}
              >t = ${format(this.time)} s</span
            >
          </div>
          ${this.moments()}
        </phy-box>
        <phy-box
          role="complementary"
          class=${"panel observation" + (this.supportTab === "tasks" ? " exploring" : "")}
        >
          <phy-tabs
            class="observation-tabs"
            label=${t.show}
            .value=${this.mode}
            .items=${this.observationModes.map((value) => ({ value, label: value === "motion" ? t.motion : value === "changes" ? t.changes : value === "energy" ? t.energy : l.resonance }))}
            @activate=${(event: Event) => {
              if (event.target !== event.currentTarget) return;
              this.mode = (event.currentTarget as TabsElement)
                .value as typeof this.mode;
              this.supportTab = "formula";
              this.persist();
            }}
          >
            <div
              class="plot"
              slot=${this.mode}
              ?hidden=${this.supportTab === "tasks"}
            >
              ${this.plotPanel()}
            </div>
          </phy-tabs>
          ${this.supportPanel()}
        </phy-box>
      </div> `;
  }
}

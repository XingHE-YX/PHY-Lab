import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/contract";
import {
  parameters,
  defaults,
  stateAt,
  format,
  clamp,
  TAU,
  keyTime,
  type Parameters,
  type PhysicsState,
} from "./model/physics";
import { chart, type Metric } from "./components/chart";
import { renderScene } from "./components/scene";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import {
  meetsChallenge,
  type Challenge,
  type ChallengeIndex,
} from "./model/exploration";
import { math, mathStyles } from "./components/math";
export interface Snapshot {
  params: Parameters;
  time: number;
  speed: number;
  mode: string;
  velocity: boolean;
  acceleration: boolean;
  previous: Parameters | null;
  curves: Record<Metric, boolean>;
  exploration?: {
    version: 1;
    completed: boolean[];
    active: Challenge | null;
  };
}
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
    mode: { state: true },
    previous: { state: true },
    moment: { state: true },
    curves: { state: true },
    supportTab: { state: true },
    completedTasks: { state: true },
    activeChallenge: { state: true },
  };
  static styles = [mathStyles, styles];
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
  declare mode: string;
  declare previous: Parameters | null;
  declare moment: string;
  declare curves: Record<Metric, boolean>;
  context!: ExperimentContext;
  private toolbarControls?: HTMLDivElement;
  private frame = 0;
  private last = 0;
  private editing = false;
  constructor() {
    super();
    this.completedTasks = [false, false, false];
    this.activeChallenge = null;
    this.supportTab = "formula";
    this.locale = "zh-CN";
    this.params = { ...defaults };
    this.time = 0;
    this.playing = false;
    this.speed = 1;
    this.dragging = false;
    this.dragX = 0;
    this.velocity = true;
    this.acceleration = true;
    this.mode = "motion";
    this.previous = null;
    this.moment = "";
    this.curves = {
      x: true,
      v: true,
      a: true,
      kinetic: true,
      potential: true,
      total: true,
    };
  }
  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    const saved = context.storage.read<Partial<Snapshot>>({});
    if (saved.exploration?.version === 1) {
      this.completedTasks = [0, 1, 2].map(
        (index) => saved.exploration?.completed?.[index] === true,
      );
      const active = saved.exploration.active;
      if (
        active &&
        [0, 1, 2].includes(active.index) &&
        active.baseline &&
        !this.completedTasks[active.index]
      )
        this.activeChallenge = {
          index: active.index,
          baseline: parameters(active.baseline),
        };
    }
    this.params = parameters(saved?.params);
    this.time =
      typeof saved?.time === "number" && Number.isFinite(saved.time)
        ? clamp(saved.time, 0, 1e6)
        : 0;
    this.speed =
      typeof saved?.speed === "number" && [0.25, 0.5, 1].includes(saved.speed)
        ? saved.speed
        : 1;
    this.mode = ["motion", "changes", "energy"].includes(saved?.mode ?? "")
      ? saved.mode!
      : "motion";
    this.velocity = saved?.velocity !== false;
    this.acceleration = saved?.acceleration !== false;
    this.previous = saved?.previous ? parameters(saved.previous) : null;
    if (saved?.curves && typeof saved.curves === "object")
      for (const key of Object.keys(this.curves) as Metric[])
        this.curves[key] = saved.curves[key] !== false;
  }
  updated(changed: Map<PropertyKey, unknown>) {
    if (
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
      <select
        aria-label=${t.speed}
        .value=${String(this.speed)}
        style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:7px;font-size:12px"
        @change=${(event: Event) => {
          this.speed = Number((event.target as HTMLSelectElement).value);
          this.last = 0;
          this.persist();
        }}
      >
        <option value="1">1×</option>
        <option value="0.5">0.5×</option>
        <option value="0.25">0.25×</option>
      </select>`;
  }
  get effectiveParameters(): Parameters {
    return this.dragging
      ? {
          ...this.params,
          A: Math.abs(this.dragX),
          phi: this.dragX < 0 ? Math.PI : 0,
        }
      : this.params;
  }
  get state(): PhysicsState {
    return stateAt(this.effectiveParameters, this.dragging ? 0 : this.time);
  }
  snapshot(): Snapshot {
    return {
      params: { ...this.params },
      time: this.time,
      speed: this.speed,
      mode: this.mode,
      velocity: this.velocity,
      acceleration: this.acceleration,
      previous: this.previous,
      curves: this.curves,
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
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  play() {
    if (this.playing || this.dragging) return;
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
  setParameter(name: keyof Parameters, value: number) {
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
    this.dragX = clamp((point.x - 390) / 300, -0.8, 0.8);
  }
  private release() {
    if (!this.dragging) return;
    this.previous = { ...this.params };
    this.params = {
      ...this.params,
      A: Math.abs(this.dragX),
      phi: this.dragX < 0 ? Math.PI : 0,
    };
    this.dragging = false;
    this.time = 0;
    this.moment = "";
    this.persist();
    if (this.params.A > 0) this.play();
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
  scene() {
    return renderScene({
      params: this.effectiveParameters,
      time: this.dragging ? 0 : this.time,
      state: this.state,
      locale: this.locale,
      velocity: this.velocity,
      acceleration: this.acceleration,
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
  private tabKeys = async (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const modes = ["motion", "changes", "energy"];
    let index = modes.indexOf(this.mode);
    index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 2
          : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    this.mode = modes[index];
    this.persist();
    await this.updateComplete;
    this.renderRoot
      .querySelectorAll<HTMLButtonElement>("[role=tab]")
      [index]?.focus();
  };
  parameter(
    name: keyof Parameters,
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
          <span class="muted">${name === "phi" ? "φ" : name}</span></span
        ><span class="val"
          >${format(this.params[name], name === "k" ? 0 : 2)} ${unit}</span
        ></label
      ><input
        id=${name}
        aria-label=${label}
        type="range"
        min=${min}
        max=${max}
        step=${step}
        .value=${String(this.params[name])}
        @input=${(e: Event) => {
          if (!this.editing) {
            this.pause();
            this.previous = { ...this.params };
            this.editing = true;
          }
          this.params = parameters({
            ...this.params,
            [name]: Number((e.target as HTMLInputElement).value),
          });
          this.time = 0;
          this.moment = "";
        }}
        @change=${() => {
          this.editing = false;
          this.persist();
        }}
      />
      <div class="limits mono">
        <span>${min} ${unit}</span
        ><span>${name === "phi" ? "2π" : max} ${unit}</span>
      </div>
    </div>`;
  }
  locate(moment: "right" | "left" | "equilibrium" | "equal") {
    this.pause();
    this.dragging = false;
    this.time = keyTime(this.params, moment);
    this.moment = moment;
    this.persist();
  }
  seek = (time: number) => {
    this.pause();
    this.dragging = false;
    this.time = time;
    this.moment = "";
    this.persist();
  };
  plotPanel() {
    const t = texts(this.locale),
      p = this.effectiveParameters,
      s = this.state,
      time = this.dragging ? 0 : this.time;
    const labels: Record<Metric, string> = {
      x: t.position,
      v: this.locale === "zh-CN" ? "速度" : "Velocity",
      a: this.locale === "zh-CN" ? "加速度" : "Acceleration",
      kinetic: t.kinetic,
      potential: t.potential,
      total: t.total,
    };
    const keys: Metric[] =
      this.mode === "motion"
        ? ["x"]
        : this.mode === "changes"
          ? ["x", "v", "a"]
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
        this.mode === "changes" ? 146 : 210,
      );
    const ratio = s.total > 0 ? s.kinetic / s.total : 0;
    return html`<div class="plot-top">
        ${
          this.mode !== "motion"
            ? html`<div class="toggles">
                ${keys.map(
                  (key) =>
                    html`<label
                      ><input
                        type="checkbox"
                        .checked=${this.curves[key]}
                        @change=${(event: Event) => {
                          this.curves = {
                            ...this.curves,
                            [key]: (event.target as HTMLInputElement).checked,
                          };
                          this.persist();
                        }}
                      />${this.locale === "en" && this.mode === "energy" ? (key === "kinetic" ? "Kinetic" : key === "potential" ? "Potential" : "Total") : labels[key]}</label
                    >`,
                )}
              </div>`
            : ""
        }
        <span class="mono plot-time">t = ${format(time)} s</span>
      </div>
      ${
        this.mode === "motion"
          ? html`${plot(["x"], t.position, "m")}
              <div class="mini-stats">
                <div class="mini-stat">
                  <small>${t.amplitude} A</small
                  ><strong>${format(p.A)} <span class="unit">m</span></strong>
                </div>
                <div class="mini-stat">
                  <small>${t.period} T</small
                  ><strong
                    >${format(s.period)} <span class="unit">s</span></strong
                  >
                </div>
              </div>`
          : this.mode === "changes"
            ? html`${this.curves.x ? plot(["x"], t.position, "m") : ""}${this.curves.v ? plot(["v"], labels.v, "m/s") : ""}${this.curves.a ? plot(["a"], labels.a, "m/s²") : ""}`
            : html`${plot(
                  keys.filter((key) => this.curves[key]),
                  this.locale === "zh-CN" ? "能量" : "Energy",
                  "J",
                )}
                <div class="energy-values">
                  ${[
                    ["kinetic", s.kinetic, "var(--green)"],
                    ["potential", s.potential, "var(--blue)"],
                    ["total", s.total, "var(--text)"],
                  ].map(
                    ([key, value, color]) =>
                      html`<div>
                        <small>${labels[key as Metric]}</small
                        ><strong style=${"color:" + color}
                          >${format(Number(value), 3)}
                          <span class="unit">J</span></strong
                        >
                      </div>`,
                  )}
                </div>
                <div class="energy-bar" aria-label=${t.energy}>
                  <div
                    style=${"width:" + ratio * 100 + "%;background:var(--green)"}
                  ></div>
                  <div
                    style=${"width:" + (s.total > 0 ? (1 - ratio) * 100 : 0) + "%;background:var(--blue)"}
                  ></div>
                </div>
                <div class="energy-caption">
                  <span
                    >${t.kinetic}
                    ${s.total > 0 ? format(ratio * 100, 0) : "0"}%</span
                  ><span
                    >${t.potential}
                    ${s.total > 0 ? format((1 - ratio) * 100, 0) : "0"}%</span
                  >
                </div>`
      }
      ${
        this.previous
          ? html`<div class="compare">
              <button
                @click=${() => {
                  this.previous = null;
                  this.persist();
                }}
              >
                ${t.clearCompare}</button
              >┄ ${t.previous}<br /><span class="mono"
                >A ${format(this.previous.A)} m · m
                ${format(this.previous.m, 1)} kg · k
                ${format(this.previous.k, 0)} N/m</span
              >
            </div>`
          : ""
      }`;
  }
  equations() {
    const t = texts(this.locale),
      zh = this.locale === "zh-CN",
      p = this.effectiveParameters,
      s = this.state;
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
    const values =
      this.mode === "motion"
        ? [
            ["x", format(s.x, 3), "m", "var(--blue)"],
            [String.raw`\omega`, format(s.omega), "rad/s", "var(--text)"],
            [String.raw`\varphi`, format(p.phi), "rad", "var(--text)"],
          ]
        : this.mode === "changes"
          ? [
              ["v", format(s.v, 3), "m/s", "var(--green)"],
              ["a", format(s.a, 3), "m/s²", "var(--red)"],
            ]
          : [
              [
                String.raw`E_{\mathrm{k}}`,
                format(s.kinetic, 3),
                "J",
                "var(--green)",
              ],
              [
                String.raw`E_{\mathrm{p}}`,
                format(s.potential, 3),
                "J",
                "var(--blue)",
              ],
              ["E", format(s.total, 3), "J", "var(--text)"],
            ];
    return html`<section class="theory">
      <div class="formula-main">
        <div class="equation">
          ${formulas.map(([source, color]) => html`<span style=${"color:" + color}>${math(source)}</span>`)}
        </div>
        ${this.mode === "energy" ? html`<div class="conservation">${math(String.raw`E = E_{\mathrm{k}} + E_{\mathrm{p}} = \frac{1}{2}kA^2`)}</div>` : ""}
        <p class="explanation">
          ${this.mode === "motion" ? t.positionExplain : this.mode === "changes" ? t.velocityExplain : t.energyExplain}
        </p>
      </div>
      <div class="formula-live">
        <div class="formula-caption">
          ${zh ? "当前数值" : "Current values"}<span class="mono"
            >t = ${format(this.dragging ? 0 : this.time)} s</span
          >
        </div>
        <div class="formula-values">
          ${values.map(([symbol, value, unit, color]) => html`<div class="formula-value"><span class="formula-symbol">${math(symbol)}</span><strong style=${"color:" + color}>${value}</strong><span class="unit">${unit}</span></div>`)}
        </div>
      </div>
      <details class="derivation">
        <summary>${zh ? "查看推导" : "View derivation"}</summary>
        <div class="derivation-steps">
          ${[
            [zh ? "回复力" : "Restoring force", String.raw`F = -kx`],
            [
              zh ? "运动方程" : "Equation of motion",
              String.raw`\ddot{x} + \frac{k}{m}x = 0`,
            ],
            [
              zh ? "角频率" : "Angular frequency",
              String.raw`\omega = \sqrt{\frac{k}{m}}`,
            ],
            [
              zh ? "周期" : "Period",
              String.raw`T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{m}{k}}`,
            ],
          ].map(
            ([label, source]) =>
              html`<div>
                <small>${label}</small>
                <div>${math(source)}</div>
              </div>`,
          )}
        </div>
      </details>
    </section>`;
  }
  moments() {
    const t = texts(this.locale);
    const hint =
      this.params.A === 0
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
          ["equilibrium", t.center],
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
          <label
            ><input
              type="checkbox"
              .checked=${this.velocity}
              @change=${(e: Event) => {
                this.velocity = (e.target as HTMLInputElement).checked;
                this.persist();
              }}
            />${t.velocity}</label
          ><label
            ><input
              type="checkbox"
              .checked=${this.acceleration}
              @change=${(e: Event) => {
                this.acceleration = (e.target as HTMLInputElement).checked;
                this.persist();
              }}
            />${t.acceleration}</label
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
        const target = 2 * stateAt(baseline, 0).period;
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
    return html`<section class="panel support">
      <div
        class="support-tabs"
        role="tablist"
        aria-label=${zh ? "公式与探索" : "Equations and exploration"}
        @keydown=${(event: KeyboardEvent) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          this.supportTab =
            event.key === "Home"
              ? "formula"
              : event.key === "End"
                ? "tasks"
                : this.supportTab === "formula"
                  ? "tasks"
                  : "formula";
          void this.updateComplete.then(() =>
            this.renderRoot
              .querySelector<HTMLButtonElement>(
                ".support-tabs [aria-selected=true]",
              )
              ?.focus(),
          );
        }}
      >
        ${(["formula", "tasks"] as const).map(
          (tab) =>
            html`<button
              role="tab"
              aria-selected=${this.supportTab === tab}
              tabindex=${this.supportTab === tab ? 0 : -1}
              aria-controls="support-content"
              class=${this.supportTab === tab ? "selected" : ""}
              @click=${() => (this.supportTab = tab)}
            >
              ${tab === "formula" ? (zh ? "公式" : "Equations") : texts(this.locale).tasks}
            </button>`,
        )}
      </div>
      <div
        id="support-content"
        role="tabpanel"
        aria-label=${this.supportTab === "formula" ? (zh ? "公式" : "Equations") : texts(this.locale).tasks}
      >
        ${this.supportTab === "formula" ? this.equations() : this.tasks()}
      </div>
    </section>`;
  }
  render() {
    const t = texts(this.locale),
      zh = this.locale === "zh-CN",
      s = this.state,
      p = this.effectiveParameters,
      duration = 2 * s.period;
    const start =
      Math.floor(Math.max(0, this.time - 1e-9) / duration) * duration;
    return html`<div class="heading">
        <div class="heading-copy">
          <h1>${t.title}</h1>
          <p class="intro">${t.subtitle}</p>
        </div>
        <div class="lab-meta">
          <span class=${"status " + (this.playing ? "running" : "")}
            ><i class="status-dot"></i
            >${this.dragging ? (zh ? "拖动中" : "HOLDING") : this.playing ? (zh ? "运行中" : "RUNNING") : zh ? "已暂停" : "PAUSED"}</span
          >
        </div>
      </div>
      <div class="lab-grid bench">
        <aside class="panel parameters">
          <div class="panel-heading">${t.parameters}<span>INPUT</span></div>
          <div class="parameter-body">
            ${this.parameter("A", t.amplitude, 0, 0.8, 0.01, "m")}${this.parameter("m", t.mass, 0.2, 5, 0.1, "kg")}${this.parameter("k", t.stiffness, 1, 50, 1, "N/m")}${this.parameter("phi", t.phase, 0, TAU, 0.01, "rad")}
            <div class="derived">
              ${[
                [t.omega, format(s.omega) + " rad/s"],
                [t.period, format(s.period) + " s"],
                [t.total, format(s.total, 3) + " J"],
              ].map(
                ([label, value]) =>
                  html`<div class="derived-row">
                    <span class="muted">${label}</span><span>${value}</span>
                  </div>`,
              )}
            </div>
          </div>
        </aside>
        <section class="panel stage">
          <div class="scene-header">
            <span>${this.dragging ? t.holding : t.drag}</span
            ><span class="mono"
              >θ =
              ${format((((s.omega * (this.dragging ? 0 : this.time) + p.phi) % TAU) / TAU) * 360, 1)}°</span
            >
          </div>
          <div class="scene-wrap">
            ${this.scene()}
            <div class="scene-scale mono">
              ${p.A === 0 ? t.zero : "−A ← 0 → +A"}
            </div>
          </div>
          <div class="readouts">
            ${[
              [t.position, s.x, "m", "var(--blue)"],
              [zh ? "速度" : "Velocity", s.v, "m/s", "var(--green)"],
              [zh ? "加速度" : "Acceleration", s.a, "m/s²", "var(--red)"],
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
            ><input
              type="range"
              min=${start}
              max=${start + duration}
              step=".001"
              .value=${String(this.time)}
              aria-label=${t.timeline}
              @input=${(e: Event) => this.seek(Number((e.target as HTMLInputElement).value))}
            /><span>${format(start + duration, 1)}s</span>
            <span class="time-label" aria-label=${t.time}
              >t = ${format(this.time)} s</span
            >
          </div>
          ${this.moments()}
        </section>
        <aside class="panel observation">
          <div
            class="tabs"
            role="tablist"
            aria-label=${zh ? "观察模式" : "Observation mode"}
            @keydown=${this.tabKeys}
          >
            ${[
              ["motion", t.motion],
              ["changes", t.changes],
              ["energy", t.energy],
            ].map(
              ([mode, label]) =>
                html`<button
                  role="tab"
                  tabindex=${mode === this.mode ? 0 : -1}
                  aria-controls="observations"
                  aria-selected=${mode === this.mode}
                  class=${mode === this.mode ? "active" : ""}
                  @click=${() => {
                    this.mode = mode;
                    this.persist();
                  }}
                >
                  ${label}
                </button>`,
            )}
          </div>
          <div
            class="plot"
            id="observations"
            role="tabpanel"
            aria-label=${this.mode === "motion" ? t.motion : this.mode === "changes" ? t.changes : t.energy}
          >
            ${this.plotPanel()}
          </div>
          <div class="observation-note">
            ${this.mode === "motion" ? (zh ? "曲线记录小球的位置。拖动时间游标，回到任意一个瞬间。" : "The curve records position. Scrub time to inspect any instant.") : this.mode === "changes" ? (zh ? "三个量共享同一时刻。端点速度为零，加速度指向平衡位置。" : "All three quantities share one instant. At endpoints velocity is zero; acceleration points toward equilibrium.") : zh ? "两种能量此消彼长。一个完整振动中，动能两次达到最大。" : "Energy changes form. Kinetic energy reaches a maximum twice in each full cycle."}
          </div>
        </aside>
      </div>
      ${this.supportPanel()}`;
  }
}

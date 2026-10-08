import { LitElement, html } from "lit";
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
import { styles } from "./styles/styles";
export interface Snapshot {
  params: Parameters;
  time: number;
  speed: number;
  mode: string;
  velocity: boolean;
  acceleration: boolean;
  previous: Parameters | null;
  curves: Record<Metric, boolean>;
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
  };
  static styles = styles;
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
  private frame = 0;
  private last = 0;
  private editing = false;
  constructor() {
    super();
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
        <span>${min} ${unit}</span><span>${max} ${unit}</span>
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
  analysis() {
    const t = texts(this.locale),
      p = this.effectiveParameters,
      s = this.state,
      time = this.dragging ? 0 : this.time;
    const labels: Record<Metric, string> = {
      x: t.position,
      v: t.velocity.replace("箭头", "").replace(" arrow", ""),
      a: t.acceleration.replace("箭头", "").replace(" arrow", ""),
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
    const ratio = s.total > 0 ? s.kinetic / s.total : 0;
    const plot = (metrics: Metric[], label: string, unit: string) =>
      chart(p, this.previous, time, metrics, label, unit, this.seek);
    return html`<div class="plot-layout">
        <section class="panel plot">
          <div class="plot-top">
            <span>${t.zoom}</span
            ><span class="mono">t = ${format(time)} s</span>
          </div>
          ${
            this.mode !== "motion"
              ? html`<div class="toggles" style="padding:10px 0;border:0">
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
                        />${labels[key]}</label
                      >`,
                  )}
                </div>`
              : ""
          }${
            this.mode === "motion"
              ? plot(["x"], t.position, "m")
              : this.mode === "changes"
                ? html`${this.curves.x ? plot(["x"], t.position, "m") : ""}${this.curves.v ? plot(["v"], labels.v, "m/s") : ""}${this.curves.a ? plot(["a"], labels.a, "m/s²") : ""}`
                : html`${plot(
                      keys.filter((key) => this.curves[key]),
                      t.energy,
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
          }${
            this.previous
              ? html`<div class="compare">
                  <span
                    >┄ ${t.previous} · A=${format(this.previous.A)} m ·
                    m=${format(this.previous.m, 1)} kg ·
                    k=${format(this.previous.k, 0)} N/m</span
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
          }
        </section>
        <aside class="panel equations">
          <div class="section-title">${t.formula}</div>
          ${
            this.mode === "motion"
              ? html`<div class="equation" style="color:var(--blue)">
                    x = A cos(ωt + φ)
                  </div>
                  <div class="subtle-box mono">
                    x = ${format(p.A)} cos(${format(s.omega)} × ${format(time)}
                    + ${format(p.phi)})<br />= ${format(s.x, 3)} m
                  </div>
                  <p class="explanation">${t.positionExplain}</p>`
              : this.mode === "changes"
                ? html`<div class="equation" style="color:var(--green)">
                      v = −Aω sin(ωt + φ)
                    </div>
                    <div class="equation" style="color:var(--red)">
                      a = −ω²x
                    </div>
                    <div class="subtle-box mono">
                      v = ${format(s.v, 3)} m/s<br />a = ${format(s.a, 3)} m/s²
                    </div>
                    <p class="explanation">${t.velocityExplain}</p>`
                : html`<div class="equation" style="color:var(--green)">
                      E<sub>k</sub> = ½mv²
                    </div>
                    <div class="equation" style="color:var(--blue)">
                      E<sub>p</sub> = ½kx²
                    </div>
                    <div class="equation">
                      E = E<sub>k</sub> + E<sub>p</sub> = ½kA²
                    </div>
                    <div class="subtle-box mono">
                      ${format(s.kinetic, 3)} + ${format(s.potential, 3)}<br />=
                      ${format(s.total, 3)} J
                    </div>
                    <p class="explanation">${t.energyExplain}</p>`
          }
          <details class="derivation">
            <summary>${t.derive}</summary>
            <p>
              F = −kx<br />a = F/m = −(k/m)x<br />ω = √(k/m)<br />T = 2π√(m/k)
            </p>
            <div class="subtle-box mono">
              T = ${format(s.period, 3)} s<br />ω = ${format(s.omega, 3)} rad/s
            </div>
          </details>
        </aside>
      </div>
      <section class="panel moments">
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
        <p class="moment-hint">
          ${this.moment === "right" ? t.rightHint : this.moment === "left" ? t.leftHint : this.moment === "equilibrium" ? t.centerHint : this.moment === "equal" ? t.equalHint : t.hint}
        </p>
      </section>
      <section class="tasks">
        <h2 class="section-title">${t.tasks}</h2>
        <div class="task-grid">
          ${[
            [t.task1, t.answer1, t.double],
            [t.task2, t.answer2, t.locate],
            [t.task3, t.answer3, t.resetTask],
          ].map(
            ([question, answer, action], i) =>
              html`<details class="panel task">
                <span class="task-number">0${i + 1}</span>
                <summary>${question}</summary>
                <p>${answer}</p>
                <button
                  ?disabled=${i === 0 && (p.A > 0.4 || p.A === 0)}
                  @click=${() => {
                    if (i === 0) this.setParameter("A", this.params.A * 2);
                    if (i === 1) {
                      this.mode = "changes";
                      this.locate("right");
                    }
                    if (i === 2) {
                      this.mode = "energy";
                      this.restart();
                    }
                  }}
                >
                  ${action}
                </button>
              </details>`,
          )}
        </div>
      </section>`;
  }
  render() {
    const t = texts(this.locale),
      s = this.state,
      p = this.params,
      window = 2 * s.period,
      start = Math.floor(Math.max(0, this.time - 1e-9) / window) * window;
    return html`<div class="heading">
        <div>
          <h1>${t.title}</h1>
          <p class="intro">${t.subtitle}</p>
        </div>
        <div class="model">${t.model}</div>
      </div>
      <div class="bench">
        <section class="panel">
          <div class="scene-header">
            <span>${this.dragging ? t.holding : t.drag}</span
            ><span class="mono"
              >${this.params.A === 0 ? t.zero : "ω = " + format(s.omega) + " rad/s"}</span
            >
          </div>
          ${this.scene()}
          <div class="readouts">
            ${[
              [t.position, s.x, "m", "var(--blue)"],
              [
                t.velocity.replace("箭头", "").replace(" arrow", ""),
                s.v,
                "m/s",
                "var(--green)",
              ],
              [
                t.acceleration.replace("箭头", "").replace(" arrow", ""),
                s.a,
                "m/s²",
                "var(--red)",
              ],
            ].map(
              ([label, value, unit, color]) =>
                html`<div class="readout">
                  <div class="label">${label}</div>
                  <span class="value mono" style=${"color:" + color}
                    >${format(Number(value), 3)}</span
                  ><span class="unit">${unit}</span>
                </div>`,
            )}
          </div>
          <div class="controls">
            <phy-button
              variant="primary"
              ?disabled=${this.dragging}
              @click=${() => (this.playing ? this.pause() : this.play())}
              >${this.playing ? "Ⅱ" : "▷"}
              ${this.playing ? t.pause : t.play}</phy-button
            ><phy-button @click=${() => this.restart()}>↺ ${t.reset}</phy-button
            ><select
              aria-label=${t.speed}
              .value=${String(this.speed)}
              @change=${(e: Event) => {
                this.speed = Number((e.target as HTMLSelectElement).value);
                this.last = 0;
                this.persist();
              }}
            >
              <option value="1">1×</option>
              <option value="0.5">0.5×</option>
              <option value="0.25">0.25×</option></select
            ><span class="time-label mono">t = ${format(this.time)} s</span>
          </div>
          <div class="timeline">
            <span class="mono">${format(start, 1)}s</span
            ><input
              type="range"
              min=${start}
              max=${start + window}
              step="0.001"
              .value=${String(this.time)}
              aria-label=${t.timeline}
              @input=${(e: Event) => {
                this.pause();
                this.dragging = false;
                this.time = Number((e.target as HTMLInputElement).value);
                this.moment = "";
                this.persist();
              }}
            /><span class="mono">${format(start + window, 1)}s</span>
          </div>
          <div class="toggles">
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
        </section>
        <aside class="panel parameters">
          <h2 class="section-title">${t.parameters}</h2>
          ${this.parameter("A", t.amplitude, 0, 0.8, 0.01, "m")}${this.parameter("m", t.mass, 0.2, 5, 0.1, "kg")}${this.parameter("k", t.stiffness, 1, 50, 1, "N/m")}
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
          <details class="advanced">
            <summary>${t.advanced}</summary>
            ${this.parameter("phi", t.phase, 0, TAU, 0.01, "rad")}
          </details>
        </aside>
      </div>
      <section class="analysis">
        <div
          class="tabs"
          role="tablist"
          aria-label=${t.show}
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
          id="observations"
          role="tabpanel"
          aria-label=${this.mode === "motion" ? t.motion : this.mode === "changes" ? t.changes : t.energy}
        >
          ${this.analysis()}
        </div>
      </section>`;
  }
}

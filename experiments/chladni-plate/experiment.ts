import { LitElement, html, render } from "lit";
import { live } from "lit/directives/live.js";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/contract";
import { plate, PRESETS } from "./model/catalog";
import { frequency, clamp, type Parameters } from "./model/plate";
import {
  response,
  field,
  pointAt,
  energies,
  responseCurve,
  type Response,
  type Field,
} from "./model/response";
import { SandSimulation, MAX_CYCLES, SAND_STEP } from "./model/sand";
import {
  normalizeSnapshot,
  frequencyRange,
  type Snapshot,
} from "./model/snapshot";
import { PlateRenderer, geometry, pickPlate } from "./components/renderer";
import {
  historyChart,
  resonanceChart,
  frequencyFromPointer,
} from "./components/chart";
import { math, mathStyles } from "./components/math";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
const f = (value: number, digits = 2) =>
  Number.isFinite(value)
    ? (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits)
    : "—";
export class ChladniExperiment extends LitElement {
  static properties = {
    data: { state: true },
    locale: { type: String },
    theme: { type: String },
    playing: { state: true },
    helpOpen: { state: true },
    backend: { state: true },
    chartHeight: { state: true },
  };
  static styles = [mathStyles, styles];
  declare data: Snapshot;
  declare locale: Locale;
  declare theme: "light" | "dark";
  declare playing: boolean;
  declare helpOpen: boolean;
  declare backend: string;
  declare chartHeight: number;
  private context?: ExperimentContext;
  private frame = 0;
  private last = 0;
  private toolbar?: HTMLDivElement;
  private toolbarKey = "";
  private drag?: {
    pointer: number;
    target: string;
    offsetX: number;
    offsetY: number;
  };
  private observer?: ResizeObserver;
  private chartObserver?: ResizeObserver;
  private chartWrap?: HTMLElement;
  private renderer?: PlateRenderer;
  private state!: Response;
  private grid!: Field;
  private sand!: SandSimulation;
  private curve!: ReturnType<typeof responseCurve>;
  constructor() {
    super();
    this.data = normalizeSnapshot(null);
    this.locale = "zh-CN";
    this.theme = "light";
    this.playing = false;
    this.helpOpen = false;
    this.backend = "";
    this.chartHeight = 180;
  }
  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.theme = context.theme;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
    this.rebuild();
    this.persist();
  }
  get p() {
    return this.data.params;
  }
  get point() {
    return pointAt(
      plate,
      this.state,
      this.p,
      this.data.probe.x,
      this.data.probe.y,
      this.data.cycles,
    );
  }
  snapshot(): Snapshot {
    return structuredClone(this.data);
  }
  private persist() {
    this.context?.storage.write(this.snapshot());
  }
  private set(patch: Partial<Snapshot>) {
    this.data = { ...this.data, ...patch };
    this.persist();
  }
  private rebuild() {
    this.state = response(plate, this.p);
    this.grid = field(plate, this.state);
    this.sand = new SandSimulation(
      this.grid,
      this.data.seed,
      this.data.empty ? 0 : this.data.count,
      this.p.frequency,
    );
    this.sand.seek(this.data.cycles);
    const { min, max } = frequencyRange(this.p);
    this.curve = responseCurve(plate, this.p, min, max);
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.hide);
  }
  disconnectedCallback() {
    this.pause();
    this.observer?.disconnect();
    this.chartObserver?.disconnect();
    this.renderer?.dispose();
    this.renderer = undefined;
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.hide);
    if (this.toolbar) render(null, this.toolbar);
    this.toolbar = undefined;
    super.disconnectedCallback();
  }
  private visibility = () => {
    if (document.hidden) this.pause();
  };
  private hide = () => this.pause();
  protected updated() {
    const chartWrap = this.renderRoot.querySelector<HTMLElement>(".chart-wrap");
    if (chartWrap && chartWrap !== this.chartWrap) {
      this.chartObserver?.disconnect();
      this.chartWrap = chartWrap;
      this.chartObserver = new ResizeObserver(() => {
        const height = Math.max(128, Math.round(chartWrap.clientHeight));
        if (this.chartHeight !== height) this.chartHeight = height;
      });
      this.chartObserver.observe(chartWrap);
    }
    const wrap = this.renderRoot.querySelector<HTMLElement>(".scene-wrap");
    if (wrap && !this.renderer) {
      this.renderer = new PlateRenderer(
        wrap.querySelector(".webgl")!,
        wrap.querySelector(".fallback")!,
        () => {
          this.backend = "canvas2d";
        },
      );
      this.backend = this.renderer.backend;
      this.observer = new ResizeObserver(() => this.requestUpdate());
      this.observer.observe(wrap);
    }
    if (this.renderer) {
      this.backend = this.renderer.backend;
      this.draw();
    }
    if (this.helpOpen) {
      const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
      if (dialog && !dialog.open) dialog.showModal();
    }
    if (this.context?.toolbar) {
      if (!this.toolbar) {
        this.toolbar = document.createElement("div");
        this.toolbar.style.cssText = "display:flex;gap:8px;align-items:center";
        this.context.toolbar.setControls(this.toolbar);
      }
      const key = JSON.stringify([this.playing, this.data.rate, this.locale]);
      if (key !== this.toolbarKey) {
        this.toolbarKey = key;
        render(this.playback(), this.toolbar);
      }
    }
  }
  private get tilted() {
    return this.data.tilt && this.backend === "webgl2";
  }
  private draw() {
    this.renderer?.draw({
      field: this.grid,
      sand: this.sand.positions,
      cycles: this.data.cycles,
      tilt: this.tilted,
      heat: this.data.heat || this.data.observation === "mode",
      nodes: this.data.nodes,
      dark: this.theme === "dark",
    });
    const wrap = this.renderRoot.querySelector<HTMLElement>(".scene-wrap");
    if (!wrap) return;
    const cam = geometry(wrap.clientWidth, wrap.clientHeight, this.tilted);
    const s = this.point,
      peak = Math.max(this.grid.peak, 1e-30);
    const drivePoint = pointAt(
      plate,
      this.state,
      this.p,
      this.p.driveX,
      this.p.driveY,
      this.data.cycles,
    );
    for (const [selector, x, y, z] of [
      [
        ".handle.drive",
        this.p.driveX,
        this.p.driveY,
        (0.13 * drivePoint.w) / peak,
      ],
      [
        ".handle.probe",
        this.data.probe.x,
        this.data.probe.y,
        (0.13 * s.w) / peak,
      ],
    ] as const) {
      const node = wrap.querySelector<HTMLElement>(selector)!,
        position = cam.project(x, y, z);
      node.style.left = position.x + "px";
      node.style.top = position.y + "px";
    }
    const mount = wrap.querySelector<HTMLElement>(".center-mount")!;
    mount.style.left = wrap.clientWidth / 2 + "px";
    mount.style.top = wrap.clientHeight / 2 + "px";
    mount.style.width = cam.scale * 0.22 + "px";
    mount.style.height = cam.scale * 0.22 * cam.flatten + "px";
    mount.style.rotate = this.tilted ? "11deg" : "0deg";
  }
  pause() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  play() {
    if (this.playing) return;
    if (this.data.cycles >= MAX_CYCLES) this.seek(0);
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) {
      const cycles = Math.min(
        MAX_CYCLES,
        this.data.cycles +
          Math.min(0.08, (now - this.last) / 1000) * 4 * this.data.rate,
      );
      this.sand.seek(cycles);
      this.data = { ...this.data, cycles };
      if (cycles >= MAX_CYCLES) {
        this.pause();
        return;
      }
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  seek(cycles: number) {
    this.pause();
    cycles = clamp(cycles, 0, MAX_CYCLES);
    this.sand.seek(cycles);
    this.set({ cycles });
  }
  private changePhysics(patch: Partial<Parameters>) {
    this.pause();
    this.data = normalizeSnapshot({
      ...this.data,
      params: { ...this.p, ...patch },
      cycles: 0,
      empty: false,
    });
    this.rebuild();
    this.persist();
  }
  private sprinkle() {
    this.pause();
    this.data = {
      ...this.data,
      seed: (this.data.seed + 1) >>> 0,
      cycles: 0,
      empty: false,
    };
    this.rebuild();
    this.persist();
  }
  private clear() {
    this.pause();
    this.data = { ...this.data, cycles: 0, empty: true };
    this.rebuild();
    this.persist();
  }
  private changeCount(count: number) {
    this.pause();
    this.data = normalizeSnapshot({
      ...this.data,
      count,
      cycles: 0,
      empty: false,
    });
    this.rebuild();
    this.persist();
  }
  private playback() {
    const t = texts(this.locale);
    return html`<phy-button
        variant="primary"
        @click=${() => (this.playing ? this.pause() : this.play())}
        >${this.playing ? "Ⅱ" : "▷"}
        ${this.playing ? t.pause : t.play}</phy-button
      ><phy-button @click=${() => this.seek(0)}>↺ ${t.restart}</phy-button
      ><phy-button
        label=${t.step}
        @click=${() => this.seek(this.data.cycles + SAND_STEP)}
        >↦</phy-button
      ><select
        aria-label=${t.speed}
        .value=${String(this.data.rate)}
        @change=${(e: Event) => this.set({ rate: Number((e.target as HTMLSelectElement).value) })}
      >
        <option value="1">1×</option>
        <option value="0.5">0.5×</option>
        <option value="0.25">0.25×</option>
      </select>`;
  }
  private movePoint = (e: PointerEvent) => {
    if (!e.isPrimary || (e.type === "pointerdown" && e.button !== 0)) return;
    const node = e.currentTarget as HTMLElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    const wrap = this.renderRoot.querySelector<HTMLElement>(".scene-wrap")!,
      rect = wrap.getBoundingClientRect(),
      cam = geometry(rect.width, rect.height, this.tilted),
      px = e.clientX - rect.left,
      py = e.clientY - rect.top,
      target = node.dataset.target ?? this.data.target;
    if (e.type === "pointerdown") {
      const point = pickPlate(
        this.grid,
        this.data.cycles,
        cam,
        this.tilted,
        px,
        py,
      );
      if (!point && !node.dataset.target) return;
      const base = point ?? cam.unproject(px, py),
        current =
          target === "drive"
            ? { x: this.p.driveX, y: this.p.driveY }
            : this.data.probe;
      this.drag = {
        pointer: e.pointerId,
        target,
        offsetX: node.dataset.target ? current.x - base.x : 0,
        offsetY: node.dataset.target ? current.y - base.y : 0,
      };
      node.setPointerCapture(e.pointerId);
      if (node instanceof HTMLButtonElement) node.focus();
      e.preventDefault();
    }
    if (
      !this.drag ||
      this.drag.pointer !== e.pointerId ||
      this.drag.target !== target
    )
      return;
    const picked =
        pickPlate(this.grid, this.data.cycles, cam, this.tilted, px, py) ??
        cam.unproject(px, py),
      point = {
        x: picked.x + this.drag.offsetX,
        y: picked.y + this.drag.offsetY,
      };
    if (target === "drive")
      this.changePhysics({
        driveX: clamp(point.x, -0.94, 0.94),
        driveY: clamp(point.y, -0.94, 0.94),
      });
    else
      this.set({
        probe: { x: clamp(point.x, -1, 1), y: clamp(point.y, -1, 1) },
      });
    e.stopPropagation();
  };
  private pointKeys = (e: KeyboardEvent) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
        e.key,
      )
    )
      return;
    e.preventDefault();
    const drive = (e.currentTarget as HTMLElement).dataset.target === "drive",
      step = e.shiftKey ? 0.1 : 0.02;
    let x = drive ? this.p.driveX : this.data.probe.x,
      y = drive ? this.p.driveY : this.data.probe.y;
    if (e.key === "Home") {
      x = 0;
      y = 0;
    } else if (e.key === "ArrowLeft") x -= step;
    else if (e.key === "ArrowRight") x += step;
    else if (e.key === "ArrowUp") y -= step;
    else y += step;
    if (drive)
      this.changePhysics({
        driveX: clamp(x, -0.94, 0.94),
        driveY: clamp(y, -0.94, 0.94),
      });
    else this.set({ probe: { x: clamp(x, -1, 1), y: clamp(y, -1, 1) } });
  };
  private responsePointer = (e: PointerEvent) => {
    const node = e.currentTarget as SVGSVGElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    if (e.type === "pointerdown") {
      node.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    const { min, max } = frequencyRange(this.p);
    this.changePhysics({
      frequency: clamp(frequencyFromPointer(e, min, max), min, max),
    });
  };
  private responseKeys = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const { min, max } = frequencyRange(this.p),
      step = (max - min) / (e.shiftKey ? 50 : 500);
    this.changePhysics({
      frequency:
        e.key === "Home"
          ? min
          : e.key === "End"
            ? max
            : clamp(
                this.p.frequency + (e.key === "ArrowRight" ? step : -step),
                min,
                max,
              ),
    });
  };
  private observationKeys = async (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const options = ["sand", "mode", "resonance"] as const,
      index = options.indexOf(this.data.observation);
    this.set({
      observation:
        options[
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? 2
              : (index + (e.key === "ArrowRight" ? 1 : 2)) % 3
        ],
    });
    await this.updateComplete;
    this.renderRoot
      .querySelector<HTMLButtonElement>(
        '.observation-tabs [aria-selected="true"]',
      )
      ?.focus();
  };
  private slider(
    name: keyof Parameters | "count",
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    multiplier = 1,
  ) {
    const digits =
      name === "count" ? 0 : name === "damping" || name === "force" ? 3 : 2;
    const limitDigits =
      name === "damping"
        ? 3
        : name === "force"
          ? 2
          : name === "thickness"
            ? 1
            : 0;
    return html`<div class="parameter">
      <label for=${name}
        >${label}<span class="val"
          >${f(value * multiplier, digits)} ${unit}</span
        ></label
      ><input
        id=${name}
        type="range"
        min=${min}
        max=${max}
        step=${step}
        .value=${String(value)}
        aria-label=${label}
        aria-valuetext=${f(value * multiplier, digits) + " " + unit}
        @input=${(e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          if (name === "count") this.changeCount(v);
          else this.changePhysics({ [name]: v });
        }}
      />
      <div class="limits">
        <span>${f(min * multiplier, limitDigits)}</span
        ><span>${f(max * multiplier, limitDigits)} ${unit}</span>
      </div>
    </div>`;
  }
  private parameterPanel() {
    const t = texts(this.locale),
      { min, max } = frequencyRange(this.p),
      p = this.p;
    if (this.data.parameterTab === "drive")
      return html` ${this.slider("frequency", t.frequency, p.frequency, min, max, 0.01, "Hz")}
        ${this.slider("force", t.force, p.force, 0, 0.15, 0.001, "N")}
        ${this.slider("damping", t.damping, p.damping, 0.005, 0.08, 0.001, "")}
        <div class="position-summary">
          ${t.position}<span class="mono"
            >x ${f(p.driveX * p.length * 50, 1)} · y
            ${f(p.driveY * p.length * 50, 1)} cm</span
          >
        </div>
        <p class="parameter-note">${t.coupling}</p>
        <div class="derived">
          <div class="derived-row">
            <span>${t.dominant}</span
            ><span
              >#${String(this.state.dominant + 1).padStart(2, "0")} ·
              ${f(this.state.frequencies[this.state.dominant], 1)} Hz</span
            >
          </div>
          <div class="derived-row">
            <span>${t.period}</span><span>${f(1000 / p.frequency)} ms</span>
          </div>
        </div>`;
    return html`${this.slider("length", t.length, p.length, 0.24, 0.5, 0.005, "cm", 100)}${this.slider("thickness", t.thickness, p.thickness, 0.0006, 0.0015, 0.00005, "mm", 1000)}${this.slider("count", t.count, this.data.count, 500, 6000, 100, "")}
      <div class="derived">
        <div class="derived-row"><span>E</span><span>70 GPa</span></div>
        <div class="derived-row"><span>ρ</span><span>2700 kg/m³</span></div>
        <div class="derived-row"><span>ν</span><span>0.33</span></div>
      </div> `;
  }
  private facts() {
    const t = texts(this.locale),
      e = energies(this.state, this.p, this.data.cycles),
      mode = this.data.observation;
    const rows =
      mode === "sand"
        ? [
            [t.settled, f(this.sand.lowAmplitudeFraction * 100, 1) + " %"],
            [t.remaining, String(this.sand.remaining)],
          ]
        : mode === "mode"
          ? [
              [t.kinetic, f(e.kinetic * 1e6) + " μJ"],
              [t.potential, f(e.potential * 1e6) + " μJ"],
            ]
          : [
              [t.frequency, f(this.p.frequency) + " Hz"],
              [
                t.dominant,
                f(this.state.frequencies[this.state.dominant]) + " Hz",
              ],
            ];
    return html`<div class="facts">
      ${rows.map(([label, value]) => html`<div><small>${label}</small><b>${value}</b></div>`)}
    </div>`;
  }
  private observationPanel() {
    const t = texts(this.locale),
      observation = this.data.observation;
    return html`<div
      id="plate-observation"
      class="observation-content"
      role="tabpanel"
      aria-label=${t[observation]}
    >
      ${this.facts()}
      <p
        class="view-note ${this.grid.peak > this.p.thickness / 3 ? "warning" : ""}"
      >
        ${this.grid.peak > this.p.thickness / 3 ? t.warning : this.p.force === 0 ? t.zero : observation === "sand" ? t.sandHint : observation === "mode" ? t.modeHint : t.resonanceHint}
      </p>
      ${
        observation === "resonance"
          ? html`<p class="plot-heading">${t.responseValue}</p>
              <div class="chart-wrap">
                ${resonanceChart(this.data, this.curve, this.locale, this.responsePointer, this.responseKeys, this.chartHeight)}
              </div>
              <p class="chart-caption">${t.truncated}</p>`
          : html`
              <p class="plot-heading">${t.probeHistory}</p>
              <div class="metric-tabs" role="group" aria-label=${t.metric}>
                ${(["w", "v", "a"] as const).map((metric) => html`<button class=${this.data.metric === metric ? "selected" : ""} aria-pressed=${this.data.metric === metric} @click=${() => this.set({ metric })}>${metric === "w" ? "w / μm" : metric === "v" ? "v / mm·s⁻¹" : "a / m·s⁻²"}</button>`)}
              </div>
              <div class="chart-wrap">
                ${historyChart(this.data, this.state, this.locale, this.chartHeight)}
              </div>
              <div class="coordinates">
                ${(["x", "y"] as const).map(
                  (axis) =>
                    html`<div class="coordinate">
                      <label for=${"probe-" + axis}>${axis}</label
                      ><input
                        id=${"probe-" + axis}
                        type="number"
                        min=${-this.p.length * 50}
                        max=${this.p.length * 50}
                        step="0.1"
                        aria-label=${axis === "x" ? t.probeX : t.probeY}
                        .value=${live(f(this.data.probe[axis] * this.p.length * 50, 1))}
                        @focus=${() => this.pause()}
                        @change=${(e: Event) => {
                          const input = e.target as HTMLInputElement;
                          if (
                            input.value !== "" &&
                            Number.isFinite(input.valueAsNumber)
                          )
                            this.set({
                              probe: {
                                ...this.data.probe,
                                [axis]: clamp(
                                  input.valueAsNumber / (this.p.length * 50),
                                  -1,
                                  1,
                                ),
                              },
                            });
                          else this.requestUpdate();
                        }}
                      /><span>cm</span>
                    </div>`,
                )}
              </div>
            `
      }
    </div>`;
  }
  private supportPanel() {
    const t = texts(this.locale),
      observation = this.data.observation;
    return html`<section class="support">
        <div class="equation">
          ${math(observation === "sand" ? String.raw`w(x,y,t)=\Re\!\left[W(x,y)e^{i\omega t}\right]` : observation === "mode" ? String.raw`D\nabla^4\Phi_j=\rho h\omega_j^2\Phi_j` : String.raw`Q_j=\frac{F_j/M_j}{\omega_j^2-\omega^2+i2\zeta\omega_j\omega}`)}
        </div>
        <p>
          ${observation === "sand" ? t.formulaSand : observation === "mode" ? t.formulaMode : t.formulaResonance}
        </p>
      </section>
      <section class="preset-block">
        <h2 class="preset-heading">${t.presets}</h2>
        <div class="presets">
          ${PRESETS.map((index) => {
            const freq = frequency(plate.modes[index], this.p),
              selected = Math.abs(this.p.frequency - freq) < 0.02;
            return html`<button
              class=${"preset" + (selected ? " selected" : "")}
              aria-pressed=${selected}
              aria-label=${`${t.preset} ${index + 1} · ${f(freq, 1)} Hz`}
              @click=${() => this.changePhysics({ frequency: freq })}
            >
              ${String(index + 1).padStart(2, "0")}<small
                >${f(freq, 1)} Hz</small
              >
            </button>`;
          })}
        </div>
      </section>`;
  }
  private helpDialog() {
    const t = texts(this.locale);
    return html`<dialog
      class="help-dialog"
      @close=${() => {
        this.helpOpen = false;
        this.renderRoot
          .querySelector<HTMLButtonElement>(".help-button")
          ?.focus();
      }}
    >
      <div class="dialog-heading">
        <h2>${t.help}</h2>
        <button
          aria-label=${t.close}
          @click=${() => this.renderRoot.querySelector<HTMLDialogElement>("dialog")?.close()}
        >
          ×
        </button>
      </div>
      ${[t.helpIntro, t.helpModel, t.helpSteady, t.helpTime, t.helpSand, t.helpInteraction, t.helpLimits].map((text) => html`<p>${text}</p>`)}
      <div class="help-formulas">
        ${math(String.raw`D=\frac{Eh^3}{12(1-\nu^2)},\qquad D\nabla^4 w+\rho h\ddot w=p`)}${math(String.raw`\omega=2\pi f,\qquad t=N/f,\qquad f_j\propto h/L^2`)}
      </div>
      <div class="help-tasks">
        ${[t.task1, t.task2, t.task3].map((task) => html`<p>${task}</p>`)}
      </div>
    </dialog>`;
  }
  protected render() {
    if (!this.state) return html``;
    const t = texts(this.locale),
      s = this.point,
      observation = this.data.observation;
    return html`<div class="heading">
        <div class="heading-copy">
          <h1>${t.title}</h1>
          <p class="intro">${t.subtitle}</p>
        </div>
        <p class="model-summary">${t.assumptions}</p>
      </div>
      <div class="lab">
        <aside class="panel parameter-panel">
          <div class="panel-heading">
            ${t.parameters}<span
              class=${"status" + (this.playing ? " running" : "")}
              >${this.playing ? t.playing : t.paused}</span
            >
          </div>
          <div
            class="parameter-tabs"
            role="group"
            aria-label=${t.parameterGroup}
          >
            ${(["drive", "plate"] as const).map((parameterTab) => html`<button class=${this.data.parameterTab === parameterTab ? "selected" : ""} aria-pressed=${this.data.parameterTab === parameterTab} @click=${() => this.set({ parameterTab })}>${t[parameterTab]}</button>`)}
          </div>
          <div class="parameter-body">${this.parameterPanel()}</div>
          <div class="parameter-footer">
            <div class="pair">
              <button @click=${() => this.sprinkle()}>${t.sprinkle}</button
              ><button @click=${() => this.clear()}>${t.clear}</button>
            </div>
            <button
              class="help-button"
              @click=${() => {
                this.pause();
                this.helpOpen = true;
              }}
            >
              ${t.help}</button
            ><small>${t.restartHint}</small>
          </div>
        </aside>
        <section class="panel stage">
          <div class="scene-heading">
            <span>${t.surface}</span
            ><small>${t.steady} · ${f(this.p.frequency, 1)} Hz</small>
          </div>
          <div class="scene-tools">
            <div class="pair" role="group" aria-label=${t.target}>
              ${(["drive", "probe"] as const).map((target) => html`<button class=${this.data.target === target ? "selected" : ""} aria-pressed=${this.data.target === target} @click=${() => this.set({ target })}>${target === "drive" ? t.moveDrive : t.moveProbe}</button>`)}
            </div>
            <div class="camera" role="group" aria-label=${t.camera}>
              <button
                class=${!this.tilted ? "selected" : ""}
                aria-pressed=${!this.tilted}
                @click=${() => this.set({ tilt: false })}
              >
                ${t.top}</button
              ><button
                ?disabled=${this.backend !== "webgl2"}
                class=${this.tilted ? "selected" : ""}
                aria-pressed=${this.tilted}
                @click=${() => this.set({ tilt: true })}
              >
                ${t.tilted}
              </button>
            </div>
          </div>
          <div
            class="scene-wrap"
            @pointerdown=${this.movePoint}
            @pointermove=${this.movePoint}
          >
            <canvas
              class="webgl"
              aria-label=${t.canvas}
              role="img"
              data-w=${s.w}
              data-v=${s.v}
              data-a=${s.a}
            ></canvas
            ><canvas class="fallback" aria-hidden="true" hidden></canvas>
            <span class="scene-label"
              >CHLADNI /
              ${String(this.state.dominant + 1).padStart(2, "0")}</span
            >
            <div class="center-mount" role="img" aria-label=${t.clamp}></div>
            <button
              class="handle drive"
              data-target="drive"
              aria-label=${t.driveHandle}
              aria-description=${t.coupling}
              @pointerdown=${this.movePoint}
              @pointermove=${this.movePoint}
              @keydown=${this.pointKeys}
            >
              <span>S</span>
            </button>
            <button
              class="handle probe"
              data-target="probe"
              aria-label=${t.probeHandle}
              @pointerdown=${this.movePoint}
              @pointermove=${this.movePoint}
              @keydown=${this.pointKeys}
            >
              <span>P</span>
            </button>
            <div class="scene-caption">
              ${t.phaseSlow} · ${f(4 * this.data.rate, 0)} ${t.cycles}/s<br />${this.tilted ? (this.grid.peak > 0 ? t.shapeScale + " ×" + f((0.13 * this.p.length) / 2 / this.grid.peak, 0) : t.noDeform) : t.sandApprox}
            </div>
            <div class="scene-scale">L = ${f(this.p.length * 100, 0)} cm</div>
          </div>
          <div class="layer-controls" role="group" aria-label=${t.layers}>
            <label
              ><input
                type="checkbox"
                .checked=${this.data.heat || observation === "mode"}
                ?disabled=${observation === "mode"}
                @change=${(e: Event) => this.set({ heat: (e.target as HTMLInputElement).checked })}
              />${t.heat}</label
            ><label
              ><input
                type="checkbox"
                .checked=${this.data.nodes}
                @change=${(e: Event) => this.set({ nodes: (e.target as HTMLInputElement).checked })}
              />${t.nodes}</label
            ><small
              >${this.backend === "webgl2" ? t.gpu : t.flatFallback}</small
            >
          </div>
          <div class="readouts">
            ${[
              [t.displacement, s.w * 1e6, "μm", "var(--blue)"],
              [t.velocity, s.v * 1e3, "mm/s", "var(--green)"],
              [t.acceleration, s.a, "m/s²", "var(--red)"],
            ].map(
              ([label, value, unit, color]) =>
                html`<div class="readout">
                  <small>${label}</small
                  ><span class="value" style=${"color:" + color}
                    >${f(Number(value))}<span class="unit">${unit}</span></span
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <span>N</span
            ><input
              type="range"
              min="0"
              max=${MAX_CYCLES}
              step=".01"
              .value=${String(this.data.cycles)}
              aria-label=${t.timeline}
              aria-valuetext=${f(this.data.cycles) + " " + t.cycles}
              @input=${(e: Event) => this.seek(Number((e.target as HTMLInputElement).value))}
            /><span>${f(this.data.cycles, 1)} / ${MAX_CYCLES}</span
            ><span class="time-label" title=${t.physicalTime}
              >t ${f(s.time * 1000, 1)} ms</span
            >
          </div>
          ${this.context?.toolbar ? "" : html`<div class="scene-tools">${this.playback()}</div>`}
        </section>
        <aside class="panel observation-panel">
          <div
            class="observation-tabs"
            role="tablist"
            aria-label=${t.observation}
            @keydown=${this.observationKeys}
          >
            ${(["sand", "mode", "resonance"] as const).map((view) => html`<button role="tab" aria-selected=${observation === view} aria-controls="plate-observation" tabindex=${observation === view ? 0 : -1} class=${observation === view ? "selected" : ""} @click=${() => this.set({ observation: view })}>${t[view]}</button>`)}
          </div>
          ${this.observationPanel()}${this.supportPanel()}
        </aside>
      </div>
      ${this.helpOpen ? this.helpDialog() : ""}`;
  }
}

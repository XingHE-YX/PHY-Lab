import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type {
  TabsElement,
  RadioGroupElement,
  SliderElement,
  SelectElement,
  CheckboxElement,
  InputElement,
} from "../../src/infra/platform/protocols/v2/components";
import { LitElement, html, render } from "lit";
import { live } from "lit/directives/live.js";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/protocols/v2";
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
import { SandSimulation, MAX_CYCLES } from "./model/sand";
import {
  normalizeSnapshot,
  frequencyRange,
  type Snapshot,
} from "./model/snapshot";
import { PlateRenderer, geometry, pickPlate } from "./components/renderer";
import { PlateAudio } from "./components/audio";
import {
  historyChart,
  resonanceChart,
  frequencyFromPointer,
} from "./components/chart";
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
    audioUnavailable: { state: true },
  };
  static styles = styles;
  declare data: Snapshot;
  declare locale: Locale;
  declare theme: "light" | "dark";
  declare playing: boolean;
  declare helpOpen: boolean;
  declare backend: string;
  declare chartHeight: number;
  declare audioUnavailable: boolean;
  private context?: ExperimentContext;
  private helpHandle?: DialogHandle;
  private helpLocale = "";
  private readonly helpContent = document.createElement("div");
  private frame = 0;
  private last = 0;
  private toolbar?: HTMLDivElement;
  private toolbarKey = "";
  private settingsControls?: HTMLDivElement;
  private settingsKey = "";
  private audio = new PlateAudio(() => {
    this.audioUnavailable = true;
  });
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
    this.audioUnavailable = false;
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
    this.audio.dispose();
    this.renderer = undefined;
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.hide);
    if (this.toolbar) render(null, this.toolbar);
    this.toolbar = undefined;
    if (this.settingsControls) render(null, this.settingsControls.shadowRoot!);
    this.context?.settings?.setControls(null, "experiment");
    this.settingsControls = undefined;
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
    if (this.helpOpen) this.syncHelp();
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
    if (this.context?.settings) {
      if (!this.settingsControls) {
        this.settingsControls = document.createElement("div");
        this.settingsControls.attachShadow({ mode: "open" });
        this.context.settings.setControls(this.settingsControls, "experiment");
      }
      const key = JSON.stringify([
        this.data.muted,
        this.locale,
        this.audioUnavailable,
      ]);
      if (this.settingsKey !== key) {
        this.settingsKey = key;
        const t = texts(this.locale);
        render(
          html`<style>
              :host {
                font-family: var(--font);
                color: var(--text);
              }
              phy-switch {
                display: block;
                font-size: 13px;
              }
              phy-switch::part(base) {
                width: 100%;
                flex-direction: row-reverse;
                justify-content: space-between;
                gap: 16px;
              }
            </style>
            <phy-switch
              label=${t.mute}
              .checked=${this.data.muted}
              ?disabled=${this.audioUnavailable}
              @change=${(e: Event) => {
                this.set({
                  muted: (e.currentTarget as CheckboxElement).checked,
                });
                this.syncAudio();
              }}
            ></phy-switch>
            <p
              style="font-size:12px;line-height:1.7;color:var(--muted);margin:10px 0 0"
            >
              ${this.audioUnavailable ? t.audioUnavailable : t.audioHint}
            </p>`,
          this.settingsControls.shadowRoot!,
        );
      }
    }
  }
  private syncAudio() {
    if (!this.playing || this.data.muted || this.p.force === 0) {
      this.audio.stop();
      return;
    }
    // Spatial/time RMS surface velocity controls a bounded illustrative volume.
    const amplitude =
      Math.sqrt(
        this.state.real.reduce(
          (sum, value, i) => sum + value ** 2 + this.state.imaginary[i] ** 2,
          0,
        ),
      ) / 2;
    void this.audio.play(
      this.p.frequency,
      (2 * Math.PI * this.p.frequency * amplitude) / Math.SQRT2,
    );
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
    this.audio.stop();
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  play() {
    if (this.playing) return;
    if (this.data.cycles >= MAX_CYCLES) this.seek(0);
    this.playing = true;
    this.syncAudio();
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
      ><phy-select
        label=${t.speed}
        .value=${String(this.data.rate)}
        .options=${[
          { value: "1", label: "1×" },
          { value: "0.5", label: "0.5×" },
          { value: "0.25", label: "0.25×" },
        ]}
        @change=${(e: Event) => this.set({ rate: Number((e.target as SelectElement).value) })}
      ></phy-select>`;
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
      ><phy-slider
        id=${name}
        min=${min}
        max=${max}
        step=${step}
        .value=${value}
        label=${label}
        value-text=${f(value * multiplier, digits) + " " + unit}
        @input=${(e: Event) => {
          const v = Number((e.target as SliderElement).value);
          if (name === "count") this.changeCount(v);
          else this.changePhysics({ [name]: v });
        }}
      ></phy-slider>
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
      slot=${observation}
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
              <phy-radio-group
                class="metric-tabs"
                variant="segmented"
                label=${t.metric}
                .value=${this.data.metric}
                .options=${(["w", "v", "a"] as const).map((value) => ({ value, label: value === "w" ? "w / μm" : value === "v" ? "v / mm·s⁻¹" : "a / m·s⁻²" }))}
                @change=${(e: Event) => this.set({ metric: (e.currentTarget as RadioGroupElement).value as Snapshot["metric"] })}
              ></phy-radio-group>
              <div class="chart-wrap">
                ${historyChart(this.data, this.state, this.locale, this.chartHeight)}
              </div>
              <div class="coordinates">
                ${(["x", "y"] as const).map(
                  (axis) =>
                    html`<div class="coordinate">
                      <label for=${"probe-" + axis}>${axis}</label
                      ><phy-input
                        id=${"probe-" + axis}
                        type="number"
                        min=${-this.p.length * 50}
                        max=${this.p.length * 50}
                        step="0.1"
                        label=${axis === "x" ? t.probeX : t.probeY}
                        .value=${live(f(this.data.probe[axis] * this.p.length * 50, 1))}
                        @focus=${() => this.pause()}
                        @change=${(e: Event) => {
                          const input = e.currentTarget as InputElement;
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
                      ></phy-input
                      ><span>cm</span>
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
          <phy-math
            .source=${observation === "sand" ? String.raw`w(x,y,t)=\Re\!\left[W(x,y)e^{i\omega t}\right]` : observation === "mode" ? String.raw`D\nabla^4\Phi_j=\rho h\omega_j^2\Phi_j` : String.raw`Q_j=\frac{F_j/M_j}{\omega_j^2-\omega^2+i2\zeta\omega_j\omega}`}
          ></phy-math>
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
  private syncHelp() {
    if (!this.context || (this.helpHandle && this.helpLocale === this.locale))
      return;
    const t = texts(this.locale),
      root =
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
          .help-formulas {
            display: grid;
            gap: 18px;
            margin: 20px 0;
          }
          .help-tasks {
            display: grid;
            gap: 10px;
            border-top: 1px solid var(--border);
            padding-top: 18px;
          }
          .help-tasks p {
            margin: 0;
          }
        </style>
        ${[t.helpIntro, t.helpModel, t.helpSteady, t.helpTime, t.helpSand, t.helpAudio, t.helpInteraction, t.helpLimits].map((text) => html`<p>${text}</p>`)}
        <div class="help-formulas">
          <phy-math
            .source=${String.raw`D=\frac{Eh^3}{12(1-\nu^2)},\qquad D\nabla^4 w+\rho h\ddot w=p`}
          ></phy-math
          ><phy-math
            .source=${String.raw`\omega=2\pi f,\qquad t=N/f,\qquad f_j\propto h/L^2`}
          ></phy-math>
        </div>
        <div class="help-tasks">
          ${[t.task1, t.task2, t.task3].map((task) => html`<p>${task}</p>`)}
        </div> `,
      root,
    );
    this.helpLocale = this.locale;
    if (this.helpHandle) this.helpHandle.update({ title: t.help });
    else {
      const handle = this.context.dialog.open({
        title: t.help,
        content: this.helpContent,
        width: 740,
        returnFocus:
          this.renderRoot.querySelector<HTMLElement>(".help-button") ??
          undefined,
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
        <phy-box role="complementary" class="panel parameter-panel">
          <div class="panel-heading">
            ${t.parameters}<span
              class=${"status" + (this.playing ? " running" : "")}
              >${this.playing ? t.playing : t.paused}</span
            >
          </div>
          <phy-tabs
            class="parameter-tabs"
            variant="segmented"
            label=${t.parameterGroup}
            .value=${this.data.parameterTab}
            .items=${(["drive", "plate"] as const).map((value) => ({ value, label: t[value] }))}
            @change=${(e: Event) => {
              if (e.target !== e.currentTarget) return;
              this.set({
                parameterTab: (e.currentTarget as TabsElement)
                  .value as Snapshot["parameterTab"],
              });
            }}
          >
            <div class="parameter-body" slot=${this.data.parameterTab}>
              ${this.parameterPanel()}
            </div>
          </phy-tabs>
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
        </phy-box>
        <phy-box class="panel stage">
          <div class="scene-heading">
            <span>${t.surface}</span
            ><small>${t.steady} · ${f(this.p.frequency, 1)} Hz</small>
          </div>
          <div class="scene-tools">
            <phy-radio-group
              class="pair"
              variant="segmented"
              label=${t.target}
              .value=${this.data.target}
              .options=${(["drive", "probe"] as const).map((value) => ({ value, label: value === "drive" ? t.moveDrive : t.moveProbe }))}
              @change=${(e: Event) => this.set({ target: (e.currentTarget as RadioGroupElement).value as Snapshot["target"] })}
            ></phy-radio-group>
            <phy-radio-group
              class="camera"
              variant="segmented"
              label=${t.camera}
              .value=${this.tilted ? "tilted" : "top"}
              .options=${[
                { value: "top", label: t.top },
                {
                  value: "tilted",
                  label: t.tilted,
                  disabled: this.backend !== "webgl2",
                },
              ]}
              @change=${(e: Event) => this.set({ tilt: (e.currentTarget as RadioGroupElement).value === "tilted" })}
            ></phy-radio-group>
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
            <phy-checkbox
              .checked=${this.data.heat || observation === "mode"}
              ?disabled=${observation === "mode"}
              @change=${(e: Event) => this.set({ heat: (e.target as CheckboxElement).checked })}
              >${t.heat}</phy-checkbox
            ><phy-checkbox
              .checked=${this.data.nodes}
              @change=${(e: Event) => this.set({ nodes: (e.target as CheckboxElement).checked })}
              >${t.nodes}</phy-checkbox
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
            ><phy-slider
              min="0"
              max=${MAX_CYCLES}
              step=".01"
              .value=${this.data.cycles}
              label=${t.timeline}
              value-text=${f(this.data.cycles) + " " + t.cycles}
              @input=${(e: Event) => this.seek(Number((e.target as SliderElement).value))}
            ></phy-slider
            ><span>${f(this.data.cycles, 1)} / ${MAX_CYCLES}</span
            ><span class="time-label" title=${t.physicalTime}
              >t ${f(s.time * 1000, 1)} ms</span
            >
          </div>
          ${this.context?.toolbar ? "" : html`<div class="scene-tools">${this.playback()}</div>`}
        </phy-box>
        <phy-box role="complementary" class="panel observation-panel">
          <phy-tabs
            class="observation-tabs"
            label=${t.observation}
            .value=${observation}
            .items=${(["sand", "mode", "resonance"] as const).map((value) => ({ value, label: t[value] }))}
            @change=${(e: Event) => {
              if (e.target !== e.currentTarget) return;
              this.set({
                observation: (e.currentTarget as TabsElement)
                  .value as Snapshot["observation"],
              });
            }}
          >
            ${this.observationPanel()}
          </phy-tabs>
          ${this.supportPanel()}
        </phy-box>
      </div> `;
  }
}

import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
  Theme,
  SliderElement,
  SelectElement,
  CheckboxElement,
  TabsElement,
  DialogHandle,
} from "../../src/infra/platform/protocols/v2";
import {
  defaults,
  parameters,
  at,
  derived,
  format,
  clamp,
  screenHalf,
  cyclesPerSecond,
  fringePosition,
  adjacentFringe,
  type Parameters,
} from "./model/physics";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import {
  opticalScene,
  intensityChart,
  phaseChart,
  sceneGeometry,
  plotGeometry,
} from "./components/optics";

export class YoungExperiment extends LitElement {
  static properties = {
    data: { state: true },
    locale: { type: String },
    theme: { type: String },
    playing: { state: true },
  };
  static styles = styles;
  declare data: Snapshot;
  declare locale: Locale;
  declare theme: Theme;
  declare playing: boolean;
  private context?: ExperimentContext;
  private frame = 0;
  private last = 0;
  private toolbar?: HTMLDivElement;
  private toolbarKey = "";
  private helpHandle?: DialogHandle;
  private helpLocale = "";
  private helpContent = document.createElement("div");
  private drag?: { node: Element; id: number };
  constructor() {
    super();
    this.data = normalizeSnapshot(null);
    this.locale = "zh-CN";
    this.theme = "light";
    this.playing = false;
  }
  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.theme = context.theme;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
    this.persist();
  }
  get p() {
    return this.data.params;
  }
  get state() {
    return at(this.p, this.data.probe, this.data.cycles);
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
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.hide);
  }
  disconnectedCallback() {
    this.pause();
    this.endDrag();
    this.helpHandle?.close();
    this.helpHandle = undefined;
    if (this.helpContent.shadowRoot) render(null, this.helpContent.shadowRoot);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.hide);
    if (this.toolbar) render(null, this.toolbar);
    this.toolbar = undefined;
    this.toolbarKey = "";
    this.context?.toolbar?.setControls(null);
    super.disconnectedCallback();
  }
  private visibility = () => {
    if (document.hidden) this.pause();
  };
  private hide = () => this.pause();
  protected updated() {
    if (!this.isConnected || this.context?.signal.aborted) return;
    if (this.helpHandle && this.helpLocale !== this.locale) this.syncHelp();
    if (!this.context?.toolbar) return;
    if (!this.toolbar) {
      this.toolbar = document.createElement("div");
      this.toolbar.style.cssText = "display:flex;align-items:center;gap:8px";
      this.context.toolbar.setControls(this.toolbar);
    }
    const key = JSON.stringify([this.locale, this.playing, this.data.rate]);
    if (key !== this.toolbarKey) {
      this.toolbarKey = key;
      render(this.playback(), this.toolbar);
    }
  }
  pause() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  private play = () => {
    if (
      this.playing ||
      !this.isConnected ||
      this.context?.signal.aborted ||
      document.hidden
    )
      return;
    if (this.data.cycles >= 4) this.set({ cycles: 0 });
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  };
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) {
      const delta = Math.min(0.1, (now - this.last) / 1000);
      const cycles = Math.min(
        4,
        this.data.cycles + delta * this.data.rate * cyclesPerSecond,
      );
      this.data = { ...this.data, cycles };
      if (cycles >= 4) {
        this.pause();
        return;
      }
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  private seek(cycles: number) {
    if (!Number.isFinite(cycles)) return;
    this.pause();
    this.set({ cycles: clamp(cycles, 0, 4) });
  }
  private changeParameter(key: keyof Parameters, value: number) {
    if (!Number.isFinite(value)) return;
    this.pause();
    this.set({ params: parameters({ ...this.p, [key]: value }), cycles: 0 });
  }
  private changeProbe(y: number) {
    if (!Number.isFinite(y)) return;
    this.set({ probe: clamp(y, -screenHalf, screenHalf) });
  }
  private reset = () => {
    this.pause();
    this.set({ params: { ...defaults }, cycles: 0, probe: 0, reference: null });
  };
  private endDrag() {
    if (this.drag?.node.hasPointerCapture(this.drag.id))
      this.drag.node.releasePointerCapture(this.drag.id);
    this.drag = undefined;
  }
  private pointer(e: PointerEvent, chart: boolean) {
    const target = e.currentTarget as SVGElement;
    if (e.type === "pointercancel" || e.type === "pointerup") {
      this.endDrag();
      return;
    }
    if (e.type === "pointerdown") {
      if (e.button !== 0) return;
      this.endDrag();
      this.drag = { node: target, id: e.pointerId };
      target.setPointerCapture(e.pointerId);
      target.focus({ preventScroll: true });
    }
    if (this.drag?.node !== target || this.drag.id !== e.pointerId) return;
    e.preventDefault();
    const svg =
      target instanceof SVGSVGElement ? target : target.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    this.changeProbe(
      chart
        ? (((point.x - plotGeometry.left) /
            (plotGeometry.right - plotGeometry.left)) *
            2 -
            1) *
            screenHalf
        : ((160 - point.y) / (sceneGeometry.bottom - 160)) * screenHalf,
    );
  }
  private scenePointer = (e: PointerEvent) => this.pointer(e, false);
  private chartPointer = (e: PointerEvent) => this.pointer(e, true);
  private probeKeys = (e: KeyboardEvent) => {
    const directions: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
    };
    if (!(e.key in directions) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    this.changeProbe(
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? screenHalf
          : this.data.probe +
            directions[e.key] * (e.shiftKey ? 0.5e-3 : 0.05e-3),
    );
  };
  private playback() {
    const t = texts(this.locale);
    return html`<phy-button
        @click=${() => (this.playing ? this.pause() : this.play())}
        >${this.playing ? "Ⅱ " + t.pause : "▷ " + t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}>${t.rewind}</phy-button>
      <phy-select
        label=${t.speed}
        .value=${String(this.data.rate)}
        .options=${[1, 0.5, 0.25].map((value) => ({ value: String(value), label: value + "×" }))}
        @change=${(e: Event) => this.set({ rate: Number((e.currentTarget as SelectElement).value) })}
      ></phy-select>`;
  }
  private parameter(
    key: keyof Parameters,
    label: string,
    scale: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    digits: number,
  ) {
    const value = this.p[key] * scale;
    return html`<div class="parameter">
      <label>${label}<output>${format(value, digits)} ${unit}</output></label>
      <phy-slider
        label=${label}
        .value=${value}
        .min=${min}
        .max=${max}
        .step=${step}
        value-text=${`${format(value, digits)} ${unit}`}
        @input=${(e: Event) => this.changeParameter(key, (e.currentTarget as SliderElement).value / scale)}
      ></phy-slider>
      <div class="range-ends">
        <span>${min} ${unit}</span><span>${max} ${unit}</span>
      </div>
    </div>`;
  }
  private layer(key: keyof Snapshot["layers"], label: string) {
    return html`<phy-checkbox
      .checked=${this.data.layers[key]}
      @change=${(e: Event) => this.set({ layers: { ...this.data.layers, [key]: (e.currentTarget as CheckboxElement).checked } })}
      >${label}</phy-checkbox
    >`;
  }
  private navigate(direction: -1 | 1) {
    const y = adjacentFringe(this.p, this.data.probe, direction, false);
    if (y !== null) this.changeProbe(y);
  }
  private loadTask(task: "wavelength" | "separation" | "distance") {
    this.pause();
    const p = {
      ...defaults,
      [task]:
        task === "wavelength" ? 650e-9 : task === "separation" ? 0.5e-3 : 3,
    };
    this.set({
      params: p,
      reference: { ...defaults },
      cycles: 0,
      probe: fringePosition(p, 1)!,
      observation: "intensity",
      support: "formula",
    });
    void this.updateComplete.then(() =>
      (
        this.renderRoot.querySelector(".observation-tabs") as TabsElement
      )?.focus(),
    );
  }
  private tasks() {
    const t = texts(this.locale);
    return html`<div class="task-grid">
      ${(
        [
          ["wavelength", t.taskWavelength, t.taskWavelengthHint],
          ["separation", t.taskSeparation, t.taskSeparationHint],
          ["distance", t.taskDistance, t.taskDistanceHint],
        ] as const
      ).map(
        ([task, title, hint], i) =>
          html`<article class="task">
            <h3>${i + 1}. ${title}</h3>
            <p>${hint}</p>
            <phy-button
              label=${t.load + ": " + title}
              @click=${() => this.loadTask(task)}
              >${t.load}</phy-button
            >
          </article>`,
      )}
    </div>`;
  }
  private formulas() {
    const t = texts(this.locale);
    return html`<div class="formula-content">
      <phy-math
        .source=${String.raw`\Delta=r_2-r_1,\quad \Delta\varphi=\frac{2\pi\Delta}{\lambda}`}
      ></phy-math>
      <phy-math
        .source=${String.raw`\frac{I}{I_{\max}}=\cos^2\!\left(\frac{\Delta\varphi}{2}\right)`}
      ></phy-math>
      <small>${t.formulaHint}</small><small>${t.normalized}</small>
    </div>`;
  }
  private openHelp = (e: Event) => {
    if (this.helpHandle || !this.context || this.context.signal.aborted) return;
    this.syncHelp();
    const handle = this.context.dialog.open({
      title: texts(this.locale).helpTitle,
      content: this.helpContent,
      width: "md",
      returnFocus: e.currentTarget as HTMLElement,
    });
    this.helpHandle = handle;
    void handle.closed.then(() => {
      if (this.helpHandle === handle) this.helpHandle = undefined;
    });
  };
  private syncHelp() {
    const t = texts(this.locale);
    const root =
      this.helpContent.shadowRoot ??
      this.helpContent.attachShadow({ mode: "open" });
    render(
      html`<style>
          :host {
            font: 13px/1.8 var(--font);
            color: var(--text);
          }
          p {
            margin: 12px 0;
          }
          phy-math {
            display: block;
            margin: 16px 0;
            font-size: 14px;
          }
          a {
            color: var(--primary);
          }
          :focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 3px;
          }
        </style>
        <p>${t.helpAssumptions}</p>
        <p>${t.helpGeometry}</p>
        <phy-math
          .source=${String.raw`r_1=\sqrt{L^2+(y-d/2)^2},\quad r_2=\sqrt{L^2+(y+d/2)^2}`}
        ></phy-math>
        <p>${t.helpIntensity}</p>
        <p>${t.colorHint}</p>
        <phy-math
          .source=${String.raw`\Delta=m\lambda\; (\mathrm{bright}),\qquad\Delta=(m+\tfrac12)\lambda\; (\mathrm{dark})`}
        ></phy-math>
        <p>${t.helpScale}</p>
        <p>${t.helpTime}</p>
        <p>${t.helpControls}</p>
        <p>
          <a
            href="https://web.mit.edu/viz/EM/visualizations/coursenotes/modules/guide14.pdf"
            target="_blank"
            rel="noopener noreferrer"
            >${t.sourceTitle}</a
          ><br />${t.sourceNote}
        </p>`,
      root,
    );
    this.helpLocale = this.locale;
    this.helpHandle?.update({ title: t.helpTitle });
  }
  protected render() {
    const t = texts(this.locale),
      s = this.state,
      d = derived(this.p);
    const dark = fringePosition(this.p, 0.5);
    const condition =
      s.intensity > 1 - 1e-8
        ? t.constructive
        : s.intensity < 1e-8
          ? t.destructive
          : t.intermediate;
    return html`<div class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        ${!this.context?.toolbar ? this.playback() : ""}<phy-button
          @click=${this.openHelp}
          >${t.help}</phy-button
        >
      </div>
      <div class="lab">
        <phy-box class="panel parameter-panel"
          ><div class="panel-heading">
            <h2>${t.parameters}</h2>
            <small>λ · d · L</small>
          </div>
          <div class="parameters">
            ${this.parameter("wavelength", t.wavelength, 1e9, 400, 700, 5, "nm", 0)}${this.parameter("separation", t.separation, 1e3, 0.1, 1, 0.01, "mm", 2)}${this.parameter("distance", t.distance, 1, 0.5, 3, 0.05, "m", 2)}
          </div>
          <div class="derived">
            <div>
              <span>${t.spacing}</span
              ><output data-readout="spacing"
                >${format(d.spacing * 1e3)} mm</output
              >
            </div>
            <div>
              <span>${t.period}</span
              ><output>${format(d.period * 1e15)} fs</output>
            </div>
          </div>
          <div class="layers" role="group" aria-label=${t.layers}>
            ${this.layer("paths", t.paths)}${this.layer("wavefronts", t.wavefronts)}${this.layer("orders", t.orders)}
          </div>
          <div class="parameter-footer">
            <phy-button @click=${this.reset}>${t.reset}</phy-button
            ><small>${t.parameterHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel main-panel"
          ><div class="panel-heading">
            <h2>${t.scene}</h2>
            <small>${t.coherent}</small>
          </div>
          <div class="scene-wrap">
            ${opticalScene(this.data, t, this.scenePointer, this.probeKeys, this.theme === "dark")}
          </div>
          <div class="readouts">
            <div>
              <span>${t.delta}</span
              ><output data-readout="delta"
                >${format(s.delta * 1e9, 1)} nm</output
              >
            </div>
            <div>
              <span>${t.phase}</span
              ><output data-readout="phase"
                >${format(s.phase / Math.PI)} π</output
              >
            </div>
            <div>
              <span>${t.intensity}</span
              ><output data-readout="intensity"
                >${format(s.intensity * 100, 1)} %</output
              >
            </div>
          </div>
          <div class="probe-control">
            <span>${t.probePosition}</span
            ><phy-slider
              label=${t.probePosition}
              .min=${-12}
              .max=${12}
              .step=${0.05}
              .value=${this.data.probe * 1e3}
              value-text=${format(this.data.probe * 1e3) + " mm"}
              @input=${(e: Event) => this.changeProbe((e.currentTarget as SliderElement).value * 1e-3)}
            ></phy-slider
            ><output data-readout="probe">${format(s.y * 1e3)} mm</output>
          </div>
          <div class="fringe-controls">
            <phy-button
              ?disabled=${adjacentFringe(this.p, s.y, -1, false) === null}
              @click=${() => this.navigate(-1)}
              >${t.previousBright}</phy-button
            ><phy-button @click=${() => this.changeProbe(0)}
              >${t.center}</phy-button
            ><phy-button
              ?disabled=${adjacentFringe(this.p, s.y, 1, false) === null}
              @click=${() => this.navigate(1)}
              >${t.nextBright}</phy-button
            ><phy-button
              ?disabled=${dark === null || Math.abs(dark) > screenHalf}
              title=${dark === null || Math.abs(dark) > screenHalf ? t.noFringe : ""}
              @click=${() => dark !== null && this.changeProbe(dark)}
              >${t.firstDark}</phy-button
            >
          </div>
          <div class="clock-control">
            <span>${t.clock}</span
            ><phy-slider
              label=${t.clock}
              .min=${0}
              .max=${4}
              .step=${0.005}
              .value=${this.data.cycles}
              value-text=${format(this.data.cycles) + " T"}
              @input=${(e: Event) => this.seek((e.currentTarget as SliderElement).value)}
            ></phy-slider
            ><output data-readout="cycles"
              >${format(this.data.cycles)} T</output
            >
          </div>
          <div class="scene-caption">
            <div class="time-scale">
              <span
                >${t.slow} · ${format(cyclesPerSecond * this.data.rate, 2)}
                ${t.cyclesPerSecond}</span
              ><span>${t.flight} = ${format(d.flight * 1e9)} ns</span>
            </div>
            <div>${t.sceneHint}</div>
            <div>${t.probeHint}</div>
          </div>
        </phy-box>
        <phy-box
          class=${"panel observation-panel" + (this.data.support === "tasks" ? " tasks-open" : "")}
        >
          <phy-tabs
            class="observation-tabs"
            label=${t.observation}
            .value=${this.data.observation}
            .items=${[
              { value: "intensity", label: t.intensityTab },
              { value: "phase", label: t.phaseTab },
            ]}
            @activate=${(e: Event) => {
              if (e.target !== e.currentTarget) return;
              this.set({
                observation: (e.currentTarget as TabsElement)
                  .value as Snapshot["observation"],
                support: "formula",
              });
            }}
          >
            ${
              this.data.support === "formula"
                ? html`<div
                    class="observation-content"
                    slot=${this.data.observation}
                  >
                    <div class="plot-wrap">
                      ${this.data.observation === "intensity" ? intensityChart(this.p, s, t, this.chartPointer, this.probeKeys) : phaseChart(this.p, s, this.data.cycles, t)}
                    </div>
                    <div class="observation-summary">
                      <strong data-readout="condition">${condition}</strong>
                      <div class="mono">${t.order} = ${format(s.order, 3)}</div>
                      <small
                        >${this.data.observation === "phase" ? t.phaseHint : t.intensityHint}</small
                      >
                      ${this.data.reference && this.data.observation === "intensity" ? html`<div class="comparison"><output data-readout="comparison">${t.comparison} = ${format(d.spacing / derived(this.data.reference).spacing, 3)}</output><small>${t.reference}: λ=${format(this.data.reference.wavelength * 1e9, 0)} nm · d=${format(this.data.reference.separation * 1e3)} mm · L=${format(this.data.reference.distance)} m</small></div>` : ""}
                    </div>
                  </div>`
                : ""
            }
          </phy-tabs>
          <phy-tabs
            class="support-tabs"
            variant="segmented"
            label=${t.support}
            .value=${this.data.support}
            .items=${[
              { value: "formula", label: t.formula },
              { value: "tasks", label: t.tasks },
            ]}
            @change=${(e: Event) => {
              if (e.target === e.currentTarget)
                this.set({
                  support: (e.currentTarget as TabsElement)
                    .value as Snapshot["support"],
                });
            }}
            ><div slot=${this.data.support}>
              ${this.data.support === "formula" ? this.formulas() : this.tasks()}
            </div></phy-tabs
          >
        </phy-box>
      </div>`;
  }
}

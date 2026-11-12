import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/contract";
import {
  parameters,
  waveAt,
  derived,
  duration,
  timeWindow,
  format,
  clamp,
  harmonic,
  type WaveParameters,
  type WaveMode,
} from "./model/physics";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import { renderScene, sceneGeometry } from "./components/scene";
import { waveChart, profileChart } from "./components/chart";
import { math, mathStyles } from "./components/math";
export class WaveExperiment extends LitElement {
  static properties = {
    data: { state: true },
    locale: { type: String },
    playing: { state: true },
    helpOpen: { state: true },
  };
  static styles = [mathStyles, styles];
  declare data: Snapshot;
  declare locale: Locale;
  declare playing: boolean;
  declare helpOpen: boolean;
  context?: ExperimentContext;
  private frame = 0;
  private last = 0;
  private toolbar?: HTMLDivElement;
  private toolbarKey = "";
  private observer?: ResizeObserver;
  private sceneNode?: Element;
  private chartNode?: Element;
  private sceneWidth = 700;
  private sceneHeight = 420;
  private chartHeight = 250;
  constructor() {
    super();
    this.data = normalizeSnapshot(null);
    this.locale = "zh-CN";
    this.playing = false;
    this.helpOpen = false;
  }
  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
    this.persist();
  }
  get p() {
    return this.data.params;
  }
  get point() {
    return waveAt(this.p, this.data.probe * this.p.length, this.data.time);
  }
  snapshot(): Snapshot {
    return structuredClone(this.data);
  }
  persist() {
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
    this.observer?.disconnect();
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
  updated() {
    if (!this.observer)
      this.observer = new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          if (entry.target === this.sceneNode) {
            const w = Math.round(entry.contentRect.width),
              h = Math.round(entry.contentRect.height);
            if (
              Math.abs(w - this.sceneWidth) > 1 ||
              Math.abs(h - this.sceneHeight) > 1
            ) {
              this.sceneWidth = w;
              this.sceneHeight = h;
              changed = true;
            }
          } else {
            const h = Math.max(
              130,
              Math.round(
                (entry.contentRect.height * 332) /
                  Math.max(1, entry.contentRect.width),
              ),
            );
            if (Math.abs(h - this.chartHeight) > 1) {
              this.chartHeight = h;
              changed = true;
            }
          }
        }
        if (changed) this.requestUpdate();
      });
    const scene = this.renderRoot.querySelector(".scene-wrap"),
      chart = this.renderRoot.querySelector(".chart-stack");
    for (const [old, next] of [
      [this.sceneNode, scene],
      [this.chartNode, chart],
    ]) {
      if (old !== next) {
        if (old) this.observer.unobserve(old);
        if (next) this.observer.observe(next);
      }
    }
    this.sceneNode = scene ?? undefined;
    this.chartNode = chart ?? undefined;
    if (this.helpOpen) {
      const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
      if (dialog && !dialog.open) dialog.showModal();
    }
    if (this.context?.toolbar) {
      if (!this.toolbar) {
        this.toolbar = document.createElement("div");
        this.toolbar.style.cssText = "display:flex;align-items:center;gap:8px";
        this.context.toolbar.setControls(this.toolbar);
      }
      const key = JSON.stringify([this.playing, this.data.rate, this.locale]);
      if (key !== this.toolbarKey) {
        this.toolbarKey = key;
        render(this.playback(), this.toolbar);
      }
    }
  }
  pause() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.persist();
  }
  play() {
    if (this.playing) return;
    if (!harmonic(this.p) && this.data.time >= duration(this.p))
      this.set({ time: 0 });
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) {
      const end = !harmonic(this.p) ? duration(this.p) : 1e5;
      const time = Math.min(
        end,
        this.data.time +
          Math.min(0.08, (now - this.last) / 1000) * this.data.rate,
      );
      this.data = { ...this.data, time };
      if (time >= end) {
        this.pause();
        return;
      }
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  restart() {
    this.pause();
    this.set({ time: 0 });
  }
  seek = (time: number) => {
    this.pause();
    this.set({ time: clamp(time, 0, 1e5) });
  };
  emit(polarity: 1 | -1 = this.p.polarity) {
    this.pause();
    this.set({ time: 0, params: parameters({ ...this.p, polarity }) });
    this.play();
  }
  changeParameter(name: keyof WaveParameters, value: number | string) {
    this.pause();
    this.set({ params: parameters({ ...this.p, [name]: value }), time: 0 });
  }
  changeMode(mode: WaveMode) {
    this.pause();
    this.set({
      time: 0,
      params: parameters({ ...this.p, mode }),
      support: "formula",
      parameterTab: mode === "travel" ? "source" : "medium",
    });
  }
  private setProbe = (probe: number) => this.set({ probe: clamp(probe, 0, 1) });
  private beginProbe = (e: PointerEvent) => {
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    this.moveProbe(e);
  };
  private moveProbe = (e: PointerEvent) => {
    const node = e.currentTarget as SVGElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    const svg = node.closest("svg"),
      matrix = svg?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    const g = sceneGeometry(this.p, this.sceneWidth, this.sceneHeight);
    this.setProbe((point.x - g.left) / (g.right - g.left));
  };
  private probeKeys = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    this.setProbe(
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? 1
          : this.data.probe +
            ((e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.5 : 0.1)) /
              this.p.length,
    );
  };
  private playback() {
    const t = texts(this.locale);
    return html`<phy-button
        variant="primary"
        @click=${() => (this.playing ? this.pause() : this.play())}
        >${this.playing ? "Ⅱ" : "▷"}
        ${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.restart()}>↺ ${t.restart}</phy-button>
      <phy-button
        aria-label=${t.step}
        @click=${() => this.seek(this.data.time + (harmonic(this.p) ? 1 / this.p.frequency : this.p.duration) / 40)}
        >▹</phy-button
      >
      <select
        aria-label=${t.rate}
        .value=${String(this.data.rate)}
        style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:7px;font-size:12px"
        @change=${(e: Event) => {
          this.last = 0;
          this.set({ rate: Number((e.target as HTMLSelectElement).value) });
        }}
      >
        <option value="1">1×</option>
        <option value="0.5">0.5×</option>
        <option value="0.25">0.25×</option>
      </select>`;
  }
  private parameter(
    name: "amplitude" | "speed" | "frequency" | "length" | "duration",
    symbol: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) {
    const t = texts(this.locale);
    return html`<div class="parameter">
      <label for=${name}
        ><span>${t[name]} <span class="muted">${symbol}</span></span
        ><span class="val">${format(this.p[name])} ${unit}</span></label
      >
      <input
        id=${name}
        type="range"
        aria-label=${t[name]}
        min=${min}
        max=${max}
        step=${step}
        .value=${String(this.p[name])}
        @input=${(e: Event) => this.changeParameter(name, Number((e.target as HTMLInputElement).value))}
      />
      <div class="limits">
        <span>${min} ${unit}</span><span>${max} ${unit}</span>
      </div>
    </div>`;
  }
  private parameterPanel() {
    const t = texts(this.locale),
      p = this.p,
      d = derived(p);
    return html`${
        this.data.parameterTab === "source"
          ? html` <div
                class="source-tabs"
                role="group"
                aria-label=${t.sourceType}
              >
                ${(["pulse", "sine"] as const).map((source) => html`<button class=${p.source === source ? "selected" : ""} aria-pressed=${p.source === source} @click=${() => this.changeParameter("source", source)}>${t[source]}</button>`)}
              </div>
              ${this.parameter("amplitude", "A", 0, 0.4, 0.01, "m")}
              ${
                p.source === "pulse"
                  ? html`${this.parameter("duration", "τ", 0.4, 2, 0.05, "s")}
                      <div class="emit-actions">
                        <button
                          class="primary"
                          aria-label=${t.emitUp}
                          @click=${() => this.emit(1)}
                        >
                          ${t.upward}</button
                        ><button
                          aria-label=${t.emitDown}
                          @click=${() => this.emit(-1)}
                        >
                          ${t.downward}
                        </button>
                      </div>`
                  : this.parameter("frequency", "f", 0.2, 2, 0.05, "Hz")
              }
              <p class="parameter-note">
                ${p.source === "pulse" ? t.sourceHint : t.rampHint}
              </p>`
          : html`${this.parameter("speed", "c", 1, 6, 0.1, "m/s")}${this.parameter("length", "L", 4, 12, 0.5, "m")}`
      }
      <div class="derived">
        ${(harmonic(p)
          ? [
              [t.wavelength, `${format(d.wavelength)} m`],
              [t.period, `${format(d.period)} s`],
            ]
          : [[t.pulseLength, `${format(d.pulseLength)} m`]]
        )
          .concat([[t.transit, `${format(d.transit)} s`]])
          .map(
            ([label, value]) =>
              html`<div class="derived-row">
                <span class="muted">${label}</span><span>${value}</span>
              </div>`,
          )}
      </div>`;
  }
  private moments() {
    const p = this.p,
      t = texts(this.locale),
      d = derived(p),
      pulse = p.source === "pulse";
    const lead = pulse ? p.duration / 2 : 0;
    return html`<div class="moments">
      <button @click=${() => this.seek(pulse ? lead : d.period)}>
        ${pulse ? t.launchCenter : t.launchSine}</button
      ><button @click=${() => this.seek(d.transit + lead)}>
        ${pulse ? t.boundaryCenter : t.boundaryFront}
      </button>
    </div>`;
  }
  private plotPanel() {
    const t = texts(this.locale),
      s = this.point;
    return html`<div class="plot">
      <div class="probe-control">
        <label for="probe-position"
          ><span>${t.probe} xₚ</span
          ><span class="val">${format(s.x)} m</span></label
        ><input
          id="probe-position"
          type="range"
          min="0"
          max="1"
          step=".001"
          .value=${String(this.data.probe)}
          aria-label=${t.probe + " xₚ"}
          @input=${(e: Event) => this.setProbe(Number((e.target as HTMLInputElement).value))}
        />
      </div>
      <p class="view-note">
        ${this.data.observation === "record" ? t.recordHint : t.spaceHint}
      </p>
      ${this.data.observation === "record" ? html`<div class="metric-tabs" role="group" aria-label=${t.record}>${(["y", "v"] as const).map((metric) => html`<button class=${this.data.metric === metric ? "selected" : ""} aria-pressed=${this.data.metric === metric} @click=${() => this.set({ metric })}>${metric === "y" ? t.displacement + " y" : t.velocity + " vᵧ"}</button>`)}</div>` : ""}
      <div class="chart-stack">
        ${this.data.observation === "record" ? waveChart(this.p, this.data.time, this.data.probe, this.data.metric, this.chartHeight, this.seek) : profileChart(this.p, this.data.time, this.data.probe, this.chartHeight, this.setProbe)}
      </div>
      <p class="view-note">
        ${this.p.amplitude === 0 ? t.zero : !harmonic(this.p) && this.data.time >= duration(this.p) ? t.endHint : t.travelExplain}
      </p>
    </div>`;
  }
  private observationKeys = async (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const observation =
      e.key === "Home"
        ? "record"
        : e.key === "End"
          ? "profile"
          : this.data.observation === "record"
            ? "profile"
            : "record";
    this.set({ observation });
    await this.updateComplete;
    this.renderRoot
      .querySelector<HTMLButtonElement>(
        ".observation-tabs [aria-selected=true]",
      )
      ?.focus();
  };
  private helpDialog() {
    const t = texts(this.locale);
    return html`<dialog
      class="help-dialog"
      @close=${() => {
        this.helpOpen = false;
        this.renderRoot
          .querySelector<HTMLButtonElement>(".parameter-footer button")
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
      <p>${t.helpIntro}</p>
      <p>${t.helpPulse}</p>
      <p>${t.helpBoundary}</p>
      <p>${t.probeHelp}</p>
      <div class="help-formulas">
        ${math(String.raw`y_{\mathrm{i}}(x,t)=s(t-x/c)`)}${math(String.raw`\lambda=c/f,\qquad T=1/f`)}${math(String.raw`v_y=\frac{\partial y}{\partial t},\qquad a_y=\frac{\partial^2y}{\partial t^2}`)}
      </div>
    </dialog>`;
  }
  render() {
    const t = texts(this.locale),
      p = this.p,
      s = this.point,
      { start, end } = timeWindow(p, this.data.time);
    return html`<div class="heading">
        <div class="heading-copy">
          <h1>${t.title}</h1>
          <p class="intro">${t.assumptions}</p>
        </div>
        <div class="mode-switch" role="group" aria-label=${t.model}>
          ${(["travel"] as const).map((mode) => html`<button class=${p.mode === mode ? "selected" : ""} aria-pressed=${p.mode === mode} @click=${() => this.changeMode(mode)}>${t[mode]}</button>`)}
        </div>
      </div>
      <div class="lab">
        <aside class="panel parameter-panel">
          <div class="panel-heading">
            ${t.parameters}<span
              class=${"status" + (this.playing ? " running" : "")}
              >${this.playing ? t.playing : t.pause}</span
            >
          </div>
          <div
            class="parameter-tabs"
            role="group"
            aria-label=${t.parameterGroup}
          >
            ${(["source", "medium"] as const).map((parameterTab) => html`<button class=${this.data.parameterTab === parameterTab ? "selected" : ""} aria-pressed=${this.data.parameterTab === parameterTab} @click=${() => this.set({ parameterTab })}>${t[parameterTab]}</button>`)}
          </div>
          <div class="parameter-body">${this.parameterPanel()}</div>
          <div class="parameter-footer">
            <button @click=${() => (this.helpOpen = true)}>${t.help}</button
            ><small>${t.restartHint}</small>
          </div>
        </aside>
        <section class="panel stage">
          <div class="scene-heading">
            <span>${t.spaceTitle} <span class="mono">y(x,t)</span></span
            ><small>${t.spaceHint}</small>
          </div>
          <div class="scene-wrap">
            ${renderScene({ params: p, time: this.data.time, probe: this.data.probe, layers: this.data.layers, locale: this.locale, width: this.sceneWidth, height: this.sceneHeight, pointerDown: this.beginProbe, pointerMove: this.moveProbe, keyDown: this.probeKeys, emit: () => this.emit() })}
          </div>
          <div class="scene-foot">
            <span>${t.scale}</span
            ><label
              ><input
                type="checkbox"
                .checked=${this.data.layers.velocity}
                @change=${(e: Event) => this.set({ layers: { ...this.data.layers, velocity: (e.target as HTMLInputElement).checked } })}
              />${t.velocityArrow}</label
            >
          </div>
          <div class="readouts">
            ${[
              [t.displacement, s.y, "m", "var(--blue)"],
              [t.velocity, s.v, "m/s", "var(--green)"],
              [t.acceleration, s.a, "m/s²", "var(--red)"],
            ].map(
              ([label, value, unit, color]) =>
                html`<div class="readout">
                  <small>${label}</small
                  ><span class="value" style=${"color:" + color}
                    >${format(Number(value), 3)}<span class="unit"
                      >${unit}</span
                    ></span
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <span>${format(start, 1)}s</span
            ><input
              type="range"
              min=${start}
              max=${end}
              step=".001"
              .value=${String(this.data.time)}
              aria-label=${t.timeline}
              @input=${(e: Event) => this.seek(Number((e.target as HTMLInputElement).value))}
            /><span>${format(end, 1)}s</span
            ><span class="time-label">t = ${format(this.data.time)} s</span>
          </div>
          ${this.moments()}
        </section>
        <aside class="panel observation-panel">
          <div
            class="observation-tabs"
            role="tablist"
            aria-label=${t.observation}
            @keydown=${this.observationKeys}
          >
            ${(["record", "profile"] as const).map((observation) => html`<button role="tab" aria-selected=${this.data.observation === observation} aria-controls="wave-observation" tabindex=${this.data.observation === observation ? 0 : -1} class=${this.data.observation === observation ? "selected" : ""} @click=${() => this.set({ observation })}>${t[observation]}</button>`)}
          </div>
          <div
            id="wave-observation"
            role="tabpanel"
            class="observation-content"
          >
            ${this.plotPanel()}
          </div>
          <section class="support">
            <div class="equation">${math(String.raw`y(x,t)=s(t-x/c)`)}</div>
            <p class="explanation">${t.travelExplain}</p>
          </section>
        </aside>
      </div>
      ${this.helpOpen ? this.helpDialog() : ""}`;
  }
}

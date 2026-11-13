import { LitElement, html, render } from "lit";
import { live } from "lit/directives/live.js";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/contract";
import {
  parameters,
  limits,
  derived,
  at,
  duration,
  playbackScale,
  momentTime,
  format,
  clamp,
  type LCParameters,
} from "./model/physics";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import { math, mathStyles } from "./components/math";
import { circuit } from "./components/circuit";
import { chart } from "./components/chart";

export class LCExperiment extends LitElement {
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
  private context?: ExperimentContext;
  private frame = 0;
  private last = 0;
  private toolbar?: HTMLDivElement;
  private toolbarKey = "";
  private observer?: ResizeObserver;
  private chartNode?: Element;
  private plotHeight = 160;
  private returnFocus?: HTMLElement;
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
  get state() {
    return at(this.p, this.data.time);
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
    this.observer?.disconnect();
    this.observer = undefined;
    this.chartNode = undefined;
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.hide);
    if (this.toolbar) render(null, this.toolbar);
    this.toolbar = undefined;
    this.toolbarKey = "";
    super.disconnectedCallback();
  }
  private visibility = () => {
    if (document.hidden) this.pause();
  };
  private hide = () => this.pause();
  protected updated() {
    if (!this.observer)
      this.observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = Math.max(
            105,
            Math.round(
              ((entry.contentRect.height - 10) * 332) /
                Math.max(1, entry.contentRect.width - 16) /
                2,
            ),
          );
          if (Math.abs(height - this.plotHeight) > 1) {
            this.plotHeight = height;
            this.requestUpdate();
          }
        }
      });
    const next = this.renderRoot.querySelector(".chart-stack");
    if (next !== this.chartNode) {
      if (this.chartNode) this.observer.unobserve(this.chartNode);
      if (next) this.observer.observe(next);
      this.chartNode = next ?? undefined;
    }
    if (this.helpOpen) {
      const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog");
      if (dialog && !dialog.open) dialog.showModal();
    }
    if (
      this.context?.toolbar &&
      this.isConnected &&
      !this.context.signal.aborted
    ) {
      if (!this.toolbar) {
        this.toolbar = document.createElement("div");
        this.toolbar.style.cssText = "display:flex;align-items:center;gap:8px";
        this.context.toolbar.setControls(this.toolbar);
      }
      const key = JSON.stringify([
        this.playing,
        this.data.closed,
        this.data.rate,
        this.locale,
      ]);
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
    if (this.playing || this.context?.signal.aborted || !this.isConnected)
      return;
    if (!this.data.closed || this.data.time >= duration(this.p))
      this.set({ closed: true, time: 0 });
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) {
      const time = Math.min(
        duration(this.p),
        this.data.time +
          Math.min(0.1, (now - this.last) / 1000) *
            playbackScale *
            this.data.rate,
      );
      this.data = { ...this.data, time };
      if (time >= duration(this.p)) {
        this.pause();
        return;
      }
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  private prepare = () => {
    this.pause();
    this.set({ closed: false, time: 0 });
  };
  private connect = () => {
    if (this.data.closed) this.prepare();
    else this.set({ closed: true, time: 0 });
  };
  private restart = () => {
    this.pause();
    this.set({ time: 0 });
  };
  private seek = (time: number) => {
    this.pause();
    this.set({ closed: true, time: clamp(time, 0, duration(this.p)) });
  };
  private changeParameter(name: keyof LCParameters, value: number) {
    this.pause();
    this.set({
      params: parameters({ ...this.p, [name]: value }),
      closed: false,
      time: 0,
    });
  }
  private playback() {
    const t = texts(this.locale);
    return html`<phy-button
        variant="primary"
        @click=${() => (this.playing ? this.pause() : this.play())}
        >${this.playing ? "Ⅱ" : "▷"}
        ${this.playing ? t.pause : this.data.closed ? t.play : t.start}</phy-button
      >
      <phy-button @click=${this.restart}>↺ ${t.restart}</phy-button>
      <select
        aria-label=${t.rate}
        .value=${live(String(this.data.rate))}
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
    name: keyof LCParameters,
    label: string,
    unit: string,
    scale: number,
    step: number,
  ) {
    const range = limits[name],
      digits = name === "voltage" ? 1 : 0;
    return html`<div class="parameter">
      <label for=${name}
        >${label}<output class="mono"
          >${format(this.p[name] * scale, digits)} ${unit}</output
        ></label
      >
      <input
        id=${name}
        type="range"
        aria-label=${label}
        min=${range.min * scale}
        max=${range.max * scale}
        step=${step}
        .value=${live(String(this.p[name] * scale))}
        @input=${(e: Event) => this.changeParameter(name, Number((e.target as HTMLInputElement).value) / scale)}
      />
      <div class="range-ends">
        <span>${format(range.min * scale, 0)}</span
        ><span>${format(range.max * scale, 0)} ${unit}</span>
      </div>
    </div>`;
  }
  private hint() {
    const t = texts(this.locale),
      s = this.state,
      d = derived(this.p);
    if (d.energy === 0) return t.empty;
    if (!this.data.closed) return t.readyHint;
    if (Math.abs(s.electric - s.magnetic) < d.energy * 1e-5) return t.equalHint;
    if (Math.abs(s.current) < d.current * 1e-5)
      return s.q >= 0 ? t.firstCharge : t.reversedCharge;
    if (Math.abs(s.q) < Math.abs(d.charge) * 1e-5)
      return s.current >= 0 ? t.firstCurrent : t.reversedCurrent;
    return t.exchange;
  }
  private openHelp = (e: Event) => {
    this.returnFocus = e.currentTarget as HTMLElement;
    this.helpOpen = true;
  };
  private closeHelp = () => {
    this.helpOpen = false;
    this.returnFocus?.focus();
  };
  private help() {
    const t = texts(this.locale);
    return this.helpOpen
      ? html`<dialog aria-label=${t.helpTitle} @close=${this.closeHelp}>
          <h2>${t.helpTitle}</h2>
          <p>${t.helpAssumptions}</p>
          <p>${t.helpSigns}</p>
          <div class="equation">
            ${math(String.raw`L\ddot q+\frac{q}{C}=0,\qquad \omega=\frac{1}{\sqrt{LC}}`)}
          </div>
          <p>${t.helpClock}</p>
          <p>${t.helpReset}</p>
          <p>${t.helpFields}</p>
          <p>${t.controlsHint}</p>
          <footer>
            <phy-button
              @click=${() => this.renderRoot.querySelector<HTMLDialogElement>("dialog")?.close()}
              >${t.dismiss}</phy-button
            >
          </footer>
        </dialog>`
      : "";
  }
  protected render() {
    const t = texts(this.locale),
      s = this.state,
      d = derived(this.p);
    const noCurrent = Math.abs(s.current) < d.current * 1e-6 || d.current === 0;
    return html`<header class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        <span class="model-note">${t.model}</span>
      </header>
      <div class="lab">
        <section class="panel parameter-panel" aria-label=${t.parameters}>
          <div class="panel-heading">
            <h2>${t.parameters}</h2>
            <small>${this.data.closed ? t.closed : t.prepared}</small>
          </div>
          <div class="parameters">
            ${this.parameter("inductance", t.inductance, "mH", 1e3, 5)}${this.parameter("capacitance", t.capacitance, "μF", 1e6, 5)}${this.parameter("voltage", t.initialVoltage, "V", 1, 0.5)}
          </div>
          <div class="derived">
            <div>
              <span>${t.period}</span
              ><output data-derived="period"
                >${format(d.period * 1e3)} ms</output
              >
            </div>
            <div>
              <span>${t.frequency}</span
              ><output>${format(d.frequency)} Hz</output>
            </div>
            <div>
              <span>${t.maximumCurrent}</span
              ><output>${format(d.current * 1e3)} mA</output>
            </div>
            <div>
              <span>${t.totalEnergy}</span
              ><output>${format(d.energy * 1e3, 3)} mJ</output>
            </div>
          </div>
          <div class="parameter-footer">
            <phy-button @click=${this.data.closed ? this.prepare : this.connect}
              >${this.data.closed ? t.charge : t.close}</phy-button
            ><phy-button @click=${this.openHelp}>${t.help}</phy-button
            ><small>${t.resetHint}</small>
          </div>
        </section>
        <section class="panel main-panel" aria-label=${t.circuit}>
          <div class="panel-heading">
            <h2>${t.circuit}</h2>
            <small>${this.data.closed ? t.closed : t.open}</small>
          </div>
          <div class="scene-wrap">
            ${circuit(this.p, s, this.data.closed, this.data.layers, t, this.connect)}
          </div>
          <div class="layer-controls">
            <div>
              ${(["fields", "current"] as const).map((key) => html`<label><input type="checkbox" .checked=${this.data.layers[key]} @change=${(e: Event) => this.set({ layers: { ...this.data.layers, [key]: (e.target as HTMLInputElement).checked } })} />${key === "fields" ? t.fields : t.currentArrows}</label>`)}
            </div>
            <span class="direction"
              >${noCurrent ? t.noCurrent : s.current > 0 ? t.clockwise : t.counterclockwise}</span
            >
          </div>
          <div class="readouts">
            <div class="readout charge">
              <label>${t.chargeLabel}</label
              ><output data-readout="q">${format(s.q * 1e6)}</output
              ><small>μC</small>
            </div>
            <div class="readout current">
              <label>${t.currentLabel}</label
              ><output data-readout="current">${format(s.current * 1e3)}</output
              ><small>mA</small>
            </div>
            <div class="readout voltage">
              <label>${t.voltageLabel}</label
              ><output data-readout="voltage">${format(s.voltage)}</output
              ><small>V</small>
            </div>
          </div>
          <div class="timeline">
            <div class="time-values">
              <output>${t.time} t = ${format(this.data.time * 1e3)} ms</output
              ><span
                >${t.playbackSecond} =
                ${format(playbackScale * this.data.rate * 1e3, 0)} ms
                ${t.experimentTime}</span
              >
            </div>
            <input
              type="range"
              aria-label=${t.timeCursor}
              aria-valuetext=${format(this.data.time * 1e3) + " ms"}
              min="0"
              max=${duration(this.p)}
              step=${derived(this.p).period / 1000}
              .value=${live(String(this.data.time))}
              @input=${(e: Event) => this.seek(Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="moments" role="group" aria-label=${t.moment}>
            ${[t.electricMaximum, t.magneticMaximum, t.reverseCharge, t.reverseCurrent].map((label, i) => html`<button @click=${() => this.seek(momentTime(this.p, i))}>${label}<small>${["0", "T/4", "T/2", "3T/4"][i]}</small></button>`)}
          </div>
        </section>
        <section class="panel observation-panel" aria-label=${t.observe}>
          <div class="panel-heading">
            <h2>${t.oscillation}</h2>
            <small>${t.phase} ${format((s.phase * 180) / Math.PI, 1)}°</small>
          </div>
          <p class="observation-summary">${this.hint()}</p>
          <div class="chart-stack">
            ${chart(this.p, this.data.time, [{ metric: "q", color: "var(--blue)" }], t.chartCharge, t.chartTime, this.plotHeight, this.seek)}${chart(this.p, this.data.time, [{ metric: "current", color: "var(--green)" }], t.chartCurrent, t.chartTime, this.plotHeight, this.seek)}
          </div>
          <div class="formula-content">
            <div class="equation">
              ${math(String.raw`q=CU_0\cos(\omega t)`)}
            </div>
            <div class="equation">
              ${math(String.raw`I=CU_0\omega\sin(\omega t)`)}
            </div>
            <div class="equation">${math(String.raw`T=2\pi\sqrt{LC}`)}</div>
            <p>${t.formulaHint}</p>
          </div>
          <div class="observation-footer">${t.fieldHint}</div>
        </section>
      </div>
      ${this.help()}`;
  }
}

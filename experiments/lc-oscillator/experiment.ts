import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
  CheckboxElement,
  SelectElement,
  SliderElement,
  TabsElement,
  DialogHandle,
} from "../../src/infra/platform/protocols/v2";
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
import { circuit } from "./components/circuit";
import { chart } from "./components/chart";
import { spring } from "./components/spring";

const observations: Snapshot["observation"][] = [
  "oscillation",
  "energy",
  "analogy",
];

export class LCExperiment extends LitElement {
  static properties = {
    data: { state: true },
    locale: { type: String },
    playing: { state: true },
    helpOpen: { state: true },
  };
  static styles = styles;
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
  private helpHandle?: DialogHandle;
  private helpLocale = "";
  private readonly helpContent = document.createElement("div");
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
    this.closeHelp();
    if (this.helpContent.shadowRoot) render(null, this.helpContent.shadowRoot);
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
    if (!this.isConnected || this.context?.signal.aborted) return;
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
    if (this.helpOpen) this.syncHelp();
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
  private async loadTask(task: Snapshot["task"]) {
    this.pause();
    const params = parameters(null);
    if (task === "voltage") params.voltage *= 2;
    if (task === "inductance") params.inductance *= 4;
    this.set({
      task,
      params,
      support: "formula",
      closed: task === "current",
      time: task === "current" ? momentTime(params, 1) : 0,
      observation: task === "inductance" ? "oscillation" : "energy",
    });
    await this.updateComplete;
    this.renderRoot.querySelector<TabsElement>(".observation-tabs")?.focus();
  }
  private taskComparison() {
    const t = texts(this.locale),
      d = derived(this.p),
      reference = derived(parameters(null));
    return html`<small class="task-reference">${t.taskBaseline}</small>
      <output class="task-comparison" aria-label=${t.taskCompare}>
        T/Tref = ${format(d.period / reference.period)} ·
        ${this.data.task === "inductance" ? `Iₘ/Iref = ${format(d.current / reference.current)}` : `E/Eref = ${format(d.energy / reference.energy)}`}
      </output>`;
  }
  private tasks() {
    const t = texts(this.locale);
    return html`<div class="task-grid">
      ${(
        [
          ["voltage", t.taskVoltage, t.taskVoltageHint],
          ["inductance", t.taskInductance, t.taskInductanceHint],
          ["current", t.taskZeroCharge, t.taskZeroChargeHint],
        ] as const
      ).map(
        ([task, title, hint], index) =>
          html`<article class="task" aria-labelledby=${`task-${task}`}>
            <h3 id=${`task-${task}`}>${index + 1}. ${title}</h3>
            <p>${hint}</p>
            <button @click=${() => this.loadTask(task)}>${t.loadPreset}</button>
          </article>`,
      )}
    </div>`;
  }
  private supportPanel() {
    const t = texts(this.locale);
    return html`<phy-tabs
      class="support support-tabs"
      variant="segmented"
      label=${t.support}
      .value=${this.data.support}
      .items=${(["formula", "tasks"] as const).map((value) => ({ value, label: t[value] }))}
      @change=${(e: Event) => {
        if (e.target !== e.currentTarget) return;
        this.set({
          support: (e.currentTarget as TabsElement)
            .value as Snapshot["support"],
        });
      }}
    >
      <div
        class=${"support-body " + (this.data.support === "formula" ? "formula-content" : "task-content")}
        slot=${this.data.support}
      >
        ${this.data.support === "formula" ? html`${this.formulas()}<small class="support-note">${this.data.observation === "analogy" ? t.normalized : t.fieldHint}</small>` : this.tasks()}
      </div>
    </phy-tabs>`;
  }
  private energyBar() {
    const t = texts(this.locale),
      s = this.state,
      total = derived(this.p).energy;
    const electric = total === 0 ? 0 : clamp(s.electric / total, 0, 1),
      magnetic = total === 0 ? 0 : clamp(s.magnetic / total, 0, 1);
    return html`<div class="energy-strip">
      <div class="energy-values">
        <span class="charge"
          >${t.electricShort}
          <output data-readout="electric"
            >${format(s.electric * 1e3, 3)}</output
          ></span
        >
        <span class="current"
          >${t.magneticShort}
          <output data-readout="magnetic"
            >${format(s.magnetic * 1e3, 3)}</output
          ></span
        >
        <span
          >Σ
          <output data-readout="total">${format(s.total * 1e3, 3)}</output>
          mJ</span
        >
      </div>
      <div
        class="energy-bar"
        data-electric=${electric}
        data-magnetic=${magnetic}
        role="img"
        aria-label=${total === 0 ? t.empty : `${t.electricShort} ${format(electric * 100, 0)}%, ${t.magneticShort} ${format(magnetic * 100, 0)}%`}
      >
        <span style=${`width:${electric * 100}%;background:var(--blue)`}></span
        ><span
          style=${`width:${magnetic * 100}%;background:var(--green)`}
        ></span>
      </div>
    </div>`;
  }
  private plots() {
    const t = texts(this.locale);
    if (this.data.observation === "analogy") {
      if (derived(this.p).energy === 0)
        return html`<div class="normalization-empty">
          ${t.noNormalization}
        </div>`;
      return html`<div class="chart-legend">
          <span class="charge">━ q/Qₘ ↔ x/A</span
          ><span class="current">┄ −I/Iₘ ↔ v/vₘ</span>
        </div>
        <div class="chart-stack analogy-stack">
          ${spring(this.p, this.state, t)}
          ${chart(
            this.p,
            this.data.time,
            [
              { metric: "position", color: "var(--blue)" },
              { metric: "velocity", color: "var(--green)", dash: "6 4" },
            ],
            t.chartNormalized,
            t.chartTime,
            this.plotHeight,
            this.seek,
          )}
        </div>`;
    }
    if (this.data.observation === "energy")
      return html` <div class="chart-legend">
          <span class="charge">━ ${t.electricShort}</span
          ><span class="current">┄ ${t.magneticShort}</span
          ><span>┈ ${t.totalEnergy}</span>
        </div>
        <div class="chart-stack single">
          ${chart(
            this.p,
            this.data.time,
            [
              { metric: "electric", color: "var(--blue)" },
              { metric: "magnetic", color: "var(--green)", dash: "6 4" },
              { metric: "total", color: "var(--text)", dash: "2 4" },
            ],
            t.chartEnergy,
            t.chartTime,
            this.plotHeight * 2,
            this.seek,
          )}
        </div>`;
    return html`<div class="chart-stack">
      ${chart(this.p, this.data.time, [{ metric: "q", color: "var(--blue)" }], t.chartCharge, t.chartTime, this.plotHeight, this.seek)}
      ${chart(this.p, this.data.time, [{ metric: "current", color: "var(--green)" }], t.chartCurrent, t.chartTime, this.plotHeight, this.seek)}
    </div>`;
  }
  private formulas() {
    const t = texts(this.locale);
    if (this.data.observation === "analogy")
      return html` <div class="equation">
          <phy-math
            .source=${String.raw`q\leftrightarrow x,\quad -I\leftrightarrow v`}
          ></phy-math>
        </div>
        <div class="equation">
          <phy-math
            .source=${String.raw`L\leftrightarrow m,\quad C^{-1}\leftrightarrow k`}
          ></phy-math>
        </div>
        <div class="equation">
          <phy-math
            .source=${String.raw`\frac{1}{\sqrt{LC}}\leftrightarrow\sqrt{\frac{k}{m}}`}
          ></phy-math>
        </div>
        <p>${t.analogyHint}</p>`;
    return this.data.observation === "energy"
      ? html` <div class="equation">
            <phy-math
              .source=${String.raw`E_C=\frac{q^2}{2C},\quad E_L=\frac{LI^2}{2}`}
            ></phy-math>
          </div>
          <div class="equation">
            <phy-math .source=${String.raw`E_C+E_L=\frac12 CU_0^2`}></phy-math>
          </div>
          <p>${t.energyHint}</p>`
      : html` <div class="equation">
            <phy-math .source=${String.raw`q=CU_0\cos(\omega t)`}></phy-math>
          </div>
          <div class="equation">
            <phy-math
              .source=${String.raw`I=CU_0\omega\sin(\omega t)`}
            ></phy-math>
          </div>
          <div class="equation">
            <phy-math .source=${String.raw`T=2\pi\sqrt{LC}`}></phy-math>
          </div>
          <p>${t.formulaHint}</p>`;
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
      <phy-select
        label=${t.rate}
        .value=${String(this.data.rate)}
        .options=${[1, 0.5, 0.25].map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        @change=${(e: Event) => {
          this.last = 0;
          this.set({ rate: Number((e.currentTarget as SelectElement).value) });
        }}
      ></phy-select>`;
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
      <phy-slider
        id=${name}
        label=${label}
        value-text=${`${format(this.p[name] * scale, digits)} ${unit}`}
        min=${range.min * scale}
        max=${range.max * scale}
        step=${step}
        .value=${this.p[name] * scale}
        @input=${(e: Event) => this.changeParameter(name, (e.currentTarget as SliderElement).value / scale)}
      ></phy-slider>
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
    this.helpHandle?.close();
  };
  private syncHelp() {
    if (
      !this.context ||
      this.context.signal.aborted ||
      !this.isConnected ||
      (this.helpHandle && this.helpLocale === this.locale)
    )
      return;
    const t = texts(this.locale);
    const root =
      this.helpContent.shadowRoot ??
      this.helpContent.attachShadow({ mode: "open" });
    render(
      html`<style>
          :host {
            color: var(--text);
            font: 13px/1.8 var(--font);
          }
          p {
            margin: 12px 0;
          }
          .equation {
            text-align: center;
            margin: 18px 0;
            font-size: 14px;
          }
        </style>
        <p>${t.helpAssumptions}</p>
        <p>${t.helpSigns}</p>
        <div class="equation">
          <phy-math
            .source=${String.raw`L\ddot q+\frac{q}{C}=0,\qquad \omega=\frac{1}{\sqrt{LC}}`}
          ></phy-math>
        </div>
        <p>${t.helpClock}</p>
        <p>${t.helpReset}</p>
        <p>${t.helpFields}</p>
        <p>${t.helpAnalogy}</p>
        <p>${t.controlsHint}</p>`,
      root,
    );
    this.helpLocale = this.locale;
    if (this.helpHandle) this.helpHandle.update({ title: t.helpTitle });
    else {
      const handle = this.context.dialog.open({
        title: t.helpTitle,
        content: this.helpContent,
        width: "md",
        returnFocus: this.returnFocus,
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
        <phy-box
          role="complementary"
          class="panel parameter-panel"
          aria-label=${t.parameters}
        >
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
          <div class="comparison-summary">${this.taskComparison()}</div>
          <div class="parameter-footer">
            <phy-button @click=${this.data.closed ? this.prepare : this.connect}
              >${this.data.closed ? t.charge : t.close}</phy-button
            ><phy-button @click=${this.openHelp}>${t.help}</phy-button
            ><small>${t.resetHint}</small>
          </div>
        </phy-box>
        <phy-box role="region" class="panel main-panel" aria-label=${t.circuit}>
          <div class="panel-heading">
            <h2>${t.circuit}</h2>
            <small
              >${this.data.closed ? t.closed : t.open} ·
              ${format((s.phase * 180) / Math.PI, 1)}°</small
            >
          </div>
          <div class="scene-wrap">
            ${circuit(this.p, s, this.data.closed, this.data.layers, t, this.connect)}
          </div>
          <div class="layer-controls">
            <div>
              ${(["fields", "current"] as const).map((key) => html`<phy-checkbox .checked=${this.data.layers[key]} @change=${(e: Event) => this.set({ layers: { ...this.data.layers, [key]: (e.currentTarget as CheckboxElement).checked } })}>${key === "fields" ? t.fields : t.currentArrows}</phy-checkbox>`)}
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
          ${this.energyBar()}
          <div class="timeline">
            <div class="time-values">
              <output>${t.time} t = ${format(this.data.time * 1e3)} ms</output
              ><span
                >${t.playbackSecond} =
                ${format(playbackScale * this.data.rate * 1e3, 0)} ms
                ${t.experimentTime}</span
              >
            </div>
            <phy-slider
              label=${t.timeCursor}
              value-text=${format(this.data.time * 1e3) + " ms"}
              min="0"
              max=${duration(this.p)}
              step=${derived(this.p).period / 1000}
              .value=${this.data.time}
              @input=${(e: Event) => this.seek((e.currentTarget as SliderElement).value)}
            ></phy-slider>
          </div>
          <div class="moments" role="group" aria-label=${t.moment}>
            ${[t.electricMaximum, t.magneticMaximum, t.reverseCharge, t.reverseCurrent, t.equalEnergy].map((label, i) => html`<button ?disabled=${d.energy === 0} @click=${() => this.seek(momentTime(this.p, i))}>${label}<small>${["0", "T/4", "T/2", "3T/4", "T/8"][i]}</small></button>`)}
          </div>
        </phy-box>
        <phy-box
          role="complementary"
          class=${"panel observation-panel" + (this.data.support === "tasks" ? " exploring" : "")}
          aria-label=${t.observe}
        >
          <phy-tabs
            class="observation-tabs"
            label=${t.observe}
            .value=${this.data.observation}
            .items=${observations.map((value) => ({ value, label: t[value] }))}
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
                    <p class="observation-summary">${this.hint()}</p>
                    ${this.plots()}
                  </div>`
                : ""
            }
          </phy-tabs>
          ${this.supportPanel()}
        </phy-box>
      </div>`;
  }
}

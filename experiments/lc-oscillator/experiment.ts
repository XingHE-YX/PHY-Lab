import { LitElement, html, render } from "lit";
import type {
  ExperimentContext,
  Locale,
  CheckboxElement,
  SelectElement,
  SliderElement,
  TabsElement,
  RadioGroupElement,
  DialogHandle,
} from "../../src/infra/platform/protocols/v2";
import {
  parameters,
  limits,
  derived,
  at,
  playbackScale,
  momentTime,
  format,
  clamp,
  type LCParameters,
} from "./model/physics";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import {
  buildTransient,
  sampleTransient,
  transientValues,
  switchLimits,
  switchParameters,
  type SwitchParameters,
  type TransientProfile,
} from "./model/transient";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import { circuit } from "./components/circuit";
import { chart } from "./components/chart";
import { spring } from "./components/spring";
import { transientChart } from "./components/transient-chart";

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
  private transientCache?: { key: string; profile: TransientProfile };
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
  private get runParameters() {
    return {
      ...this.p,
      voltage:
        Math.hypot(
          this.data.seed.q,
          this.data.seed.current / derived(this.p).omega,
        ) / this.p.capacitance,
    };
  }
  get state() {
    const event = this.data.transient,
      profile = this.profile;
    if (!this.data.closed && event && profile) {
      const point = sampleTransient(profile, event.elapsed);
      const energy = transientValues(this.p, event.model, point);
      return {
        time: event.at + point.time,
        phase: 0,
        q: point.voltage * this.p.capacitance,
        current: point.current,
        voltage: point.voltage,
        currentRate: energy.inductorVoltage / this.p.inductance,
        electric: energy.electric,
        magnetic: energy.magnetic,
        total: energy.electric + energy.magnetic,
      };
    }
    return at(this.p, this.data.time, this.data.seed);
  }
  private get profile() {
    const event = this.data.transient;
    if (!event) return undefined;
    const key = JSON.stringify([this.p, event.initial, event.model]);
    if (this.transientCache?.key !== key)
      this.transientCache = {
        key,
        profile: buildTransient(this.p, event.initial, event.model),
      };
    return this.transientCache.profile;
  }
  private get replaying() {
    return !this.data.closed && !!this.data.transient;
  }
  private get transientTime() {
    return this.profile && this.data.transient
      ? sampleTransient(this.profile, this.data.transient.elapsed).time
      : 0;
  }
  private get switchVoltage() {
    if (this.data.closed) return 0;
    return this.profile && this.data.transient
      ? sampleTransient(this.profile, this.data.transient.elapsed).switchVoltage
      : this.state.voltage;
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
          const height = entry.target.classList.contains("transient-plot")
            ? Math.max(
                150,
                Math.round(
                  (entry.contentRect.height * 332) /
                    Math.max(1, entry.contentRect.width),
                ),
              )
            : Math.max(
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
    const next = this.renderRoot.querySelector(".chart-stack, .transient-plot");
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
        this.data.transient?.elapsed === 0,
        this.replaying,
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
    if (this.replaying) {
      const event = this.data.transient!,
        profile = this.profile!;
      if (profile.duration === 0) return;
      if (event.elapsed >= profile.duration)
        this.set({ transient: { ...event, elapsed: 0 }, support: "transient" });
    } else if (!this.data.closed) this.set({ closed: true, time: 0 });
    this.playing = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.last) {
      const delta = Math.min(0.1, (now - this.last) / 1000) * this.data.rate;
      if (this.replaying) {
        const event = this.data.transient!,
          profile = this.profile!;
        const scale = Math.log1p(profile.duration / profile.timeScale);
        const progress = Math.min(
          1,
          Math.log1p(event.elapsed / profile.timeScale) / scale + delta / 4,
        );
        const elapsed =
          progress === 1
            ? profile.duration
            : profile.timeScale * Math.expm1(progress * scale);
        this.data = { ...this.data, transient: { ...event, elapsed } };
        if (progress === 1) {
          this.pause();
          return;
        }
      } else
        this.data = {
          ...this.data,
          time: this.data.time + delta * playbackScale,
        };
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
  private prepare = () => {
    this.pause();
    this.set({
      closed: false,
      time: 0,
      seed: { q: this.p.capacitance * this.p.voltage, current: 0 },
      transient: null,
      support:
        this.data.support === "transient" ? "formula" : this.data.support,
    });
  };
  private connect = () => {
    this.pause();
    if (this.data.closed) {
      const state = this.state;
      this.set({
        closed: false,
        support: "transient",
        transient: {
          at: this.data.time,
          initial: { q: state.q, current: state.current },
          model: { ...this.data.switch },
          elapsed: 0,
        },
      });
      this.play();
    } else {
      const point = this.profile?.points.at(-1);
      const seed = point
        ? { q: point.voltage * this.p.capacitance, current: point.current }
        : this.data.seed;
      this.set({
        closed: true,
        time: 0,
        seed,
        support: "formula",
        transient:
          this.data.transient && this.profile
            ? { ...this.data.transient, elapsed: this.profile.duration }
            : null,
      });
      this.play();
    }
  };
  private restart = () => {
    this.pause();
    if (this.replaying)
      this.set({
        transient: { ...this.data.transient!, elapsed: 0 },
        support: "transient",
      });
    else this.set({ time: 0 });
  };
  private seek = (time: number) => {
    this.pause();
    if (this.replaying) return;
    this.set({ closed: true, time: Math.max(0, time) });
  };
  private seekTransient = (time: number) => {
    this.pause();
    if (this.data.transient && this.profile)
      this.set({
        closed: false,
        transient: {
          ...this.data.transient,
          elapsed: clamp(time, 0, this.profile.duration),
        },
      });
  };
  private changeParameter(name: keyof LCParameters, value: number) {
    this.pause();
    const params = parameters({ ...this.p, [name]: value });
    this.set({
      params,
      seed: { q: params.capacitance * params.voltage, current: 0 },
      transient: null,
      support:
        this.data.support === "transient" ? "formula" : this.data.support,
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
      seed: { q: params.capacitance * params.voltage, current: 0 },
      transient: null,
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
      d = derived(this.runParameters),
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
      .items=${[
        ...[
          { value: "formula", label: t.formula },
          { value: "tasks", label: t.tasks },
        ],
        ...(this.data.transient
          ? [{ value: "transient", label: t.transientTab }]
          : []),
      ]}
      @change=${(e: Event) => {
        if (e.target !== e.currentTarget) return;
        this.set({
          support: (e.currentTarget as TabsElement)
            .value as Snapshot["support"],
        });
      }}
    >
      <div
        class=${"support-body " + (this.data.support === "formula" ? "formula-content" : this.data.support === "transient" ? "transient-content" : "task-content")}
        slot=${this.data.support}
      >
        ${this.data.support === "transient" ? this.transientPanel() : this.data.support === "formula" ? html`${this.formulas()}<small class="support-note">${this.data.observation === "analogy" ? t.normalized : t.fieldHint}</small>` : this.tasks()}
      </div>
    </phy-tabs>`;
  }
  private transientPanel() {
    const t = texts(this.locale),
      event = this.data.transient,
      profile = this.profile;
    if (!event || !profile) return "";
    const point = sampleTransient(profile, event.elapsed),
      values = transientValues(this.p, event.model, point);
    const error =
      profile.initialEnergy === 0
        ? 0
        : (Math.abs(values.stored + values.dissipated - profile.initialEnergy) /
            profile.initialEnergy) *
          100;
    return html`<p class="transient-model">
        ${t.transientApprox}<br />Cₚ ${format(event.model.capacitance * 1e9, 1)}
        nF · Uᵦ ${format(event.model.breakdown, 0)} V · Rₜ
        ${format(event.model.resistance, 0)} Ω
      </p>
      <phy-radio-group
        variant="segmented"
        label=${t.transientPlot}
        .value=${this.data.transientMetric}
        .options=${[
          { value: "voltage", label: t.voltage },
          { value: "current", label: t.current },
          { value: "energy", label: t.transientEnergy },
        ]}
        @change=${(e: Event) => this.set({ transientMetric: (e.currentTarget as RadioGroupElement).value as Snapshot["transientMetric"] })}
      ></phy-radio-group>
      <div class="transient-legend">
        ${this.data.transientMetric === "voltage" ? "━ Uₛ　┄ Uʟ" : this.data.transientMetric === "current" ? "━ I / mA" : `━ E꜀　┄ Eʟ　┈ Eₚ　━ ${t.lossShort}`}
      </div>
      <div class="transient-plot">
        ${transientChart(this.p, profile, event.elapsed, this.data.transientMetric, this.data.transientZoom, t, this.seekTransient, this.plotHeight)}
      </div>
      <div class="transient-summary">
        <div>
          <small>${t.peakSwitch}</small
          ><output data-transient="peak"
            >${format(profile.peakVoltage)} V</output
          >
        </div>
        <div title=${t.transientTimeHint}>
          <small>${t.settlingTime}</small
          ><output>${format(profile.duration * 1e6, 1)} μs</output>
        </div>
        <div>
          <small>${t.dissipatedEnergy}</small
          ><output data-transient="loss"
            >${format(values.dissipated * 1e3, 4)} mJ</output
          >
        </div>
        <div>
          <small>${t.energyBalance}</small
          ><output data-transient="balance">${format(error, 6)}%</output>
        </div>
      </div>
      <div class="transient-tools">
        <phy-button
          ?disabled=${profile.duration === 0}
          @click=${() => {
            this.seekTransient(0);
            this.play();
          }}
          >${t.transientReplay}</phy-button
        >
        <phy-select
          label=${t.transientZoomLabel}
          .value=${this.data.transientZoom}
          .options=${[
            { value: "impulse", label: t.impulseZoom },
            { value: "full", label: t.fullTransient },
          ]}
          @change=${(e: Event) => this.set({ transientZoom: (e.currentTarget as SelectElement).value as Snapshot["transientZoom"] })}
        ></phy-select>
      </div>`;
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
    const p = this.runParameters;
    if (this.replaying)
      return html`<p class="normalization-empty">${t.transientUnavailable}</p>`;
    if (this.data.observation === "analogy") {
      if (derived(p).energy === 0)
        return html`<div class="normalization-empty">
          ${t.noNormalization}
        </div>`;
      return html`<div class="chart-legend">
          <span class="charge">━ q/Qₘ ↔ x/A</span
          ><span class="current">┄ −I/Iₘ ↔ v/vₘ</span>
        </div>
        <div class="chart-stack analogy-stack">
          ${spring(p, this.state, t)}
          ${chart(
            p,
            this.data.time,
            [
              { metric: "position", color: "var(--blue)" },
              { metric: "velocity", color: "var(--green)", dash: "6 4" },
            ],
            t.chartNormalized,
            t.chartTime,
            this.plotHeight,
            this.seek,
            this.data.seed,
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
            p,
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
            this.data.seed,
          )}
        </div>`;
    return html`<div class="chart-stack">
      ${chart(p, this.data.time, [{ metric: "q", color: "var(--blue)" }], t.chartCharge, t.chartTime, this.plotHeight, this.seek, this.data.seed)}
      ${chart(p, this.data.time, [{ metric: "current", color: "var(--green)" }], t.chartCurrent, t.chartTime, this.plotHeight, this.seek, this.data.seed)}
    </div>`;
  }
  private formulas() {
    const t = texts(this.locale);
    if (this.replaying)
      return html`<phy-math
          .source=${String.raw`E_0=E_C+E_L+E_p+E_{\mathrm{diss}}`}
        ></phy-math>
        <p>${t.transientBalanceHint}</p>`;
    if (
      this.data.observation !== "analogy" &&
      (Math.abs(this.data.seed.q - this.p.capacitance * this.p.voltage) >
        1e-12 ||
        Math.abs(this.data.seed.current) > 1e-12)
    )
      return html`<div class="equation">
          <phy-math
            .source=${String.raw`q=q_0\cos(\omega t)-\frac{I_0}{\omega}\sin(\omega t)`}
          ></phy-math>
        </div>
        <div class="equation">
          <phy-math
            .source=${String.raw`I=q_0\omega\sin(\omega t)+I_0\cos(\omega t)`}
          ></phy-math>
        </div>
        <p>${t.residualInitial}</p>`;
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
    return html`${this.data.closed || (this.replaying && this.profile!.duration > 0) ? html`<phy-button variant="primary" @click=${() => (this.playing ? this.pause() : this.play())}>${this.playing ? "Ⅱ" : "▷"} ${this.replaying ? (this.playing ? t.pauseReplay : t.resumeReplay) : this.playing ? t.pause : t.play}</phy-button>` : ""}
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
      d = derived(this.runParameters);
    if (d.energy === 0) return t.empty;
    if (this.replaying) return t.transientUnavailable;
    if (!this.data.closed) return t.readyHint;
    if (Math.abs(s.electric - s.magnetic) < d.energy * 1e-5) return t.equalHint;
    if (Math.abs(s.current) < d.current * 1e-5)
      return s.q >= 0 ? t.firstCharge : t.reversedCharge;
    if (Math.abs(s.q) < Math.abs(d.charge) * 1e-5)
      return s.current >= 0 ? t.firstCurrent : t.reversedCurrent;
    return t.exchange;
  }
  private switchParameter(
    name: keyof SwitchParameters,
    label: string,
    unit: string,
    scale: number,
    step: number,
  ) {
    const range = switchLimits[name],
      value = this.data.switch[name] * scale;
    return html`<div class="parameter">
      <label for=${"switch-" + name}
        >${label}<output
          >${format(value, name === "capacitance" ? 1 : 0)} ${unit}</output
        ></label
      >
      <phy-slider
        id=${"switch-" + name}
        label=${label}
        value-text=${`${value} ${unit}`}
        .value=${value}
        min=${range.min * scale}
        max=${range.max * scale}
        step=${step}
        @input=${(event: Event) => this.set({ switch: switchParameters({ ...this.data.switch, [name]: (event.currentTarget as SliderElement).value / scale }) })}
      ></phy-slider>
      <div class="range-ends">
        <span>${format(range.min * scale, name === "capacitance" ? 1 : 0)}</span
        ><span>${format(range.max * scale, 0)} ${unit}</span>
      </div>
    </div>`;
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
        <p>${t.helpTransient}</p>
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
      d = derived(this.runParameters);
    const noCurrent = Math.abs(s.current) < d.current * 1e-6 || d.current === 0;
    return html`<header class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        <span class="model-note"
          >${this.replaying ? t.transientApprox : t.model}</span
        >
      </header>
      <div class="lab">
        <phy-box
          role="complementary"
          class="panel parameter-panel"
          aria-label=${t.parameters}
        >
          <div class="panel-heading">
            <h2>${t.parameters}</h2>
            <small
              >${this.replaying ? t.disconnected : this.data.closed ? t.closed : t.prepared}</small
            >
          </div>
          <phy-tabs
            class="parameter-tabs"
            variant="segmented"
            label=${t.parameterGroup}
            .value=${this.data.parameterTab}
            .items=${[
              { value: "circuit", label: t.circuitGroup },
              { value: "switch", label: t.switchGroup },
            ]}
            @change=${(event: Event) => {
              if (event.target === event.currentTarget)
                this.set({
                  parameterTab: (event.currentTarget as TabsElement)
                    .value as Snapshot["parameterTab"],
                });
            }}
          >
            <div class="parameters" slot=${this.data.parameterTab}>
              ${this.data.parameterTab === "circuit" ? html`${this.parameter("inductance", t.inductance, "mH", 1e3, 5)}${this.parameter("capacitance", t.capacitance, "μF", 1e6, 5)}${this.parameter("voltage", t.initialVoltage, "V", 1, 0.5)}` : html`${this.switchParameter("capacitance", t.switchCapacitance, "nF", 1e9, 0.1)}${this.switchParameter("breakdown", t.breakdownVoltage, "V", 1, 50)}${this.switchParameter("resistance", t.transientResistance, "Ω", 1, 50)}`}
            </div>
          </phy-tabs>
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
            <phy-button @click=${this.prepare}>${t.charge}</phy-button
            ><phy-button @click=${this.openHelp}>${t.help}</phy-button
            ><small
              >${this.data.parameterTab === "switch" ? t.switchParameterNote : t.resetHint}</small
            >
          </div>
        </phy-box>
        <phy-box role="region" class="panel main-panel" aria-label=${t.circuit}>
          <div class="panel-heading">
            <h2>${t.circuit}</h2>
            <small
              >${this.replaying ? t.transientSlow : this.data.closed ? t.closed : t.open}
              ·
              ${this.replaying ? `${format(this.transientTime * 1e6, 1)} μs` : `${format((s.phase * 180) / Math.PI, 1)}°`}</small
            >
          </div>
          <div class="scene-wrap">
            ${circuit(
              this.p,
              s,
              this.data.closed,
              this.data.layers,
              t,
              this.connect,
              {
                voltage: this.switchVoltage,
                power:
                  this.replaying && this.profile
                    ? transientValues(
                        this.p,
                        this.data.transient!.model,
                        sampleTransient(
                          this.profile,
                          this.data.transient!.elapsed,
                        ),
                      ).arcPower
                    : 0,
              },
            )}
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
            <div class="readout switch-voltage">
              <label>${t.switchVoltage}</label
              ><output data-readout="switch-voltage"
                >${format(this.switchVoltage)}</output
              ><small>V</small>
            </div>
          </div>
          ${this.energyBar()}
          <div class="clock-readout">
            <div class="time-values">
              <output
                >${this.replaying ? `Δt = ${format(this.transientTime * 1e6, 1)} μs` : `${t.time} t = ${format(this.data.time * 1e3)} ms`}</output
              ><span
                >${this.replaying ? t.transientSlow : `${t.playbackSecond} = ${format(playbackScale * this.data.rate * 1e3, 0)} ms ${t.experimentTime}`}</span
              >
            </div>
          </div>
          <div class="moments" role="group" aria-label=${t.moment}>
            ${[t.electricMaximum, t.magneticMaximum, t.reverseCharge, t.reverseCurrent, t.equalEnergy].map((label, i) => html`<button ?disabled=${d.energy === 0 || this.replaying} @click=${() => this.seek(momentTime(this.p, i))}>${label}<small>${["0", "T/4", "T/2", "3T/4", "T/8"][i]}</small></button>`)}
          </div>
        </phy-box>
        <phy-box
          role="complementary"
          class=${"panel observation-panel" + (this.data.support !== "formula" ? " exploring" : "")}
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

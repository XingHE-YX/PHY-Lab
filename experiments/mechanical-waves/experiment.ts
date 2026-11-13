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
import {
  parameters,
  waveAt,
  derived,
  duration,
  timeWindow,
  format,
  clamp,
  harmonic,
  standingSites,
  standingAmplitude,
  type WaveParameters,
  type WaveMode,
} from "./model/physics";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import { texts } from "./locales/messages";
import { styles } from "./styles/desktop";
import { renderScene, sceneGeometry } from "./components/scene";
import { waveChart, profileChart } from "./components/chart";
export class WaveExperiment extends LitElement {
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
  context?: ExperimentContext;
  private helpHandle?: DialogHandle;
  private helpLocale = "";
  private readonly helpContent = document.createElement("div");
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
    if (this.helpOpen) this.syncHelp();
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
    this.set({
      time: clamp(time, 0, harmonic(this.p) ? 1e5 : duration(this.p)),
    });
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
        label=${t.step}
        @click=${() => this.seek(this.data.time + (harmonic(this.p) ? 1 / this.p.frequency : this.p.duration) / 40)}
        >▹</phy-button
      >
      <phy-select
        label=${t.rate}
        .value=${String(this.data.rate)}
        .options=${[
          { value: "1", label: "1×" },
          { value: "0.5", label: "0.5×" },
          { value: "0.25", label: "0.25×" },
        ]}
        @change=${(e: Event) => {
          this.last = 0;
          this.set({ rate: Number((e.target as SelectElement).value) });
        }}
      ></phy-select>`;
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
      <phy-slider
        id=${name}
        label=${t[name]}
        value-text=${format(this.p[name]) + " " + unit}
        min=${min}
        max=${max}
        step=${step}
        .value=${this.p[name]}
        @input=${(e: Event) => this.changeParameter(name, Number((e.target as SliderElement).value))}
      ></phy-slider>
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
          ? html` ${
                p.mode !== "standing"
                  ? html`<phy-radio-group
                      class="source-tabs"
                      variant="segmented"
                      label=${t.sourceType}
                      .value=${p.source}
                      .options=${(["pulse", "sine"] as const).map((value) => ({ value, label: t[value] }))}
                      @change=${(e: Event) => this.changeParameter("source", (e.currentTarget as RadioGroupElement).value as WaveParameters["source"])}
                    ></phy-radio-group>`
                  : ""
              }
              ${this.parameter("amplitude", "A", 0, 0.4, 0.01, "m")}
              ${
                !harmonic(p)
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
                ${p.mode === "standing" ? t.preparedHint : p.source === "pulse" ? t.sourceHint : t.rampHint}
              </p>`
          : html`${this.parameter("speed", "c", 1, 6, 0.1, "m/s")}${this.parameter("length", "L", 4, 12, 0.5, "m")}
            ${
              p.mode !== "travel"
                ? html`<div class="boundary-label">${t.boundary}</div>
                    <phy-radio-group
                      class="boundary-tabs"
                      variant="segmented"
                      label=${t.boundary}
                      .value=${p.boundary}
                      .options=${(["fixed", "free"] as const).map((value) => ({ value, label: t[value] }))}
                      @change=${(e: Event) => this.changeParameter("boundary", (e.currentTarget as RadioGroupElement).value as WaveParameters["boundary"])}
                    ></phy-radio-group>
                    <p class="parameter-note">${t.boundaryHint}</p>`
                : ""
            }`
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
    if (p.mode === "standing") {
      const start = timeWindow(p, this.data.time).start;
      return html`<div class="moments">
        ${([1, 2, 3] as const).map((n) => html`<button @click=${() => this.seek(start + (n * d.period) / 4)}>${n === 1 ? t.quarter : n === 2 ? t.half : t.threeQuarter}</button>`)}
        ${(["node", "antinode"] as const).map((kind) => html`<button ?disabled=${!standingSites(p, kind).length} title=${standingSites(p, kind).length ? "" : p.amplitude === 0 ? t.zero : kind === "node" ? t.noNode : t.noAntinode} @click=${() => this.selectSite(kind)}>${kind === "node" ? t.pickNode : t.pickAntinode}</button>`)}
      </div>`;
    }
    return html`<div class="moments">
      <button @click=${() => this.seek(pulse ? lead : d.period)}>
        ${pulse ? t.launchCenter : t.launchSine}</button
      ><button @click=${() => this.seek(d.transit + lead)}>
        ${pulse ? t.boundaryCenter : t.boundaryFront}
      </button>
      ${p.mode === "reflection" ? html`<button @click=${() => this.seek((2 * p.length - this.point.x) / p.speed + lead)}>${pulse ? t.returnCenter : t.returnFront}</button>` : ""}
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
        ><phy-slider
          id="probe-position"
          min="0"
          max="1"
          step=".001"
          .value=${this.data.probe}
          label=${t.probe + " xₚ"}
          value-text=${format(s.x) + " m"}
          @input=${(e: Event) => this.setProbe(Number((e.target as SliderElement).value))}
        ></phy-slider>
      </div>
      <p class="view-note">
        ${this.data.observation === "record" ? t.recordHint : t.spaceHint}
      </p>
      ${this.data.observation === "record" ? html`<phy-radio-group class="metric-tabs" variant="segmented" label=${t.record} .value=${this.data.metric} .options=${(["y", "v"] as const).map((value) => ({ value, label: value === "y" ? t.displacement + " y" : t.velocity + " vᵧ" }))} @change=${(e: Event) => this.set({ metric: (e.currentTarget as RadioGroupElement).value as Snapshot["metric"] })}></phy-radio-group>` : ""}
      <div class="chart-stack">
        ${this.data.observation === "record" ? waveChart(this.p, this.data.time, this.data.probe, this.data.metric, this.chartHeight, this.seek) : profileChart(this.p, this.data.time, this.data.probe, this.chartHeight, this.setProbe, this.data.layers)}
      </div>
      ${
        this.data.observation === "profile" && this.p.mode !== "travel"
          ? html`<div class="component-values" aria-label=${t.componentAt}>
              ${[
                [t.incident, s.incident],
                [t.reflected, s.reflected],
                [t.total, s.y],
              ].map(
                ([label, value]) =>
                  html`<div>
                    <small>${label}</small><b>${format(Number(value), 3)} m</b>
                  </div>`,
              )}
            </div>`
          : ""
      }
      <p class="view-note">${this.observationNote}</p>
    </div>`;
  }
  private get observationNote() {
    const t = texts(this.locale),
      p = this.p,
      layers = this.data.layers;
    if (p.amplitude === 0) return t.zero;
    if (
      this.data.observation === "profile" &&
      !layers.total &&
      !layers.incident &&
      !(layers.reflected && p.mode !== "travel")
    )
      return t.allHidden;
    if (p.mode === "standing") return t.standingHint;
    if (!harmonic(p) && this.data.time >= duration(p)) return t.endHint;
    return this.data.observation === "profile"
      ? t.layersHint
      : p.mode === "reflection"
        ? t.reflectionExplain
        : t.travelExplain;
  }
  private layerControls() {
    const t = texts(this.locale);
    return html`<div class="layer-controls" role="group" aria-label=${t.layers}>
      ${(["total", "incident", "reflected"] as const).map((layer) => html`<phy-checkbox ?disabled=${layer === "reflected" && this.p.mode === "travel"} .checked=${this.data.layers[layer]} @change=${(e: Event) => this.set({ layers: { ...this.data.layers, [layer]: (e.target as CheckboxElement).checked } })}><span aria-hidden="true" class=${"swatch " + layer}></span>${t[layer]}</phy-checkbox>`)}
      ${this.p.mode === "standing" ? html`<phy-checkbox .checked=${this.data.layers.sites} @change=${(e: Event) => this.set({ layers: { ...this.data.layers, sites: (e.target as CheckboxElement).checked } })}>${t.markers}</phy-checkbox>` : ""}
    </div>`;
  }
  private equations() {
    const t = texts(this.locale),
      p = this.p;
    const formula =
      p.mode === "travel"
        ? String.raw`y(x,t)=s(t-x/c)`
        : p.mode === "reflection"
          ? String.raw`y=y_{\mathrm{i}}+y_{\mathrm{r}}`
          : p.boundary === "fixed"
            ? String.raw`y=2A\sin[q(L-x)]\cos(\omega t)`
            : String.raw`y=2A\cos[q(L-x)]\sin(\omega t)`;
    return html` <div class="equation">
        <phy-math .source=${formula}></phy-math>
      </div>
      ${p.mode === "reflection" ? html`<div class="equation"><phy-math .source=${String.raw`y_{\mathrm{r}}=R\,s\!\left(t-\frac{2L-x}{c}\right)`}></phy-math></div>` : p.mode === "standing" ? html`<div class="equation"><phy-math .source=${String.raw`q=\frac{2\pi}{\lambda},\quad \lambda=\frac{c}{f}`}></phy-math></div>` : ""}
      <p class="explanation">
        ${p.mode === "travel" ? t.travelExplain : p.mode === "reflection" ? t.reflectionExplain : t.standingExplain}
      </p>`;
  }
  private selectSite(kind: "node" | "antinode") {
    const sites = standingSites(this.p, kind),
      x = this.point.x;
    const next = sites.find((site) => site > x + 1e-7) ?? sites[0];
    if (next !== undefined) this.setProbe(next / this.p.length);
  }
  private async applyTask(index: number) {
    this.pause();
    const p = parameters({
      mode: index === 0 ? "travel" : index === 1 ? "reflection" : "standing",
    });
    const d = derived(p),
      probe =
        index === 2
          ? (p.length - d.wavelength / 4) / p.length
          : index === 1
            ? 0.7
            : 0.5;
    const time =
      index === 2
        ? d.period / 4
        : index === 1
          ? (2 - probe) * d.transit + p.duration / 2
          : probe * d.transit + p.duration / 3;
    this.set({
      params: p,
      time,
      probe,
      support: "formula",
      observation: index === 1 ? "profile" : "record",
      metric: "v",
      parameterTab: index === 1 ? "medium" : "source",
      layers: {
        ...this.data.layers,
        total: true,
        incident: index === 1,
        reflected: index === 1,
        sites: true,
      },
    });
    await this.updateComplete;
    this.renderRoot.querySelector<TabsElement>(".observation-tabs")?.focus();
  }
  private supportPanel() {
    const t = texts(this.locale);
    return html`<phy-tabs
      class=${"support support-tabs" + (this.data.support === "tasks" ? " exploring" : "")}
      label=${t.support}
      .value=${this.data.support}
      .items=${[
        { value: "formula", label: t.equations },
        { value: "tasks", label: t.tasks },
      ]}
      @change=${(e: Event) => {
        if (e.target !== e.currentTarget) return;
        this.set({
          support: (e.currentTarget as TabsElement)
            .value as Snapshot["support"],
        });
      }}
    >
      <div class="support-body" slot=${this.data.support}>
        ${
          this.data.support === "formula"
            ? this.equations()
            : html`<p class="view-note">${t.taskPresetHint}</p>
                <div class="task-grid">
                  ${[
                    [t.task1, t.task1Hint, t.task1Action],
                    [t.task2, t.task2Hint, t.task2Action],
                    [t.task3, t.task3Hint, t.task3Action],
                  ].map(
                    ([title, hint, action], index) =>
                      html`<article class="task">
                        <h3>${title}</h3>
                        <p>${hint}</p>
                        <button @click=${() => this.applyTask(index)}>
                          ${action}
                        </button>
                      </article>`,
                  )}
                </div>`
        }
      </div></phy-tabs
    >`;
  }
  private syncHelp() {
    if (!this.context || (this.helpHandle && this.helpLocale === this.locale))
      return;
    const t = texts(this.locale);
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
          .help-formulas {
            display: grid;
            gap: 18px;
            margin-top: 20px;
            font-size: 15px;
          }
        </style>
        <p>${t.helpIntro}</p>
        <p>${t.helpPulse}</p>
        <p>${t.helpBoundary}</p>
        <p>${t.helpStanding}</p>
        <p>${t.probeHelp}</p>
        <div class="help-formulas">
          <phy-math
            .source=${String.raw`y_{\mathrm{i}}(x,t)=s(t-x/c)`}
          ></phy-math
          ><phy-math .source=${String.raw`\lambda=c/f,\qquad T=1/f`}></phy-math
          ><phy-math
            .source=${String.raw`v_y=\frac{\partial y}{\partial t},\qquad a_y=\frac{\partial^2y}{\partial t^2}`}
          ></phy-math>
        </div> `,
      root,
    );
    this.helpLocale = this.locale;
    if (this.helpHandle) this.helpHandle.update({ title: t.help });
    else {
      const handle = this.context.dialog.open({
        title: t.help,
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
  render() {
    const t = texts(this.locale),
      p = this.p,
      s = this.point,
      { start, end } = timeWindow(p, this.data.time);
    return html`<div class="heading">
        <div class="heading-copy">
          <h1>${t.title}</h1>
          <p class="intro">
            ${p.mode === "standing" ? t.prepared : t.assumptions}
          </p>
        </div>
        <phy-radio-group
          class="mode-switch"
          variant="segmented"
          label=${t.model}
          .value=${p.mode}
          .options=${(["travel", "reflection", "standing"] as const).map((value) => ({ value, label: t[value] }))}
          @change=${(e: Event) => this.changeMode((e.currentTarget as RadioGroupElement).value as WaveMode)}
        ></phy-radio-group>
      </div>
      <div class="lab">
        <phy-box role="complementary" class="panel parameter-panel">
          <div class="panel-heading">
            ${t.parameters}<span
              class=${"status" + (this.playing ? " running" : "")}
              >${this.playing ? t.playing : t.pause}</span
            >
          </div>
          <phy-tabs
            class="parameter-tabs"
            variant="segmented"
            label=${t.parameterGroup}
            .value=${this.data.parameterTab}
            .items=${(["source", "medium"] as const).map((value) => ({ value, label: t[value] }))}
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
            <button @click=${() => (this.helpOpen = true)}>${t.help}</button
            ><small>${t.restartHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel stage">
          <div class="scene-heading">
            <span>${t.spaceTitle} <span class="mono">y(x,t)</span></span
            ><small
              >${p.mode === "standing" ? `${t.nodes} ${standingSites(p, "node").length} · ${t.antinodes} ${standingSites(p, "antinode").length}` : t.spaceHint}</small
            >
          </div>
          ${this.layerControls()}
          <div class="scene-wrap">
            ${renderScene({ params: p, time: this.data.time, probe: this.data.probe, layers: this.data.layers, locale: this.locale, width: this.sceneWidth, height: this.sceneHeight, pointerDown: this.beginProbe, pointerMove: this.moveProbe, keyDown: this.probeKeys, emit: () => this.emit() })}
          </div>
          <div class="scene-foot">
            <span
              >${p.mode === "standing" ? `${t.pointAmplitude} ${format(standingAmplitude(p, s.x), 3)} m · ${t.nodeSpacing} ${format(derived(p).wavelength / 2)} m` : t.scale}</span
            ><phy-checkbox
              .checked=${this.data.layers.velocity}
              @change=${(e: Event) => this.set({ layers: { ...this.data.layers, velocity: (e.target as CheckboxElement).checked } })}
              >${t.velocityArrow}</phy-checkbox
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
            ><phy-slider
              min=${start}
              max=${end}
              step=".001"
              .value=${this.data.time}
              label=${t.timeline}
              value-text=${format(this.data.time) + " s"}
              @input=${(e: Event) => this.seek(Number((e.target as SliderElement).value))}
            ></phy-slider
            ><span>${format(end, 1)}s</span
            ><span class="time-label">t = ${format(this.data.time)} s</span>
          </div>
          ${this.moments()}
        </phy-box>
        <phy-box
          role="complementary"
          class=${"panel observation-panel" + (this.data.support === "tasks" ? " exploring" : "")}
        >
          <phy-tabs
            class="observation-tabs"
            label=${t.observation}
            .value=${this.data.observation}
            .items=${(["record", "profile"] as const).map((value) => ({ value, label: t[value] }))}
            @activate=${(e: Event) => {
              if (e.target !== e.currentTarget) return;
              this.set({
                observation: (e.currentTarget as TabsElement)
                  .value as Snapshot["observation"],
                support: "formula",
              });
            }}
          >
            ${this.data.support === "formula" ? html`<div class="observation-content" slot=${this.data.observation}>${this.plotPanel()}</div>` : ""}
          </phy-tabs>
          ${this.supportPanel()}
        </phy-box>
      </div> `;
  }
}

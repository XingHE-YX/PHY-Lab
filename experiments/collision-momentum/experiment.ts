import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  RadioGroupElement,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import {
  chartTimeFromEvent,
  number,
  plotQuantities,
  totals,
  units,
} from "./components/quantities";
import { scene, velocityCoordinate } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  clamp,
  defaults,
  limits,
  makeTrial,
  parameterValue,
  scenarios,
  type Cart,
  type Metric,
  type Mode,
  type Parameter,
  type Parameters,
  type ScenarioPreset,
  type Trial,
} from "./model/physics";
import {
  normalizeSnapshot,
  type Rate,
  type Snapshot,
  type Support,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const timelineSteps = 4000;
const metrics: Metric[] = ["momentum", "kinetic"];
const modes: Mode[] = ["elastic", "inelastic"];
const velocityKey = (cart: Cart) =>
  cart === "left" ? "leftVelocity" : "rightVelocity";
const equations = {
  elastic: String.raw`p_{\rm i}=p_{\rm f},\quad K_{\rm i}=K_{\rm f}`,
  inelastic: String.raw`v_{\rm f}=\frac{m_{\rm A}u_{\rm A}+m_{\rm B}u_{\rm B}}{m_{\rm A}+m_{\rm B}}`,
  noContact: String.raw`u_{\rm A}\le u_{\rm B}\quad\Longrightarrow\quad v_i=u_i`,
};

export class CollisionExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    data: { state: true },
    playing: { state: true },
    chartHeight: { state: true },
  };
  declare locale: Locale;
  declare private data: Snapshot;
  declare private playing: boolean;
  declare private chartHeight: number;
  private context?: ExperimentContext;
  private readonly controls = document.createElement("div");
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;
  private frame?: number;
  private previousFrame?: number;
  private pointer?: {
    id: number;
    cart: Cart;
    coordinate: number;
    velocity: number;
  };
  private chartPointer?: number;
  private chartObserver?: ResizeObserver;
  private observedChartWrap?: Element;
  private cached?: { parameters: Parameters; trial: Trial };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.playing = false;
    this.chartHeight = 190;
    this.controls.style.cssText = "display:flex;align-items:center;gap:8px";
    this.help.attachShadow({ mode: "open" });
  }

  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
    this.persist();
  }

  snapshot(): Snapshot {
    return structuredClone(this.data);
  }

  private get trial() {
    const { parameters } = this.data;
    if (this.cached?.parameters !== parameters)
      this.cached = { parameters, trial: makeTrial(parameters) };
    return this.cached.trial;
  }

  connectedCallback() {
    super.connectedCallback();
    this.context?.toolbar?.setControls(this.controls);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.onHide);
  }

  disconnectedCallback() {
    this.pause();
    this.dialog?.close();
    this.chartObserver?.disconnect();
    this.chartObserver = undefined;
    this.observedChartWrap = undefined;
    render(nothing, this.help.shadowRoot!);
    this.context?.toolbar?.setControls(null);
    render(nothing, this.controls);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.onHide);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    const previous = changed.get("data") as Snapshot | undefined;
    if (
      !previous ||
      previous.rate !== this.data.rate ||
      changed.has("playing") ||
      changed.has("locale")
    )
      render(this.playback(), this.controls);
    if (this.dialog && changed.has("locale")) this.updateHelp();
    this.syncChartObserver();
  }

  private syncChartObserver() {
    const wrap = this.renderRoot.querySelector(".chart-wrap");
    if (wrap === this.observedChartWrap) return;
    this.chartObserver?.disconnect();
    this.observedChartWrap = wrap ?? undefined;
    if (!wrap) return;
    this.chartObserver = new ResizeObserver((entries) => {
      const height = Math.round(entries[0]?.contentRect.height ?? 0);
      if (height >= 120 && Math.abs(height - this.chartHeight) > 2)
        this.chartHeight = height;
    });
    this.chartObserver.observe(wrap);
  }

  private persist() {
    this.context?.storage.write(this.snapshot());
  }

  private set(patch: Partial<Snapshot>) {
    this.data = { ...this.data, ...patch };
    this.persist();
  }

  private visibility = () => {
    if (document.hidden) this.pause();
  };

  private onHide = () => this.pause();

  private stop() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.previousFrame = undefined;
    this.playing = false;
  }

  pause() {
    this.stop();
    this.pointer = undefined;
    this.chartPointer = undefined;
    this.persist();
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    const elapsed =
      this.previousFrame === undefined ? 0 : (now - this.previousFrame) / 1000;
    this.previousFrame = now;
    const { duration } = this.trial;
    const time = Math.min(duration, this.data.time + elapsed * this.data.rate);
    this.data = { ...this.data, time };
    if (time >= duration) this.pause();
    else this.frame = requestAnimationFrame(this.tick);
  };

  private toggle = () => {
    if (this.playing) {
      this.pause();
      return;
    }
    if (this.data.time >= this.trial.duration) this.set({ time: 0 });
    this.playing = true;
    this.frame = requestAnimationFrame(this.tick);
  };

  private seek = (time: number) => {
    this.stop();
    this.pointer = undefined;
    this.set({ time: clamp(time, 0, this.trial.duration) });
  };

  private configure(patch: Partial<Parameters>) {
    this.stop();
    this.chartPointer = undefined;
    this.set({ parameters: { ...this.data.parameters, ...patch }, time: 0 });
  }

  private restoreDefaults = () => {
    this.stop();
    this.pointer = undefined;
    this.chartPointer = undefined;
    this.set({ parameters: { ...defaults }, time: 0 });
  };

  private loadScenario(preset: ScenarioPreset) {
    this.stop();
    this.pointer = undefined;
    this.chartPointer = undefined;
    this.set({
      parameters: { ...preset.parameters },
      time: 0,
      metric: preset.metric,
      support: "formula",
    });
    void this.updateComplete.then(() => {
      (
        this.renderRoot.querySelector(".observation-tabs") as HTMLElement | null
      )?.focus?.();
    });
  }

  private change(key: Parameter, input: number) {
    const value = parameterValue(key, input);
    if (value !== this.data.parameters[key]) this.configure({ [key]: value });
  }

  private adjust = {
    start: (cart: Cart, event: PointerEvent) => {
      if (
        event.button !== 0 ||
        this.pointer ||
        this.data.time !== 0 ||
        this.playing
      )
        return;
      const coordinate = velocityCoordinate(event);
      if (coordinate === null) return;
      this.pointer = {
        id: event.pointerId,
        cart,
        coordinate,
        velocity: this.data.parameters[velocityKey(cart)],
      };
      (event.currentTarget as SVGGraphicsElement).setPointerCapture(
        event.pointerId,
      );
    },
    move: (event: PointerEvent) => {
      const pointer = this.pointer;
      if (pointer?.id !== event.pointerId) return;
      const coordinate = velocityCoordinate(event);
      if (coordinate !== null)
        this.change(
          velocityKey(pointer.cart),
          pointer.velocity + coordinate - pointer.coordinate,
        );
    },
    end: (event: PointerEvent) => {
      if (this.pointer?.id === event.pointerId) this.pointer = undefined;
    },
    key: (cart: Cart, event: KeyboardEvent) => {
      const key = velocityKey(cart);
      const { min, max, step } = limits[key];
      const current = this.data.parameters[key];
      const size = step * (event.shiftKey ? 4 : 1);
      const next =
        event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? current - size
          : event.key === "ArrowRight" || event.key === "ArrowUp"
            ? current + size
            : event.key === "Home"
              ? min
              : event.key === "End"
                ? max
                : null;
      if (next === null) return;
      event.preventDefault();
      this.change(key, next);
    },
  };

  private chartScrub = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.chartPointer !== undefined) return;
      const next = chartTimeFromEvent(event, this.trial.duration);
      if (next === null) return;
      this.pause();
      this.chartPointer = event.pointerId;
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.seek(next);
    },
    move: (event: PointerEvent) => {
      if (this.chartPointer !== event.pointerId) return;
      const next = chartTimeFromEvent(event, this.trial.duration);
      if (next !== null) this.seek(next);
    },
    end: (event: PointerEvent) => {
      if (this.chartPointer === event.pointerId) this.chartPointer = undefined;
    },
  };

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button variant="primary" @click=${this.toggle}
        ><span aria-hidden="true">${this.playing ? "Ⅱ" : "▷"}</span>
        ${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}
        ><span aria-hidden="true">↺</span> ${t.reset}</phy-button
      >
      <phy-select
        .label=${t.rate}
        .value=${String(this.data.rate)}
        .options=${[1, 0.5, 0.25].map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        @change=${(event: Event) => {
          this.previousFrame = undefined;
          this.set({
            rate: Number((event.currentTarget as SelectElement).value) as Rate,
          });
        }}
      ></phy-select>`;
  }

  private parameter(key: Parameter, t: Messages) {
    const { min, max, step, unit } = limits[key];
    const value = this.data.parameters[key];
    const label = `${number(value)} ${unit}`;
    return html`<div class="parameter">
      <div class="parameter-label">
        <span>${t[key]}</span><output>${label}</output>
      </div>
      <phy-slider
        .label=${t[key]}
        .valueText=${label}
        .value=${value}
        .min=${min}
        .max=${max}
        .step=${step}
        @input=${(event: Event) => this.change(key, (event.currentTarget as SliderElement).value)}
      ></phy-slider>
      <div class="limits" aria-hidden="true">
        <span>${min}</span><span>${max} ${unit}</span>
      </div>
    </div>`;
  }

  private updateHelp() {
    const t = messages(this.locale);
    render(
      html`<style>
          p {
            color: var(--text);
            line-height: 1.65;
            margin: 0 0 12px;
          }
          p:last-child {
            margin-bottom: 0;
          }
        </style>
        ${t.helpBody.map((paragraph) => html`<p>${paragraph}</p>`)}`,
      this.help.shadowRoot!,
    );
    this.dialog?.update({ title: t.help });
  }

  private openHelp = (event: Event) => {
    if (!this.context || this.dialog) return;
    this.pause();
    this.updateHelp();
    const dialog = this.context.dialog.open({
      title: messages(this.locale).help,
      content: this.help,
      width: "md",
      returnFocus: event.currentTarget as HTMLElement,
    });
    this.dialog = dialog;
    void dialog.closed.then(() => {
      if (this.dialog === dialog) this.dialog = undefined;
    });
  };

  private observationPanel(
    t: Messages,
    trial: Trial,
    sample: ReturnType<Trial["at"]>,
  ) {
    const { time, metric, support } = this.data;
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observe}
      .value=${metric}
      .items=${metrics.map((value) => ({ value, label: t[value] }))}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          metric: (event.currentTarget as TabsElement).value as Metric,
          support: "formula",
        });
      }}
      @activate=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        if (this.data.support !== "formula") this.set({ support: "formula" });
      }}
    >
      ${
        support === "formula"
          ? html`<div class="observation" slot=${metric}>
              ${totals(trial, sample, t)}
              ${plotQuantities(
                trial,
                sample,
                time,
                metric,
                this.chartHeight,
                this.chartScrub,
                t,
              )}
            </div>`
          : nothing
      }
    </phy-tabs>`;
  }

  private supportPanel(t: Messages, trial: Trial) {
    const { parameters, support } = this.data;
    const outcome = trial.contact === null ? "noContact" : parameters.mode;
    const hint =
      outcome === "noContact"
        ? t.noContactHint
        : outcome === "elastic"
          ? t.elasticHint
          : t.inelasticHint;
    return html`<phy-tabs
      class="support support-tabs"
      variant="segmented"
      .label=${t.supportLabel}
      .value=${support}
      .items=${[
        { value: "formula", label: t.formulaTab },
        { value: "explore", label: t.exploreTab },
      ]}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          support: (event.currentTarget as TabsElement).value as Support,
        });
      }}
    >
      <div class="support-body" slot=${support}>
        ${
          support === "formula"
            ? html`<section class="model-formula">
                <phy-math .source=${equations[outcome]}></phy-math>
                <p>${hint}</p>
              </section>`
            : html`<div class="explore-content">
                <p class="explore-hint">${t.exploreHint}</p>
                <div class="scenario-grid">
                  ${scenarios.map((preset) => {
                    const copy = t.scenarios[preset.id];
                    return html`<article class="scenario-card">
                      <h3>${copy.title}</h3>
                      <p>${copy.detail}</p>
                      <button
                        type="button"
                        data-scenario=${preset.id}
                        @click=${() => this.loadScenario(preset)}
                      >
                        ${t.loadScenario}
                      </button>
                    </article>`;
                  })}
                </div>
              </div>`
        }
      </div>
    </phy-tabs>`;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, vectors, centerOfMass, support } = this.data;
    const trial = this.trial;
    const sample = trial.at(time);
    const editable = !this.playing && time === 0;

    const isDefault =
      parameters.mode === defaults.mode &&
      parameters.leftMass === defaults.leftMass &&
      parameters.rightMass === defaults.rightMass &&
      parameters.leftVelocity === defaults.leftVelocity &&
      parameters.rightVelocity === defaults.rightVelocity;

    const atBefore =
      trial.preContact !== null && Math.abs(time - trial.preContact) < 1e-4;
    const atAfter =
      trial.contact !== null && Math.abs(time - trial.contact) < 1e-4;
    const atEnd = Math.abs(time - trial.duration) < 1e-4;

    const readouts = [
      { kind: "left", label: "vₐ", value: sample.velocity.left, unit: "m/s" },
      { kind: "right", label: "vᵦ", value: sample.velocity.right, unit: "m/s" },
      {
        kind: "momentum",
        label: t.totalP,
        value: sample.momentum.total,
        unit: units.momentum,
      },
      {
        kind: "kinetic",
        label: t.totalK,
        value: sample.kinetic.total,
        unit: units.kinetic,
      },
    ];

    return html`<header class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        ${
          this.context?.toolbar
            ? html`<span class="model-note">${t.modelNote}</span>`
            : html`<div class="fallback-controls">${this.playback()}</div>`
        }
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.parameters}>
          <div class="panel-heading">
            <h2>${t.parameters}</h2>
            <span class=${this.playing ? "status active" : "status"}
              >${this.playing ? t.running : t.paused}</span
            >
          </div>
          <div class="parameters">
            <div class="segmented-field">
              <span>${t.mode}</span>
              <phy-radio-group
                variant="segmented"
                .label=${t.mode}
                .value=${parameters.mode}
                .options=${modes.map((value) => ({ value, label: t[value] }))}
                @change=${(event: Event) =>
                  this.configure({
                    mode: (event.currentTarget as RadioGroupElement)
                      .value as Mode,
                  })}
              ></phy-radio-group>
            </div>
            <section class="cart-parameters">
              <div class="cart-heading">
                <h3 class="left">${t.cartLeft}</h3>
                <output
                  >pₐ = ${number(trial.before.momentum.left)} kg·m/s</output
                >
              </div>
              ${this.parameter("leftMass", t)}${this.parameter("leftVelocity", t)}
            </section>
            <section class="cart-parameters">
              <div class="cart-heading">
                <h3 class="right">${t.cartRight}</h3>
                <output
                  >pᵦ = ${number(trial.before.momentum.right)} kg·m/s</output
                >
              </div>
              ${this.parameter("rightMass", t)}${this.parameter("rightVelocity", t)}
            </section>
          </div>
          <div class="parameter-footer">
            <phy-button
              ?disabled=${isDefault && time === 0}
              @click=${this.restoreDefaults}
              >${t.restoreDefaults}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
            <small>${t.resetHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.scene}>
          <div class="panel-heading">
            <h2>${t.scene}</h2>
            <small class="phase mono" data-phase=${sample.phase}
              >${t[sample.phase]}${trial.contact === null ? "" : ` · t꜀ = ${number(trial.contact, 3)} s`}</small
            >
          </div>
          <div class="scene-wrap">
            ${scene(
              trial,
              sample,
              time,
              { vectors, centerOfMass },
              editable,
              this.adjust,
              t,
            )}
          </div>
          <div class="layer-controls">
            <div>
              <phy-checkbox
                .checked=${vectors}
                @change=${(event: Event) => this.set({ vectors: (event.currentTarget as CheckboxElement).checked })}
                >${t.vectors}</phy-checkbox
              >
              <phy-checkbox
                .checked=${centerOfMass}
                @change=${(event: Event) => this.set({ centerOfMass: (event.currentTarget as CheckboxElement).checked })}
                >${t.centerOfMass}</phy-checkbox
              >
            </div>
            <span class="layer-hint"
              >${editable ? t.dragHint : t.dragLocked}</span
            >
          </div>
          <div class="readouts">
            ${readouts.map(
              ({ kind, label, value, unit }) =>
                html`<div class=${kind}>
                  <span>${label}</span
                  ><output data-readout=${kind}
                    >${number(value)} <small>${unit}</small></output
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <span>0.00 s</span>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${number(time)} s`}
              .min=${0}
              .max=${timelineSteps}
              .step=${1}
              .value=${Math.round((time * timelineSteps) / trial.duration)}
              @input=${(event: Event) => this.seek(trial.duration * ((event.currentTarget as SliderElement).value / timelineSteps))}
            ></phy-slider>
            <span>${number(trial.duration)} s</span>
            <output class="time-label" data-time=${time}
              >t = ${number(time)} s</output
            >
          </div>
          <div class="moments">
            <button
              type="button"
              class=${atBefore ? "selected" : ""}
              ?disabled=${trial.preContact === null}
              @click=${() => this.seek(trial.preContact ?? 0)}
            >
              ${t.beforeContact}<small aria-hidden="true"
                >${trial.preContact === null ? "—" : `${number(trial.preContact)} s`}</small
              >
            </button>
            <button
              type="button"
              class=${atAfter ? "selected" : ""}
              ?disabled=${trial.contact === null}
              @click=${() => this.seek(trial.contact ?? 0)}
            >
              ${t.afterContact}<small aria-hidden="true"
                >${trial.contact === null ? "—" : `${number(trial.contact)} s`}</small
              >
            </button>
            <button
              type="button"
              class=${atEnd ? "selected" : ""}
              @click=${() => this.seek(trial.duration)}
            >
              ${t.end}<small aria-hidden="true"
                >${number(trial.duration)} s</small
              >
            </button>
          </div>
        </phy-box>
        <phy-box
          class=${"panel right" + (support === "explore" ? " exploring" : "")}
          role="region"
          aria-label=${t.observe}
        >
          ${this.observationPanel(t, trial, sample)}
          ${this.supportPanel(t, trial)}
        </phy-box>
      </div>`;
  }
}

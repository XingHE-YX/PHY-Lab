import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import { number, plotQuantities, totals, units } from "./components/quantities";
import { scene, velocityCoordinate } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  clamp,
  limits,
  makeTrial,
  parameterValue,
  presets,
  type Cart,
  type Metric,
  type Mode,
  type Parameter,
  type Parameters,
  type Preset,
  type Trial,
} from "./model/physics";
import { normalizeSnapshot, type Rate, type Snapshot } from "./model/snapshot";
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
  };
  declare locale: Locale;
  declare private data: Snapshot;
  declare private playing: boolean;
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
  private cached?: { parameters: Parameters; trial: Trial };

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.playing = false;
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
    this.set({ parameters: { ...this.data.parameters, ...patch }, time: 0 });
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

  private playback() {
    const t = messages(this.locale);
    return html`<phy-button variant="primary" @click=${this.toggle}
        >${this.playing ? t.pause : t.play}</phy-button
      >
      <phy-button @click=${() => this.seek(0)}>${t.reset}</phy-button>
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

  protected render() {
    const t = messages(this.locale);
    const { parameters, time, vectors, metric } = this.data;
    const trial = this.trial;
    const sample = trial.at(time);
    const outcome = trial.contact === null ? "noContact" : parameters.mode;
    const hint =
      outcome === "noContact"
        ? t.noContactHint
        : outcome === "elastic"
          ? t.elasticHint
          : t.inelasticHint;
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
        <h1>${t.title}</h1>
        <p>${t.subtitle}</p>
        ${this.context?.toolbar ? nothing : html`<div class="fallback-controls">${this.playback()}</div>`}
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.parameters}>
          <div class="panel-heading"><h2>${t.parameters}</h2></div>
          <div class="parameters">
            <div class="field-label">
              <span>${t.mode}</span>
              <phy-select
                .label=${t.mode}
                .value=${parameters.mode}
                .options=${modes.map((value) => ({ value, label: t[value] }))}
                @change=${(event: Event) => this.configure({ mode: (event.currentTarget as SelectElement).value as Mode })}
              ></phy-select>
            </div>
            <section class="cart-parameters">
              <h3 class="left">${t.cartLeft}</h3>
              ${this.parameter("leftMass", t)}${this.parameter("leftVelocity", t)}
            </section>
            <section class="cart-parameters">
              <h3 class="right">${t.cartRight}</h3>
              ${this.parameter("rightMass", t)}${this.parameter("rightVelocity", t)}
            </section>
          </div>
          <div class="footer">
            <p>${t.resetHint}</p>
            <phy-select
              .label=${t.preset}
              .value=${""}
              .options=${[{ value: "", label: t.preset, disabled: true }, ...(Object.keys(presets) as Preset[]).map((key) => ({ value: key, label: t[key] }))]}
              @change=${(event: Event) => {
                const control = event.currentTarget as SelectElement;
                const preset = presets[control.value as Preset];
                if (preset)
                  this.configure({ ...preset, mode: parameters.mode });
                control.value = "";
              }}
            ></phy-select>
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.scene}>
          <div class="panel-heading">
            <h2>${t.scene}</h2>
            <small class="phase" data-phase=${sample.phase}
              >${t[sample.phase]}${trial.contact === null ? "" : ` · t꜀ = ${number(trial.contact, 3)} s`}</small
            >
            <phy-checkbox
              .checked=${vectors}
              @change=${(event: Event) => this.set({ vectors: (event.currentTarget as CheckboxElement).checked })}
              >${t.vectors}</phy-checkbox
            >
          </div>
          <div class="scene-wrap">
            ${scene(trial, sample, vectors, !this.playing && time === 0, this.adjust, t)}
          </div>
          <div class="readouts">
            ${readouts.map(
              ({ kind, label, value, unit }) =>
                html` <div class=${kind}>
                  <span>${label}</span
                  ><output data-readout=${kind}
                    >${number(value)} <small>${unit}</small></output
                  >
                </div>`,
            )}
          </div>
          <div class="timeline">
            <div class="time-label">
              <span>${t.timeline}</span
              ><output data-time=${time}
                >${number(time)} / ${number(trial.duration)} s</output
              >
            </div>
            <phy-slider
              .label=${t.timeline}
              .valueText=${`${number(time)} s`}
              .min=${0}
              .max=${timelineSteps}
              .step=${1}
              .value=${Math.round((time * timelineSteps) / trial.duration)}
              @input=${(event: Event) => this.seek(trial.duration * ((event.currentTarget as SliderElement).value / timelineSteps))}
            ></phy-slider>
            <div class="moments">
              <phy-button
                ?disabled=${trial.preContact === null}
                @click=${() => this.seek(trial.preContact ?? 0)}
                >${t.beforeContact}</phy-button
              >
              <phy-button
                ?disabled=${trial.contact === null}
                @click=${() => this.seek(trial.contact ?? 0)}
                >${t.afterContact}</phy-button
              >
              <phy-button @click=${() => this.seek(trial.duration)}
                >${t.end}</phy-button
              >
            </div>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.observe}>
          ${totals(trial, sample, t)}
          <phy-tabs
            class="observation-tabs"
            .label=${t.observe}
            .value=${metric}
            .items=${metrics.map((value) => ({ value, label: t[value] }))}
            @change=${(event: Event) => {
              if (event.target === event.currentTarget)
                this.set({
                  metric: (event.currentTarget as TabsElement).value as Metric,
                });
            }}
          >
            <div class="observation" slot=${metric}>
              ${plotQuantities(trial, sample, time, metric, this.seek, t)}
              <section class="model-formula">
                <phy-math .source=${equations[outcome]}></phy-math>
                <p>${hint}</p>
              </section>
            </div>
          </phy-tabs>
        </phy-box>
      </div>`;
  }
}

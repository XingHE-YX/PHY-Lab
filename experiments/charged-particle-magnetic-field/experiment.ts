import { LitElement, html, nothing, render, svg } from "lit";
import type {
  CheckboxElement,
  DialogHandle,
  ExperimentContext,
  Locale,
  SelectElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2";
import { fieldScene, scene } from "./components/scene";
import { plot } from "./components/chart";
import { number, physicalTime, texts } from "./locales/messages";
import {
  at,
  clamp,
  defaults,
  limits,
  orbit,
  parameters,
  replaySpan,
  type Parameters,
} from "./model/physics";
import { normalizeSnapshot, rates, type Snapshot } from "./model/snapshot";
import { styles } from "./styles/desktop";

const forceFormula = String.raw`\vec F=q\,\vec v\times\vec B,\quad \vec F\cdot\vec v=0`;
const orbitFormula = String.raw`r=\frac{mv}{|qB_z|},\quad T=\frac{2\pi m}{|qB_z|}`;
const energyFormula = String.raw`K=\tfrac12mv^2=\mathrm{const.}`;
const keys = Object.keys(limits) as (keyof Parameters)[];

export class MagneticExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    data: { state: true },
    playing: { state: true },
    aim: { state: true },
  };

  declare locale: Locale;
  declare private data: Snapshot;
  declare private playing: boolean;
  declare private aim: Parameters | null;
  private context?: ExperimentContext;
  private toolbar?: HTMLDivElement;
  private playbackKey = "";
  private modelParams?: Parameters;
  private model = orbit(defaults);
  private frame = 0;
  private previous = 0;
  private drag?: {
    node: SVGCircleElement;
    pointer: number;
    x: number;
    y: number;
    moved: boolean;
  };
  private help?: DialogHandle;
  private helpContent = document.createElement("div");

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.playing = false;
    this.aim = null;
  }

  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.pause);
  }

  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.pause);
    this.cancelDrag();
    this.help?.close();
    this.pause();
    this.toolbar?.remove();
    this.toolbar = undefined;
    this.playbackKey = "";
    super.disconnectedCallback();
  }

  protected updated(changed: ReadonlyMap<PropertyKey, unknown>) {
    if (this.help && changed.has("locale")) {
      this.renderHelp();
      this.help.update({ title: this.labels.help });
    }
    if (!this.context?.toolbar) return;
    if (!this.toolbar) {
      this.toolbar = document.createElement("div");
      this.toolbar.style.cssText = "display:flex;align-items:center;gap:8px";
      this.context.toolbar.setControls(this.toolbar);
    }
    const key = [this.locale, this.data.rate, this.playbackLabel].join(":");
    if (key === this.playbackKey) return;
    this.playbackKey = key;
    render(this.playback(), this.toolbar);
  }

  private get labels() {
    return texts[this.locale];
  }

  private get trajectory() {
    if (this.modelParams !== this.data.params) {
      this.modelParams = this.data.params;
      this.model = orbit(this.modelParams);
    }
    return this.model;
  }

  snapshot(): Snapshot {
    return { ...this.data, params: { ...this.data.params } };
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

  private stop() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.previous = 0;
  }

  pause = () => {
    this.stop();
    this.persist();
  };

  private flight = () => {
    if (this.playing) {
      this.pause();
      return;
    }
    if (!this.isConnected || document.hidden || this.context?.signal.aborted)
      return;
    this.cancelDrag();
    if (!this.data.launched || this.data.progress >= replaySpan)
      this.set({ launched: true, progress: 0 });
    this.playing = true;
    this.frame = requestAnimationFrame(this.tick);
  };

  private tick = (now: number) => {
    if (!this.playing) return;
    if (this.previous) {
      const elapsed = Math.min((now - this.previous) / 1000, 0.1);
      const progress = Math.min(
        replaySpan,
        this.data.progress + (elapsed * this.data.rate) / 3,
      );
      this.data = { ...this.data, progress };
      if (progress === replaySpan) {
        this.pause();
        return;
      }
    }
    this.previous = now;
    this.frame = requestAnimationFrame(this.tick);
  };

  private rearm = () => {
    this.cancelDrag();
    this.stop();
    this.set({ launched: false, progress: 0 });
  };

  private reset = () => {
    this.cancelDrag();
    this.stop();
    this.data = normalizeSnapshot(null);
    this.persist();
  };

  private seek(progress: number) {
    if (!this.data.launched || !Number.isFinite(progress)) return;
    this.stop();
    this.set({ progress: clamp(progress, 0, replaySpan) });
  }

  private changeParams(patch: Partial<Parameters>) {
    this.cancelDrag();
    this.stop();
    this.set({
      params: parameters({ ...this.data.params, ...patch }),
      launched: false,
      progress: 0,
    });
  }

  private cancelDrag() {
    const previous = this.drag;
    this.drag = undefined;
    this.aim = null;
    if (previous?.node.hasPointerCapture(previous.pointer))
      previous.node.releasePointerCapture(previous.pointer);
  }

  private startAim = (event: PointerEvent) => {
    if (event.button !== 0 || this.drag) return;
    const node = event.currentTarget as SVGCircleElement;
    this.drag = {
      node,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
    node.focus({ preventScroll: true });
  };

  private updateAim = (event: PointerEvent) => {
    if (this.drag?.pointer !== event.pointerId) return;
    if (event.type === "pointercancel" || event.type === "lostpointercapture") {
      this.cancelDrag();
      return;
    }
    const { node, x, y } = this.drag;
    this.drag.moved ||= Math.hypot(event.clientX - x, event.clientY - y) >= 3;
    const transform = node.ownerSVGElement?.getScreenCTM();
    if (this.drag.moved && transform) {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        transform.inverse(),
      );
      const dx = point.x - scene.originX;
      const dy = scene.originY - point.y;
      const speed = Math.round(
        (Math.hypot(dx, dy) / scene.aim) * limits.speed.max,
      );
      const angle =
        speed === 0
          ? this.data.params.angle
          : Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      this.aim = parameters({
        ...this.data.params,
        speed,
        angle: (angle + 360) % 360,
      });
    }
    if (event.type === "pointerup") {
      const aim = this.aim;
      this.cancelDrag();
      if (aim) this.changeParams(aim);
    }
  };

  private aimKeys = (event: KeyboardEvent) => {
    const { speed, angle } = this.data.params;
    const step = event.shiftKey ? 5 : 1;
    switch (event.key) {
      case "ArrowUp":
        this.changeParams({ speed: speed + step });
        break;
      case "ArrowDown":
        this.changeParams({ speed: speed - step });
        break;
      case "ArrowLeft":
        this.changeParams({ angle: (angle + step + 360) % 360 });
        break;
      case "ArrowRight":
        this.changeParams({ angle: (angle - step + 360) % 360 });
        break;
      case "Enter":
      case " ":
        this.flight();
        void this.updateComplete.then(() =>
          this.toolbar?.querySelector<HTMLElement>(".flight-control")?.focus(),
        );
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  private get playbackLabel() {
    const text = this.labels;
    if (this.playing) return text.pause;
    if (!this.data.launched) return text.launch;
    return this.data.progress >= replaySpan ? text.replay : text.play;
  }

  private playback() {
    return html` <phy-button
        class="flight-control"
        variant="primary"
        @click=${this.flight}
        >${this.playbackLabel}</phy-button
      >
      <phy-button @click=${this.rearm}>${this.labels.rearm}</phy-button>
      <phy-select
        label=${this.labels.rate}
        .value=${String(this.data.rate)}
        .options=${rates.map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        @change=${(event: Event) => {
          const value = Number((event.currentTarget as SelectElement).value);
          const rate = rates.find((option) => option === value);
          if (rate) {
            this.previous = 0;
            this.set({ rate });
          }
        }}
      ></phy-select>`;
  }

  private renderHelp() {
    this.helpContent.style.cssText =
      "font-size:13px;line-height:1.8;color:var(--text)";
    const text = this.labels;
    render(
      html`<p>${text.model}</p>
        <phy-math .source=${forceFormula}></phy-math>
        <p>${text.units}</p>
        <p>${text.screen}</p>
        <p>${text.clock}</p>`,
      this.helpContent,
    );
  }

  private openHelp = (event: Event) => {
    if (this.help || !this.context) return;
    this.pause();
    this.renderHelp();
    const handle = this.context.dialog.open({
      title: this.labels.help,
      content: this.helpContent,
      width: "md",
      returnFocus: event.currentTarget as HTMLElement,
    });
    this.help = handle;
    void handle.closed.then(() => {
      if (this.help === handle) this.help = undefined;
    });
  };

  private parameter(key: keyof Parameters) {
    const label = this.labels.sliders[key];
    const { min, max, step, unit } = limits[key];
    const value = (this.aim ?? this.data.params)[key];
    const valueText = unit === "°" ? `${value}°` : `${value} ${unit}`;
    return html`<div class="parameter">
      <div class="row">
        <span>${label}</span><span class="mono">${valueText}</span>
      </div>
      <phy-slider
        data-param=${key}
        .label=${label}
        .valueText=${valueText}
        .min=${min}
        .max=${max}
        .step=${step}
        .value=${value}
        @input=${(event: Event) => this.changeParams({ [key]: (event.currentTarget as SliderElement).valueAsNumber })}
      ></phy-slider>
    </div>`;
  }

  private layer(key: "trail" | "vectors") {
    return html`<phy-checkbox
      .checked=${this.data[key]}
      @change=${(event: Event) => this.set({ [key]: (event.currentTarget as CheckboxElement).checked })}
      >${this.labels[key]}</phy-checkbox
    >`;
  }

  private timeline() {
    const text = this.labels;
    const { progress, launched } = this.data;
    const model = this.trajectory;
    const moments: [string, number][] =
      model.kind === "circle"
        ? [
            [text.start, 0],
            [text.quarter, 0.25],
            [text.half, 0.5],
            [text.full, 1],
            [text.end, replaySpan],
          ]
        : [
            [text.start, 0],
            [text.midpoint, 1],
            [text.end, replaySpan],
          ];
    return html`<div class="timeline">
      <div class="row">
        <span>${text.seek}</span
        ><span class="mono"
          >${physicalTime(model, progress)} /
          ${physicalTime(model, replaySpan)}</span
        >
      </div>
      <phy-slider
        class="time-input"
        .label=${text.seek}
        .valueText=${physicalTime(model, progress)}
        .min=${0}
        .max=${2000}
        .step=${1}
        .value=${Math.round(progress * 1000)}
        .disabled=${!launched}
        @input=${(event: Event) => this.seek((event.currentTarget as SliderElement).valueAsNumber / 1000)}
      ></phy-slider>
      <div class="moments">
        ${moments.map(([label, value]) => html`<phy-button .disabled=${!launched} @click=${() => this.seek(value)}>${label}</phy-button>`)}
      </div>
    </div>`;
  }

  render() {
    const text = this.labels;
    const model = this.trajectory;
    const state = at(model, this.data.progress);
    const { launched, progress, params, trail, vectors, view } = this.data;
    const readings = [
      [text.speed, `${number(model.speed / 1000)} km/s`],
      [text.force, `${number(state.force * 1e15)} fN`],
      [
        text.radius,
        model.radius === null ? "—" : `${number(model.radius * 100)} cm`,
      ],
      [text.period, model.period === null ? "—" : physicalTime(model, 1)],
      [text.energy, `${number(model.energy)} eV`],
    ];
    return html`
      <header class="heading">
        <div>
          <h1>${this.context?.experiment.title[this.locale]}</h1>
          <p>${text.subtitle}</p>
        </div>
        <phy-button @click=${this.openHelp}>${text.help}</phy-button>
      </header>
      <div class="lab">
        <section class="panel parameters" aria-labelledby="parameters-label">
          <h2 id="parameters-label">${text.parameters}</h2>
          <div class="parameter-list">
            ${keys.map((key) => this.parameter(key))}
          </div>
          <div class="layer-control" role="group" aria-label=${text.layers}>
            <span>${text.layers}</span>
            <div>${this.layer("trail")}${this.layer("vectors")}</div>
          </div>
          <phy-button @click=${this.reset}>${text.reset}</phy-button>
        </section>
        <section class="panel stage" aria-labelledby="scene-label">
          <div class="row panel-top">
            <h2 id="scene-label">${text.heading}</h2>
            <span class="mode"
              >${launched ? text.modes[model.kind] : text.before}</span
            >
          </div>
          <div class="scene-wrap">
            <svg
              class="scene"
              viewBox=${`0 0 ${scene.width} ${scene.height}`}
              role="group"
              aria-labelledby="scene-label"
            >
              ${fieldScene(model, params, progress, { launched, trail, vectors, aim: this.aim ?? params }, text)}
              ${launched ? nothing : svg`<circle class="aim-handle" cx=${scene.originX} cy=${scene.originY} r="16" tabindex="0" role="button" aria-label=${text.aimLabel} aria-describedby="aim-keys" @pointerdown=${this.startAim} @pointermove=${this.updateAim} @pointerup=${this.updateAim} @pointercancel=${this.updateAim} @lostpointercapture=${this.updateAim} @keydown=${this.aimKeys} />`}
            </svg>
          </div>
          <div class="scene-details">
            ${launched ? html`${vectors && model.speed > 0 ? html`<span class="velocity-key">${text.velocityKey}</span>` : nothing}${vectors && state.force > 0 ? html`<span class="force-key">${text.forceKey}</span>` : nothing}${trail && model.kind !== "rest" ? html`<span>${text.orbitKey}</span>` : nothing}` : html`<span>${text.aim}</span><span id="aim-keys">${text.aimKeys}</span>`}
          </div>
          ${this.timeline()}
        </section>
        <section class="panel observation" aria-labelledby="charts-label">
          <h2 id="charts-label">${text.charts}</h2>
          <phy-tabs
            class="views"
            variant="segmented"
            .label=${text.charts}
            .value=${view}
            .items=${[
              { value: "velocity", label: text.view.velocity },
              { value: "energy", label: text.view.energy },
            ]}
            @change=${(event: Event) => this.set({ view: (event.currentTarget as TabsElement).value === "energy" ? "energy" : "velocity" })}
          >
            <div class="plot-body" slot=${view}>
              ${plot(model, progress, view, text)}
            </div>
          </phy-tabs>
          <dl class="readings">
            ${readings.map(
              ([label, value]) =>
                html`<div>
                  <dt>${label}</dt>
                  <dd class="mono">${value}</dd>
                </div>`,
            )}
          </dl>
          <div class="formula">
            <phy-math
              .source=${model.kind === "circle" && view === "velocity" ? orbitFormula : energyFormula}
            ></phy-math>
            <p>${text.reasons[model.kind]}</p>
          </div>
        </section>
      </div>
    `;
  }
}

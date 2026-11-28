import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type { ExperimentContext } from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type { Locale } from "../../src/infra/platform/protocols/v2/api/environment";
import type {
  CheckboxElement,
  SliderElement,
  TabsElement,
} from "../../src/infra/platform/protocols/v2/components";
import {
  comparisons,
  details,
  objectFromCurveEvent,
  signed,
} from "./components/observation";
import { coordinate, scene } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  explorePresets,
  limits,
  objectFor,
  objectHeight,
  parameterValue,
  scenarios,
  solve,
  zoneFor,
  type ExplorePreset,
  type Parameter,
} from "./model/optics";
import { imageInView } from "./model/ray-geometry";
import {
  normalizeSnapshot,
  type Observation,
  type Snapshot,
  type Support,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const observations: Observation[] = ["reading", "compare"];
const formula = String.raw`\frac{1}{f}=\frac{1}{u}+\frac{1}{v},\qquad M=-\frac{v}{u}`;
const focalFormula = String.raw`u=f\quad\Longrightarrow\quad\frac{1}{v}=0`;

export class ThinLensExperiment extends LitElement {
  static styles = styles;
  static properties = {
    locale: { state: true },
    data: { state: true },
    chartHeight: { state: true },
  };
  declare locale: Locale;
  declare private data: Snapshot;
  declare private chartHeight: number;
  private context?: ExperimentContext;
  private drag?: { id: number; coordinate: number; distance: number };
  private curvePointer?: number;
  private chartObserver?: ResizeObserver;
  private observedChartWrap?: Element;
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.chartHeight = 190;
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

  connectedCallback() {
    super.connectedCallback();
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
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.onHide);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    if (this.dialog && changed.has("locale")) this.updateHelp();
    this.syncChartObserver();
  }

  private syncChartObserver() {
    const wrap = this.renderRoot.querySelector(".curve-wrap");
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

  pause() {
    this.drag = undefined;
    this.curvePointer = undefined;
    this.persist();
  }

  private visibility = () => {
    if (document.hidden) this.pause();
  };

  private onHide = () => this.pause();

  private set(patch: Partial<Snapshot>, save = true) {
    this.data = { ...this.data, ...patch };
    if (save) this.persist();
  }

  private change(key: Parameter, raw: number, save = true) {
    const value = parameterValue(key, raw);
    if (value !== this.data.parameters[key])
      this.set({ parameters: { ...this.data.parameters, [key]: value } }, save);
  }

  private loadExplore(preset: ExplorePreset) {
    this.drag = undefined;
    this.curvePointer = undefined;
    this.set({
      parameters: { ...preset.parameters },
      observation: preset.observation,
      support: "formula",
    });
    void this.updateComplete.then(() => {
      (
        this.renderRoot.querySelector(".observation-tabs") as HTMLElement | null
      )?.focus?.();
    });
  }

  private input = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.drag) return;
      const current = coordinate(event);
      if (current === null) return;
      this.drag = {
        id: event.pointerId,
        coordinate: current,
        distance: this.data.parameters.object,
      };
      (event.currentTarget as SVGGraphicsElement).setPointerCapture(
        event.pointerId,
      );
    },
    move: (event: PointerEvent) => {
      const drag = this.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const current = coordinate(event);
      if (current !== null)
        this.change("object", drag.distance + drag.coordinate - current, false);
    },
    end: (event: PointerEvent) => {
      if (this.drag?.id === event.pointerId) this.pause();
    },
    key: (event: KeyboardEvent) => {
      const distance = this.data.parameters.object;
      const step = event.shiftKey ? 5 : limits.object.step;
      const next =
        event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? distance + step
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? distance - step
            : event.key === "Home"
              ? limits.object.min
              : event.key === "End"
                ? limits.object.max
                : null;
      if (next === null) return;
      event.preventDefault();
      this.change("object", next);
    },
  };

  private curveScrub = {
    start: (event: PointerEvent) => {
      if (event.button !== 0 || this.curvePointer !== undefined) return;
      const next = objectFromCurveEvent(event);
      if (next === null) return;
      this.curvePointer = event.pointerId;
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.change("object", next, false);
    },
    move: (event: PointerEvent) => {
      if (this.curvePointer !== event.pointerId) return;
      const next = objectFromCurveEvent(event);
      if (next !== null) this.change("object", next, false);
    },
    end: (event: PointerEvent) => {
      if (this.curvePointer === event.pointerId) this.pause();
    },
  };

  private parameter(key: Parameter, t: Messages) {
    const range = limits[key];
    const value = this.data.parameters[key];
    const label = `${value.toFixed(1)} cm`;
    return html`
      <div class="parameter">
        <div class="parameter-label">
          <span>${t[key]}</span><output>${label}</output>
        </div>
        <phy-slider
          .label=${t[key]}
          .valueText=${label}
          .value=${value}
          .min=${range.min}
          .max=${range.max}
          .step=${range.step}
          @input=${(event: Event) => this.change(key, (event.currentTarget as SliderElement).value)}
        ></phy-slider>
        <div class="limits" aria-hidden="true">
          <span>${range.min}</span><span>${range.max} cm</span>
        </div>
      </div>
    `;
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
    image: ReturnType<typeof solve>["image"],
  ) {
    const { parameters, observation, support } = this.data;
    return html`<phy-tabs
      class="observation-tabs"
      .label=${t.observe}
      .value=${observation}
      .items=${observations.map((value) => ({ value, label: t[value] }))}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.set({
          observation: (event.currentTarget as TabsElement)
            .value as Observation,
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
          ? html`<div class="observation" slot=${observation}>
              ${
                observation === "reading"
                  ? details(
                      parameters,
                      image,
                      this.chartHeight,
                      this.curveScrub,
                      t,
                    )
                  : comparisons(
                      parameters.focal,
                      parameters.object,
                      (objectDistance: number) =>
                        this.change("object", objectDistance),
                      t,
                    )
              }
            </div>`
          : nothing
      }
    </phy-tabs>`;
  }

  private supportPanel(t: Messages, image: ReturnType<typeof solve>["image"]) {
    const { support } = this.data;
    const hint = t[`${image.kind}Hint`];
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
                <phy-math
                  .source=${image.kind === "afocal" ? focalFormula : formula}
                ></phy-math>
                <p>${hint}</p>
              </section>`
            : html`<div class="explore-content">
                <p class="explore-hint">${t.exploreHint}</p>
                <div class="scenario-grid">
                  ${explorePresets.map((preset) => {
                    const copy = t.exploreScenarios[preset.id];
                    return html`<article class="scenario-card">
                      <h3>${copy.title}</h3>
                      <p>${copy.detail}</p>
                      <button
                        type="button"
                        data-explore=${preset.id}
                        @click=${() => this.loadExplore(preset)}
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
    const { parameters, extensions, guides, support } = this.data;
    const optics = solve(parameters);
    const { image, rays } = optics;
    const zone = zoneFor(parameters);
    const power = 100 / parameters.focal;
    const ratio = parameters.object / parameters.focal;
    const isOffscreen = image.distance !== null && !imageInView(image);
    const notice =
      image.kind === "afocal"
        ? t.afocalHint
        : isOffscreen
          ? t.offscreen
          : rays.length === 2
            ? t.limitedRay
            : "";

    const readings = [
      {
        key: "object",
        label: t.object,
        value: `${parameters.object.toFixed(1)} cm`,
      },
      {
        key: "focal",
        label: t.focal,
        value: `${parameters.focal.toFixed(1)} cm`,
      },
      {
        key: "distance",
        label: t.imageDistance,
        value: signed(image.distance, "cm"),
      },
      {
        key: "magnification",
        label: t.magnification,
        value: signed(image.magnification, "×"),
      },
    ];

    return html`<header class="heading">
        <div class="heading-main">
          <h1>${t.title}</h1>
          <span class="subtitle">${t.subtitle}</span>
        </div>
        <span class="model-note">${t.modelNote}</span>
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.settings}>
          <div class="panel-heading">
            <h2>${t.settings}</h2>
            <span class="status mono">${t.zones[zone]}</span>
          </div>
          <div class="parameters">
            ${this.parameter("focal", t)}${this.parameter("object", t)}
          </div>
          <div class="derived-metrics">
            <div>
              <span>${t.objectHeightLabel}</span
              ><output>${objectHeight.toFixed(1)} cm</output>
            </div>
            <div>
              <span>${t.imageHeightLabel}</span
              ><output>${signed(image.height, "cm")}</output>
            </div>
            <div>
              <span>${t.powerLabel}</span
              ><output>+${power.toFixed(2)} D</output>
            </div>
            <div>
              <span>${t.ratioLabel}</span><output>${ratio.toFixed(2)}×</output>
            </div>
          </div>
          <div class="parameter-footer">
            <phy-button @click=${() => this.set(normalizeSnapshot(null))}
              >${t.reset}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
            <small>${t.footerHint}</small>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.scene}>
          <div class="panel-heading">
            <h2>${t.scene}</h2>
            <span class=${`regime ${image.kind}`} data-regime=${image.kind}
              >${t[image.kind]}</span
            >
          </div>
          <div class="scene-wrap">
            ${scene(parameters, optics, extensions, guides, this.input, t)}
            <p
              class="notice"
              data-offscreen=${isOffscreen}
              data-alert=${Boolean(notice)}
            >
              ${notice || t.drag}
            </p>
          </div>
          <div class="layer-controls">
            <div class="layer-switches">
              <phy-checkbox
                .checked=${extensions}
                ?disabled=${image.kind !== "virtual"}
                @change=${(event: Event) => this.set({ extensions: (event.currentTarget as CheckboxElement).checked })}
                >${t.extensions}</phy-checkbox
              >
              <phy-checkbox
                .checked=${guides}
                @change=${(event: Event) => this.set({ guides: (event.currentTarget as CheckboxElement).checked })}
                >${t.guides}</phy-checkbox
              >
            </div>
            <div class="legend" aria-hidden="true">
              <span class="parallel">${t.parallel}</span>
              <span class="center">${t.center}</span>
              <span class=${`frontFocus${rays.length < 3 ? " absent" : ""}`}
                >${t.frontFocus}</span
              >
            </div>
          </div>
          <div class="readouts">
            ${readings.map(
              ({ key, label, value }) =>
                html`<div class=${key}>
                  <span>${label}</span
                  ><output data-readout=${key}>${value}</output>
                </div>`,
            )}
          </div>
          <div class="shortcuts">
            ${scenarios.map((scenario) => {
              const target = objectFor(scenario, parameters.focal);
              const selected = Math.abs(parameters.object - target) < 1e-6;
              return html`<button
                type="button"
                class=${selected ? "selected" : ""}
                @click=${() => this.change("object", target)}
              >
                ${t[scenario]}<small aria-hidden="true"
                  >u = ${target.toFixed(1)} cm</small
                >
              </button>`;
            })}
          </div>
        </phy-box>
        <phy-box
          class=${"panel right" + (support === "explore" ? " exploring" : "")}
          role="region"
          aria-label=${t.observe}
        >
          ${this.observationPanel(t, image)} ${this.supportPanel(t, image)}
        </phy-box>
      </div>`;
  }
}

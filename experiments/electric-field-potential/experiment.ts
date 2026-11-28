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
  contributions,
  display,
  slice,
  sliceOffsetFromEvent,
} from "./components/observation";
import { scene, staticLayers, worldCoordinate } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  along,
  board,
  bounded,
  chargeAxis,
  chargeBounds,
  chargeValue,
  configurationKind,
  distance,
  measure,
  probeShortcuts,
  replaceCharge,
  scenarios,
  separated,
  valueRange,
  zeroTolerance,
  type Item,
  type Point,
  type Reading,
  type ScenarioPreset,
} from "./model/electrostatics";
import { profile } from "./model/profile";
import {
  normalizeSnapshot,
  type Observation,
  type Snapshot,
  type Support,
} from "./model/snapshot";
import { styles } from "./styles/desktop";

const observations: Observation[] = ["contributions", "profile"];
const formulas = {
  contributions: String.raw`V=\sum_i\frac{kq_i}{r_i},\quad\vec E=\sum_i\vec E_i`,
  profile: String.raw`E_{\parallel}=-\frac{\mathrm{d}V}{\mathrm{d}s}`,
};

function classification(reading: Reading | null) {
  if (!reading) return "masked";
  const zeroPotential = Math.abs(reading.potential) < zeroTolerance;
  const zeroField = reading.magnitude < zeroTolerance;
  if (zeroPotential && zeroField) return "zeroBoth";
  if (zeroPotential) return "zeroPotential";
  if (zeroField) return "zeroField";
  return null;
}

export class ElectricFieldExperiment extends LitElement {
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
  private drag?: { id: number; item: Item; pointer: Point; origin: Point };
  private sliceDrag?: {
    id: number;
    origin: Point;
    axis: Point;
    start: number;
    end: number;
  };
  private chartObserver?: ResizeObserver;
  private observedChartWrap?: Element;
  private cached?: {
    charges: Snapshot["charges"];
    vectors: boolean;
    equipotential: boolean;
    layers: ReturnType<typeof staticLayers>;
  };
  private readonly help = document.createElement("div");
  private dialog?: DialogHandle;

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.chartHeight = 230;
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

  pause() {
    this.drag = undefined;
    this.sliceDrag = undefined;
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

  private get layers() {
    const { charges, vectors, equipotential } = this.data;
    if (
      this.cached?.charges !== charges ||
      this.cached.vectors !== vectors ||
      this.cached.equipotential !== equipotential
    )
      this.cached = {
        charges,
        vectors,
        equipotential,
        layers: staticLayers(charges, vectors, equipotential),
      };
    return this.cached.layers;
  }

  private position(item: Item): Point {
    return item === "probe"
      ? this.data.probe
      : this.data.charges[item === "first" ? 0 : 1];
  }

  private move(item: Item, target: Point, save = true) {
    const point = bounded(
      target,
      item === "probe" ? board : chargeBounds,
      true,
    );
    const previous = this.position(item);
    if (point.x === previous.x && point.y === previous.y) return;
    if (item === "probe") {
      this.set({ probe: point }, save);
      return;
    }
    const index = item === "first" ? 0 : 1;
    const charges = this.data.charges;
    if (!separated(point, charges[index === 0 ? 1 : 0])) return;
    this.set(
      {
        charges: replaceCharge(charges, index, { ...charges[index], ...point }),
      },
      save,
    );
  }

  private loadScenario(preset: ScenarioPreset) {
    this.drag = undefined;
    this.sliceDrag = undefined;
    this.set({
      charges: [{ ...preset.charges[0] }, { ...preset.charges[1] }] as const,
      probe: { ...preset.probe },
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
    start: (item: Item, event: PointerEvent) => {
      if (event.button !== 0 || this.drag) return;
      const pointer = worldCoordinate(event);
      if (!pointer) return;
      this.drag = {
        id: event.pointerId,
        item,
        pointer,
        origin: this.position(item),
      };
      (event.currentTarget as SVGGraphicsElement).setPointerCapture(
        event.pointerId,
      );
    },
    move: (event: PointerEvent) => {
      const drag = this.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const point = worldCoordinate(event);
      if (point)
        this.move(
          drag.item,
          {
            x: drag.origin.x + point.x - drag.pointer.x,
            y: drag.origin.y + point.y - drag.pointer.y,
          },
          false,
        );
    },
    end: (event: PointerEvent) => {
      if (this.drag?.id === event.pointerId) this.pause();
    },
    key: (item: Item, event: KeyboardEvent) => {
      const shifts: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: 1 },
        ArrowDown: { x: 0, y: -1 },
      };
      const delta = shifts[event.key];
      if (!delta) return;
      event.preventDefault();
      const origin = this.position(item);
      const step = event.shiftKey ? 0.5 : 0.1;
      this.move(item, {
        x: origin.x + step * delta.x,
        y: origin.y + step * delta.y,
      });
    },
    place: (event: PointerEvent) => {
      if (event.button !== 0 || this.drag) return;
      const point = worldCoordinate(event);
      if (point) this.move("probe", point);
    },
  };

  private sliceScrub = {
    start: (event: PointerEvent, start: number, end: number) => {
      if (event.button !== 0 || this.sliceDrag) return;
      const offset = sliceOffsetFromEvent(event, start, end);
      if (offset === null) return;
      const origin = { ...this.data.probe };
      const axis = chargeAxis(this.data.charges);
      this.sliceDrag = { id: event.pointerId, origin, axis, start, end };
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      this.move("probe", along(origin, axis, offset), false);
    },
    move: (event: PointerEvent) => {
      const drag = this.sliceDrag;
      if (!drag || drag.id !== event.pointerId) return;
      const offset = sliceOffsetFromEvent(event, drag.start, drag.end);
      if (offset !== null)
        this.move("probe", along(drag.origin, drag.axis, offset), false);
    },
    end: (event: PointerEvent) => {
      if (this.sliceDrag?.id === event.pointerId) this.pause();
    },
  };

  private parameter(index: 0 | 1, t: Messages) {
    const charge = this.data.charges[index];
    const label = index === 0 ? t.first : t.second;
    const appearance =
      charge.nanoCoulombs > 0
        ? "positive"
        : charge.nanoCoulombs < 0
          ? "negative"
          : "neutral";
    const value = `${charge.nanoCoulombs > 0 ? "+" : ""}${charge.nanoCoulombs.toFixed(1)} nC`;
    return html`<section class="parameter">
      <div class=${`parameter-label ${appearance}`}>
        <h3>${label}</h3>
        <output>${value}</output>
      </div>
      <phy-slider
        .label=${label}
        .valueText=${value}
        .min=${valueRange.min}
        .max=${valueRange.max}
        .step=${valueRange.step}
        .value=${charge.nanoCoulombs}
        @input=${(event: Event) => {
          const next = chargeValue(
            (event.currentTarget as SliderElement).value,
          );
          if (next !== charge.nanoCoulombs)
            this.set({
              charges: replaceCharge(this.data.charges, index, {
                ...charge,
                nanoCoulombs: next,
              }),
            });
        }}
      ></phy-slider>
      <div class="limits" aria-hidden="true">
        <span>−8</span><span>0</span><span>+8 nC</span>
      </div>
      <output class="charge-position"
        >(${charge.x.toFixed(2)}, ${charge.y.toFixed(2)}) m</output
      >
    </section>`;
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

  private observationPanel(t: Messages, reading: Reading | null) {
    const { charges, probe, observation, support } = this.data;
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
                observation === "contributions"
                  ? contributions(reading, charges, t)
                  : slice(
                      profile(charges, probe),
                      reading,
                      charges,
                      this.chartHeight,
                      this.sliceScrub,
                      t,
                    )
              }
            </div>`
          : nothing
      }
    </phy-tabs>`;
  }

  private supportPanel(t: Messages, reading: Reading | null) {
    const { observation, support } = this.data;
    const special = classification(reading);
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
                <div class="case-note">
                  ${
                    special
                      ? html`<strong data-case=${special}>${t[special]}</strong>
                          <p>${t[`${special}Hint`]}</p>`
                      : html`<p>${t.generalHint}</p>`
                  }
                </div>
                <phy-math .source=${formulas[observation]}></phy-math>
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
    const {
      charges,
      probe,
      vectors,
      equipotential,
      components,
      observation,
      support,
    } = this.data;
    const reading = measure(probe, charges);
    const configKind = configurationKind(charges);
    const spacing = distance(charges[0], charges[1]);
    const netQ = charges[0].nanoCoulombs + charges[1].nanoCoulombs;
    const rA = distance(probe, charges[0]);
    const rB = distance(probe, charges[1]);
    const shortcuts = probeShortcuts(charges);
    const nearPoint = (target: Point) => distance(probe, target) < 0.03;

    const readouts = [
      {
        key: "potential",
        label: t.potential,
        value: reading?.potential,
        unit: "V",
      },
      {
        key: "strength",
        label: t.strength,
        value: reading?.magnitude,
        unit: "V/m",
      },
      { key: "fieldX", label: t.fieldX, value: reading?.fieldX, unit: "V/m" },
      { key: "fieldY", label: t.fieldY, value: reading?.fieldY, unit: "V/m" },
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
            <span class="status">${t.configKinds[configKind]}</span>
          </div>
          <div class="parameters">
            ${this.parameter(0, t)}${this.parameter(1, t)}
          </div>
          <div class="derived-metrics">
            <div>
              <span>${t.separation}</span
              ><output>${spacing.toFixed(2)} m</output>
            </div>
            <div>
              <span>${t.netCharge}</span
              ><output>${netQ > 0 ? "+" : ""}${netQ.toFixed(1)} nC</output>
            </div>
            <div>
              <span>${t.distA}</span><output>${rA.toFixed(2)} m</output>
            </div>
            <div>
              <span>${t.distB}</span><output>${rB.toFixed(2)} m</output>
            </div>
          </div>
          <div class="parameter-footer">
            <phy-button @click=${() => this.set(normalizeSnapshot(null))}
              >${t.reset}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
            <small>${t.note}</small>
          </div>
        </phy-box>
        <phy-box class="panel center" role="region" aria-label=${t.map}>
          <div class="panel-heading">
            <h2>${t.map}</h2>
            <small class="coordinates mono"
              >P (${probe.x.toFixed(2)}, ${probe.y.toFixed(2)}) m</small
            >
          </div>
          <div class="scene-wrap">
            ${scene(
              this.layers,
              charges,
              probe,
              reading,
              observation === "profile",
              components,
              this.input,
              t,
            )}
          </div>
          <div class="layer-controls">
            <div class="layer-switches">
              <phy-checkbox
                .checked=${vectors}
                @change=${(event: Event) => this.set({ vectors: (event.currentTarget as CheckboxElement).checked })}
                >${t.vectors}</phy-checkbox
              >
              <phy-checkbox
                .checked=${equipotential}
                @change=${(event: Event) => this.set({ equipotential: (event.currentTarget as CheckboxElement).checked })}
                >${t.equipotential}</phy-checkbox
              >
              <phy-checkbox
                .checked=${components}
                @change=${(event: Event) => this.set({ components: (event.currentTarget as CheckboxElement).checked })}
                >${t.components}</phy-checkbox
              >
            </div>
            <div class="legend" aria-hidden="true">
              <span class="positive">${t.positive}</span>
              <span class="zero">${t.zeroLine}</span>
              <span class="negative">${t.negative}</span>
            </div>
          </div>
          <div class="readouts" aria-label=${t.probe}>
            ${readouts.map(
              ({ key, label, value, unit }) =>
                html`<div class=${key}>
                  <span>${label}</span
                  ><output data-readout=${key}
                    >${display(value)}${value === undefined ? nothing : html` <small>${unit}</small>`}</output
                  >
                </div>`,
            )}
          </div>
          <div class="shortcuts">
            <button
              type="button"
              class=${nearPoint(shortcuts.midpoint) ? "selected" : ""}
              @click=${() => this.set({ probe: shortcuts.midpoint })}
            >
              ${t.midpoint}<small aria-hidden="true"
                >(${shortcuts.midpoint.x.toFixed(1)},
                ${shortcuts.midpoint.y.toFixed(1)})</small
              >
            </button>
            <button
              type="button"
              class=${nearPoint(shortcuts.bisectorPoint) ? "selected" : ""}
              @click=${() => this.set({ probe: shortcuts.bisectorPoint })}
            >
              ${t.bisectorPoint}<small aria-hidden="true"
                >(${shortcuts.bisectorPoint.x.toFixed(1)},
                ${shortcuts.bisectorPoint.y.toFixed(1)})</small
              >
            </button>
            <button
              type="button"
              class=${nearPoint(shortcuts.outerPoint) ? "selected" : ""}
              @click=${() => this.set({ probe: shortcuts.outerPoint })}
            >
              ${t.outerPoint}<small aria-hidden="true"
                >(${shortcuts.outerPoint.x.toFixed(1)},
                ${shortcuts.outerPoint.y.toFixed(1)})</small
              >
            </button>
          </div>
        </phy-box>
        <phy-box
          class=${"panel right" + (support === "explore" ? " exploring" : "")}
          role="region"
          aria-label=${t.observe}
        >
          ${this.observationPanel(t, reading)} ${this.supportPanel(t, reading)}
        </phy-box>
      </div>`;
  }
}

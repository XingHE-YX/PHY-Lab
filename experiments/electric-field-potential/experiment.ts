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
import { contributions, display, slice } from "./components/observation";
import { scene, staticLayers, worldCoordinate } from "./components/scene";
import { messages, type Messages } from "./locales/messages";
import {
  board,
  bounded,
  chargeBounds,
  chargeValue,
  measure,
  midpoint,
  presets,
  replaceCharge,
  separated,
  valueRange,
  zeroTolerance,
  type Item,
  type Point,
  type Preset,
  type Reading,
} from "./model/electrostatics";
import { profile } from "./model/profile";
import {
  normalizeSnapshot,
  type Observation,
  type Snapshot,
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
  static properties = { locale: { state: true }, data: { state: true } };
  declare locale: Locale;
  declare private data: Snapshot;
  private context?: ExperimentContext;
  private drag?: { id: number; item: Item; pointer: Point; origin: Point };
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
    render(nothing, this.help.shadowRoot!);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.onHide);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    if (this.dialog && changed.has("locale")) this.updateHelp();
  }

  private persist() {
    this.context?.storage.write(this.snapshot());
  }

  pause() {
    this.drag = undefined;
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

  protected render() {
    const t = messages(this.locale);
    const { charges, probe, vectors, equipotential, observation } = this.data;
    const reading = measure(probe, charges);
    const special = classification(reading);
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
        <h1>${t.title}</h1>
        <p>${t.subtitle}</p>
      </header>
      <div class="lab">
        <phy-box class="panel" role="complementary" aria-label=${t.settings}>
          <div class="panel-heading"><h2>${t.settings}</h2></div>
          <div class="parameters">
            <p>${t.note}</p>
            ${this.parameter(0, t)}${this.parameter(1, t)}
          </div>
          <div class="presets">
            <phy-select
              .label=${t.preset}
              .value=${""}
              .options=${[{ value: "", label: t.preset, disabled: true }, ...(Object.keys(presets) as Preset[]).map((key) => ({ value: key, label: t[key] }))]}
              @change=${(event: Event) => {
                const control = event.currentTarget as SelectElement;
                const selection = presets[control.value as Preset];
                if (selection)
                  this.set({ charges: selection, probe: midpoint(selection) });
                control.value = "";
              }}
            ></phy-select>
            <phy-button @click=${() => this.set({ probe: midpoint(charges) })}
              >${t.midpoint}</phy-button
            >
          </div>
          <div class="footer">
            <phy-button @click=${() => this.set(normalizeSnapshot(null))}
              >${t.reset}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.map}>
          <div class="panel-heading">
            <h2>${t.map}</h2>
            <small class="coordinates"
              >P (${probe.x.toFixed(2)}, ${probe.y.toFixed(2)}) m</small
            >
            <div class="switches">
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
            </div>
          </div>
          <div class="scene-wrap">
            ${scene(this.layers, charges, probe, reading, observation === "profile", this.input, t)}
          </div>
          <div class="legend">
            <span class="positive">${t.positive}</span
            ><span class="zero">${t.zeroLine}</span>
            <span class="negative">${t.negative}</span
            ><span class="arrow-note">${t.arrowNote}</span>
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
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.observe}>
          <phy-tabs
            class="observation-tabs"
            .label=${t.observe}
            .value=${observation}
            .items=${observations.map((value) => ({ value, label: t[value] }))}
            @change=${(event: Event) => {
              if (event.target === event.currentTarget)
                this.set({
                  observation: (event.currentTarget as TabsElement)
                    .value as Observation,
                });
            }}
          >
            <div class="observation" slot=${observation}>
              ${observation === "contributions" ? contributions(reading, t) : slice(profile(charges, probe), reading, t)}
              <section class="model-formula">
                ${
                  special
                    ? html`<strong data-case=${special}>${t[special]}</strong>
                        <p>${t[`${special}Hint`]}</p>`
                    : nothing
                }
                <phy-math .source=${formulas[observation]}></phy-math>
              </section>
            </div>
          </phy-tabs>
        </phy-box>
      </div>`;
  }
}

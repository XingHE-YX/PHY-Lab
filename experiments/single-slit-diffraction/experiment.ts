import { html, LitElement, nothing, render, type PropertyValues } from "lit";
import type {
  ExperimentContext,
  Locale,
} from "../../src/infra/platform/protocols/v2";
import type { DialogHandle } from "../../src/infra/platform/protocols/v2/api/dialog";
import type {
  CheckboxElement,
  SliderElement,
} from "../../src/infra/platform/protocols/v2/components";
import {
  chartWidth,
  intensityChart,
  pattern,
  screen,
} from "./components/plots";
import { messages, type Messages } from "./locales/messages";
import {
  intensityAt,
  limits,
  parameterValue,
  probeValue,
  screenExtent,
  type Parameter,
  type Parameters,
} from "./model/diffraction";
import { normalizeSnapshot, type Snapshot } from "./model/snapshot";
import { styles } from "./styles/desktop";

const formula = String.raw`\frac{I}{I_0}=\left(\frac{\sin\beta}{\beta}\right)^2,\quad\beta=\frac{\pi a}{\lambda}\sin\theta`;
const parameters = ["slit", "wavelength", "distance"] as const;

type Lane = "current" | "reference";
type Pattern = ReturnType<typeof pattern>;
const sliderValue = (event: Event) =>
  (event.currentTarget as SliderElement).value;

export class SingleSlitExperiment extends LitElement {
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
  private pointer?: { id: number; target: SVGElement };
  private readonly patterns: Partial<
    Record<Lane, { settings: Parameters; drawing: Pattern }>
  > = {};
  private readonly help = document.createElement("div");
  private readonly chartObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0)
      this.chartHeight = Math.max(
        140,
        Math.round((height * chartWidth) / width),
      );
  });
  private dialog?: DialogHandle;

  constructor() {
    super();
    this.locale = "zh-CN";
    this.data = normalizeSnapshot(null);
    this.chartHeight = 205;
    this.help.attachShadow({ mode: "open" });
  }

  initialize(context: ExperimentContext) {
    this.context = context;
    this.locale = context.locale;
    this.data = normalizeSnapshot(context.storage.read<unknown>(null));
  }

  snapshot(): Snapshot {
    return { ...this.data, parameters: { ...this.data.parameters } };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.pause);
    void this.updateComplete.then(() => {
      const frame = this.renderRoot.querySelector(".chart-frame");
      if (frame && this.isConnected) this.chartObserver.observe(frame);
    });
  }

  disconnectedCallback() {
    this.pause();
    this.dialog?.close();
    this.chartObserver.disconnect();
    render(nothing, this.help.shadowRoot!);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.pause);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    if (this.dialog && changed.has("locale")) this.updateHelp();
  }

  pause = () => {
    const pointer = this.pointer;
    this.pointer = undefined;
    if (pointer?.target.hasPointerCapture(pointer.id))
      pointer.target.releasePointerCapture(pointer.id);
    this.persist();
  };

  private onVisibility = () => {
    if (document.hidden) this.pause();
  };

  private persist() {
    this.context?.storage.write(this.snapshot());
  }

  private set(patch: Partial<Snapshot>, save = true) {
    this.data = { ...this.data, ...patch };
    if (save) this.persist();
  }

  private changeParameter(key: Parameter, raw: number) {
    const value = parameterValue(key, raw);
    this.set({ parameters: { ...this.data.parameters, [key]: value } });
  }

  private setProbe(raw: number, save = true) {
    const probe = probeValue(raw);
    if (probe !== this.data.probe) this.set({ probe }, save);
  }

  private readonly scrub = {
    start: (event: PointerEvent, position: number | null) => {
      if (event.button !== 0 || this.pointer || position === null) return;
      const target = event.currentTarget as SVGElement;
      target.setPointerCapture(event.pointerId);
      this.pointer = { id: event.pointerId, target };
      this.setProbe(position, false);
    },
    move: (event: PointerEvent, position: number | null) => {
      if (this.pointer?.id === event.pointerId && position !== null)
        this.setProbe(position, false);
    },
    end: (event: PointerEvent) => {
      if (this.pointer?.id === event.pointerId) this.pause();
    },
  };

  private drawing(settings: Parameters, lane: Lane) {
    const cached = this.patterns[lane];
    if (
      cached?.settings.slit === settings.slit &&
      cached.settings.wavelength === settings.wavelength &&
      cached.settings.distance === settings.distance
    )
      return cached.drawing;
    const drawing = pattern(settings, lane);
    this.patterns[lane] = { settings, drawing };
    return drawing;
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

  private parameter(key: Parameter, t: Messages) {
    const { min, max, step, digits, unit } = limits[key];
    const value = this.data.parameters[key];
    const valueText = `${value.toFixed(digits)} ${unit}`;
    return html`
      <div class="parameter">
        <div class="control-label">
          <span>${t[key]}</span><output>${valueText}</output>
        </div>
        <phy-slider
          .label=${t[key]}
          .valueText=${valueText}
          .value=${value}
          .min=${min}
          .max=${max}
          .step=${step}
          @input=${(event: Event) => this.changeParameter(key, sliderValue(event))}
        ></phy-slider>
        <div class="limits" aria-hidden="true">
          <span>${min.toFixed(digits)}</span
          ><span>${max.toFixed(digits)} ${unit}</span>
        </div>
      </div>
    `;
  }

  protected render() {
    const t = messages(this.locale);
    const { parameters: settings, reference, probe, guides } = this.data;
    const referenceSettings = { ...settings, slit: reference };
    const currentPattern = this.drawing(settings, "current");
    const referencePattern = this.drawing(referenceSettings, "reference");
    const readings = [
      intensityAt(probe, settings),
      intensityAt(probe, referenceSettings),
    ] as const;
    const positionText = `${probe.toFixed(2)} mm`;
    return html`
      <header class="heading">
        <h1>${t.title}</h1>
        <span>${t.model}</span>
      </header>
      <div class="lab">
        <phy-box class="panel" role="region" aria-label=${t.settings}>
          <div class="panel-heading"><h2>${t.settings}</h2></div>
          <div class="parameters">
            ${parameters.map((key) => this.parameter(key, t))}
          </div>
          <div class="reference-controls">
            <div class="shortcuts">
              <phy-button
                @click=${() => this.changeParameter("slit", limits.slit.min)}
                >${t.narrow}</phy-button
              >
              <phy-button
                @click=${() => this.changeParameter("slit", limits.slit.max)}
                >${t.wide}</phy-button
              >
            </div>
            <div class="control-label">
              <span>${t.referenceWidth}</span
              ><output data-readout="reference-slit">${reference} μm</output>
            </div>
            <phy-button @click=${() => this.set({ reference: settings.slit })}
              >${t.setReference}</phy-button
            >
          </div>
          <div class="tools">
            <phy-button @click=${() => this.set(normalizeSnapshot(null))}
              >${t.reset}</phy-button
            >
            <phy-button @click=${this.openHelp}>${t.help}</phy-button>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.screen}>
          <div class="panel-heading">
            <h2>${t.screen}</h2>
            <phy-checkbox
              .checked=${guides}
              @change=${(event: Event) => this.set({ guides: (event.currentTarget as CheckboxElement).checked })}
              >${t.guides}</phy-checkbox
            >
          </div>
          <div class="screen-content">
            <div class="screen-frame">
              ${screen(currentPattern, referencePattern, probe, readings, guides, this.scrub, t)}
            </div>
            <p>${t.stripeHint}</p>
          </div>
          <div class="probe-controls">
            <div class="control-label">
              <span>${t.position}</span
              ><output data-readout="probe">${positionText}</output>
            </div>
            <phy-slider
              .label=${t.position}
              .valueText=${positionText}
              .value=${probe}
              .min=${-screenExtent}
              .max=${screenExtent}
              .step=${0.01}
              @input=${(event: Event) => this.setProbe(sliderValue(event))}
            ></phy-slider>
            <div class="shortcuts">
              <phy-button @click=${() => this.setProbe(0)}
                >${t.axis}</phy-button
              >
              <phy-button @click=${() => this.setProbe(currentPattern.first)}
                >${t.firstDark}</phy-button
              >
            </div>
          </div>
          <div class="readouts">
            <div>
              <span>${t.currentIntensity}</span
              ><output data-readout="current-intensity"
                >${readings[0].toFixed(4)}</output
              >
            </div>
            <div>
              <span>${t.referenceIntensity}</span
              ><output data-readout="reference-intensity"
                >${readings[1].toFixed(4)}</output
              >
            </div>
          </div>
        </phy-box>
        <phy-box class="panel" role="region" aria-label=${t.analysis}>
          <div class="panel-heading"><h2>${t.analysis}</h2></div>
          <div class="chart-content">
            <div class="legend">
              <span class="current">${t.current}</span
              ><span class="reference">${t.reference}</span>
            </div>
            <div class="chart-frame">
              ${intensityChart(this.chartHeight, currentPattern, referencePattern, probe, readings, guides, this.scrub, t)}
            </div>
          </div>
          <div class="widths">
            <h3>${t.width}</h3>
            <dl>
              <div>
                <dt>${t.current}</dt>
                <dd data-readout="current-width">
                  ${currentPattern.centralWidth.toFixed(2)} mm
                </dd>
              </div>
              <div>
                <dt>${t.reference}</dt>
                <dd data-readout="reference-width">
                  ${referencePattern.centralWidth.toFixed(2)} mm
                </dd>
              </div>
              <div>
                <dt>${t.ratio}</dt>
                <dd data-readout="width-ratio">
                  ${(currentPattern.first / referencePattern.first).toFixed(2)}×
                </dd>
              </div>
            </dl>
            <p>${t.widthNote}</p>
          </div>
          <div class="formula">
            <phy-math .source=${formula}></phy-math>
            <p>${t.lesson}</p>
          </div>
        </phy-box>
      </div>
    `;
  }
}

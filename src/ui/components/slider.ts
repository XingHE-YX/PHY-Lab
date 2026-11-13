import { css, html } from "lit";
import { live } from "lit/directives/live.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
export class PhySlider extends FormControl {
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    label: { type: String },
    valueText: { type: String, attribute: "value-text" },
  };
  declare value: number;
  declare min: number;
  declare max: number;
  declare step: number;
  declare label: string;
  declare valueText: string;
  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.label = "";
    this.valueText = "";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      input {
        appearance: none;
        display: block;
        width: 100%;
        height: 18px;
        margin: 0;
        background: transparent;
        cursor: pointer;
      }
      input::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: var(--radius);
        background: linear-gradient(
          to right,
          var(--primary) 0 var(--fill),
          var(--border) var(--fill) 100%
        );
      }
      input::-moz-range-track {
        height: 4px;
        border-radius: var(--radius);
        background: var(--border);
      }
      input::-moz-range-progress {
        height: 4px;
        border-radius: var(--radius);
        background: var(--primary);
      }
      input::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        margin-top: -4px;
        border: 1px solid var(--primary);
        border-radius: var(--radius);
        background: var(--primary);
      }
      input::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border: 1px solid var(--primary);
        border-radius: var(--radius);
        background: var(--primary);
      }
      input:disabled {
        opacity: 0.45;
        cursor: default;
      }
    `,
  ];
  protected get currentValue() {
    return this.value;
  }
  protected restoreValue(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) this.value = value;
  }
  get valueAsNumber() {
    return this.value;
  }
  set valueAsNumber(value: number) {
    this.value = value;
  }
  private onValue(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).valueAsNumber;
    this.emit(event.type as "input" | "change");
  }
  render() {
    const fraction =
      this.max > this.min
        ? Math.max(
            0,
            Math.min(1, (this.value - this.min) / (this.max - this.min)),
          )
        : 0;
    return html`<input
      part="input"
      type="range"
      aria-label=${ifDefined(this.label || undefined)}
      aria-valuetext=${ifDefined(this.valueText || undefined)}
      min=${this.min}
      max=${this.max}
      step=${this.step}
      .value=${live(String(this.value))}
      style=${`--fill:${fraction * 100}%`}
      ?disabled=${this.effectiveDisabled}
      @input=${this.onValue}
      @change=${this.onValue}
    />`;
  }
}
customElements.define("phy-slider", PhySlider);

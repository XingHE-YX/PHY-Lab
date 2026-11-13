import { css, html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
import type { SelectOption } from "../../infra/platform/protocols/v2/components/select";
export class PhySelect extends FormControl {
  static properties = {
    value: { type: String },
    label: { type: String },
    options: { attribute: false },
  };
  declare value: string;
  declare label: string;
  declare options: readonly SelectOption[];
  constructor() {
    super();
    this.value = "";
    this.label = "";
    this.options = [];
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        min-width: 0;
      }
      select {
        width: 100%;
        min-height: 36px;
        padding: 6px 26px 6px 9px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: var(--select-font-size, 12px);
        cursor: pointer;
      }
      select:disabled {
        opacity: 0.45;
        cursor: default;
      }
    `,
  ];
  protected get currentValue() {
    return this.value;
  }
  protected restoreValue(value: unknown) {
    if (typeof value === "string") this.value = value;
  }
  protected updated() {
    if (this.nativeControl) this.nativeControl.value = this.value;
    super.updated();
  }
  private onChange(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLSelectElement).value;
    this.emit(event.type as "input" | "change");
  }
  render() {
    return html`<select
      part="select"
      aria-label=${ifDefined(this.label || undefined)}
      ?disabled=${this.effectiveDisabled}
      ?required=${this.required}
      @input=${this.onChange}
      @change=${this.onChange}
    >
      ${this.options.map((option) => html`<option value=${option.value} ?disabled=${option.disabled}>${option.label}</option>`)}
    </select>`;
  }
}
customElements.define("phy-select", PhySelect);

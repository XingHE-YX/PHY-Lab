import { css, html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
import { icon } from "./icons";
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
        vertical-align: middle;
      }
      .field {
        position: relative;
      }
      .field.disabled {
        opacity: 0.45;
      }
      select {
        appearance: none;
        -webkit-appearance: none;
        display: block;
        width: 100%;
        min-height: 36px;
        margin: 0;
        padding: 7px 32px 7px 13px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: var(--select-font-size, 13px);
        line-height: 1.3;
        cursor: pointer;
      }
      select:disabled {
        cursor: default;
      }
      .chevron {
        position: absolute;
        inset-inline-end: 9px;
        top: 50%;
        display: flex;
        color: var(--muted);
        pointer-events: none;
        transform: translateY(-50%);
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
    return html`<div
      class=${this.effectiveDisabled ? "field disabled" : "field"}
    >
      <select
        part="select"
        aria-label=${ifDefined(this.label || undefined)}
        ?disabled=${this.effectiveDisabled}
        ?required=${this.required}
        @input=${this.onChange}
        @change=${this.onChange}
      >
        ${this.options.map((option) => html`<option value=${option.value} ?disabled=${option.disabled}>${option.label}</option>`)}</select
      ><span class="chevron" aria-hidden="true">${icon("chevronDown")}</span>
    </div>`;
  }
}
customElements.define("phy-select", PhySelect);

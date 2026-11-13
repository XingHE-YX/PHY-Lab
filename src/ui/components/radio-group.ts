import { css, html } from "lit";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
import type { RadioOption } from "../../infra/platform/protocols/v2/components/radio-group";
let nextGroup = 0;
export class PhyRadioGroup extends FormControl {
  static properties = {
    value: { type: String },
    options: { attribute: false },
    label: { type: String },
    variant: { type: String, reflect: true },
  };
  declare value: string;
  declare options: readonly RadioOption[];
  declare label: string;
  declare variant: string;
  private readonly groupName = `phy-radio-${++nextGroup}`;
  constructor() {
    super();
    this.value = "";
    this.options = [];
    this.label = "";
    this.variant = "";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        min-width: 0;
      }
      .group {
        display: flex;
        gap: 8px;
      }
      label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: inherit;
      }
      input {
        accent-color: var(--primary);
        margin: 0;
      }
      label.disabled {
        opacity: 0.45;
        cursor: default;
      }
      :host([variant="segmented"]) .group {
        gap: var(--radio-gap, 4px);
      }
      :host([variant="segmented"]) label {
        flex: 1;
        position: relative;
        min-width: 0;
      }
      :host([variant="segmented"]) input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
      :host([variant="segmented"]) span {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 36px;
        padding: 5px 8px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: var(--radio-font-size, 12px);
        white-space: nowrap;
      }
      :host([variant="segmented"]) input:checked + span {
        background: var(--primary-soft);
        color: var(--primary);
        border-color: var(--primary);
      }
      :host([variant="segmented"]) input:focus-visible + span {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
      :host([variant="segmented"]) label:not(.disabled):hover span {
        background: var(--subtle);
      }
    `,
  ];
  protected get nativeControl() {
    return (
      this.renderRoot.querySelector<HTMLInputElement>("input:checked") ??
      this.renderRoot.querySelector<HTMLInputElement>("input") ??
      undefined
    );
  }
  protected get currentValue() {
    return this.value;
  }
  protected restoreValue(value: unknown) {
    if (typeof value === "string") this.value = value;
  }
  protected get submissionValue() {
    return this.options.some(
      (option) => option.value === this.value && !option.disabled,
    )
      ? this.value
      : null;
  }
  private onValue(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).value;
    this.emit(event.type as "input" | "change");
  }
  render() {
    return html`<div
      class="group"
      part="group"
      role="radiogroup"
      aria-label=${this.label}
    >
      ${this.options.map((option) => html`<label class=${this.effectiveDisabled || option.disabled ? "disabled" : ""}><input type="radio" name=${this.name || this.groupName} .value=${option.value} .checked=${this.value === option.value} ?disabled=${this.effectiveDisabled || option.disabled} ?required=${this.required} @input=${this.onValue} @change=${this.onValue} /><span>${option.label}</span></label>`)}
    </div>`;
  }
}
customElements.define("phy-radio-group", PhyRadioGroup);

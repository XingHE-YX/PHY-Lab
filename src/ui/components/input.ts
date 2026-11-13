import { html, css } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
export class PhyInput extends FormControl {
  static properties = {
    type: { type: String },
    value: { type: String },
    label: { type: String },
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: "readonly", reflect: true },
    autocomplete: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    pattern: { type: String },
    minLength: { type: Number, attribute: "minlength" },
    maxLength: { type: Number, attribute: "maxlength" },
    startFilled: { state: true },
    endFilled: { state: true },
  };
  declare type: string;
  declare value: string;
  declare label: string;
  declare placeholder: string;
  declare readOnly: boolean;
  declare autocomplete: string;
  declare min: string;
  declare max: string;
  declare step: string;
  declare pattern: string;
  declare minLength: number;
  declare maxLength: number;
  declare startFilled: boolean;
  declare endFilled: boolean;
  constructor() {
    super();
    this.type = "text";
    this.value = "";
    this.label = "";
    this.placeholder = "";
    this.readOnly = false;
    this.autocomplete = "";
    this.min = "";
    this.max = "";
    this.step = "";
    this.pattern = "";
    this.minLength = -1;
    this.maxLength = -1;
    this.startFilled = false;
    this.endFilled = false;
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        min-width: 0;
      }
      .field {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        padding: 0 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--input-background, var(--surface));
      }
      .field:focus-within {
        border-color: var(--primary);
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
      :host([disabled]) {
        opacity: 0.45;
      }
      input {
        width: 100%;
        min-width: 0;
        min-height: 34px;
        padding: 6px 0;
        border: 0;
        background: transparent;
        color: var(--text);
        font: inherit;
        font-size: var(--input-font-size, 12px);
        outline: none !important;
      }
      input::placeholder {
        color: var(--muted);
      }
      input[type="search"]::-webkit-search-cancel-button {
        appearance: none;
      }
      slot {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        color: var(--muted);
      }
      slot[hidden] {
        display: none;
      }
    `,
  ];
  protected get currentValue() {
    return this.value;
  }
  protected restoreValue(value: unknown) {
    if (typeof value === "string") this.value = value;
  }
  get valueAsNumber() {
    return this.type === "number"
      ? this.value.trim()
        ? Number(this.value)
        : NaN
      : ((this.nativeControl as HTMLInputElement | undefined)?.valueAsNumber ??
          NaN);
  }
  set valueAsNumber(value: number) {
    this.value = Number.isFinite(value) ? String(value) : "";
  }
  select() {
    (this.nativeControl as HTMLInputElement | undefined)?.select();
  }
  setSelectionRange(
    start: number | null,
    end: number | null,
    direction?: "forward" | "backward" | "none",
  ) {
    (this.nativeControl as HTMLInputElement | undefined)?.setSelectionRange(
      start,
      end,
      direction,
    );
  }
  private onValue(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).value;
    this.emit(event.type as "input" | "change");
  }
  render() {
    return html`<div class="field" part="base">
      <slot
        name="start"
        ?hidden=${!this.startFilled}
        @slotchange=${(e: Event) => {
          this.startFilled =
            (e.target as HTMLSlotElement).assignedNodes().length > 0;
        }}
      ></slot>
      <input
        part="input"
        type=${this.type}
        .value=${live(this.value)}
        aria-label=${ifDefined(this.label || undefined)}
        placeholder=${this.placeholder}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        autocomplete=${ifDefined(this.autocomplete || undefined)}
        min=${ifDefined(this.min || undefined)}
        max=${ifDefined(this.max || undefined)}
        step=${ifDefined(this.step || undefined)}
        pattern=${ifDefined(this.pattern || undefined)}
        minlength=${ifDefined(this.minLength >= 0 ? this.minLength : undefined)}
        maxlength=${ifDefined(this.maxLength >= 0 ? this.maxLength : undefined)}
        @input=${this.onValue}
        @change=${this.onValue}
      />
      <slot
        name="end"
        ?hidden=${!this.endFilled}
        @slotchange=${(e: Event) => {
          this.endFilled =
            (e.target as HTMLSlotElement).assignedNodes().length > 0;
        }}
      ></slot>
    </div>`;
  }
}
customElements.define("phy-input", PhyInput);

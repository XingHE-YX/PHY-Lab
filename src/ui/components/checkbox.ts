import { css, html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { FormControl } from "./form-control";
import { baseStyles } from "../styles/shared";
export class PhyCheckbox extends FormControl {
  static properties = {
    slotLabel: { state: true },
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean },
    value: { type: String },
    label: { type: String },
  };
  declare slotLabel: string;
  declare checked: boolean;
  declare indeterminate: boolean;
  declare value: string;
  declare label: string;
  protected get controlRole(): string | undefined {
    return undefined;
  }
  constructor() {
    super();
    this.slotLabel = "";
    this.checked = false;
    this.indeterminate = false;
    this.value = "on";
    this.label = "";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
      }
      label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        font-size: inherit;
        cursor: pointer;
      }
      span[part="label"] {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      input {
        appearance: none;
        position: relative;
        flex-shrink: 0;
        margin: 0;
        width: 14px;
        height: 14px;
        border: 1px solid var(--muted);
        border-radius: 2px;
        background: var(--surface);
        cursor: inherit;
      }
      input:checked,
      input:indeterminate {
        background: var(--primary);
        border-color: var(--primary);
      }
      input:checked::after {
        content: "";
        position: absolute;
        width: 7px;
        height: 4px;
        border-left: 2px solid var(--surface);
        border-bottom: 2px solid var(--surface);
        transform: rotate(-45deg);
        left: 3px;
        top: 3px;
      }
      input:indeterminate::after {
        content: "";
        position: absolute;
        left: 3px;
        top: 5px;
        width: 6px;
        border-top: 2px solid var(--surface);
        transform: none;
      }
      label.disabled {
        opacity: 0.45;
        cursor: default;
      }
    `,
  ];
  private readonly labelObserver = new MutationObserver(() => this.syncLabel());
  connectedCallback() {
    super.connectedCallback();
    this.labelObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  disconnectedCallback() {
    this.labelObserver.disconnect();
    super.disconnectedCallback();
  }
  private syncLabel() {
    const nodes =
      this.renderRoot.querySelector("slot")?.assignedNodes({ flatten: true }) ??
      [];
    this.slotLabel = nodes
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  }
  protected get currentValue() {
    return this.checked;
  }
  protected restoreValue(value: unknown) {
    if (typeof value === "boolean") {
      this.checked = value;
      this.indeterminate = false;
    }
  }
  protected get submissionValue() {
    return this.checked ? this.value : null;
  }
  private onValue(event: Event) {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.checked = input.checked;
    this.indeterminate = input.indeterminate;
    this.emit(event.type as "input" | "change");
  }
  render() {
    return html`<label
      class=${this.effectiveDisabled ? "disabled" : ""}
      part="base"
      ><input
        part="input"
        type="checkbox"
        role=${ifDefined(this.controlRole)}
        aria-label=${ifDefined(this.label || this.slotLabel || undefined)}
        .checked=${this.checked}
        .indeterminate=${this.indeterminate}
        .value=${this.value}
        ?disabled=${this.effectiveDisabled}
        ?required=${this.required}
        @input=${this.onValue}
        @change=${this.onValue}
      /><span part="label"
        ><slot @slotchange=${this.syncLabel}>${this.label}</slot></span
      ></label
    >`;
  }
}
customElements.define("phy-checkbox", PhyCheckbox);

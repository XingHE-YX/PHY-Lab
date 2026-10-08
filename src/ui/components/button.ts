import { LitElement, html, css } from "lit";
import { baseStyles, buttonStyles } from "../styles/shared";
export class PhyButton extends LitElement {
  static properties = {
    variant: { type: String },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static styles = [
    baseStyles,
    buttonStyles,
    css`
      :host {
        display: inline-block;
      }
      button {
        width: 100%;
      }
    `,
  ];
  declare variant: string;
  declare disabled: boolean;
  declare label: string;
  constructor() {
    super();
    this.variant = "";
    this.disabled = false;
    this.label = "";
  }
  render() {
    return html`<button
      type="button"
      class=${this.variant}
      ?disabled=${this.disabled}
      aria-label=${this.label || ""}
    >
      <slot></slot>
    </button>`;
  }
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector("button")?.focus(options);
  }
}
customElements.define("phy-button", PhyButton);

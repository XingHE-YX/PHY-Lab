import { LitElement, css, html } from "lit";
import { baseStyles } from "../styles/shared";
export class PhyBox extends LitElement {
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        min-height: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        padding: var(--box-padding, 0);
      }
    `,
  ];
  render() {
    return html`<slot></slot>`;
  }
}
customElements.define("phy-box", PhyBox);

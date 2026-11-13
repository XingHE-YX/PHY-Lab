import { LitElement, css, html } from "lit";
import { baseStyles } from "../styles/shared";
export class PhyProgress extends LitElement {
  static properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
  };
  declare value: number;
  declare max: number;
  declare label: string;
  constructor() {
    super();
    this.value = 0;
    this.max = 100;
    this.label = "";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      progress {
        appearance: none;
        display: block;
        width: 100%;
        height: 6px;
        border: 0;
        border-radius: var(--radius);
        overflow: hidden;
        background: var(--border);
        color: var(--primary);
      }
      progress::-webkit-progress-bar {
        background: var(--border);
      }
      progress::-webkit-progress-value {
        background: var(--primary);
      }
      progress::-moz-progress-bar {
        background: var(--primary);
      }
    `,
  ];
  render() {
    const max = Number.isFinite(this.max) && this.max > 0 ? this.max : 100;
    const value = Number.isFinite(this.value)
      ? Math.max(0, Math.min(max, this.value))
      : 0;
    return html`<progress
      part="progress"
      aria-label=${this.label}
      .value=${value}
      .max=${max}
    ></progress>`;
  }
}
customElements.define("phy-progress", PhyProgress);

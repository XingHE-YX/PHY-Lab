import { LitElement, css, html } from "lit";
import { baseStyles } from "../styles/shared";
import type { TabItem } from "../../infra/platform/protocols/v2/components/tabs";
let nextTabs = 0;
export class PhyTabs extends LitElement {
  static properties = {
    value: { type: String },
    items: { attribute: false },
    label: { type: String },
    variant: { type: String, reflect: true },
  };
  declare value: string;
  declare items: readonly TabItem[];
  declare label: string;
  declare variant: string;
  private readonly tabPrefix = `phy-tabs-${++nextTabs}`;
  constructor() {
    super();
    this.value = "";
    this.items = [];
    this.label = "";
    this.variant = "line";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }
      .tabs {
        display: flex;
        flex-shrink: 0;
        border-bottom: 1px solid var(--border);
      }
      button {
        flex: 1;
        min-width: 0;
        min-height: 36px;
        padding: 6px 8px;
        border: 0;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        background: transparent;
        font-size: var(--tab-font-size, 12px);
        white-space: nowrap;
        color: var(--muted);
      }
      button[aria-selected="true"] {
        border-bottom-color: var(--primary);
        color: var(--primary);
      }
      button:hover:not(:disabled) {
        background: var(--subtle);
      }
      [role="tabpanel"] {
        flex: 1;
        min-width: 0;
        min-height: 0;
      }
      [hidden] {
        display: none !important;
      }
      :host([variant="segmented"]) .tabs {
        border: 0;
        gap: 4px;
      }
      :host([variant="segmented"]) button {
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      :host([variant="segmented"]) button[aria-selected="true"] {
        background: var(--primary-soft);
        border-color: var(--primary);
      }
    `,
  ];
  protected willUpdate() {
    if (!this.items.some((item) => item.value === this.value && !item.disabled))
      this.value = this.items.find((item) => !item.disabled)?.value ?? "";
  }
  private choose(value: string) {
    if (this.value === value) return;
    this.value = value;
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
  private keys(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = this.items.filter((item) => !item.disabled);
    if (!enabled.length) return;
    const current = Math.max(
      0,
      enabled.findIndex((item) => item.value === this.value),
    );
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabled.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) %
            enabled.length;
    this.choose(enabled[index].value);
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus(),
    );
  }
  focus(options?: FocusOptions) {
    this.renderRoot
      .querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus(options);
  }
  render() {
    return html`<div
        class="tabs"
        role="tablist"
        aria-label=${this.label}
        @keydown=${this.keys}
        part="tabs"
      >
        ${this.items.map((item, i) => html`<button type="button" id=${`${this.tabPrefix}-tab-${i}`} role="tab" aria-selected=${this.value === item.value} aria-controls=${`${this.tabPrefix}-panel-${i}`} tabindex=${this.value === item.value ? 0 : -1} ?disabled=${item.disabled} @click=${() => this.choose(item.value)}>${item.label}</button>`)}
      </div>
      ${this.items.map((item, i) => html`<section id=${`${this.tabPrefix}-panel-${i}`} role="tabpanel" aria-labelledby=${`${this.tabPrefix}-tab-${i}`} ?hidden=${this.value !== item.value} part="panel"><slot name=${item.value}></slot></section>`)} `;
  }
}
customElements.define("phy-tabs", PhyTabs);

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
    orientation: { type: String, reflect: true },
  };
  declare value: string;
  declare items: readonly TabItem[];
  declare label: string;
  declare variant: string;
  declare orientation: "horizontal" | "vertical";
  private readonly tabPrefix = `phy-tabs-${++nextTabs}`;
  constructor() {
    super();
    this.value = "";
    this.items = [];
    this.label = "";
    this.variant = "line";
    this.orientation = "horizontal";
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
        gap: var(--tab-gap, 0);
      }
      button {
        flex: var(--tab-flex, 1);
        min-width: 0;
        min-height: var(--tab-height, 36px);
        padding: var(--tab-padding, 6px 8px);
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
        gap: var(--tab-gap, 4px);
      }
      :host([variant="segmented"]) button {
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      :host([variant="segmented"]) button[aria-selected="true"] {
        background: var(--primary-soft);
        border-color: var(--primary);
      }
      :host([orientation="vertical"]) {
        flex-direction: row;
      }
      :host([orientation="vertical"]) .tabs {
        flex: 0 0 var(--tab-sidebar-width, 180px);
        width: var(--tab-sidebar-width, 180px);
        min-height: 0;
        flex-direction: column;
        gap: var(--tab-gap, 4px);
        border: 0;
        border-inline-end: 1px solid var(--border);
        padding-inline-end: 16px;
        overflow: auto;
      }
      :host([orientation="vertical"]) button {
        flex: 0 0 auto;
        border: 1px solid transparent;
        border-radius: var(--radius);
        padding: 8px 12px;
        text-align: start;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      :host([orientation="vertical"]) button[aria-selected="true"] {
        background: var(--primary-soft);
        color: var(--primary);
      }
      :host([orientation="vertical"]) [role="tabpanel"] {
        padding-inline-start: 24px;
        overflow: auto;
      }
    `,
  ];
  protected willUpdate() {
    if (this.orientation !== "vertical") this.orientation = "horizontal";
    if (!this.items.some((item) => item.value === this.value && !item.disabled))
      this.value = this.items.find((item) => !item.disabled)?.value ?? "";
  }
  private choose(value: string) {
    const changed = this.value !== value;
    this.value = value;
    if (changed)
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
    this.dispatchEvent(
      new Event("activate", { bubbles: true, composed: true }),
    );
  }
  private keys(event: KeyboardEvent) {
    const previous = this.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const next = this.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    if (![previous, next, "Home", "End"].includes(event.key)) return;
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
          : (current + (event.key === next ? 1 : -1) + enabled.length) %
            enabled.length;
    this.choose(enabled[index].value);
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus(),
    );
  }
  focus(options?: FocusOptions) {
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus(options),
    );
  }
  render() {
    return html`<div
        class="tabs"
        role="tablist"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        @keydown=${this.keys}
        part="tabs"
      >
        ${this.items.map((item, i) => html`<button type="button" id=${`${this.tabPrefix}-tab-${i}`} role="tab" aria-selected=${this.value === item.value} aria-controls=${`${this.tabPrefix}-panel-${i}`} tabindex=${this.value === item.value ? 0 : -1} ?disabled=${item.disabled} @click=${() => this.choose(item.value)}>${item.label}</button>`)}
      </div>
      ${this.items.map((item, i) => html`<section id=${`${this.tabPrefix}-panel-${i}`} role="tabpanel" aria-labelledby=${`${this.tabPrefix}-tab-${i}`} ?hidden=${this.value !== item.value} part="panel"><slot name=${item.value}></slot></section>`)} `;
  }
}
customElements.define("phy-tabs", PhyTabs);

import { LitElement, css, html } from "lit";
import { baseStyles } from "../styles/shared";
import { icon } from "./icons";
import { dialogWidth } from "./dialog-width";
import type {
  DialogOptions,
  DialogResult,
} from "../../infra/platform/protocols/v2/api/dialog";
export class PhyDialog extends LitElement {
  static properties = {
    options: { attribute: false },
    closeLabel: { type: String },
  };
  declare options: DialogOptions;
  declare closeLabel: string;
  private backdropPointer = false;
  constructor() {
    super();
    this.options = { title: "", content: document.createElement("div") };
    this.closeLabel = "Close";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: contents;
      }
      dialog {
        width: var(--dialog-width);
        max-width: calc(100vw - 32px);
        max-height: calc(100dvh - 32px);
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface);
        color: var(--text);
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      dialog::backdrop {
        background: #0008;
      }
      header {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border);
      }
      h2 {
        margin: 0;
        font-size: 17px;
        line-height: 1.5;
        font-weight: 550;
      }
      .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        padding: 8px;
        border: 0;
        border-radius: var(--radius);
        background: transparent;
      }
      .close:hover {
        background: var(--subtle);
      }
      .body {
        min-height: 0;
        overflow: auto;
        padding: 20px 24px;
        font-size: 13px;
        line-height: 1.8;
        overscroll-behavior: contain;
      }
      .body::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      .body::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }
      footer {
        flex-shrink: 0;
        padding: 16px 24px;
        border-top: 1px solid var(--border);
        font-size: 12px;
      }
    `,
  ];
  get nativeDialog() {
    return this.renderRoot.querySelector<HTMLDialogElement>("dialog");
  }
  show(initialFocus?: HTMLElement) {
    this.nativeDialog?.showModal();
    initialFocus?.focus({ preventScroll: true });
  }
  dismiss(reason: DialogResult["reason"]) {
    this.dispatchEvent(new CustomEvent("dialog-dismiss", { detail: reason }));
  }
  private outside(event: MouseEvent | PointerEvent) {
    if (event.target !== this.nativeDialog) return false;
    const r = this.nativeDialog!.getBoundingClientRect();
    return (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    );
  }
  render() {
    return html`<dialog
      aria-labelledby="heading"
      style=${`--dialog-width:${dialogWidth(this.options.width)}`}
      @cancel=${(e: Event) => {
        e.preventDefault();
        this.dismiss("escape");
      }}
      @close=${() => this.dismiss("close")}
      @pointerdown=${(e: PointerEvent) => {
        this.backdropPointer = this.outside(e);
      }}
      @click=${(e: MouseEvent) => {
        if (
          this.backdropPointer &&
          this.outside(e) &&
          this.options.closeOnBackdrop !== false
        )
          this.dismiss("backdrop");
        this.backdropPointer = false;
      }}
    >
      <header part="header">
        <h2 id="heading">${this.options.title}</h2>
        <button
          class="close"
          type="button"
          aria-label=${this.closeLabel}
          @click=${() => this.dismiss("close")}
        >
          ${icon("close")}
        </button>
      </header>
      <div class="body" part="body">${this.options.content}</div>
      ${this.options.footer ? html`<footer part="footer">${this.options.footer}</footer>` : ""}
    </dialog>`;
  }
}
customElements.define("phy-dialog", PhyDialog);

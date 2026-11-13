import { LitElement, html, css, unsafeCSS } from "lit";
import { renderToString } from "katex";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import stylesheet from "katex/dist/katex.min.css?inline";
import { baseStyles } from "../styles/shared";
const formulas = new Map<string, string>();
// Font-face declarations must also live in the document scope for Shadow DOM math.
const fonts = document.createElement("style");
fonts.dataset.phyMathFonts = "";
fonts.textContent =
  stylesheet.match(/@font-face\s*\{[^}]*\}/g)?.join("\n") ?? "";
document.head.append(fonts);
export class PhyMath extends LitElement {
  static properties = {
    source: { type: String },
    display: { type: Boolean, reflect: true },
  };
  declare source: string;
  declare display: boolean;
  constructor() {
    super();
    this.source = "";
    this.display = false;
  }
  static styles = [
    baseStyles,
    unsafeCSS(stylesheet),
    css`
      :host {
        display: inline-block;
        max-width: 100%;
        vertical-align: middle;
      }
      :host([display]) {
        display: block;
      }
      .formula {
        display: block;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
      }
      .katex-display {
        margin: 0;
      }
      .math-error {
        font-family: var(--mono);
        color: var(--red);
      }
    `,
  ];
  render() {
    if (!this.source) return html``;
    const key = JSON.stringify([this.source, this.display]);
    try {
      if (!formulas.has(key)) {
        const markup = renderToString(this.source, {
          displayMode: this.display,
          throwOnError: true,
          strict: "error",
          trust: false,
          output: "htmlAndMathml",
        });
        if (formulas.size >= 512)
          formulas.delete(formulas.keys().next().value!);
        formulas.set(key, markup);
      }
      return html`<span class="formula" part="formula"
        >${unsafeHTML(formulas.get(key)!)}</span
      >`;
    } catch (error) {
      return html`<span class="math-error" title=${String(error)}
        >${this.source}</span
      >`;
    }
  }
}
customElements.define("phy-math", PhyMath);

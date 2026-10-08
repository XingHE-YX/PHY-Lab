import { LitElement, html, css } from "lit";
import type { Catalog, Locale } from "../infra/platform/contract";
import { messages } from "../infra/locales/messages";
import { baseStyles } from "../ui/styles/shared";
import { icon } from "../ui/components/icons";
export class Workbench extends LitElement {
  static properties = {
    catalog: { attribute: false },
    locale: { type: String },
    query: { type: String },
  };
  declare catalog: Catalog | null;
  declare locale: Locale;
  declare query: string;
  constructor() {
    super();
    this.catalog = null;
    this.locale = "zh-CN";
    this.query = "";
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        max-width: 1180px;
        margin: auto;
        padding: 0 32px;
      }
      .hero {
        padding: 72px 0 58px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 32px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 1.8px;
        color: var(--muted);
        font-weight: 500;
      }
      .eyebrow::before {
        content: "";
        display: inline-block;
        width: 6px;
        height: 6px;
        background: var(--primary);
        margin-right: 10px;
        vertical-align: 1px;
      }
      h1 {
        font-weight: 520;
        font-size: clamp(30px, 4vw, 46px);
        letter-spacing: -1.8px;
        margin: 18px 0 17px;
        line-height: 1.25;
      }
      .subtitle {
        font-size: 14px;
        color: var(--muted);
        line-height: 1.8;
        margin: 0;
        max-width: 510px;
      }
      .diagram {
        width: 180px;
        height: 150px;
        color: var(--border);
        flex-shrink: 0;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid var(--border);
        padding: 25px 0 22px;
      }
      h2 {
        font-size: 15px;
        font-weight: 550;
        margin: 0;
      }
      .count {
        font-size: 11px;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 22px;
      }
      .card {
        display: block;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface);
        overflow: hidden;
        transition:
          border-color 0.15s,
          transform 0.15s;
      }
      .card:hover {
        border-color: var(--muted);
        transform: translateY(-2px);
      }
      .thumb {
        aspect-ratio: 1.875;
        width: 100%;
        display: block;
        border-bottom: 1px solid var(--border);
        object-fit: cover;
      }
      .body {
        padding: 20px;
      }
      .number {
        font-size: 10px;
        letter-spacing: 1.4px;
        color: var(--muted);
      }
      h3 {
        font-size: 19px;
        font-weight: 550;
        margin: 11px 0;
      }
      .description {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.8;
        margin: 0;
        min-height: 44px;
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 18px 0 22px;
      }
      .tag {
        font-size: 10px;
        border: 1px solid var(--border);
        border-radius: 2px;
        padding: 4px 6px;
        color: var(--muted);
      }
      .open {
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .open svg {
        color: var(--primary);
      }
      .method {
        margin: 62px 0 60px;
        border-top: 1px solid var(--border);
        padding-top: 25px;
      }
      .steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 32px;
        margin-top: 25px;
      }
      .step {
        display: flex;
        gap: 17px;
      }
      .step-no {
        font-family: var(--mono);
        font-size: 11px;
        color: var(--muted);
        padding-top: 3px;
      }
      .step h4 {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 550;
      }
      .step p {
        margin: 0;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.7;
      }
      .empty {
        border: 1px dashed var(--border);
        padding: 60px 20px;
        text-align: center;
        grid-column: 1/-1;
      }
      .empty p {
        font-size: 13px;
        color: var(--muted);
      }
    `,
  ];
  render() {
    const t = messages(this.locale),
      query = this.query.trim().toLocaleLowerCase();
    const entries = (this.catalog?.experiments ?? [])
      .filter((e) => e.apiVersion === 1)
      .filter((e) =>
        [
          ...Object.values(e.title),
          ...Object.values(e.description),
          ...Object.values(e.tags).flat(),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
      );
    return html`<section class="hero">
        <div>
          <div class="eyebrow">${t.intro}</div>
          <h1>${t.title}</h1>
          <p class="subtitle">${t.subtitle}</p>
        </div>
        <svg class="diagram" viewBox="0 0 180 150" aria-hidden="true">
          <path d="M20 75h140M90 10v130" fill="none" stroke="currentColor" />
          <circle cx="90" cy="75" r="46" fill="none" stroke="currentColor" />
          <path
            d="M28 75c16-48 31-48 46 0s31 48 46 0 24-32 32 0"
            fill="none"
            stroke="var(--primary)"
            stroke-width="1.5"
          />
          <circle cx="90" cy="75" r="3" fill="var(--text)" />
        </svg>
      </section>
      <div class="section-top">
        <h2>${t.all}</h2>
        <span class="count mono"
          >${String(entries.length).padStart(2, "0")} / ${t.count}</span
        >
      </div>
      <div class="grid">
        ${entries.map(
          (e, i) =>
            html`<a class="card" href=${"#/experiments/" + e.id}
              ><img class="thumb" src=${e.thumbnail} alt="" />
              <div class="body">
                <span class="number mono"
                  >EXPERIMENT ${String(i + 1).padStart(2, "0")}</span
                >
                <h3>${e.title[this.locale]}</h3>
                <p class="description">${e.description[this.locale]}</p>
                <div class="tags">
                  ${e.tags[this.locale].map((tag) => html`<span class="tag">${tag}</span>`)}
                </div>
                <div class="open">${t.start}${icon("arrow")}</div>
              </div></a
            >`,
        )}${
          !entries.length
            ? html`<div class="empty">
                <h2>${this.catalog ? t.empty : t.loading}</h2>
                <p>${t.emptyHint}</p>
              </div>`
            : ""
        }
      </div>
      <section class="method">
        <div class="eyebrow">${t.method}</div>
        <div class="steps">
          ${[
            [t.observe, t.observeDesc],
            [t.change, t.changeDesc],
            [t.understand, t.understandDesc],
          ].map(
            ([title, desc], i) =>
              html`<div class="step">
                <span class="step-no">0${i + 1}</span>
                <div>
                  <h4>${title}</h4>
                  <p>${desc}</p>
                </div>
              </div>`,
          )}
        </div>
      </section>`;
  }
}
customElements.define("phy-workbench", Workbench);

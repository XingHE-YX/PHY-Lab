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
        max-width: none;
        margin: auto;
        padding: 24px 30px 32px;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
      h3 {
        font-size: 19px;
        font-weight: 550;
        margin: 0 0 11px;
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
    return html`
      <div class="section-top">
        <h2>${t.all}</h2>
        <span class="count mono"
          >${String(entries.length).padStart(2, "0")} / ${t.count}</span
        >
      </div>
      <div class="grid">
        ${entries.map(
          (e) =>
            html`<a class="card" href=${"#/experiments/" + e.id}
              ><img class="thumb" src=${e.thumbnail} alt="" />
              <div class="body">
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
    `;
  }
}
customElements.define("phy-workbench", Workbench);

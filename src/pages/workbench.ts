import { thumbnailForTheme } from "../infra/platform/thumbnails";
import type { Theme } from "../infra/platform/types";
import { collectCategories } from "../infra/platform/categories";
import type { TabsElement } from "../infra/platform/protocols/v2/components";
import { supportsProtocol } from "../infra/platform/compatibility";
import { LitElement, html, css } from "lit";
import type { Catalog, Locale } from "../infra/platform/contract";
import { messages } from "../infra/locales/messages";
import { baseStyles } from "../ui/styles/shared";
import { icon } from "../ui/components/icons";
export class Workbench extends LitElement {
  static properties = {
    catalog: { attribute: false },
    locale: { type: String },
    theme: { type: String },
    query: { type: String },
    category: { type: String },
  };
  declare catalog: Catalog | null;
  declare locale: Locale;
  declare theme: Theme;
  declare query: string;
  declare category: string;
  constructor() {
    super();
    this.catalog = null;
    this.locale = "zh-CN";
    this.theme = "light";
    this.query = "";
    this.category = "all";
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
      .category-tabs {
        --tab-sidebar-width: 180px;
      }
      .category-tabs::part(tabs) {
        position: sticky;
        top: 0;
        align-self: flex-start;
        max-height: calc(100dvh - 114px);
      }
      .category-tabs::part(panel) {
        overflow: visible;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0 22px;
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
        transition:
          border-color 0.15s,
          transform 0.15s;
      }
      .card-box {
        height: 100%;
        border-radius: 4px;
        overflow: hidden;
        transition: border-color 0.15s;
      }
      .card:hover .card-box {
        border-color: var(--muted);
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
    const supported = (this.catalog?.experiments ?? []).filter((e) =>
      supportsProtocol(e),
    );
    const categories = collectCategories(supported);
    const items = [
      { value: "all", label: t.all },
      ...categories.map((category) => ({
        value: "category:" + category.id,
        label: category.title[this.locale],
      })),
      ...(supported.some((e) => !e.catagory)
        ? [{ value: "uncategorized", label: t.uncategorized }]
        : []),
    ];
    const selected = items.some((item) => item.value === this.category)
      ? this.category
      : "all";
    const entries = supported
      .filter(
        (e) =>
          selected === "all" ||
          (selected === "uncategorized"
            ? !e.catagory
            : "category:" + e.catagory?.id === selected),
      )
      .filter((e) =>
        [
          ...Object.values(e.title),
          ...Object.values(e.description),
          ...Object.values(e.tags).flat(),
          ...Object.values(e.catagory?.title ?? {}),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
      );
    return html`<phy-tabs
      class="category-tabs"
      orientation="vertical"
      label=${t.categories}
      .items=${items}
      .value=${selected}
      @change=${(event: Event) => {
        if (event.target !== event.currentTarget) return;
        this.category = (event.currentTarget as TabsElement).value;
        this.dispatchEvent(
          new CustomEvent("category-change", {
            detail: this.category,
            bubbles: true,
            composed: true,
          }),
        );
      }}
    >
      <div slot=${selected} class="category-content">
        <div class="section-top">
          <h2>
            ${items.find((item) => item.value === selected)?.label ?? t.all}
          </h2>
          <span class="count mono"
            >${String(entries.length).padStart(2, "0")} / ${t.count}</span
          >
        </div>
        <div class="grid">
          ${entries.map(
            (e) =>
              html`<a class="card" href=${"#/experiments/" + e.id}
                ><phy-box class="card-box"
                  ><img
                    class="thumb"
                    src=${thumbnailForTheme(e.thumbnail, this.theme)}
                    alt=""
                  />
                  <div class="body">
                    <h3>${e.title[this.locale]}</h3>
                    <p class="description">${e.description[this.locale]}</p>
                    <div class="tags">
                      ${e.tags[this.locale].map((tag) => html`<span class="tag">${tag}</span>`)}
                    </div>
                    <div class="open">${t.start}${icon("arrow")}</div>
                  </div></phy-box
                ></a
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
      </div></phy-tabs
    > `;
  }
}
customElements.define("phy-workbench", Workbench);

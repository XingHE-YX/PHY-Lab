import { ExperimentSettingsStore } from "../../services/experiment-settings";
import { SettingsPanel } from "./settings-panel";
import { brand, brandStyles } from "../components/brand";
import { dialogs } from "../../services/dialog";
import type { DialogHandle } from "../../infra/platform/protocols/v2/api/dialog";
import type { InputElement } from "../../infra/platform/protocols/v2/components";
import { LitElement, html, css } from "lit";
import type { Catalog } from "../../infra/platform/types";
import { loadCatalog } from "../../infra/platform/registry";
import { settings } from "../../services/settings";
import { currentTheme, toggleTheme } from "../../services/theme";
import { messages } from "../../infra/locales/messages";
import { baseStyles, buttonStyles } from "../styles/shared";
import { icon } from "../components/icons";
import type { ExperimentPage } from "../../pages/experiment-page";
import { offline } from "../../services/offline";
import { updates } from "../../services/updates";
export class App extends LitElement {
  static properties = {
    catalog: { state: true },
    query: { state: true },
    category: { state: true },
    route: { state: true },
    menu: { state: true },
    modal: { state: true },
    revision: { state: true },
    catalogError: { state: true },
  };
  declare catalog: Catalog | null;
  declare query: string;
  declare category: string;
  declare route: string;
  declare menu: boolean;
  declare modal: boolean;
  declare revision: number;
  declare catalogError: string;
  private settingsDialog?: DialogHandle;
  private settingsController = new AbortController();
  private readonly settingsContent = new SettingsPanel();
  private readonly experimentControls = document.createElement("div");
  private readonly experimentSettings = new ExperimentSettingsStore();
  private onRoute = () => {
    this.experimentSettings.setExperiment(null);
    this.experimentControls.replaceChildren();
    this.route = location.hash;
    this.menu = false;
  };
  private onSettings = () => {
    this.revision++;
  };
  private onOffline = () => {
    this.revision++;
  };
  private onCatalog = () => {
    void this.refreshCatalog();
  };
  private prepareUpdate = () => {
    const page = this.renderRoot.querySelector<ExperimentPage>(
      "phy-experiment-page",
    );
    page?.instance?.pause();
    page?.save();
  };
  private closeMenu = (event: PointerEvent) => {
    if (
      this.menu &&
      !event
        .composedPath()
        .includes(this.renderRoot.querySelector(".navigation")!)
    )
      this.menu = false;
  };
  static styles = [
    baseStyles,
    buttonStyles,
    brandStyles,
    css`
      :host {
        display: flex;
        height: 100dvh;
        overflow: hidden;
        flex-direction: column;
        background: var(--bg);
      }
      .toolbar {
        height: 66px;
        flex-shrink: 0;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
        display: grid;
        grid-template-columns: 1fr minmax(220px, 430px) 1fr;
        align-items: center;
        gap: 20px;
        padding: 0 30px;
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .experiment-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-width: 0;
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 13px;
      }
      .left,
      .right {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .right {
        justify-content: flex-end;
        gap: 5px;
      }
      .icon {
        width: 36px;
        height: 36px;
        padding: 8px;
        border: 0;
        background: transparent;
      }
      .icon:hover {
        background: var(--subtle);
      }
      .language {
        font-family: var(--mono);
        font-size: 12px;
      }
      .search {
        width: 100%;
        --input-background: var(--bg);
      }
      .search .clear {
        border: 0;
        background: none;
        padding: 0;
        min-height: 0;
        color: var(--muted);
      }
      .key {
        white-space: nowrap;
        flex-shrink: 0;
        font-family: var(--mono);
        border: 1px solid var(--border);
        border-radius: 2px;
        padding: 2px 4px;
        font-size: 10px;
      }
      .navigation {
        position: relative;
        display: flex;
      }
      .menu {
        position: absolute;
        top: 46px;
        left: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 3px;
        min-width: 180px;
        padding: 6px;
        box-shadow: 0 6px 20px #00000010;
      }
      .menu a {
        display: block;
        padding: 11px 12px;
        font-size: 13px;
        border-radius: 2px;
      }
      .menu a:hover {
        background: var(--subtle);
      }
      main {
        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable;
      }
      main::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      main::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }
      @supports not selector(::-webkit-scrollbar) {
        main {
          scrollbar-width: thin;
        }
      }
      .catalog-error {
        padding: 24px;
        text-align: center;
        font-size: 13px;
        color: var(--muted);
      }

      .viewport-warning {
        display: none;
      }
      @media (max-width: 1279px) {
        .toolbar,
        main {
          display: none;
        }
        .viewport-warning {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 30px;
          text-align: center;
          gap: 14px;
        }
        .viewport-warning h1 {
          font-size: 22px;
          margin: 0;
        }
        .viewport-warning p {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.8;
          margin: 0;
        }
        .viewport-warning .brand {
          margin-bottom: 24px;
        }
      }
    `,
  ];
  constructor() {
    super();
    this.experimentControls.className = "experiment-controls";
    this.settingsContent.store = this.experimentSettings;
    this.catalog = null;
    this.query = "";
    this.category = "all";
    this.route = location.hash;
    this.menu = false;
    this.modal = false;
    this.revision = 0;
    this.catalogError = "";
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.settingsController.signal.aborted)
      this.settingsController = new AbortController();
    window.addEventListener("hashchange", this.onRoute);
    settings.addEventListener("change", this.onSettings);
    settings.addEventListener("theme-change", this.onSettings);
    offline.addEventListener("change", this.onOffline);
    updates.addEventListener("change", this.onOffline);
    offline.addEventListener("catalog-change", this.onCatalog);
    window.addEventListener("phy:prepare-update", this.prepareUpdate);
    window.addEventListener("pointerdown", this.closeMenu);
    window.addEventListener("keydown", this.onKey);
    void this.refreshCatalog();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.settingsController.abort();
    window.removeEventListener("hashchange", this.onRoute);
    settings.removeEventListener("change", this.onSettings);
    settings.removeEventListener("theme-change", this.onSettings);
    offline.removeEventListener("change", this.onOffline);
    updates.removeEventListener("change", this.onOffline);
    offline.removeEventListener("catalog-change", this.onCatalog);
    window.removeEventListener("phy:prepare-update", this.prepareUpdate);
    window.removeEventListener("pointerdown", this.closeMenu);
    window.removeEventListener("keydown", this.onKey);
  }
  private onKey = (event: KeyboardEvent) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "k" &&
      !this.route.startsWith("#/experiments/") &&
      !this.modal
    ) {
      event.preventDefault();
      this.renderRoot.querySelector<InputElement>(".search")?.focus();
    }
    if (event.key === "Escape") this.menu = false;
  };
  async refreshCatalog() {
    try {
      this.catalog = await loadCatalog();
      this.catalogError = "";
    } catch (error) {
      this.catalogError = String(error);
    }
  }
  updated() {
    if (this.modal)
      this.settingsDialog?.update({
        title: messages(settings.value.locale).settings,
      });
  }
  openSettings() {
    if (this.settingsDialog) return;
    this.modal = true;
    const handle = dialogs.scope(this.settingsController.signal).open({
      title: messages(settings.value.locale).settings,
      content: this.settingsContent,
      width: "lg",
      returnFocus:
        this.renderRoot.querySelector<HTMLElement>("#settings") ?? undefined,
    });
    this.settingsDialog = handle;
    void handle.closed.then(() => {
      if (this.settingsDialog === handle) {
        this.settingsDialog = undefined;
        this.modal = false;
      }
    });
  }
  render() {
    const s = settings.value,
      t = messages(s.locale),
      id = this.route.match(/^#\/experiments\/([a-z][a-z0-9-]*)$/)?.[1];
    return html`<div class="viewport-warning">
        ${brand()}
        <h1>
          ${s.locale === "zh-CN" ? "请使用桌面大小的窗口" : "A desktop-sized window is required"}
        </h1>
        <p>
          ${s.locale === "zh-CN" ? "PHY Lab 的实验台需要至少 1280 px 的窗口宽度。" : "PHY Lab requires a window width of at least 1280 px."}
        </p>
      </div>
      <header class="toolbar">
        <div class="left">
          ${
            id
              ? html`<a class="back" href="#/"
                  >${icon("chevronLeft")}${t.back}</a
                >`
              : html`
                  <div class="navigation">
                    <button
                      class="icon"
                      aria-label=${t.menu}
                      aria-expanded=${this.menu}
                      @click=${() => (this.menu = !this.menu)}
                    >
                      ${icon("grid")}</button
                    >${this.menu ? html`<nav class="menu" aria-label=${t.menu}><a href="#/" @click=${() => (this.menu = false)}>${t.home}</a></nav>` : ""}
                  </div>
                  <a class="brand-link" href="#/">${brand()}</a>
                `
          }
        </div>
        ${
          id
            ? this.experimentControls
            : html`
                <phy-input
                  class="search"
                  type="search"
                  label=${t.search}
                  placeholder=${t.search}
                  .value=${this.query}
                  @input=${(event: Event) => {
                    this.query = (event.currentTarget as InputElement).value;
                  }}
                >
                  <span slot="start">${icon("search")}</span>
                  <span slot="end"
                    >${
                      this.query
                        ? html`<button
                            class="clear"
                            type="button"
                            aria-label=${t.clear}
                            @click=${() => {
                              this.query = "";
                              this.category = "all";
                              this.renderRoot
                                .querySelector<InputElement>(".search")
                                ?.focus();
                            }}
                          >
                            ${icon("close")}
                          </button>`
                        : html`<kbd class="key"
                            >${/Mac/.test(navigator.platform) ? "⌘ K" : "Ctrl K"}</kbd
                          >`
                    }</span
                  >
                </phy-input>
              `
        }
        <div class="right">
          <button
            class="icon language"
            aria-label=${t.language}
            title=${t.language}
            @click=${() => settings.set({ locale: s.locale === "zh-CN" ? "en" : "zh-CN" })}
          >
            ${s.locale === "zh-CN" ? "EN" : "中"}</button
          ><button
            class="icon"
            aria-label=${t.theme}
            title=${t.theme}
            @click=${toggleTheme}
          >
            ${icon(currentTheme() === "dark" ? "sun" : "moon")}</button
          ><button
            id="settings"
            class="icon"
            aria-label=${t.settings}
            title=${t.settings}
            @click=${() => this.openSettings()}
          >
            ${icon("settings")}
          </button>
        </div>
      </header>
      <main>
        ${this.catalogError ? html`<div class="catalog-error">${t.error} · <phy-button @click=${() => this.refreshCatalog()}>${t.retry}</phy-button></div>` : ""}${
          id && this.catalog
            ? html`<phy-experiment-page
                .catalog=${this.catalog}
                .experimentId=${id}
                .locale=${s.locale}
                .theme=${currentTheme()}
                .toolbar=${this.experimentControls}
                .settingsApi=${this.experimentSettings}
              ></phy-experiment-page>`
            : html`<phy-workbench
                .catalog=${this.catalog}
                .locale=${s.locale}
                .query=${this.query}
                .category=${this.category}
                @category-change=${(event: CustomEvent<string>) => {
                  this.category = event.detail;
                }}
              ></phy-workbench>`
        }
      </main> `;
  }
}
customElements.define("phy-app", App);

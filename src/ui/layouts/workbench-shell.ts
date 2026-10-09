import { LitElement, html, css } from "lit";
import type { Catalog } from "../../infra/platform/contract";
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
    route: { state: true },
    menu: { state: true },
    modal: { state: true },
    revision: { state: true },
    catalogError: { state: true },
  };
  declare catalog: Catalog | null;
  declare query: string;
  declare route: string;
  declare menu: boolean;
  declare modal: boolean;
  declare revision: number;
  declare catalogError: string;
  private readonly experimentControls = document.createElement("div");
  private onRoute = () => {
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
      .brand {
        font-size: 17px;
        font-weight: 650;
        letter-spacing: -0.6px;
      }
      .brand span {
        color: var(--primary);
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
        height: 36px;
        border: 1px solid var(--border);
        border-radius: 3px;
        background: var(--bg);
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 11px;
        color: var(--muted);
      }
      .search input {
        width: 100%;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--text);
        font-size: 12px;
        min-width: 0;
      }
      .search:focus-within {
        border-color: var(--primary);
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
      dialog {
        width: 440px;
        max-width: calc(100vw - 32px);
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface);
        color: var(--text);
      }
      dialog::backdrop {
        background: #0006;
      }
      .dialog-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 19px 24px;
        border-bottom: 1px solid var(--border);
      }
      .dialog-top h2 {
        font-size: 17px;
        font-weight: 550;
        margin: 0;
      }
      .dialog-body {
        padding: 24px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        margin: 0 0 22px;
        font-size: 13px;
      }
      select {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 3px;
        color: var(--text);
        padding: 7px 8px;
        max-width: 180px;
      }
      .section-label {
        font-size: 10px;
        color: var(--muted);
        letter-spacing: 1px;
        text-transform: uppercase;
        margin: 28px 0 15px;
      }
      .section-label:first-child {
        margin-top: 0;
      }
      .offline {
        padding: 14px;
        background: var(--subtle);
        border: 1px solid var(--border);
        font-size: 12px;
        line-height: 1.8;
      }
      .dialog-footer {
        font-size: 11px;
        color: var(--muted);
        padding: 16px 24px;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
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
    this.catalog = null;
    this.query = "";
    this.route = location.hash;
    this.menu = false;
    this.modal = false;
    this.revision = 0;
    this.catalogError = "";
  }
  connectedCallback() {
    super.connectedCallback();
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
      !this.route.startsWith("#/experiments/")
    ) {
      event.preventDefault();
      this.renderRoot.querySelector<HTMLInputElement>(".search input")?.focus();
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
  async openSettings() {
    this.modal = true;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLDialogElement>("dialog")?.showModal();
  }
  closeSettings() {
    this.renderRoot.querySelector<HTMLDialogElement>("dialog")?.close();
    this.modal = false;
    this.renderRoot.querySelector<HTMLButtonElement>("#settings")?.focus();
  }
  offlinePanel() {
    const zh = settings.value.locale === "zh-CN",
      s = offline.status;
    if (s.state === "dev")
      return html`${messages(settings.value.locale).offlineDev}`;
    return html`<div role="status">
        ${s.state === "ready" ? (zh ? "✓ 可离线使用" : "✓ Ready for offline use") : s.state === "loading" ? (zh ? "正在准备离线资源…" : "Preparing offline resources…") : s.state === "unavailable" ? (zh ? "此浏览器不支持离线缓存" : "Offline caching is unavailable") : zh ? "离线缓存未完成" : "Offline preparation failed"}
      </div>
      <div class="mono muted">
        ${s.complete} / ${s.total} ${zh ? "个实验已缓存" : "experiments cached"}
      </div>
      ${s.error ? html`<p>${s.error}</p>` : ""}
      <div style="margin-top:12px">
        <phy-button
          ?disabled=${updates.checking}
          @click=${() => updates.check()}
          >${updates.checking ? (zh ? "正在检查…" : "Checking…") : zh ? "检查更新" : "Check for updates"}</phy-button
        >
        <phy-button
          ?disabled=${updates.checking}
          @click=${() => updates.clean()}
          >${zh ? "清理历史缓存" : "Clean old cache"}</phy-button
        >
      </div>
      ${
        offline.waiting
          ? html`<div style="margin-top:12px">
              <div>
                ${zh ? "平台新版本已准备完成" : "Platform update is ready"}
              </div>
              <phy-button
                variant="primary"
                ?disabled=${updates.checking}
                @click=${() => updates.apply()}
                >${zh ? "保存并更新" : "Save and update"}</phy-button
              >
            </div>`
          : ""
      }${updates.checked && !offline.waiting ? html`<div>${zh ? "检查完成，已使用当前可用版本" : "Checked. Using the available version."}</div>` : ""}${updates.removed !== null ? html`<div>${zh ? "已清理历史缓存" : "Old caches removed"}: ${updates.removed}</div>` : ""}${updates.error ? html`<p>${updates.error}</p>` : ""}`;
  }
  render() {
    const s = settings.value,
      t = messages(s.locale),
      id = this.route.match(/^#\/experiments\/([a-z][a-z0-9-]*)$/)?.[1];
    return html`<div class="viewport-warning">
        <div class="brand">PHY<span> Lab</span></div>
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
                  <a class="brand" href="#/">PHY<span> Lab</span></a>
                `
          }
        </div>
        ${
          id
            ? this.experimentControls
            : html`
                <label class="search"
                  >${icon("search")}<input
                    aria-label=${t.search}
                    placeholder=${t.search}
                    .value=${this.query}
                    @input=${(event: Event) => {
                      this.query = (event.target as HTMLInputElement).value;
                    }}
                  />${this.query ? html`<button class="clear" aria-label=${t.clear} @click=${() => (this.query = "")}>${icon("close")}</button>` : html`<span class="key">⌘ K</span>`}</label
                >
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
        ${this.catalogError ? html`<div class="catalog-error">${t.error} · <phy-button @click=${() => this.refreshCatalog()}>${t.retry}</phy-button></div>` : ""}${id && this.catalog ? html`<phy-experiment-page .catalog=${this.catalog} .experimentId=${id} .locale=${s.locale} .theme=${currentTheme()} .toolbar=${this.experimentControls}></phy-experiment-page>` : html`<phy-workbench .catalog=${this.catalog} .locale=${s.locale} .query=${this.query}></phy-workbench>`}
      </main>
      ${
        this.modal
          ? html`<dialog
              @cancel=${() => this.closeSettings()}
              @click=${(event: MouseEvent) => {
                if (event.target === event.currentTarget) {
                  const r = (
                    event.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  if (
                    event.clientX < r.left ||
                    event.clientX > r.right ||
                    event.clientY < r.top ||
                    event.clientY > r.bottom
                  )
                    this.closeSettings();
                }
              }}
            >
              <div class="dialog-top">
                <h2>${t.settings}</h2>
                <button
                  class="icon"
                  aria-label=${t.close}
                  @click=${() => this.closeSettings()}
                >
                  ${icon("close")}
                </button>
              </div>
              <div class="dialog-body">
                <div class="section-label">${t.appearance}</div>
                <label class="row"
                  >${t.language}<select
                    .value=${s.locale}
                    @change=${(e: Event) => settings.set({ locale: (e.target as HTMLSelectElement).value as typeof s.locale })}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en">English</option>
                  </select></label
                ><label class="row"
                  >${t.appearance}<select
                    .value=${s.theme}
                    @change=${(e: Event) => settings.set({ theme: (e.target as HTMLSelectElement).value as typeof s.theme })}
                  >
                    <option value="light">${t.light}</option>
                    <option value="dark">${t.dark}</option>
                    <option value="system">${t.system}</option>
                  </select></label
                ><label class="row"
                  >${t.motion}<input
                    type="checkbox"
                    .checked=${s.reduceMotion}
                    @change=${(e: Event) => settings.set({ reduceMotion: (e.target as HTMLInputElement).checked })}
                /></label>
                <div class="section-label">${t.offline}</div>
                <div class="offline" id="offline-panel">
                  ${this.offlinePanel()}
                </div>
              </div>
              <div class="dialog-footer">
                <span>${t.local}</span><span>PHY Lab v${__APP_VERSION__}</span>
              </div>
            </dialog>`
          : ""
      }`;
  }
}
customElements.define("phy-app", App);

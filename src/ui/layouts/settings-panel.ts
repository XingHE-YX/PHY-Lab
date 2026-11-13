import { LitElement, css, html } from "lit";
import { baseStyles, buttonStyles } from "../styles/shared";
import { brand, brandStyles } from "../components/brand";
import type {
  TabsElement,
  SelectElement,
  SwitchElement,
} from "../../infra/platform/protocols/v2/components";
import { ExperimentSettingsStore } from "../../services/experiment-settings";
import { settings } from "../../services/settings";
import { offline } from "../../services/offline";
import { updates } from "../../services/updates";
import { resourceCache } from "../../services/cache";
import { messages } from "../../infra/locales/messages";
export class SettingsPanel extends LitElement {
  static properties = {
    store: { attribute: false },
    selected: { state: true },
  };
  declare store: ExperimentSettingsStore;
  declare selected: string;
  private observedStore?: ExperimentSettingsStore;
  constructor() {
    super();
    this.store = new ExperimentSettingsStore();
    this.selected = "appearance";
  }
  static styles = [
    baseStyles,
    buttonStyles,
    brandStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .settings-tabs {
        height: min(540px, calc(100dvh - 180px));
        min-height: 240px;
        --tab-sidebar-width: 180px;
      }
      .settings-tabs::part(panel) {
        scrollbar-width: thin;
      }
      h2 {
        margin: 0 0 24px;
        font-size: 17px;
        font-weight: 550;
      }
      h3 {
        margin: 0 0 16px;
        font-size: 13px;
        font-weight: 550;
      }
      section {
        padding: 0 4px 8px 0;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 22px;
        font-size: 13px;
      }
      phy-select {
        width: 180px;
        flex-shrink: 0;
      }
      phy-switch.row {
        width: 100%;
      }
      phy-switch.row::part(base) {
        width: 100%;
        flex-direction: row-reverse;
        justify-content: space-between;
        gap: 24px;
      }
      .description {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.8;
        margin: 12px 0;
      }
      .actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
      .cache-status {
        padding: 16px;
        margin: 20px 0;
        background: var(--subtle);
      }
      phy-progress {
        margin-top: 12px;
      }
      .about-brand {
        --brand-font-size: 26px;
        --brand-logo-size: 44px;
      }
      .version {
        margin: 8px 0 24px;
        font-size: 12px;
        color: var(--muted);
      }
      .experiment-info,
      .update-info {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--border);
      }
      dl {
        display: grid;
        grid-template-columns: 90px minmax(0, 1fr);
        gap: 10px 16px;
        font-size: 13px;
        line-height: 1.7;
        margin: 0;
      }
      dt {
        color: var(--muted);
      }
      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
      a {
        color: var(--primary);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .error {
        color: var(--red);
        font-size: 12px;
        overflow-wrap: anywhere;
      }
    `,
  ];
  private onChange = () => this.requestUpdate();
  private onOffline = () => {
    if (this.selected === "cache") void resourceCache.refresh();
    this.requestUpdate();
  };
  private onStoreChange = () => {
    if (this.selected === "cache") void resourceCache.refresh();
    this.requestUpdate();
  };
  private bindStore() {
    if (this.observedStore === this.store) return;
    this.observedStore?.removeEventListener("change", this.onStoreChange);
    this.observedStore = this.store;
    this.observedStore.addEventListener("change", this.onStoreChange);
  }
  private synchronize = () => {
    // The panel survives closing; changes while detached must be rendered on re-entry.
    this.requestUpdate();
    if (this.selected === "cache") void resourceCache.refresh();
    void offline.refresh();
  };
  private onVisibility = () => {
    if (!document.hidden) this.synchronize();
  };
  connectedCallback() {
    super.connectedCallback();
    this.bindStore();
    settings.addEventListener("change", this.onChange);
    offline.addEventListener("change", this.onOffline);
    updates.addEventListener("change", this.onChange);
    resourceCache.addEventListener("change", this.onChange);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.synchronize();
  }
  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.observedStore?.removeEventListener("change", this.onStoreChange);
    this.observedStore = undefined;
    settings.removeEventListener("change", this.onChange);
    offline.removeEventListener("change", this.onOffline);
    updates.removeEventListener("change", this.onChange);
    resourceCache.removeEventListener("change", this.onChange);
    super.disconnectedCallback();
  }
  protected willUpdate() {
    if (
      ![
        "appearance",
        "cache",
        "about",
        ...this.store.tabs.map((tab) => tab.value),
      ].includes(this.selected)
    )
      this.selected = "appearance";
  }
  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has("store") && this.isConnected) this.bindStore();
  }
  private appearance() {
    const s = settings.value,
      t = messages(s.locale);
    return html`<section slot="appearance">
      <h2>${t.appearance}</h2>
      <div class="row">
        <span>${t.language}</span
        ><phy-select
          label=${t.language}
          .value=${s.locale}
          .options=${[
            { value: "zh-CN", label: "简体中文" },
            { value: "en", label: "English" },
          ]}
          @change=${(e: Event) => settings.set({ locale: (e.currentTarget as SelectElement).value as typeof s.locale })}
        ></phy-select>
      </div>
      <div class="row">
        <span>${t.appearance}</span
        ><phy-select
          label=${t.appearance}
          .value=${s.theme}
          .options=${[
            { value: "light", label: t.light },
            { value: "dark", label: t.dark },
            { value: "system", label: t.system },
          ]}
          @change=${(e: Event) => settings.set({ theme: (e.currentTarget as SelectElement).value as typeof s.theme })}
        ></phy-select>
      </div>
      <phy-switch
        class="row"
        label=${t.motion}
        .checked=${s.reduceMotion}
        @change=${(e: Event) => settings.set({ reduceMotion: (e.currentTarget as SwitchElement).checked })}
      ></phy-switch>
    </section>`;
  }
  private size() {
    if (resourceCache.bytes === null) return "…";
    const units = ["B", "KB", "MB", "GB"];
    let value = resourceCache.bytes,
      index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return (
      value.toLocaleString(settings.value.locale, {
        maximumFractionDigits: 1,
      }) +
      " " +
      units[index]
    );
  }
  private cache() {
    const t = messages(settings.value.locale),
      s = offline.status;
    const status =
      s.state === "ready"
        ? t.offlineReady
        : s.state === "loading"
          ? t.offlinePreparing
          : s.state === "empty"
            ? t.offlineEmpty
            : s.state === "dev"
              ? t.offlineDev
              : s.state === "unavailable"
                ? t.offlineUnavailable
                : t.offlineFailed;
    return html`<section slot="cache">
      <h2>${t.cacheSettings}</h2>
      <div class="row">
        <span>${t.cacheUsage}</span
        ><strong class="mono" data-cache-bytes=${resourceCache.bytes ?? ""}
          >${this.size()}</strong
        >
      </div>
      <phy-box class="cache-status"
        ><div role="status">${status}</div>
        <div class="description mono">
          ${s.complete} / ${s.total} ${t.cachedExperiments}
        </div>
        ${s.total > 0 ? html`<phy-progress label=${t.cacheProgress} .value=${s.complete} .max=${s.total}></phy-progress>` : ""}</phy-box
      >
      <p class="description">${t.cacheDescription}</p>
      <div class="actions">
        <phy-button
          ?disabled=${resourceCache.busy || updates.checking || s.state === "loading" || Boolean(offline.registration?.installing)}
          @click=${() => resourceCache.clear()}
          >${resourceCache.busy ? t.clearingCache : t.clearCache}</phy-button
        >
        <phy-button
          ?disabled=${resourceCache.busy || updates.checking || !offline.registration?.active}
          @click=${async () => {
            await updates.clean();
            await resourceCache.refresh();
          }}
          >${t.cleanHistory}</phy-button
        >
        ${
          ["empty", "error"].includes(s.state)
            ? html`<phy-button
                ?disabled=${resourceCache.busy || updates.checking}
                @click=${async () => {
                  try {
                    await offline.sync();
                  } catch {
                    /* Offline status contains the error. */
                  }
                  await resourceCache.refresh();
                }}
                >${t.prepareOffline}</phy-button
              >`
            : ""
        }
      </div>
      ${resourceCache.removed !== null ? html`<p role="status" class="description">${t.cacheCleared}</p>` : ""}
      ${updates.removed !== null ? html`<p class="description">${t.historyCleaned}: ${updates.removed}</p>` : ""}
      ${resourceCache.error || s.error || updates.error ? html`<p class="error" role="alert">${resourceCache.error || s.error || updates.error}</p>` : ""}
    </section>`;
  }
  private about() {
    const locale = settings.value.locale,
      t = messages(locale),
      experiment = this.store.manifest;
    const authors = experiment?.author
      ? Array.isArray(experiment.author)
        ? experiment.author
        : [experiment.author]
      : [];
    return html`<section slot="about">
      <div class="about-brand">${brand(true)}</div>
      <p class="version">PHY Lab v${__APP_VERSION__}</p>
      ${
        experiment
          ? html`<section
              class="experiment-info"
              aria-label=${t.currentExperiment}
            >
              <h3>${t.currentExperiment}</h3>
              <dl>
                <dt>${t.experimentName}</dt>
                <dd>${experiment.title[locale]}</dd>
                <dt>${t.experimentVersion}</dt>
                <dd>${experiment.version}</dd>
                ${
                  authors.length
                    ? html`<dt>${t.authors}</dt>
                        <dd>
                          ${authors.map((author, index) => html`${index ? (locale === "zh-CN" ? "、" : ", ") : ""}${author.url ? html`<a href=${author.url} target="_blank" rel="noopener noreferrer">${author.name}</a>` : author.name}`)}
                        </dd>`
                    : ""
                }
                ${
                  experiment.catagory
                    ? html`<dt>${t.category}</dt>
                        <dd>${experiment.catagory.title[locale]}</dd>`
                    : ""
                }
                ${
                  experiment.repository
                    ? html`<dt>${t.repository}</dt>
                        <dd>
                          <a
                            href=${experiment.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            >${experiment.repository}</a
                          >
                        </dd>`
                    : ""
                }
                ${
                  experiment.license
                    ? html`<dt>${t.license}</dt>
                        <dd>${experiment.license}</dd>`
                    : ""
                }
              </dl>
            </section>`
          : ""
      }
      <div class="update-info">
        <phy-button
          ?disabled=${updates.checking || resourceCache.busy || !offline.registration}
          @click=${() => updates.check()}
          >${updates.checking ? t.checkingUpdates : t.checkUpdates}</phy-button
        >
        ${
          offline.waiting
            ? html`<p class="description">${t.updateReady}</p>
                <phy-button
                  variant="primary"
                  ?disabled=${updates.checking || resourceCache.busy}
                  @click=${() => updates.apply()}
                  >${t.saveAndUpdate}</phy-button
                >`
            : ""
        }
        ${updates.checked && !offline.waiting ? html`<p role="status" class="description">${t.updatesChecked}</p>` : ""}
        ${updates.error ? html`<p role="alert" class="error">${updates.error}</p>` : ""}
      </div>
    </section>`;
  }
  render() {
    const locale = settings.value.locale,
      t = messages(locale),
      tabs = this.store.tabs;
    const items = [
      { value: "appearance", label: t.appearance },
      { value: "cache", label: t.cacheSettings },
      ...tabs.map((tab) => ({ value: tab.value, label: tab.title[locale] })),
      { value: "about", label: t.about },
    ];
    return html`<phy-tabs
      class="settings-tabs"
      orientation="vertical"
      label=${t.settingsNavigation}
      .items=${items}
      .value=${this.selected}
      @activate=${(e: Event) => {
        if (e.target !== e.currentTarget) return;
        this.selected = (e.currentTarget as TabsElement).value;
        this.synchronize();
      }}
    >
      ${this.appearance()}${this.cache()}${tabs.map(
        (tab) =>
          html`<section
            class="custom-panel"
            slot=${tab.value}
            role="region"
            aria-label=${tab.title[locale]}
          >
            <h2>${tab.title[locale]}</h2>
            ${tab.element}
          </section>`,
      )}${this.about()}
    </phy-tabs>`;
  }
}
customElements.define("phy-settings-panel", SettingsPanel);

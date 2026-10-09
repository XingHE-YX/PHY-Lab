import { LitElement, html, css } from "lit";
import type {
  Catalog,
  Locale,
  ExperimentInstance,
  ExperimentModule,
} from "../infra/platform/contract";
import { loadManifest } from "../infra/platform/registry";
import { experimentStorage } from "../services/storage";
import { messages } from "../infra/locales/messages";
import { baseStyles } from "../ui/styles/shared";
import { offline } from "../services/offline";
export class ExperimentPage extends LitElement {
  static properties = {
    catalog: { attribute: false },
    experimentId: { type: String },
    locale: { type: String },
    theme: { type: String },
    status: { state: true },
    error: { state: true },
    toolbar: { attribute: false },
  };
  declare catalog: Catalog | null;
  declare experimentId: string;
  declare locale: Locale;
  declare theme: "light" | "dark";
  declare status: string;
  declare error: string;
  declare toolbar: HTMLElement | null;
  instance?: ExperimentInstance;
  private controller?: AbortController;
  private currentStorage?: ReturnType<typeof experimentStorage>;
  private pinnedEntry?: string;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        max-width: 1600px;
        margin: auto;
        padding: 16px 28px;
        height: calc(100dvh - 66px);
        min-height: 0;
        overflow: hidden;
      }
      .status {
        text-align: center;
        padding: 90px 20px;
      }
      .status p {
        font-size: 13px;
        color: var(--muted);
      }
    `,
  ];
  constructor() {
    super();
    this.catalog = null;
    this.experimentId = "";
    this.locale = "zh-CN";
    this.theme = "light";
    this.status = "loading";
    this.error = "";
    this.toolbar = null;
  }
  updated(changed: Map<PropertyKey, unknown>) {
    if (
      changed.has("experimentId") ||
      (changed.has("catalog") && !this.instance)
    )
      void this.load();
    if (changed.has("locale") || changed.has("theme"))
      this.instance?.update({ locale: this.locale, theme: this.theme });
  }
  async load() {
    this.cleanup();
    this.status = "loading";
    const controller = (this.controller = new AbortController());
    try {
      const entry = this.catalog?.experiments.find(
        (e) => e.id === this.experimentId,
      );
      if (!entry)
        throw new Error(
          this.locale === "zh-CN" ? "实验不存在" : "Experiment not found",
        );
      const manifest = await loadManifest(entry.manifest, entry.id);
      await offline.ensureExperiment(entry.manifest);
      const module = (await import(
        /* @vite-ignore */ manifest.entry
      )) as ExperimentModule;
      if (controller.signal.aborted) return;
      const storage = experimentStorage(entry.id, manifest.stateVersion);
      const instance = await module.mount({
        locale: this.locale,
        theme: this.theme,
        buildId: manifest.buildId,
        signal: controller.signal,
        storage,
        toolbar: {
          setControls: (element) => {
            if (controller.signal.aborted) return;
            this.toolbar?.replaceChildren(...(element ? [element] : []));
          },
        },
      });
      if (controller.signal.aborted) {
        instance.dispose();
        return;
      }
      this.instance = instance;
      this.currentStorage = storage;
      this.pinnedEntry = new URL(manifest.entry, location.href).href;
      offline.pins.add(this.pinnedEntry);
      this.status = "ready";
    } catch (error) {
      if (!controller.signal.aborted) {
        this.error = error instanceof Error ? error.message : String(error);
        this.controller?.abort();
        this.toolbar?.replaceChildren();
        this.status = "error";
      }
    }
  }
  save() {
    if (this.instance) this.currentStorage?.write(this.instance.snapshot());
  }
  cleanup() {
    this.controller?.abort();
    this.toolbar?.replaceChildren();
    this.instance?.pause();
    this.save();
    this.instance?.dispose();
    this.instance = undefined;
    this.currentStorage = undefined;
    if (this.pinnedEntry) offline.pins.delete(this.pinnedEntry);
    this.pinnedEntry = undefined;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }
  render() {
    const t = messages(this.locale);
    return html`${
      this.status === "ready"
        ? this.instance?.element
        : html`<div class="status">
            <p>${this.status === "error" ? t.error : t.loading}</p>
            ${
              this.status === "error"
                ? html`<p>${this.error}</p>
                    <phy-button @click=${() => this.load()}
                      >${t.retry}</phy-button
                    >`
                : ""
            }
          </div>`
    }`;
  }
}
customElements.define("phy-experiment-page", ExperimentPage);

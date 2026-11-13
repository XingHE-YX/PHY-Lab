import type { ExperimentManifest, Localized } from "../infra/platform/types";
export interface MountedSettingsTab {
  value: string;
  title: Localized;
  element: HTMLElement;
}
export class ExperimentSettingsStore extends EventTarget {
  manifest: ExperimentManifest | null = null;
  private readonly controls = new Map<string, HTMLElement>();
  private emit() {
    this.dispatchEvent(new Event("change"));
  }
  setExperiment(manifest: ExperimentManifest | null) {
    if (this.manifest === manifest) return;
    this.manifest = manifest;
    this.controls.clear();
    this.emit();
  }
  setControls(element: HTMLElement | null, tabId?: string) {
    if (!this.manifest) return;
    if (
      tabId !== undefined &&
      !this.manifest.settings?.tabs.some((tab) => tab.id === tabId)
    )
      throw new Error(`Undeclared experiment settings tab: ${tabId}`);
    const key = tabId ?? "";
    if (element) this.controls.set(key, element);
    else this.controls.delete(key);
    this.emit();
  }
  get tabs(): MountedSettingsTab[] {
    const tabs: MountedSettingsTab[] = [];
    const fallback = this.controls.get("");
    if (fallback)
      tabs.push({
        value: "experiment:default",
        title: { "zh-CN": "实验设置", en: "Experiment settings" },
        element: fallback,
      });
    for (const tab of this.manifest?.settings?.tabs ?? []) {
      const element = this.controls.get(tab.id);
      if (element)
        tabs.push({
          value: "experiment:tab:" + tab.id,
          title: tab.title,
          element,
        });
    }
    return tabs;
  }
}

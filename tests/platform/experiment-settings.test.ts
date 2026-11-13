import { expect, test } from "bun:test";
import { ExperimentSettingsStore } from "../../src/services/experiment-settings";
import type { ExperimentManifest } from "../../src/infra/platform/types";

test("declared and default settings keep node identity and reject undeclared ids", () => {
  const store = new ExperimentSettingsStore();
  const manifest = {
    id: "example",
    settings: {
      tabs: [
        {
          id: "experiment",
          title: { "zh-CN": "实验设置", en: "Experiment settings" },
        },
      ],
    },
  } as ExperimentManifest;
  const first = {} as HTMLElement,
    legacy = {} as HTMLElement;
  store.setExperiment(manifest);
  store.setControls(first, "experiment");
  expect(store.tabs[0].element).toBe(first);
  expect(store.tabs[0].value).toBe("experiment:tab:experiment");
  expect(() => store.setControls(first, "appearance")).toThrow("Undeclared");
  store.setControls(legacy);
  expect(store.tabs[0].value).toBe("experiment:default");
  store.setExperiment(manifest);
  expect(store.tabs).toHaveLength(2);
  store.setControls(null, "experiment");
  expect(store.tabs).toHaveLength(1);
  store.setExperiment(null);
  store.setControls(first, "experiment");
  expect(store.tabs).toEqual([]);
});

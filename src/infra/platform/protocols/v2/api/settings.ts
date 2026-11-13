export type {
  ExperimentSettingsTab,
  ExperimentSettingsDefinition,
} from "../../../types";
export interface SettingsApi {
  /** Omit tabId for the legacy default experiment-settings panel. */
  setControls(element: HTMLElement | null, tabId?: string): void;
}

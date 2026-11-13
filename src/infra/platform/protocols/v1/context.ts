import type { Locale, Theme } from "./api/environment";
import type { ExperimentStorage } from "./api/storage";
import type { ToolbarApi } from "./api/toolbar";
import type { SettingsApi } from "./api/settings";
import type { ProtocolHost } from "../types";
import { experimentModule } from "../types";
import type { ExperimentModule } from "./instance";
export interface ExperimentContext {
  locale: Locale;
  theme: Theme;
  buildId: string;
  signal: AbortSignal;
  toolbar?: ToolbarApi;
  settings?: SettingsApi;
  storage: ExperimentStorage;
}
export async function mount(module: unknown, host: ProtocolHost) {
  const { locale, theme, buildId, signal, storage, toolbar, settings } = host;
  return experimentModule<ExperimentModule>(module).mount({
    locale,
    theme,
    buildId,
    signal,
    storage,
    toolbar,
    settings,
  });
}

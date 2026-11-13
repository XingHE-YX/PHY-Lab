import type { Locale, Theme } from "./api/environment";
import type { ExperimentStorage } from "./api/storage";
import type { ToolbarApi } from "./api/toolbar";
import type { SettingsApi } from "./api/settings";
import type { DialogApi } from "./api/dialog";
import type { ExperimentInfo } from "./api/experiment";
import type { ProtocolHost, ProtocolInfo } from "../types";
import { capabilityInfo, experimentModule } from "../types";
import { capabilities, revision } from "./capabilities";
import { parseMetadata } from "./metadata";
import type { ExperimentModule } from "./instance";
export interface ExperimentContext {
  locale: Locale;
  theme: Theme;
  buildId: string;
  signal: AbortSignal;
  toolbar?: ToolbarApi;
  settings?: SettingsApi;
  storage: ExperimentStorage;
  protocol: ProtocolInfo & { version: 2 };
  experiment: ExperimentInfo;
  dialog: DialogApi;
}
export async function mount(module: unknown, host: ProtocolHost) {
  const { locale, theme, buildId, signal, storage, toolbar, settings } = host;
  const dialog = host.dialog as DialogApi | undefined;
  if (!dialog || typeof dialog.open !== "function")
    throw new Error("Protocol v2 requires the platform dialog service");
  const info = capabilityInfo(2, revision, capabilities);
  return experimentModule<ExperimentModule>(module).mount({
    locale,
    theme,
    buildId,
    signal,
    storage,
    toolbar,
    settings,
    protocol: { ...info, version: 2 },
    experiment: Object.freeze(parseMetadata(host.manifest)),
    dialog,
  });
}

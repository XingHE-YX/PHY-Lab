import type {
  ExperimentManifest,
  ExperimentMetadata,
  Locale,
  Theme,
  MountedExperiment,
} from "../types";
export interface CapabilityTable {
  api: Readonly<Record<string, number>>;
  components: Readonly<Record<string, number>>;
}
export interface ProtocolInfo {
  version: number;
  revision: number;
  capabilities: { api: readonly string[]; components: readonly string[] };
}
/** Host-owned services are injected; protocol modules never import UI implementations. */
export interface ProtocolHost {
  locale: Locale;
  theme: Theme;
  buildId: string;
  signal: AbortSignal;
  manifest: ExperimentManifest;
  storage: {
    read<T>(fallback: T): T;
    readVersion<T>(version: number, fallback: T): T;
    write(value: unknown): void;
  };
  toolbar?: { setControls(element: HTMLElement | null): void };
  settings?: { setControls(element: HTMLElement | null, tabId?: string): void };
  dialog?: unknown;
}
export interface ProtocolDefinition {
  version: number;
  revision: number;
  capabilities: CapabilityTable;
  parseMetadata(value: unknown): ExperimentMetadata;
  parseManifest(value: unknown): ExperimentManifest;
  mount(module: unknown, host: ProtocolHost): Promise<MountedExperiment>;
}
export function capabilityInfo(
  version: number,
  revision: number,
  table: CapabilityTable,
): ProtocolInfo {
  const available = (entries: Readonly<Record<string, number>>) =>
    Object.freeze(
      Object.entries(entries)
        .filter(([, since]) => since <= revision)
        .map(([name]) => name),
    );
  return Object.freeze({
    version,
    revision,
    capabilities: Object.freeze({
      api: available(table.api),
      components: available(table.components),
    }),
  });
}
export function experimentModule<T>(value: unknown): T {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as { mount?: unknown }).mount !== "function"
  )
    throw new Error("Invalid experiment module");
  return value as T;
}

export type Locale = "zh-CN" | "en";
export type Theme = "light" | "dark";
export type Localized = Record<Locale, string>;
export interface Resource {
  url: string;
  sha256: string;
  size: number;
}
export interface ExperimentAuthor {
  name: string;
  url?: string;
}
export interface ExperimentCategory {
  id: string;
  title: Localized;
}
export interface ExperimentSettingsTab {
  id: string;
  title: Localized;
}
export interface ExperimentSettingsDefinition {
  tabs: ExperimentSettingsTab[];
}
/** Transport fields shared by the registry, build tools and offline worker. */
export interface ExperimentMetadata {
  id: string;
  version: string;
  apiVersion: number;
  /** Minimum required revision within apiVersion; omission means zero. */
  apiRevision?: number;
  stateVersion: number;
  title: Localized;
  description: Localized;
  tags: Record<Locale, string[]>;
  author?: ExperimentAuthor | ExperimentAuthor[];
  catagory?: ExperimentCategory;
  settings?: ExperimentSettingsDefinition;
  repository?: string;
  license?: string;
}
export interface ExperimentManifest extends ExperimentMetadata {
  buildId: string;
  entry: string;
  thumbnail: string;
  resources: Resource[];
}
export interface Catalog {
  schemaVersion: 1;
  revision: string;
  experiments: (Pick<
    ExperimentMetadata,
    | "id"
    | "version"
    | "apiVersion"
    | "apiRevision"
    | "title"
    | "description"
    | "tags"
    | "catagory"
  > & { thumbnail: string; manifest: string })[];
}
export interface AppRelease {
  version: string;
  buildId: string;
  base: string;
  shell: string;
  resources: Resource[];
}
export interface MountedExperiment {
  element: HTMLElement;
  update(context: { locale: Locale; theme: Theme }): void;
  pause(): void;
  snapshot(): unknown;
  dispose(): void;
}

export type Locale = "zh-CN" | "en";
export type Localized = Record<Locale, string>;
export interface Resource {
  url: string;
  sha256: string;
  size: number;
}
export interface ExperimentManifest {
  id: string;
  version: string;
  buildId: string;
  apiVersion: 1;
  stateVersion: number;
  title: Localized;
  description: Localized;
  tags: Record<Locale, string[]>;
  entry: string;
  thumbnail: string;
  resources: Resource[];
}
export interface Catalog {
  schemaVersion: 1;
  revision: string;
  experiments: (Pick<
    ExperimentManifest,
    | "id"
    | "version"
    | "apiVersion"
    | "title"
    | "description"
    | "tags"
    | "thumbnail"
  > & { manifest: string })[];
}
export interface ExperimentContext {
  locale: Locale;
  theme: "light" | "dark";
  buildId: string;
  signal: AbortSignal;
  storage: {
    read<T>(fallback: T): T;
    readVersion<T>(version: number, fallback: T): T;
    write(value: unknown): void;
  };
}
export interface ExperimentInstance {
  element: HTMLElement;
  update(context: Pick<ExperimentContext, "locale" | "theme">): void;
  pause(): void;
  snapshot(): unknown;
  dispose(): void;
}
export interface ExperimentModule {
  mount(context: ExperimentContext): Promise<ExperimentInstance>;
}
export interface AppRelease {
  version: string;
  buildId: string;
  base: string;
  shell: string;
  resources: Resource[];
}

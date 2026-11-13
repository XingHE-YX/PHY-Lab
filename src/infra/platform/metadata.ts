import type {
  ExperimentMetadata,
  ExperimentManifest,
  Localized,
} from "./types";
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
export function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Invalid ${field}`);
  return value.trim();
}
export function webUrl(value: unknown, field: string): string {
  const result = text(value, field);
  const url = new URL(result);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(`Invalid ${field} URL`);
  return result;
}
export function revision(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid apiRevision");
  return value;
}
export function localized(value: unknown, field: string): Localized {
  const raw = record(value);
  return { "zh-CN": text(raw["zh-CN"], field), en: text(raw.en, field) };
}
export function baseMetadata(value: unknown): ExperimentMetadata {
  const raw = record(value);
  const id = text(raw.id, "id"),
    version = text(raw.version, "version");
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Invalid experiment id");
  if (!/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/.test(version))
    throw new Error("Invalid experiment version");
  if (!Number.isSafeInteger(raw.apiVersion) || (raw.apiVersion as number) < 1)
    throw new Error("Invalid apiVersion");
  if (
    !Number.isSafeInteger(raw.stateVersion) ||
    (raw.stateVersion as number) < 1
  )
    throw new Error("Invalid stateVersion");
  const tags = record(raw.tags);
  const list = (locale: string) => {
    if (
      !Array.isArray(tags[locale]) ||
      !(tags[locale] as unknown[]).every(
        (v) => typeof v === "string" && v.trim(),
      )
    )
      throw new Error("Invalid tags");
    return (tags[locale] as string[]).map((v) => v.trim());
  };
  return {
    id,
    version,
    apiVersion: raw.apiVersion as number,
    apiRevision: revision(raw.apiRevision),
    stateVersion: raw.stateVersion as number,
    title: localized(raw.title, "title"),
    description: localized(raw.description, "description"),
    tags: { "zh-CN": list("zh-CN"), en: list("en") },
  };
}
export function manifestWith<M extends ExperimentMetadata>(
  value: unknown,
  parse: (value: unknown) => M,
): M & ExperimentManifest {
  const raw = record(value),
    metadata = parse(raw);
  if (!Array.isArray(raw.resources)) throw new Error("Invalid resources");
  const urls = new Set<string>();
  const resources = raw.resources.map((value) => {
    const r = record(value),
      url = text(r.url, "resource URL"),
      sha256 = text(r.sha256, "resource fingerprint");
    if (
      urls.has(url) ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      !Number.isSafeInteger(r.size) ||
      (r.size as number) < 0
    )
      throw new Error("Invalid resource");
    urls.add(url);
    return { url, sha256, size: r.size as number };
  });
  const entry = text(raw.entry, "entry");
  if (!urls.has(entry)) throw new Error("Entry missing from resources");
  return {
    ...metadata,
    buildId: text(raw.buildId, "buildId"),
    entry,
    thumbnail: text(raw.thumbnail, "thumbnail"),
    resources,
  };
}

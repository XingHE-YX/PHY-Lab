import { collectCategories } from "./categories";
import { parseExperimentManifest } from "./compatibility";
import type { Catalog, ExperimentManifest } from "./types";
export const base = import.meta.env.BASE_URL;
export function scopedUrl(value: string) {
  const url = new URL(value, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(base))
    throw new Error("Resource outside platform scope");
  return url.href;
}
export async function loadCatalog(): Promise<Catalog> {
  const response = await fetch(base + "catalog.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Catalog unavailable");
  const catalog = (await response.json()) as Catalog;
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.experiments))
    throw new Error("Unsupported catalog");
  const ids = new Set<string>();
  for (const e of catalog.experiments) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(e.id) ||
      ids.has(e.id) ||
      !e.title?.en ||
      !e.title?.["zh-CN"] ||
      !e.tags?.en ||
      !e.tags?.["zh-CN"]
    )
      throw new Error("Invalid catalog entry");
    ids.add(e.id);
    scopedUrl(e.manifest);
  }
  collectCategories(catalog.experiments);
  return catalog;
}
export async function loadManifest(
  url: string,
  id: string,
): Promise<ExperimentManifest> {
  const response = await fetch(scopedUrl(url));
  if (!response.ok) throw new Error("Experiment unavailable");
  const manifest = parseExperimentManifest(await response.json());
  if (manifest.id !== id) throw new Error("Experiment identity mismatch");
  scopedUrl(manifest.entry);
  scopedUrl(manifest.thumbnail);
  for (const resource of manifest.resources) scopedUrl(resource.url);
  return manifest;
}

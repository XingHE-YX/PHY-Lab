import { collectCategories } from "../src/infra/platform/categories";
import { parseExperimentManifest } from "../src/infra/platform/compatibility";
import { join } from "node:path";
import type { Catalog } from "../src/infra/platform/types";
import { dist, base, hash, experimentIds, json, save } from "./shared";
export async function generateCatalog() {
  const experiments: Catalog["experiments"] = [];
  for (const id of await experimentIds()) {
    const pointer = await json<{ manifest: string }>(
      join(dist, "experiments", id, "latest.json"),
    );
    const manifest = parseExperimentManifest(
      await json<unknown>(join(dist, pointer.manifest.slice(base.length))),
    );
    const {
      version,
      apiVersion,
      apiRevision,
      title,
      description,
      tags,
      thumbnail,
      catagory,
    } = manifest;
    experiments.push({
      id,
      version,
      apiVersion,
      apiRevision,
      title,
      description,
      tags,
      thumbnail,
      ...(catagory ? { catagory } : {}),
      manifest: pointer.manifest,
    });
  }
  collectCategories(experiments);
  const catalog: Catalog = {
    schemaVersion: 1,
    revision: hash(JSON.stringify(experiments)).slice(0, 16),
    experiments,
  };
  await save(join(dist, "catalog.json"), catalog);
  return catalog;
}
if (import.meta.main) await generateCatalog();

import { join } from "node:path";
import type {
  Catalog,
  ExperimentManifest,
} from "../src/infra/platform/contract";
import { dist, base, hash, experimentIds, json, save } from "./shared";
export async function generateCatalog() {
  const experiments: Catalog["experiments"] = [];
  for (const id of await experimentIds()) {
    const pointer = await json<{ manifest: string }>(
      join(dist, "experiments", id, "latest.json"),
    );
    const manifest = await json<ExperimentManifest>(
      join(dist, pointer.manifest.slice(base.length)),
    );
    const { version, apiVersion, title, description, tags, thumbnail } =
      manifest;
    experiments.push({
      id,
      version,
      apiVersion,
      title,
      description,
      tags,
      thumbnail,
      manifest: pointer.manifest,
    });
  }
  const catalog: Catalog = {
    schemaVersion: 1,
    revision: hash(JSON.stringify(experiments)).slice(0, 16),
    experiments,
  };
  await save(join(dist, "catalog.json"), catalog);
  return catalog;
}
if (import.meta.main) await generateCatalog();

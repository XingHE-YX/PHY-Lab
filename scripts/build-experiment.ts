import { build } from "vite";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExperimentManifest } from "../src/infra/platform/contract";
import {
  root,
  dist,
  base,
  hash,
  json,
  resources,
  save,
  assertId,
} from "./shared";

export async function buildExperiment(id: string) {
  assertId(id);
  const source = join(root, "experiments", id);
  const metadata = await json<
    Omit<ExperimentManifest, "buildId" | "entry" | "thumbnail" | "resources">
  >(join(source, "experiment.json"));
  if (
    metadata.id !== id ||
    !/^\d+\.\d+\.\d+$/.test(metadata.version) ||
    metadata.apiVersion !== 1
  )
    throw new Error("Invalid experiment metadata");
  const stage = join(root, ".build", id);
  await rm(stage, { recursive: true, force: true });
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    await build({
      configFile: false,
      root,
      publicDir: false,
      build: {
        outDir: stage,
        emptyOutDir: true,
        target: "es2022",
        lib: {
          entry: join(source, "index.ts"),
          formats: ["es"],
          fileName: () => "entry.js",
        },
        cssCodeSplit: true,
      },
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
  await cp(join(source, "assets"), stage, { recursive: true });
  const fingerprints = await resources(stage, "");
  const buildId = hash(JSON.stringify({ metadata, fingerprints })).slice(0, 16);
  const prefix =
    base + "experiments/" + id + "/" + metadata.version + "/" + buildId + "/";
  const manifest: ExperimentManifest = {
    ...metadata,
    buildId,
    entry: prefix + "entry.js",
    thumbnail: prefix + "thumbnail.svg",
    resources: await resources(stage, prefix),
  };
  const destination = join(dist, "experiments", id, metadata.version, buildId);
  await mkdir(destination, { recursive: true });
  await cp(stage, destination, { recursive: true });
  await save(join(destination, "manifest.json"), manifest);
  await save(join(dist, "experiments", id, "latest.json"), {
    manifest: prefix + "manifest.json",
  });
  console.log("Experiment:", id, metadata.version, buildId);
  return manifest;
}
if (import.meta.main) {
  const id = process.argv[2];
  if (!id) throw new Error("Usage: bun scripts/build-experiment.ts <id>");
  await buildExperiment(id);
}

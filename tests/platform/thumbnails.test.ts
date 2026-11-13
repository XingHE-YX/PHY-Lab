import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseExperimentMetadata,
  parseExperimentManifest,
} from "../../src/infra/platform/compatibility";
import {
  thumbnailForTheme,
  thumbnailUrls,
} from "../../src/infra/platform/thumbnails";
import {
  resolveThumbnails,
  publishThumbnails,
} from "../../scripts/experiment-thumbnails";
const metadata = (apiVersion = 2) => ({
  id: "example",
  version: "1.0.0",
  apiVersion,
  stateVersion: 1,
  title: { "zh-CN": "示例", en: "Example" },
  description: { "zh-CN": "说明", en: "Description" },
  tags: { "zh-CN": [], en: [] },
});
const resource = (url: string) => ({ url, sha256: "a".repeat(64), size: 10 });

test("v2 metadata accepts fixed and themed thumbnails without changing the default or v1", () => {
  expect(parseExperimentMetadata(metadata())).not.toHaveProperty("thumbnail");
  expect(
    parseExperimentMetadata({
      ...metadata(),
      thumbnail: "assets/thumbnail.svg",
    }).thumbnail,
  ).toBe("assets/thumbnail.svg");
  const thumbnail = { light: "assets/light.svg", dark: "assets/dark.svg" };
  expect(
    parseExperimentMetadata({ ...metadata(), thumbnail }).thumbnail,
  ).toEqual(thumbnail);
  expect(
    parseExperimentMetadata({ ...metadata(1), thumbnail }),
  ).not.toHaveProperty("thumbnail");
  for (const thumbnail of [
    null,
    [],
    "",
    {},
    { light: "a.svg" },
    { light: "", dark: "dark.svg" },
    { light: "light.svg", dark: 1 },
  ])
    expect(() =>
      parseExperimentMetadata({ ...metadata(), thumbnail }),
    ).toThrow();
});

test("published themed thumbnails require both resources while fixed thumbnails stay fixed", () => {
  const thumbnail = { light: "/light.svg", dark: "/dark.svg" };
  const manifest = {
    ...metadata(),
    buildId: "build",
    entry: "/entry.js",
    thumbnail,
    resources: [
      resource("/entry.js"),
      resource("/light.svg"),
      resource("/dark.svg"),
    ],
  };
  expect(parseExperimentManifest(manifest).thumbnail).toEqual(thumbnail);
  expect(() =>
    parseExperimentManifest({
      ...manifest,
      resources: manifest.resources.slice(0, 2),
    }),
  ).toThrow("thumbnail missing");
  expect(() =>
    parseExperimentManifest({ ...manifest, apiVersion: 1 }),
  ).toThrow();
  for (const theme of ["light", "dark"] as const)
    expect(thumbnailForTheme("/fixed.svg", theme)).toBe("/fixed.svg");
  expect(thumbnailForTheme(thumbnail, "light")).toBe("/light.svg");
  expect(thumbnailForTheme(thumbnail, "dark")).toBe("/dark.svg");
  expect(thumbnailUrls(thumbnail)).toEqual(["/light.svg", "/dark.svg"]);
});

test("the build resolves existing local assets and publishes both themed paths", async () => {
  const source = await mkdtemp(join(tmpdir(), "phy-thumbnail-"));
  try {
    await mkdir(join(source, "assets", "previews"), { recursive: true });
    await writeFile(join(source, "assets", "thumbnail.svg"), "default");
    await writeFile(join(source, "assets", "previews", "light.svg"), "light");
    await writeFile(join(source, "assets", "previews", "dark.svg"), "dark");
    expect(await resolveThumbnails(source)).toBe("thumbnail.svg");
    expect(await resolveThumbnails(source, "assets/previews/light.svg")).toBe(
      "previews/light.svg",
    );
    const paths = await resolveThumbnails(source, {
      light: "assets/previews/light.svg",
      dark: "assets/previews/dark.svg",
    });
    expect(publishThumbnails(paths, "/experiments/example/build/")).toEqual({
      light: "/experiments/example/build/previews/light.svg",
      dark: "/experiments/example/build/previews/dark.svg",
    });
    for (const path of [
      "../secret.svg",
      "https://example.com/a.svg",
      "assets/../secret.svg",
      "assets/previews/light.svg?x",
      "assets/%2e%2e/secret.svg",
      "assets/previews",
      "assets/missing.svg",
      "assets/\\secret.svg",
    ])
      await expect(resolveThumbnails(source, path)).rejects.toThrow();
    await writeFile(join(source, "outside.svg"), "outside");
    await symlink(
      join(source, "outside.svg"),
      join(source, "assets", "linked.svg"),
    );
    await expect(
      resolveThumbnails(source, "assets/linked.svg"),
    ).rejects.toThrow("inside assets");
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});

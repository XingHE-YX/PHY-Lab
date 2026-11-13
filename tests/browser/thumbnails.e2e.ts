import { expect, test } from "@playwright/test";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type {
  Catalog,
  ExperimentManifest,
} from "../../src/infra/platform/types";
import { settingsPage } from "./helpers/settings";

const dist = join(import.meta.dirname, "../../dist");
test("themed thumbnails follow system and manual themes offline while fixed thumbnails do not switch", async ({
  page,
  context,
}) => {
  const original = await readFile(join(dist, "catalog.json"), "utf8");
  const catalog = JSON.parse(original) as Catalog;
  const themed = catalog.experiments[0],
    fixed = catalog.experiments[1];
  const own = JSON.parse(
    await readFile(join(dist, themed.manifest.slice(1)), "utf8"),
  ) as ExperimentManifest;
  const other = JSON.parse(
    await readFile(join(dist, fixed.manifest.slice(1)), "utf8"),
  ) as ExperimentManifest;
  if (typeof own.thumbnail !== "string" || typeof other.thumbnail !== "string")
    throw new Error("This fixture needs the existing fixed thumbnails");
  const thumbnails = { light: own.thumbnail, dark: other.thumbnail };
  const darkResource = other.resources.find(
    (resource) => resource.url === other.thumbnail,
  )!;
  const buildId = "themed-" + Date.now();
  const prefix = `/experiments/${themed.id}/${themed.version}/${buildId}/`;
  const directory = join(dist, prefix.slice(1));
  try {
    await mkdir(directory, { recursive: true });
    const manifest = {
      ...own,
      buildId,
      thumbnail: thumbnails,
      resources: [...own.resources, darkResource],
    };
    await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
    themed.thumbnail = thumbnails;
    themed.manifest = prefix + "manifest.json";
    catalog.revision = buildId;
    await writeFile(join(dist, "catalog.json"), JSON.stringify(catalog));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    const image = page.locator(
      `.card[href="#/experiments/${themed.id}"] .thumb`,
    );
    const fixedImage = page.locator(
      `.card[href="#/experiments/${fixed.id}"] .thumb`,
    );
    await expect(image).toHaveAttribute("src", thumbnails.light);
    await expect(fixedImage).toHaveAttribute("src", other.thumbnail);
    await settingsPage(page, "cache");
    await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
    const cached = await page.evaluate(
      async ({ id, buildId, thumbnails }) => {
        const name = (await caches.keys()).find((name) =>
          name.endsWith(`experiment:${id}:${buildId}`),
        );
        if (!name) return false;
        const cache = await caches.open(name);
        return (
          Boolean(await cache.match(thumbnails.light)) &&
          Boolean(await cache.match(thumbnails.dark))
        );
      },
      { id: themed.id, buildId, thumbnails },
    );
    expect(cached).toBe(true);
    await page.keyboard.press("Escape");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(image).toHaveAttribute("src", thumbnails.dark);
    await expect(fixedImage).toHaveAttribute("src", other.thumbnail);
    await context.setOffline(true);
    await page.reload();
    await expect(image).toHaveAttribute("src", thumbnails.dark);
    await expect
      .poll(() =>
        image.evaluate(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "切换明暗", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(image).toHaveAttribute("src", thumbnails.light);
    await expect
      .poll(() =>
        image.evaluate(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(fixedImage).toHaveAttribute("src", other.thumbnail);
  } finally {
    await context.setOffline(false);
    await writeFile(join(dist, "catalog.json"), original);
    await rm(directory, { recursive: true, force: true });
  }
});

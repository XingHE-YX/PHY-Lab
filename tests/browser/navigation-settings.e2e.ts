import { expect, test } from "@playwright/test";
import { settingsPage } from "./helpers/settings";
import type { ExperimentPage } from "../../src/pages/experiment-page";

test.describe("home category navigation", () => {
  test.use({ serviceWorkers: "block" });
  test("home categories and search filter together using vertical tabs", async ({
    page,
  }) => {
    await page.route("**/catalog.json", async (route) => {
      const response = await route.fetch();
      const catalog = await response.json();
      for (const entry of catalog.experiments)
        entry.catagory =
          entry.id === "mechanical-waves"
            ? { id: "optics", title: { "zh-CN": "光学", en: "Optics" } }
            : { id: "mechanics", title: { "zh-CN": "力学", en: "Mechanics" } };
      await route.fulfill({ response, json: catalog });
    });
    await page.goto("/");
    const categories = page.getByRole("tablist", { name: "实验分类" });
    await expect(categories).toHaveAttribute("aria-orientation", "vertical");
    await categories.getByRole("tab", { name: "光学", exact: true }).click();
    await expect(
      page.getByRole("link", { name: /机械波实验台/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /弹簧振子/ })).toHaveCount(0);
    await page.getByRole("searchbox").fill("不存在");
    await expect(
      page.getByRole("heading", { name: "没有找到匹配的实验" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "清除搜索", exact: true }).click();
    await page.getByRole("button", { name: "切换语言", exact: true }).click();
    await expect(
      page.getByRole("tab", { name: "Optics", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Mechanics", exact: true }).click();
    await expect(
      page.getByRole("link", { name: /Spring oscillator/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Mechanical waves/ }),
    ).toHaveCount(0);
    await page
      .getByRole("tab", { name: "All experiments", exact: true })
      .click();
    await expect(page.locator(".card")).toHaveCount(3);
  });
});

test("wide settings has vertical pages, no search or footer, and current experiment credits", async ({
  page,
}) => {
  await page.goto("/");
  let dialog = await settingsPage(page, "about");
  await expect(dialog).toHaveCSS("width", "960px");
  await expect(
    dialog.getByRole("tablist", { name: "设置分类" }),
  ).toHaveAttribute("aria-orientation", "vertical");
  await expect(dialog.getByRole("searchbox")).toHaveCount(0);
  await expect(dialog.locator("footer")).toHaveCount(0);
  await expect(
    dialog.getByText("PHY Lab v0.2.0", { exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".brand-logo")).toBeVisible();
  await expect(
    dialog.getByRole("region", { name: "当前实验", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  dialog = await settingsPage(page, "about");
  const current = dialog.getByRole("region", { name: "当前实验", exact: true });
  await expect(current).toContainText("弹簧振子");
  await expect(current).toContainText("yuanzui-cf、XingHE-YX");
  const currentBox = (await current.boundingBox())!;
  const updateBox = (await dialog
    .getByRole("button", { name: "检查更新", exact: true })
    .boundingBox())!;
  expect(currentBox.y + currentBox.height).toBeLessThan(updateBox.y);
  await page.keyboard.press("Escape");
  await page.goto("/#/experiments/chladni-plate");
  await expect(
    page.getByRole("heading", { name: "克拉尼图形", exact: true }),
  ).toBeVisible();
  dialog = await settingsPage(page, "experiment");
  await expect(
    dialog.getByRole("tab", { name: "声音", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("tab", { name: "实验设置", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await dialog.getByRole("switch", { name: "静音", exact: true }).check();
  await settingsPage(page, "appearance");
  await settingsPage(page, "experiment");
  await expect(
    dialog.getByRole("switch", { name: "静音", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await settingsPage(page, "experiment");
  await expect(
    page.getByRole("switch", { name: "静音", exact: true }),
  ).toBeChecked();
});

test("clearing scoped resources keeps settings and progress and can rebuild offline resources", async ({
  page,
  context,
}) => {
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "质量", exact: true })
    .evaluate((node) => {
      const input = node as HTMLInputElement;
      input.value = "2";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await settingsPage(page, "cache");
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  const usage = page.locator("[data-cache-bytes]");
  await expect
    .poll(async () => Number(await usage.getAttribute("data-cache-bytes")))
    .toBeGreaterThan(0);
  await page.evaluate(async () => {
    const cache = await caches.open("unrelated-fixture");
    await cache.put("/unrelated-data", new Response("keep"));
  });
  const saved = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith("phy-lab:"),
      ),
    ),
  );
  await page.getByRole("button", { name: "一键清除缓存", exact: true }).click();
  await expect(usage).toHaveAttribute("data-cache-bytes", "0");
  await expect(
    page.getByText("尚未准备离线资源", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([key]) =>
          key.startsWith("phy-lab:"),
        ),
      ),
    ),
  ).toEqual(saved);
  expect(
    await page.evaluate(async () =>
      (
        await (await caches.open("unrelated-fixture")).match("/unrelated-data")
      )?.text(),
    ),
  ).toBe("keep");
  await page
    .getByRole("button", { name: "重新准备离线资源", exact: true })
    .click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  expect(
    await page.locator("phy-experiment-page").evaluate(
      (el) =>
        (
          (el as ExperimentPage).instance!.snapshot() as {
            params: { m: number };
          }
        ).params.m,
    ),
  ).toBe(2);
  await context.setOffline(false);
});

test.describe("named experimental settings", () => {
  test.use({ serviceWorkers: "block" });
  test("declared tabs preserve their controls and clear on exit", async ({
    page,
  }) => {
    await page.route("**/manifest.json", async (route) => {
      const response = await route.fetch();
      const manifest = await response.json(),
        oldEntry = manifest.entry;
      manifest.settings = {
        tabs: [
          {
            id: "general",
            title: { "zh-CN": "实验设置", en: "Experiment settings" },
          },
          { id: "display", title: { "zh-CN": "显示", en: "Display" } },
        ],
      };
      manifest.entry = "/named-settings-fixture.js";
      manifest.resources = manifest.resources.map(
        (resource: { url: string }) =>
          resource.url === oldEntry
            ? { ...resource, url: manifest.entry }
            : resource,
      );
      await route.fulfill({ response, json: manifest });
    });
    await page.route("**/named-settings-fixture.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `export async function mount(context) {
      const element = document.createElement('h1'); element.textContent = 'Named settings fixture';
      for (const [id, text] of [['general','General option'],['display','Display option']]) {
        const panel = document.createElement('label'), input = document.createElement('input');
        input.type = 'checkbox'; panel.append(input, text); context.settings.setControls(panel,id);
      }
      window.namedSettings = context.settings;
      return { element, update() {}, pause() {}, snapshot() { return {}; }, dispose() {} };
    }`,
      }),
    );
    await page.goto("/#/experiments/spring-oscillator");
    await expect(
      page.getByRole("heading", { name: "Named settings fixture" }),
    ).toBeVisible();
    const dialog = await settingsPage(page, "experiment");
    await dialog.getByRole("checkbox", { name: "General option" }).check();
    await dialog.getByRole("tab", { name: "显示", exact: true }).click();
    await dialog.getByRole("checkbox", { name: "Display option" }).check();
    await dialog.getByRole("tab", { name: "实验设置", exact: true }).click();
    await expect(
      dialog.getByRole("checkbox", { name: "General option" }),
    ).toBeChecked();
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const panel = document.createElement("label"),
        input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      panel.append(input, "Replacement option");
      (window as any).namedSettings.setControls(panel, "general");
    });
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(
      dialog.getByRole("tab", { name: "实验设置", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      dialog.getByRole("checkbox", { name: "Replacement option" }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("checkbox", { name: "General option" }),
    ).toHaveCount(0);
    await page.evaluate(() =>
      (window as any).namedSettings.setControls(null, "general"),
    );
    await expect(
      dialog.getByRole("tab", { name: "外观", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "返回控制台", exact: true }).click();
    await settingsPage(page, "appearance");
    await expect(
      page.getByRole("dialog").getByRole("tab", { name: "显示", exact: true }),
    ).toHaveCount(0);
  });
});

test("every retained settings page refreshes when reopened after background changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await settingsPage(page, "appearance");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(
    dialog.getByRole("tab", { name: "Appearance", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    dialog.getByRole("combobox", { name: "Switch language", exact: true }),
  ).toHaveValue("en");
  await expect(
    dialog.getByRole("combobox", { name: "Appearance", exact: true }),
  ).toHaveValue(theme!);
  await settingsPage(page, "cache");
  await expect(
    page.getByText("✓ Ready for offline use", { exact: true }),
  ).toBeVisible();
  const usage = page.locator("[data-cache-bytes]");
  await expect
    .poll(async () => Number(await usage.getAttribute("data-cache-bytes")))
    .toBeGreaterThan(0);
  const before = Number(await usage.getAttribute("data-cache-bytes"));
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    const cache = await caches.open("phy-lab:/:v1:refresh-fixture");
    await cache.put("/refresh-bytes", new Response("x".repeat(1024)));
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    dialog.getByRole("tab", { name: "Cache settings", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect
    .poll(async () => Number(await usage.getAttribute("data-cache-bytes")))
    .toBeGreaterThan(before);
  const beforeRoute = Number(await usage.getAttribute("data-cache-bytes"));
  await page.evaluate(async () => {
    const cache = await caches.open("phy-lab:/:v1:refresh-fixture");
    await cache.put("/refresh-more", new Response("x".repeat(1024)));
    location.hash = "#/experiments/spring-oscillator";
  });
  await expect
    .poll(async () => Number(await usage.getAttribute("data-cache-bytes")))
    .toBeGreaterThan(beforeRoute);
  await settingsPage(page, "about");
  await page.keyboard.press("Escape");
  await page.goto("/#/experiments/mechanical-waves");
  await expect(
    page.getByRole("heading", { name: "Mechanical waves", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(
    dialog.getByRole("tab", { name: "About", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const current = dialog.getByRole("region", {
    name: "Current experiment",
    exact: true,
  });
  await expect(current).toContainText("Mechanical waves");
  await expect(current).toContainText("XingHE-YX");
  await expect(current).not.toContainText("yuanzui-cf");
  await page.keyboard.press("Escape");
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    dialog.getByRole("region", { name: "Current experiment", exact: true }),
  ).toHaveCount(0);
});

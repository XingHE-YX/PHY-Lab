import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/mechanical-waves/model/snapshot";
import { waveAt } from "../../experiments/mechanical-waves/model/physics";
async function open(page: Page) {
  await page.goto("/#/experiments/mechanical-waves");
  await expect(
    page.getByRole("heading", { name: "机械波实验台", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: number) {
  await page
    .getByRole("slider", { name, exact: true })
    .evaluate((node, value) => {
      const input = node as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
}
test("wave propagation, point readouts and chart markers share one time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("机械波");
  await page.getByRole("link", { name: /机械波实验台/ }).click();
  await range(page, "拖动时间游标", 2.6);
  const saved = await snapshot(page),
    expected = waveAt(
      saved.params,
      saved.probe * saved.params.length,
      saved.time,
    );
  await expect(page.locator(".readout").first()).toContainText(
    expected.y.toFixed(3),
  );
  await expect(page.locator('.chart-point[data-metric="y"]')).toHaveAttribute(
    "data-value",
    String(expected.y),
  );
  await expect(page.locator(".tracked-particle")).toHaveAttribute(
    "data-y",
    String(expected.y),
  );
  await page.getByRole("tab", { name: "空间剖面", exact: true }).click();
  expect((await snapshot(page)).time).toBe(saved.time);
  const probe = page.getByRole("slider", { name: "跟踪位置", exact: true });
  await probe.focus();
  await page.keyboard.press("ArrowRight");
  expect((await snapshot(page)).probe * saved.params.length).toBeCloseTo(
    4.1,
    5,
  );
  expect((await snapshot(page)).time).toBe(saved.time);
  await page.getByRole("button", { name: "发出向下波包", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ 暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  expect((await snapshot(page)).params.polarity).toBe(-1);
  await range(page, "拖动时间游标", 2.6);
  await expect(page.locator(".readout").first()).toContainText("-");
  await page.getByRole("button", { name: "模型说明", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "模型说明", exact: true }),
  ).toBeFocused();
});

test("fixed and free boundaries reflect correctly and layers preserve the physical state", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "波的反射", exact: true }).click();
  await range(page, "跟踪位置 xₚ", 1);
  await page.getByRole("button", { name: "波峰到右端", exact: true }).click();
  await expect(page.locator(".readout").first()).toContainText("0.000");
  await page.getByRole("button", { name: "自由端", exact: true }).click();
  await page.getByRole("button", { name: "波峰到右端", exact: true }).click();
  await expect(page.locator(".boundary-ring")).toHaveAttribute(
    "data-y",
    "0.44",
  );
  await expect(page.locator(".readout").first()).toContainText("0.440");
  await page.getByRole("tab", { name: "空间剖面", exact: true }).click();
  await expect(page.locator(".component-values")).toContainText("0.220");
  const before = await snapshot(page);
  await page.getByLabel("入射波 →", { exact: true }).check();
  await page.getByLabel("反射波 ←", { exact: true }).check();
  await expect(page.locator(".wave-incident")).toBeVisible();
  await expect(page.locator(".wave-reflected")).toBeVisible();
  await page.getByLabel("合成波", { exact: true }).uncheck();
  expect((await snapshot(page)).time).toBe(before.time);
  expect((await snapshot(page)).params).toEqual(before.params);
  await expect(page.locator(".tracked-particle")).toHaveAttribute(
    "data-y",
    "0.44",
  );
  await page.getByLabel("入射波 →", { exact: true }).uncheck();
  await page.getByLabel("反射波 ←", { exact: true }).uncheck();
  await expect(page.locator(".view-note").last()).toContainText("图层已隐藏");
  await page.getByRole("button", { name: "固定端", exact: true }).click();
  await range(page, "跟踪位置 xₚ", 0.5);
  await page
    .getByRole("button", { name: "反射波峰到探针", exact: true })
    .click();
  await expect(page.locator(".readout").first()).toContainText("-0.220");
});

test("standing nodes stay at rest and a straight profile can still have moving antinodes", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.getByRole("button", { name: "驻波", exact: true }).click();
  await expect(page.locator(".node-marker")).toHaveCount(5);
  await expect(page.locator(".antinode-marker")).toHaveCount(4);
  await page.getByRole("button", { name: "定位波节", exact: true }).click();
  await page.getByRole("button", { name: "T/4", exact: true }).click();
  let saved = await snapshot(page),
    s = waveAt(saved.params, saved.probe * saved.params.length, saved.time);
  expect(s.y).toBeCloseTo(0, 10);
  expect(s.v).toBeCloseTo(0, 10);
  await page.getByRole("button", { name: "定位波腹", exact: true }).click();
  saved = await snapshot(page);
  s = waveAt(saved.params, saved.probe * saved.params.length, saved.time);
  expect(s.y).toBeCloseTo(0, 10);
  expect(Math.abs(s.v)).toBeGreaterThan(1);
  const arrow = page.locator(".particle-velocity");
  await expect(arrow).toHaveCount(1);
  // A vertical SVG path has zero box width; inspect its painted direction.
  const dy = await arrow.evaluate((node) => {
    const path = node as SVGPathElement;
    return (
      path.getPointAtLength(path.getTotalLength()).y -
      path.getPointAtLength(0).y
    );
  });
  expect(Math.sign(dy)).toBe(-Math.sign(s.v));
  expect(Math.abs(dy)).toBeGreaterThan(20);
  await page.getByLabel("波节与波腹", { exact: true }).uncheck();
  await expect(page.locator(".node-marker")).toHaveCount(0);
  expect((await snapshot(page)).time).toBe(saved.time);
  await page.getByRole("button", { name: "波源", exact: true }).click();
  await range(page, "入射振幅", 0);
  await expect(
    page.getByRole("button", { name: "定位波节", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".view-note").last()).toContainText("振幅为零");
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page.getByRole("button", { name: "观察驻波", exact: true }).click();
  expect((await snapshot(page)).params.mode).toBe("standing");
  await expect(page.locator(".chart-point")).toHaveAttribute(
    "data-metric",
    "v",
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await range(page, "拖动时间游标", 0.25);
  await page.getByLabel("入射波 →", { exact: true }).check();
  await page.getByLabel("反射波 ←", { exact: true }).check();
  if ((await page.locator("html").getAttribute("data-theme")) !== "dark")
    await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("standing-wave-desktop.png"),
    animations: "disabled",
  });
});

async function layoutViolations(page: Page) {
  return page.locator("phy-experiment-page").evaluate((el) => {
    const root = (el as ExperimentPage).instance!.element.shadowRoot!;
    return [
      ".heading",
      ".parameter-body",
      ".stage",
      ".scene-wrap",
      ".readouts",
      ".timeline",
      ".moments",
      ".plot",
      ".support",
    ].flatMap((selector) => {
      const node = root.querySelector<HTMLElement>(selector)!;
      const rect = node.getBoundingClientRect();
      return rect.top < 0 ||
        rect.bottom > innerHeight + 1 ||
        node.scrollWidth > node.clientWidth + 1 ||
        node.scrollHeight > node.clientHeight + 1
        ? [selector]
        : [];
    });
  });
}
test("wave controls fit the desktop viewport in both languages and themes", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await open(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    for (const theme of ["light", "dark"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", { name: /^(切换明暗|Toggle theme)$/ })
          .click();
      for (const locale of ["zh-CN", "en"]) {
        if ((await page.locator("html").getAttribute("lang")) !== locale)
          await page
            .getByRole("button", { name: /^(切换语言|Switch language)$/ })
            .click();
        for (const model of [0, 1, 2]) {
          await page.locator(".mode-switch button").nth(model).click();
          for (const source of model === 2 ? [0] : [0, 1]) {
            await page.locator(".parameter-tabs button").nth(0).click();
            if (model !== 2)
              await page.locator(".source-tabs button").nth(source).click();
            for (const group of [0, 1]) {
              await page.locator(".parameter-tabs button").nth(group).click();
              for (const view of [0, 1]) {
                await page
                  .locator(".observation-tabs button")
                  .nth(view)
                  .click();
                await expect
                  .poll(() => layoutViolations(page), {
                    message: `${size.width} ${theme} ${locale} ${model} ${source} ${group} ${view}`,
                  })
                  .toEqual([]);
                await expect(page.locator(".wave-chart")).toBeVisible();
              }
            }
          }
        }
        await page.screenshot({
          path: info.outputPath(`waves-${size.width}-${theme}-${locale}.png`),
          animations: "disabled",
        });
      }
    }
  }
});

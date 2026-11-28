import { expect, test, type Locator, type Page } from "@playwright/test";

const route = "/#/experiments/single-slit-diffraction";
const read = (page: Page, key: string) =>
  page.locator('[data-readout="' + key + '"]');
const slider = (page: Page, name: string) =>
  page.getByRole("slider", { name, exact: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const width = async (page: Page, lane: "current" | "reference") =>
  Number(
    await page
      .locator('[data-strip="' + lane + '"]')
      .getAttribute("data-width"),
  );

async function open(page: Page) {
  await page.goto(route);
  await expect(
    page.getByRole("heading", { name: "单缝衍射", exact: true }),
  ).toBeVisible();
}

async function pointerAt(hit: Locator, fraction: number) {
  return hit.evaluate((element: SVGRectElement, amount) => {
    const x = element.x.baseVal.value + element.width.baseVal.value * amount;
    const y = element.y.baseVal.value + element.height.baseVal.value * 0.5;
    const point = new DOMPoint(x, y).matrixTransform(element.getScreenCTM()!);
    return { x: point.x, y: point.y };
  }, fraction);
}

test("the catalog opens the experiment and slit presets change only the current pattern", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("单缝衍射");
  await page.getByRole("link", { name: /单缝衍射/ }).click();
  await expect(read(page, "current-width")).toHaveText("16.50 mm");
  await expect(read(page, "reference-width")).toHaveText("8.25 mm");
  await expect(read(page, "width-ratio")).toHaveText("2.00×");
  const referenceTrace = page.locator(".trace.reference");
  const before = await referenceTrace.getAttribute("points");
  await button(page, "窄缝").click();
  await expect(slider(page, "缝宽 a")).toHaveValue("40");
  await expect(read(page, "width-ratio")).toHaveText("4.00×");
  await expect(referenceTrace).toHaveAttribute("points", before!);
  await button(page, "将当前缝宽设为参照").click();
  await expect(read(page, "reference-slit")).toHaveText("40 μm");
  await button(page, "宽缝").click();
  await expect(read(page, "width-ratio")).toHaveText("0.25×");
  const widths = [await width(page, "current"), await width(page, "reference")];
  await slider(page, "波长 λ").press("End");
  await expect(
    page.locator("linearGradient[data-wavelength='700']"),
  ).toHaveCount(2);
  expect(await width(page, "current")).toBeGreaterThan(widths[0]);
  expect(await width(page, "reference")).toBeGreaterThan(widths[1]);
  const widest = [await width(page, "current"), await width(page, "reference")];
  await slider(page, "屏距 L").press("End");
  await expect(slider(page, "屏距 L")).toHaveValue("2");
  expect((await width(page, "current")) / widest[0]).toBeCloseTo(2 / 1.2, 10);
  expect((await width(page, "reference")) / widest[1]).toBeCloseTo(2 / 1.2, 10);
});

test("strip and chart share a draggable probe, keyboard controls and dark-fringe guides", async ({
  page,
}) => {
  await open(page);
  const strip = page.locator(".fringe-screen");
  const chart = page.locator(".intensity-chart");
  const start = await pointerAt(strip.locator(".position-hit"), 0.35);
  const end = await pointerAt(strip.locator(".position-hit"), 0.55);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
  const probe = Number(await strip.getAttribute("data-probe"));
  expect(Math.abs(probe - 4)).toBeLessThan(0.25);
  await expect(chart).toHaveAttribute("data-probe", String(probe));
  await expect(slider(page, "屏上位置 x")).toHaveValue(String(probe));
  for (const lane of ["current", "reference"]) {
    const stripeIntensity = await strip
      .locator('[data-strip="' + lane + '"]')
      .getAttribute("data-probe-intensity");
    await expect(chart.locator('[data-curve="' + lane + '"]')).toHaveAttribute(
      "data-intensity",
      stripeIntensity!,
    );
    await expect(read(page, lane + "-intensity")).toHaveText(
      Number(stripeIntensity).toFixed(4),
    );
  }

  const onChart = await pointerAt(chart.locator(".position-hit"), 0.38);
  await page.mouse.click(onChart.x, onChart.y);
  const negative = Number(await chart.getAttribute("data-probe"));
  expect(Math.abs(negative + 9.6)).toBeLessThan(0.35);
  await expect(strip).toHaveAttribute("data-probe", String(negative));

  await button(page, "第一暗纹").press("Enter");
  await expect(read(page, "probe")).toHaveText("8.25 mm");
  await expect(read(page, "current-intensity")).toHaveText("0.0000");
  const bounds = await strip.boundingBox();
  await page
    .getByRole("checkbox", { name: "标记第一暗纹", exact: true })
    .uncheck();
  await expect(page.locator(".width-bracket, .central-region")).toHaveCount(0);
  await expect(read(page, "current-intensity")).toHaveText("0.0000");
  expect(await strip.boundingBox()).toEqual(bounds);

  const probeSlider = slider(page, "屏上位置 x");
  await probeSlider.press("Home");
  await expect(read(page, "probe")).toHaveText("-40.00 mm");
  await probeSlider.press("ArrowRight");
  await expect(read(page, "probe")).toHaveText("-39.99 mm");
  await button(page, "中央").click();
  await expect(read(page, "current-intensity")).toHaveText("1.0000");
  await expect(read(page, "reference-intensity")).toHaveText("1.0000");
});

test("reload restores the controls, and reset restores the default comparison", async ({
  page,
}) => {
  await open(page);
  await button(page, "窄缝").click();
  await button(page, "将当前缝宽设为参照").click();
  await slider(page, "缝宽 a").press("End");
  await slider(page, "波长 λ").press("Home");
  await slider(page, "屏距 L").press("End");
  await slider(page, "屏上位置 x").press("Home");
  await page
    .getByRole("checkbox", { name: "标记第一暗纹", exact: true })
    .uncheck();
  await page.reload();
  await expect(slider(page, "缝宽 a")).toHaveValue("160");
  await expect(slider(page, "波长 λ")).toHaveValue("400");
  await expect(slider(page, "屏距 L")).toHaveValue("2");
  await expect(read(page, "probe")).toHaveText("-40.00 mm");
  await expect(read(page, "reference-slit")).toHaveText("40 μm");
  await expect(
    page.getByRole("checkbox", { name: "标记第一暗纹", exact: true }),
  ).not.toBeChecked();
  await button(page, "重置实验").click();
  await expect(slider(page, "缝宽 a")).toHaveValue("80");
  await expect(slider(page, "波长 λ")).toHaveValue("550");
  await expect(slider(page, "屏距 L")).toHaveValue("1.2");
  await expect(read(page, "probe")).toHaveText("0.00 mm");
  await expect(read(page, "reference-slit")).toHaveText("160 μm");
  await expect(
    page.getByRole("checkbox", { name: "标记第一暗纹", exact: true }),
  ).toBeChecked();
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(
    "the workbench fits " +
      viewport.width +
      "×" +
      viewport.height +
      " in both themes and languages",
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      await open(page);
      const overflowAreas = page.locator(
        ".lab, .panel, .parameters, .reference-controls, .tools, .screen-content, .probe-controls, .readouts, .chart-content, .widths, .formula, phy-math [part='formula']",
      );
      for (const language of ["zh-CN", "en"]) {
        if (language === "en") await button(page, "切换语言").click();
        await expect(
          page.getByRole("heading", {
            name: language === "en" ? "Single-slit diffraction" : "单缝衍射",
            exact: true,
          }),
        ).toBeVisible();
        const themeToggle = button(
          page,
          language === "en" ? "Toggle theme" : "切换明暗",
        );
        for (const theme of ["light", "dark"]) {
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator(".formula .katex")).toBeVisible();
          const overflow = await overflowAreas.evaluateAll((areas) =>
            areas.flatMap((area) => {
              const rect = area.getBoundingClientRect();
              return rect.bottom > innerHeight + 1 ||
                rect.right > innerWidth + 1 ||
                rect.top < 0 ||
                rect.left < 0 ||
                area.scrollHeight > area.clientHeight + 1 ||
                area.scrollWidth > area.clientWidth + 1
                ? [String(area.className)]
                : [];
            }),
          );
          expect(overflow).toEqual([]);
          await themeToggle.click();
        }
      }
      const help = button(page, "Model & controls");
      await help.press("Enter");
      await expect(
        page.getByRole("dialog", { name: "Model & controls" }),
      ).toContainText("normalised to each pattern’s own central peak");
      await page.keyboard.press("Escape");
      await expect(help).toBeFocused();
    },
  );
}

test("the first experiment visit works offline after the initial platform cache", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await button(page, "设置").click();
  await page.getByRole("tab", { name: "缓存设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await button(page, "关闭").click();
  await context.setOffline(true);
  await open(page);
  await button(page, "窄缝").click();
  await expect(read(page, "width-ratio")).toHaveText("4.00×");
  await page.reload();
  await expect(read(page, "width-ratio")).toHaveText("4.00×");
});

import { expect, test, type Page } from "@playwright/test";
import { defaults, duration, makeTrial } from "../model/physics";

const route = "/#/experiments/doppler-effect";
const title = /^(多普勒效应|Doppler effect)$/;
const read = (page: Page, key: string) =>
  page.locator(`[data-readout="${key}"]`);
const time = async (page: Page) =>
  Number(await page.locator("output[data-time]").getAttribute("data-time"));
const mover = (page: Page) =>
  page.getByRole("slider", { name: "运动物体回看位置", exact: true });
const selectRole = (page: Page, label: string) =>
  page
    .getByRole("radiogroup", { name: "运动物体", exact: true })
    .getByRole("radio", { name: label, exact: true })
    .click();
const selectMotion = (page: Page, label: string) =>
  page
    .getByRole("radiogroup", { name: "相对运动", exact: true })
    .getByRole("radio", { name: label, exact: true })
    .click();

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("catalog opens the lab and both roles compare approach, retreat, and rest", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("多普勒");
  await page.getByRole("link", { name: /多普勒效应/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(read(page, "received")).toHaveText("533.33 Hz");
  await expect(read(page, "wavelength")).toHaveText("0.637 m");
  await selectMotion(page, "远离");
  await expect(read(page, "received")).toHaveText("320.00 Hz");
  await selectRole(page, "观察者");
  await expect(read(page, "received")).toHaveText("300.00 Hz");
  await expect(read(page, "wavelength")).toHaveText("0.850 m");
  await expect(page.locator(".wavefronts .wavefront").first()).toBeVisible();
  const centres = await page
    .locator(".wavefronts .wavefront")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => node.getAttribute("cx"))),
    ]);
  expect(centres).toHaveLength(1);
  await selectMotion(page, "靠近");
  await expect(read(page, "received")).toHaveText("500.00 Hz");
  await expect(read(page, "wavelength")).toHaveText("0.850 m");
  await selectMotion(page, "静止");
  await expect(read(page, "received")).toHaveText("400.00 Hz");
  await expect(mover(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "运动对照" }).click();
  await expect(page.locator('[data-case="approach"]')).toContainText(
    "500.00 Hz",
  );
  await expect(page.locator('[data-case="retreat"]')).toContainText(
    "300.00 Hz",
  );
  await expect(page.locator(".comparison-row[data-active]")).toContainText(
    "400.00 Hz",
  );
  await page.locator('[data-case="approach"]').click();
  await expect(read(page, "received")).toHaveText("500.00 Hz");
  await page.locator(".switch-role").click();
  await expect(read(page, "received")).toHaveText("533.33 Hz");
  await page
    .getByRole("slider", { name: "运动时速率", exact: true })
    .press("Home");
  await expect(read(page, "received")).toHaveText("400.00 Hz");
  await expect(page.locator(".motion-status")).toHaveText("静止 · 0 m/s");
});

test("next arrival aligns the measured crest, observer and arrival tick", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  const trial = makeTrial(defaults);
  await page.getByRole("button", { name: "首个到达", exact: true }).click();
  const first = await time(page);
  expect(first).toBe(trial.nextArrival(0));
  const index = trial.at(first).index;
  await expect(page.locator(".reception-row .highlighted")).toHaveAttribute(
    "data-index",
    String(index),
  );
  await expect(page.locator('.object[data-object="observer"]')).toHaveAttribute(
    "data-last-arrival",
    String(index),
  );
  const rightEdge = await page
    .locator(".wavefront.hitting")
    .evaluate((node) => {
      const ring = node as SVGCircleElement;
      return ring.cx.baseVal.value + ring.r.baseVal.value;
    });
  const observer = await page
    .locator('.object[data-object="observer"]')
    .evaluate(
      (node) => (node as SVGGElement).transform.baseVal.getItem(0).matrix.e,
    );
  expect(rightEdge).toBeCloseTo(observer, 3);
  await page.getByRole("button", { name: "下个到达", exact: true }).click();
  expect(1 / ((await time(page)) - first)).toBeCloseTo(trial.received, 8);
  await expect(page.locator(".reception-row .highlighted")).toHaveAttribute(
    "data-index",
    String(index + 1),
  );
  await page.getByRole("button", { name: "实验终点", exact: true }).click();
  expect(await time(page)).toBe(duration);
  await page.getByRole("button", { name: "下个到达", exact: true }).click();
  expect(await time(page)).toBe(first);
  expect(errors).toEqual([]);
});

test("drag, chart scrub, layer toggles, scenarios, and reload stay paused", async ({
  page,
}) => {
  await open(page);
  const handle = mover(page);
  await handle.press("End");
  expect(await time(page)).toBe(duration);
  await handle.press("Shift+ArrowLeft");
  expect(await time(page)).toBeCloseTo(0.07, 12);
  await handle.press("Home");
  const coords = await handle.evaluate((node) => {
    const matrix = (node as SVGGraphicsElement).getScreenCTM()!;
    return [0, 16 * 85 * 0.03].map((x) => {
      const point = new DOMPoint(x, 0).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
  });
  await page.mouse.move(coords[0].x, coords[0].y);
  await page.mouse.down();
  await page.mouse.move(coords[1].x, coords[1].y, { steps: 4 });
  await page.mouse.up();
  expect(await time(page)).toBeCloseTo(0.03, 3);
  await expect(read(page, "received")).toHaveText("533.33 Hz");

  // Chart scrubbing updates physical time
  const chartBox = await page.locator(".timing-chart").boundingBox();
  expect(chartBox).not.toBeNull();
  const timeBeforeChart = await time(page);
  await page.mouse.click(
    chartBox!.x + chartBox!.width * 0.72,
    chartBox!.y + chartBox!.height * 0.5,
  );
  expect(await time(page)).not.toBeCloseTo(timeBeforeChart, 4);

  // Layer toggles hide and show wavelength guide & velocity vector
  await expect(page.locator(".wavelength-guide")).toBeVisible();
  await expect(page.locator(".velocity-cue")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "波长标尺 λ₊", exact: true })
    .uncheck();
  await expect(page.locator(".wavelength-guide")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "速度矢量", exact: true }).uncheck();
  await expect(page.locator(".velocity-cue")).toHaveCount(0);

  // Explore tab loads scenario and returns to formula view
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page.locator('[data-scenario="halfMach"]').click();
  await expect(read(page, "received")).toHaveText("800.00 Hz");
  await expect(
    page.getByRole("tab", { name: "公式", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  const before = await time(page);
  const rate = page.getByRole("combobox", { name: "播放速度" });
  await rate.selectOption("0.25");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect.poll(() => time(page)).toBeGreaterThan(before);
  await page.getByRole("checkbox", { name: "显示波前", exact: true }).uncheck();
  await page.getByRole("tab", { name: "运动对照", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".wavefronts")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeVisible();
  const paused = await time(page);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await time(page)).toBe(paused);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "运动对照", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("checkbox", { name: "显示波前", exact: true }),
  ).not.toBeChecked();
  await expect(rate).toHaveValue("0.25");
  expect(await time(page)).toBe(paused);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`both views fit ${viewport.width}×${viewport.height} in both languages and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page);
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .derived-metrics, .parameter-footer, .scene-wrap, .layer-controls, .readouts, .timeline, .moments, .timing, .comparison, .model-formula, phy-math [part="formula"]',
    );
    for (const language of ["zh", "en"]) {
      if (language === "en")
        await page.getByRole("button", { name: "切换语言" }).click();
      for (const theme of ["light", "dark"]) {
        if (theme === "dark")
          await page
            .getByRole("button", { name: /切换明暗|Toggle theme/ })
            .click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const name of language === "en"
          ? ["Compare motion", "Arrivals"]
          : ["运动对照", "到达时刻"]) {
          await page.getByRole("tab", { name, exact: true }).click();
          await expect(page.locator(".model-formula .math-error")).toHaveCount(
            0,
          );
          const overflow = await keys.evaluateAll((nodes) =>
            nodes.flatMap((node) => {
              const rect = node.getBoundingClientRect();
              return rect.bottom > innerHeight + 1 ||
                rect.right > innerWidth + 1 ||
                rect.top < 0 ||
                rect.left < 0 ||
                node.scrollHeight > node.clientHeight + 1 ||
                node.scrollWidth > node.clientWidth + 1
                ? [
                    `${node.className}: ${rect.width}×${rect.height} (${node.scrollWidth}×${node.scrollHeight})`,
                  ]
                : [];
            }),
          );
          expect(overflow).toEqual([]);
          expect(await scene.boundingBox()).toEqual(bounds);
        }
        if (theme === "dark")
          await page
            .getByRole("button", { name: /切换明暗|Toggle theme/ })
            .click();
      }
    }
    const help = page.getByRole("button", {
      name: "Model & controls",
      exact: true,
    });
    await help.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Model & controls" }),
    ).toContainText("constant subsonic speed");
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  });
}

test("first visit and reload work offline with the selected role and crest", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("tab", { name: "缓存设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await open(page);
  await selectRole(page, "观察者");
  await page.getByRole("button", { name: "首个到达", exact: true }).click();
  const saved = await time(page);
  await page.reload();
  await expect(
    page
      .getByRole("radiogroup", { name: "运动物体", exact: true })
      .getByRole("radio", { name: "观察者", exact: true }),
  ).toBeChecked();
  await expect(read(page, "received")).toHaveText("500.00 Hz");
  expect(await time(page)).toBe(saved);
  await expect(page.locator(".wavefront.hitting")).toBeVisible();
});

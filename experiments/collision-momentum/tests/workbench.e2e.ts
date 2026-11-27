import { expect, test, type Page } from "@playwright/test";
import { defaults, makeTrial } from "../model/physics";

const route = "/#/experiments/collision-momentum";
const title = /^(碰撞与动量守恒|Collisions and momentum)$/;
const time = async (page: Page) =>
  Number(await page.locator("output[data-time]").getAttribute("data-time"));
const mode = (page: Page) =>
  page.getByRole("combobox", { name: "碰撞类型", exact: true });
const preset = (page: Page) =>
  page.getByRole("combobox", { name: "选择探索预设", exact: true });
const read = (page: Page, key: string) =>
  page.locator(`[data-readout="${key}"]`);

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("catalog opens both collision types and live totals match the comparison and plot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("动量守恒");
  await page.getByRole("link", { name: /碰撞与动量守恒/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const elastic = makeTrial(defaults);
  const sticky = makeTrial({ ...defaults, mode: "inelastic" });
  await expect(page.locator('[data-before="momentum"]')).toHaveText("2.75");
  await expect(page.locator('[data-after="momentum"]')).toHaveText("2.75");
  await expect(page.locator('[data-before="kinetic"]')).toHaveText("5.19");
  await expect(page.locator('[data-after="kinetic"]')).toHaveText("5.19");
  await page.getByRole("button", { name: "接触后", exact: true }).click();
  expect(await time(page)).toBe(elastic.contact);
  await expect(read(page, "left")).toHaveText("-0.30 m/s");
  await expect(read(page, "right")).toHaveText("3.20 m/s");
  await expect(page.locator(".coupling")).toHaveCount(0);
  await mode(page).selectOption("inelastic");
  expect(await time(page)).toBe(0);
  await page.getByRole("tab", { name: "动能", exact: true }).click();
  await page.getByRole("button", { name: "接触前", exact: true }).click();
  expect(await time(page)).toBe(sticky.preContact);
  await expect(page.locator(".phase")).toHaveAttribute("data-phase", "before");
  await page.getByRole("button", { name: "接触后", exact: true }).click();
  await expect(page.locator(".coupling")).toBeVisible();
  for (const cart of ["left", "right"])
    await expect(read(page, cart)).toHaveText("1.10 m/s");
  await expect(read(page, "momentum")).toHaveText("2.75 kg·m/s");
  await expect(read(page, "kinetic")).toHaveText("1.51 J");
  await expect(page.locator('[data-after="kinetic"]')).toHaveText("1.51");
  await expect(page.locator("[data-transfer]")).toHaveText(
    `${sticky.transfer!.toFixed(2)} J`,
  );
  await expect(
    page.locator('.chart-point[data-series="total"]'),
  ).toHaveAttribute("data-value", String(sticky.after!.kinetic.total));
  expect(errors).toEqual([]);
});

test("the equal-speed run has no fabricated after state or contact marker", async ({
  page,
}) => {
  await open(page);
  await mode(page).selectOption("inelastic");
  await preset(page).selectOption("tandem");
  await expect(page.locator(".phase")).toHaveAttribute(
    "data-phase",
    "noContact",
  );
  await expect(
    page.getByRole("button", { name: "接触后", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "接触前", exact: true }),
  ).toBeDisabled();
  await expect(page.locator('[data-after="momentum"]')).toHaveText("—");
  await expect(page.locator('[data-after="kinetic"]')).toHaveText("—");
  await expect(page.locator(".contact-line")).toHaveCount(0);
  await page.getByRole("button", { name: "实验终点", exact: true }).click();
  await expect(read(page, "left")).toHaveText("1.50 m/s");
  await expect(read(page, "right")).toHaveText("1.50 m/s");
  await expect(page.locator(".coupling")).toHaveCount(0);
});

test("mass and signed initial velocity are editable through sliders and the scene", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("slider", { name: "质量 mₐ", exact: true })
    .press("Home");
  await expect(
    page.getByRole("slider", { name: "质量 mₐ", exact: true }),
  ).toHaveValue("0.5");
  const handle = page.getByRole("slider", {
    name: "滑块 A 的初速度",
    exact: true,
  });
  await handle.press("Shift+ArrowLeft");
  await expect(read(page, "left")).toHaveText("1.50 m/s");
  const points = await handle.evaluate((node) => {
    const group = node as SVGGraphicsElement;
    const grip = group.querySelector(".arrow-grip") as SVGCircleElement;
    const matrix = group.getScreenCTM()!;
    return [0, -22].map((shift) => {
      const point = new DOMPoint(
        grip.cx.baseVal.value + shift,
        grip.cy.baseVal.value,
      ).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 4 });
  await page.mouse.up();
  await expect(read(page, "left")).toHaveText("-0.50 m/s");
  await expect(
    page.getByRole("slider", { name: "初速度 uₐ", exact: true }),
  ).toHaveValue("-0.5");
  await expect(page.locator('[data-before="momentum"]')).toHaveText("-1.25");
  expect(await time(page)).toBe(0);
});

test("slow playback and visibility preserve exact time and reload the paused view", async ({
  page,
}) => {
  await open(page);
  const replay = page.getByRole("slider", { name: "回看时间", exact: true });
  await replay.press("End");
  expect(await time(page)).toBe(makeTrial(defaults).duration);
  await replay.press("Home");
  expect(await time(page)).toBe(0);
  const rate = page.getByRole("combobox", { name: "播放速度", exact: true });
  await rate.selectOption("0.25");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect.poll(() => time(page)).toBeGreaterThan(0);
  await page
    .getByRole("checkbox", { name: "显示速度箭头", exact: true })
    .uncheck();
  await page.getByRole("tab", { name: "动能", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".vector")).toHaveCount(0);
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
    page.getByRole("tab", { name: "动能", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("checkbox", { name: "显示速度箭头", exact: true }),
  ).not.toBeChecked();
  await expect(rate).toHaveValue("0.25");
  expect(await time(page)).toBe(paused);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`workbench fits ${viewport.width}×${viewport.height} in both locales and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page);
    await mode(page).selectOption("inelastic");
    await page.getByRole("button", { name: "接触后", exact: true }).click();
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .footer, .scene-wrap, .readouts, .timeline, .totals, .chart-wrap, .model-formula, phy-math [part="formula"]',
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
          ? ["Momentum", "Kinetic energy"]
          : ["动量", "动能"]) {
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
    ).toContainText("frictionless");
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  });
}

test("first offline visit and reload preserve the stuck carts", async ({
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
  await mode(page).selectOption("inelastic");
  await page.getByRole("button", { name: "接触后", exact: true }).click();
  const saved = await time(page);
  await page.reload();
  await expect(mode(page)).toHaveValue("inelastic");
  await expect(page.locator(".coupling")).toBeVisible();
  expect(await time(page)).toBe(saved);
});

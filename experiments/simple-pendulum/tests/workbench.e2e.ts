import { expect, test, type Page } from "@playwright/test";
import { defaults, makePendulum, presets, radians } from "../model/physics";

const route = "/#/experiments/simple-pendulum";
const title = /^(单摆|Simple pendulum)$/;
const time = async (page: Page) =>
  Number(await page.locator("[data-time]").getAttribute("data-time"));
const bob = (page: Page) =>
  page.getByRole("slider", { name: "摆球释放角", exact: true });

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("catalog entry compares the small-angle and nonlinear return on the same clock", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("小角近似");
  await page.getByRole("link", { name: /单摆/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const preset = page.getByRole("combobox", { name: "选择探索预设" });
  const increase = page.locator('[data-period="increase"]');
  await preset.selectOption("small");
  await expect(increase).toHaveText("+0.19%");
  await preset.selectOption("large");
  const model = makePendulum(presets.large);
  await expect(increase).toHaveText(
    `+${((model.ratio - 1) * 100).toFixed(2)}%`,
  );
  await expect(page.locator('[data-series="actual"]')).toHaveAttribute(
    "data-value",
    String(model.ratio),
  );
  await page.getByRole("tab", { name: "摆角", exact: true }).click();
  await page.getByRole("button", { name: "小角近似回摆" }).click();
  expect(await time(page)).toBe(model.approximate);
  const { angle, angleLinear } = model.at(model.approximate);
  expect(Math.abs((angleLinear - angle) / radians)).toBeGreaterThan(40);
  await expect(bob(page)).toHaveAttribute("data-angle", String(angle));
  await expect(page.locator(".linear-model")).toHaveAttribute(
    "data-angle",
    String(angleLinear),
  );
  await expect(page.locator('[data-series="actual"]')).toHaveAttribute(
    "data-value",
    String(angle / radians),
  );
  await page.getByRole("button", { name: "非线性回摆" }).click();
  expect(await time(page)).toBe(model.period);
  await expect(page.locator('[data-readout="actual"]')).toHaveText("120.00 °");
});

test("the bob can be dragged or adjusted by keyboard, including the zero-angle limit", async ({
  page,
}) => {
  await open(page);
  const handle = bob(page);
  await handle.press("Home");
  await expect(page.locator('[data-period="actual"]')).toHaveText("—");
  await expect(page.locator(".model-formula")).toContainText("摆球静止");
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("slider", { name: "回看时间" })).toBeDisabled();
  await handle.press("Shift+ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "-10");
  const reference = await page.locator(".motion-scene").evaluate((node) => {
    const svg = node as SVGSVGElement;
    const matrix = svg.getScreenCTM()!;
    const ball = svg.querySelector("circle.bob") as SVGCircleElement;
    const pivot = svg.querySelector("circle.pivot") as SVGCircleElement;
    const radius = Math.hypot(
      ball.cx.baseVal.value - pivot.cx.baseVal.value,
      ball.cy.baseVal.value - pivot.cy.baseVal.value,
    );
    const coordinate = (x: number, y: number) => {
      const point = new DOMPoint(x, y).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    };
    return {
      start: coordinate(ball.cx.baseVal.value, ball.cy.baseVal.value),
      end: coordinate(pivot.cx.baseVal.value + radius, pivot.cy.baseVal.value),
    };
  });
  await page.mouse.move(reference.start.x, reference.start.y);
  await page.mouse.down();
  await page.mouse.move(reference.end.x, reference.end.y, { steps: 8 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "90");
  expect(await time(page)).toBe(0);
  await expect(
    page.getByRole("button", { name: "播放", exact: true }),
  ).toBeEnabled();
  const help = page.getByRole("button", { name: "模型与操作" });
  await help.press("Enter");
  await expect(page.getByRole("dialog", { name: "模型与操作" })).toContainText(
    "刚性杆",
  );
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
});

test("replay updates energy, chart and scene and preferences reload paused", async ({
  page,
}) => {
  await open(page);
  const model = makePendulum(defaults);
  const cursor = page.getByRole("slider", { name: "回看时间" });
  await cursor.press("End");
  expect(await time(page)).toBe(model.duration);
  await cursor.press("Home");
  await cursor.press("ArrowRight");
  expect(await time(page)).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "能量" }).click();
  await page.getByRole("button", { name: "首次过最低点" }).click();
  expect(await time(page)).toBe(model.period! / 4);
  const sample = model.at(model.period! / 4);
  await expect(page.locator('[data-series="kinetic"]')).toHaveAttribute(
    "data-value",
    String(sample.kinetic),
  );
  await expect(page.locator('[data-series="potential"]')).toHaveAttribute(
    "data-value",
    String(sample.potential),
  );
  await expect(bob(page)).toHaveAttribute("data-angle", String(sample.angle));
  const rate = page.getByRole("combobox", { name: "播放速度" });
  await rate.selectOption("0.25");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect.poll(() => time(page)).toBeGreaterThan(model.period! / 4);
  await page.getByRole("checkbox", { name: "显示小角近似摆球" }).uncheck();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".linear-model")).toHaveCount(0);
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
  await expect(page.getByRole("tab", { name: "能量" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("checkbox", { name: "显示小角近似摆球" }),
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
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    await open(page);
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .periods, .source-footer, .scene-wrap, .timeline, .chart-wrap, .model-formula, phy-math [part="formula"], .readouts, .moments',
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
          ? ["Period", "Angles", "Energy"]
          : ["周期", "摆角", "能量"]) {
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
                    `${node.className}: ${rect.width}×${rect.height}, ${node.scrollWidth}×${node.scrollHeight} (${rect.bottom}/${innerHeight})`,
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
  });
}

test("opens offline before its first visit and retains the selected release", async ({
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
  await page
    .getByRole("combobox", { name: "选择探索预设" })
    .selectOption("extreme");
  await page.getByRole("button", { name: "非线性回摆" }).click();
  const paused = await time(page);
  await page.reload();
  await expect(bob(page)).toHaveAttribute("aria-valuenow", "165");
  expect(await time(page)).toBe(paused);
});

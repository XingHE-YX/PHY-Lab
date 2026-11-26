import { expect, test, type Page } from "@playwright/test";
import { at, defaults, derive, envelope } from "../model/physics";

const route = "/#/experiments/vibration-beats";
const heading = /^(振动合成与拍|Superposition and beats)$/;

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function time(page: Page) {
  return Number(await page.locator("[data-time]").getAttribute("data-time"));
}

test("the catalog shows theme-aware thumbnails and opens a synchronized, replayable model", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("拍频");
  const card = page.getByRole("link", { name: /振动合成与拍/ });
  const thumb = card.locator("img.thumb");
  await expect(thumb).toHaveAttribute("src", /thumbnail-light\.svg$/);
  await page.getByRole("button", { name: /切换明暗|Toggle theme/ }).click();
  await expect(thumb).toHaveAttribute("src", /thumbnail-dark\.svg$/);
  await page.getByRole("button", { name: /切换明暗|Toggle theme/ }).click();
  await card.click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.locator('[data-derived="beat"]')).toHaveText("5.00 s");
  await expect(page.locator('[data-derived="max"]')).toHaveText("6.00 cm");
  await expect(page.locator('[data-derived="min"]')).toHaveText("0.00 cm");

  const timeline = page.getByRole("slider", { name: "回看时间" });
  await timeline.press("End");
  expect(await time(page)).toBeCloseTo(derive(defaults).duration, 10);
  await timeline.press("Home");
  await timeline.press("ArrowRight");
  expect(await time(page)).toBeGreaterThan(0);

  await page.getByRole("tab", { name: "振幅包络" }).click();
  const plot = page.locator(".time-chart");
  await expect(plot.locator(".trace.carrier")).toHaveCount(1);
  const positions = await plot.evaluate((element) => {
    const matrix = (element as SVGSVGElement).getScreenCTM()!;
    return [40 + (326 - 40) * 0.1, 40 + (326 - 40) * 0.35].map((x) => {
      const point = new DOMPoint(x, 80).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
  });
  await page.mouse.move(positions[0].x, positions[0].y);
  await page.mouse.down();
  await page.mouse.move(positions[1].x, positions[1].y, { steps: 4 });
  await page.mouse.up();
  expect(await time(page)).toBeCloseTo(3.5, 1);
  const current = await time(page);
  const expected = at(defaults, current);
  const track = page.locator('[data-track="sum"]');
  const cursor = plot.locator('[data-series="sum"]');
  await expect(track).toHaveAttribute("data-value", String(expected.sumX));
  await expect(cursor).toHaveAttribute("data-value", String(expected.sumX));
  await expect(plot.locator('[data-series="bound"]').first()).toHaveAttribute(
    "data-value",
    String(envelope(defaults, current)),
  );
  await expect(page.locator('[data-readout="sum"]')).toHaveText(
    `${expected.sumX.toFixed(2)} cm`,
  );
  expect(errors).toEqual([]);
});

test("exploration tasks, moments and phasor phase handle cover all physical regimes", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "下一次反相" }).click();
  await expect(page.locator('[data-readout="bound"]')).toHaveText("0.00 cm");
  await page.getByRole("button", { name: "正交 90°" }).click();
  await expect(page.locator('[data-readout="bound"]')).toHaveText(
    `${Math.hypot(3, 3).toFixed(2)} cm`,
  );

  // Open Explore tab, return via observation tab, then load presets
  await page.getByRole("tab", { name: "探索" }).click();
  await expect(page.locator(".task-grid")).toBeVisible();
  await page.getByRole("tab", { name: "时域波形" }).click();
  await expect(page.locator(".time-chart")).toBeVisible();

  await page.getByRole("tab", { name: "探索" }).click();
  await page.locator('button[data-preset="unequal"]').click();
  expect(await time(page)).toBe(0);
  await expect(page.locator(".time-chart")).toBeVisible();
  await page.getByRole("button", { name: "下一次反相" }).click();
  await expect(page.locator('[data-readout="bound"]')).toHaveText("1.50 cm");

  await page.getByRole("tab", { name: "探索" }).click();
  await page.locator('button[data-preset="locked"]').click();
  await expect(page.locator('[data-derived="beat"]')).toHaveText("—");
  await expect(page.getByRole("button", { name: "下一次反相" })).toBeDisabled();
  await expect(page.locator(".model-formula")).toContainText("包络恒定");

  // Keyboard phase adjustment on the Z₂ phasor handle
  const phaseHandle = page.getByRole("slider", {
    name: "调节振源 2 初相位 φ₂",
  });
  await phaseHandle.focus();
  await phaseHandle.press("ArrowLeft");
  await expect(page.locator("[data-phase-summary]")).toContainText("175.0°");

  await page.getByRole("slider", { name: "振幅 A₂" }).press("Home");
  await expect(page.locator(".model-formula")).toContainText("不产生干涉拍");
  await expect(page.locator('[data-readout="sum"]')).toHaveText("3.00 cm");

  const help = page.getByRole("button", { name: "模型与操作" });
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "模型与操作" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "模型与操作" })).toBeHidden();
  await expect(help).toBeFocused();
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`three-column workbench fits ${viewport.width}×${viewport.height} in both locales and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    await open(page);
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameter-footer, .layer-controls, .timeline, .chart-wrap, .model-formula, phy-math [part="formula"], .readouts, .parameter, .moments',
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
        await page
          .getByRole("tab", {
            name: language === "en" ? "Envelope" : "振幅包络",
          })
          .click();
        await expect(page.locator(".model-formula .math-error")).toHaveCount(0);
        const overflow = await keys.evaluateAll((nodes) =>
          nodes.flatMap((node) => {
            const rect = node.getBoundingClientRect();
            return rect.bottom > innerHeight + 1 ||
              rect.right > innerWidth + 1 ||
              rect.top < 0 ||
              rect.left < 0 ||
              node.scrollHeight > node.clientHeight + 1 ||
              node.scrollWidth > node.clientWidth + 1
              ? [`${node.className}: ${rect.bottom}/${innerHeight}`]
              : [];
          }),
        );
        expect(overflow).toEqual([]);
        expect(await scene.boundingBox()).toEqual(bounds);
        if (theme === "dark")
          await page
            .getByRole("button", { name: /切换明暗|Toggle theme/ })
            .click();
      }
    }
  });
}

test("appearance and layers preserve playback; hiding and reloading restore a paused session", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("combobox", { name: "播放速度" }).selectOption("0.25");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect.poll(() => time(page)).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "振幅包络" }).click();
  await page.getByRole("checkbox", { name: "旋转矢量" }).uncheck();
  await expect(page.locator(".phasors")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
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
  await expect(page.getByRole("tab", { name: "振幅包络" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("checkbox", { name: "旋转矢量" }),
  ).not.toBeChecked();
  await expect(page.getByRole("combobox", { name: "播放速度" })).toHaveValue(
    "0.25",
  );
  expect(await time(page)).toBe(paused);
});

test("the production cache opens the experiment before its first visit while offline", async ({
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
  await page.getByRole("button", { name: "下一次反相" }).click();
  await expect(page.locator('[data-readout="bound"]')).toHaveText("0.00 cm");
  const paused = await time(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  expect(await time(page)).toBe(paused);
});

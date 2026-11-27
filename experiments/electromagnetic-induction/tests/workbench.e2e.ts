import { expect, test, type Page } from "@playwright/test";
import {
  defaults,
  demoPath,
  demonstration,
  sampleAt,
  stepSeconds,
} from "../model/physics";

const route = "/#/experiments/electromagnetic-induction";
const heading = /^(电磁感应与楞次定律|Electromagnetic induction & Lenz’s law)$/;
const magnet = (page: Page) =>
  page.getByRole("slider", { name: "磁铁位置", exact: true });
const direction = (page: Page) => page.locator(".direction output");
const cursor = async (page: Page) =>
  Number(await page.locator("[data-cursor]").getAttribute("data-cursor"));
const demo = (page: Page) =>
  page.getByRole("button", { name: "演示：靠近、停留、远离", exact: true });

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

test("drag toward, hold without releasing, then drag away and release", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("楞次定律");
  await page.getByRole("link", { name: /电磁感应与楞次定律/ }).click();
  await expect(magnet(page)).toBeVisible();
  const points = await magnet(page).evaluate((node) => {
    const magnet = node as SVGGraphicsElement;
    const box = magnet.getBBox();
    const matrix = magnet.getScreenCTM()!;
    return [0, 190, 60].map((delta) => {
      const point = new DOMPoint(
        box.x + box.width / 2 + delta,
        box.y + box.height / 2,
      ).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
  });
  const [start, near, away] = points;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(near.x, near.y, { steps: 2 });
  await expect(direction(page)).toHaveAttribute(
    "data-direction",
    "counterclockwise",
  );
  await expect(direction(page)).toHaveAttribute("data-direction", "noCurrent");
  await expect(page.locator('[data-readout="emf"]')).toHaveText("0.000 mV");
  await expect(page.locator('[data-readout="flux"]')).not.toHaveText(
    "0.000 μWb",
  );
  await expect(page.locator("[data-cursor]")).toBeVisible();
  const firstPause = await cursor(page);
  await expect.poll(() => cursor(page)).toBeGreaterThan(firstPause);
  await page.mouse.move(away.x, away.y, { steps: 2 });
  await expect(direction(page)).toHaveAttribute("data-direction", "clockwise");
  await page.mouse.up();
  await expect(direction(page)).toHaveAttribute("data-direction", "noCurrent");
  const final = await cursor(page);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await cursor(page)).toBe(final);
  expect(errors).toEqual([]);
});

test("demo compares equal-distance approach and retreat with the same graph cursor and flips with pole", async ({
  page,
}) => {
  await open(page);
  const path = demoPath();
  for (const [label, timestamp] of [
    ["靠近", demonstration.approach],
    ["停留", demonstration.hold],
    ["远离", demonstration.retreat],
  ] as const) {
    if (label === "靠近") await demo(page).click();
    await page.getByRole("button", { name: label, exact: true }).click();
    const expected = sampleAt(
      defaults,
      path,
      Math.round(timestamp / stepSeconds),
    );
    await expect(direction(page)).toHaveAttribute(
      "data-direction",
      expected.direction,
    );
    await expect(page.locator(".current-inset")).toHaveAttribute(
      "data-direction",
      expected.direction,
    );
    await expect(page.locator(".chart-point")).toHaveAttribute(
      "data-value",
      String(expected.emf * 1e3),
    );
    await expect(magnet(page)).toHaveAttribute(
      "data-position",
      String(expected.distance),
    );
  }
  await page
    .getByRole("combobox", { name: "朝向线圈的磁极" })
    .selectOption("-1");
  expect(await cursor(page)).toBe(0);
  await demo(page).click();
  await page.getByRole("button", { name: "靠近", exact: true }).click();
  await expect(direction(page)).toHaveAttribute("data-direction", "clockwise");
  await page.getByRole("tab", { name: "电流", exact: true }).click();
  const expected = sampleAt(
    { ...defaults, polarity: -1 },
    path,
    Math.round(demonstration.approach / stepSeconds),
  );
  await expect(page.locator(".chart-point")).toHaveAttribute(
    "data-value",
    String(expected.current * 1e3),
  );
});

test("keyboard controls record motion; slow replay, visibility and reload preserve the recorded physics", async ({
  page,
}) => {
  await open(page);
  await magnet(page).press("Shift+ArrowRight");
  await expect(direction(page)).toHaveAttribute(
    "data-direction",
    "counterclockwise",
  );
  await expect(magnet(page)).toHaveAttribute("aria-valuenow", "18.0");
  await expect(direction(page)).toHaveAttribute("data-direction", "noCurrent");
  const last = await cursor(page);
  const timeline = page.getByRole("slider", { name: "回看时间" });
  await timeline.press("Home");
  expect(await cursor(page)).toBe(0);
  await timeline.press("End");
  expect(await cursor(page)).toBe(last);
  await page.getByRole("combobox", { name: "回放速度" }).selectOption("0.25");
  await page.getByRole("button", { name: "回放", exact: true }).click();
  await expect.poll(() => cursor(page)).toBeGreaterThan(0);
  await page.getByRole("checkbox", { name: "显示轴向磁场" }).uncheck();
  await page.getByRole("tab", { name: "磁通量", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".field-guides")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "回放", exact: true }),
  ).toBeVisible();
  const stopped = await cursor(page);
  const sampleBefore = await page
    .locator(".chart-point")
    .getAttribute("data-value");
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await cursor(page)).toBe(stopped);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "磁通量", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("checkbox", { name: "显示轴向磁场" }),
  ).not.toBeChecked();
  await expect(page.getByRole("combobox", { name: "回放速度" })).toHaveValue(
    "0.25",
  );
  expect(await cursor(page)).toBe(stopped);
  await expect(page.locator(".chart-point")).toHaveAttribute(
    "data-value",
    sampleBefore!,
  );
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`one screen at ${viewport.width}×${viewport.height} in both languages and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page);
    await demo(page).click();
    await page.getByRole("button", { name: "靠近", exact: true }).click();
    const scene = page.locator(".scene-wrap");
    const frame = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .position, .source-footer, .scene-wrap, .timeline, .chart-wrap, .model-formula, phy-math [part="formula"], .readouts, .direction, .moments',
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
          ? ["Flux", "EMF", "Current"]
          : ["磁通量", "电动势", "电流"]) {
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
          expect(await scene.boundingBox()).toEqual(frame);
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
    ).toContainText("self-inductance");
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  });
}

test("first visit works offline and the stationary demo marker restores offline", async ({
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
  await demo(page).click();
  await page.getByRole("button", { name: "停留", exact: true }).click();
  await expect(direction(page)).toHaveAttribute("data-direction", "noCurrent");
  const saved = await cursor(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "停留", exact: true }),
  ).toBeVisible();
  expect(await cursor(page)).toBe(saved);
  await expect(page.locator('[data-readout="emf"]')).toHaveText("0.000 mV");
});

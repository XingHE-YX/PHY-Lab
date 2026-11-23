import { test, expect, type Page } from "@playwright/test";
import type { Snapshot } from "../../experiments/charged-particle-magnetic-field/model/snapshot";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import { settingsPage } from "./helpers/settings";

const id = "charged-particle-magnetic-field";
const title = "带电粒子在磁场中的运动";
const storageKey = `phy-lab:experiment:${id}:state:1`;

async function open(page: Page) {
  await page.goto(`/#/experiments/${id}`);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}

async function state(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate(
      (node) => (node as ExperimentPage).instance!.snapshot() as Snapshot,
    );
}

async function slider(page: Page, name: string, value: string) {
  await page
    .getByRole("slider", { name, exact: true })
    .evaluate((node, value) => {
      (node as HTMLInputElement).value = value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}

async function reading(page: Page, label: string) {
  return page
    .locator(".readings > div")
    .filter({ hasText: label })
    .locator("dd")
    .innerText();
}

test("launch handles accept pointer and keyboard; replay keeps vectors, time and energy synchronized", async ({
  page,
}) => {
  await open(page);
  const aim = page.getByRole("button", { name: "初速度拖拽手柄", exact: true });
  const point = await aim.evaluate((node) => {
    const circle = node as SVGCircleElement;
    const transform = circle.getScreenCTM()!;
    const x = circle.cx.baseVal.value;
    const y = circle.cy.baseVal.value;
    const origin = new DOMPoint(x, y).matrixTransform(transform);
    const target = new DOMPoint(x, y - 85).matrixTransform(transform);
    return { x: origin.x, y: origin.y, targetX: target.x, targetY: target.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.targetX, point.targetY, { steps: 5 });
  await page.mouse.up();
  expect(await state(page)).toMatchObject({
    params: { speed: 174, angle: 90 },
    launched: false,
    progress: 0,
  });
  await aim.press("Shift+ArrowUp");
  expect((await state(page)).params.speed).toBe(179);
  await aim.press("Enter");
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "¼ 周期", exact: true }).click();
  expect((await state(page)).progress).toBe(0.25);
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  const quarterX = Number(await page.locator(".particle").getAttribute("cx"));
  const quarterY = Number(await page.locator(".particle").getAttribute("cy"));
  expect(quarterX).toBeGreaterThan(264);
  expect(quarterY).toBeLessThan(164);
  const force = page.locator(".vector.force line");
  expect(Number(await force.getAttribute("y2"))).toBeGreaterThan(quarterY);
  const energy = await reading(page, "动能");
  await page.getByRole("tab", { name: "动能", exact: true }).click();
  const initialMarker = await page
    .locator(".chart-point.energy")
    .getAttribute("cy");
  await page
    .getByRole("slider", { name: "回看时间", exact: true })
    .press("End");
  expect((await state(page)).progress).toBe(2);
  await expect(page.locator(".cursor")).toHaveAttribute("x1", "261");
  await expect(page.locator(".chart-point.energy")).toHaveAttribute(
    "cy",
    initialMarker!,
  );
  expect(await reading(page, "动能")).toBe(energy);
  expect(
    Number(await page.locator(".particle").getAttribute("cx")),
  ).toBeCloseTo(264, 5);
  await expect(
    page.getByRole("button", { name: "重播", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "回到发射位", exact: true }).click();
  const scene = await page.locator(".scene-wrap").boundingBox();
  await page.getByLabel("轨迹", { exact: true }).uncheck();
  await expect(page.locator(".predicted")).toHaveCount(0);
  expect(await page.locator(".scene-wrap").boundingBox()).toEqual(scene);
});

test("degenerate motion disables circular readouts and the animation stops when hidden or off the page", async ({
  page,
}) => {
  await open(page);
  await slider(page, "磁场 Bz", "-100");
  await expect(page.locator(".scene")).toContainText("入屏");
  await slider(page, "电荷", "0");
  expect(await reading(page, "轨道半径")).toBe("—");
  expect(await reading(page, "周期")).toBe("—");
  await page.getByRole("button", { name: "发射", exact: true }).click();
  await page.getByRole("button", { name: "中点", exact: true }).click();
  await expect(page.getByRole("slider", { name: "回看时间" })).toHaveAttribute(
    "aria-valuetext",
    "1 μs",
  );
  await expect(page.locator(".vector.force")).toHaveCount(0);
  expect(await reading(page, "磁力大小")).toBe("0 fN");
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect
    .poll(async () => (await state(page)).progress)
    .toBeGreaterThan(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  const hidden = await state(page);
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    Reflect.deleteProperty(document, "hidden");
  });
  expect(await state(page)).toEqual(hidden);
  await slider(page, "初速度大小", "0");
  await page.getByRole("button", { name: "发射", exact: true }).click();
  await expect(page.getByText("保持静止", { exact: true })).toBeVisible();
  expect(await reading(page, "动能")).toBe("0 eV");
  await page.getByRole("link", { name: "返回控制台", exact: true }).click();
  await expect(page.locator(".flight-control")).toHaveCount(0);
  await open(page);
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  expect((await state(page)).params.speed).toBe(0);
});

test("first visit after caching works offline and reload restores an isolated paused flight", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "电磁学", exact: true }).click();
  const search = page.getByRole("searchbox");
  await search.fill("洛伦兹力");
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await settingsPage(page, "cache");
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await card.click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await slider(page, "电荷", "-2");
  await page.getByRole("button", { name: "发射", exact: true }).click();
  await page.getByRole("button", { name: "½ 周期", exact: true }).click();
  await page.getByRole("tab", { name: "动能", exact: true }).click();
  await page.getByLabel("矢量", { exact: true }).uncheck();
  await page
    .getByRole("combobox", { name: "慢放倍率", exact: true })
    .selectOption("0.25");
  const snapshot = await state(page);
  expect(snapshot).toMatchObject({
    progress: 0.5,
    rate: 0.25,
    view: "energy",
    vectors: false,
    params: { charge: -2 },
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  expect(await state(page)).toEqual(snapshot);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      storageKey,
    ),
  ).toEqual(snapshot);
});

for (const [width, height] of [
  [1280, 720],
  [1440, 900],
]) {
  for (const locale of ["zh-CN", "en"]) {
    for (const theme of ["light", "dark"]) {
      test(`single-screen workbench: ${width}×${height}, ${locale}, ${theme}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({
          reducedMotion: "reduce",
          colorScheme: "light",
        });
        await open(page);
        if (theme === "dark")
          await page
            .getByRole("button", { name: "切换明暗", exact: true })
            .click();
        if (locale === "en")
          await page
            .getByRole("button", { name: "切换语言", exact: true })
            .click();
        const help = page.getByRole("button", {
          name: /^(模型说明|Model notes)$/,
        });
        await help.click();
        await expect(
          page.getByRole("dialog", { name: /^(模型说明|Model notes)$/ }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(help).toBeFocused();
        await page.getByRole("button", { name: /^(发射|Launch)$/ }).click();
        await page.getByRole("button", { name: /^(¼ 周期|¼ period)$/ }).click();
        const viewport = await page
          .locator("phy-experiment-page")
          .evaluate((node) => {
            const workbench = (node as ExperimentPage).instance!.element;
            const root = workbench.shadowRoot!;
            const selectors = [
              ".parameter-list",
              ".layer-control",
              ".scene-wrap",
              ".moments",
              ".readings",
              ".formula",
              ".plot",
            ];
            return {
              scroll: workbench.scrollHeight - workbench.clientHeight,
              boxes: selectors.map((selector) => {
                const { x, y, right, bottom, width, height } = root
                  .querySelector(selector)!
                  .getBoundingClientRect();
                return { x, y, right, bottom, width, height };
              }),
            };
          });
        expect(viewport.scroll).toBeLessThanOrEqual(1);
        for (const box of viewport.boxes) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(width);
          expect(box.bottom).toBeLessThanOrEqual(height);
          expect(box.width).toBeGreaterThan(150);
          expect(box.height).toBeGreaterThan(24);
        }
        if (
          (width === 1280 && locale === "en" && theme === "dark") ||
          (width === 1440 && locale === "zh-CN" && theme === "light")
        )
          await page.screenshot({
            path: info.outputPath("magnetic-workbench.png"),
            animations: "disabled",
          });
      });
    }
  }
}

import { settingsPage } from "./helpers/settings";
import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/spring-oscillator/experiment";
import {
  stateAt,
  TAU,
} from "../../experiments/spring-oscillator/model/physics";

async function open(page: Page) {
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: number) {
  await page.getByRole("slider", { name, exact: true }).evaluate((node, v) => {
    const input = node as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function geometry(page: Page) {
  return page.locator(".scene").evaluate((node) => {
    const number = (selector: string, attribute: string) =>
      Number(node.querySelector(selector)!.getAttribute(attribute));
    return {
      viewBox: node.getAttribute("viewBox"),
      ox: number(".reference-circle", "cx"),
      oy: number(".reference-circle", "cy"),
      radius: number(".reference-circle", "r"),
      x: number(".mass-surface", "cx"),
      y: number(".mass-surface", "cy"),
      mx: number(".phase-tip", "cx"),
      my: number(".phase-tip", "cy"),
      x1: number(".phase-projection", "x1"),
      x2: number(".phase-projection", "x2"),
      y1: number(".phase-projection", "y1"),
      y2: number(".phase-projection", "y2"),
    };
  });
}

test("phasor visibility preserves time, playback, framing and saved preferences", async ({
  page,
}) => {
  await open(page);
  const toggle = page.getByRole("switch", { name: "旋转矢量", exact: true });
  await expect(toggle).not.toBeChecked();
  await page.getByRole("button", { name: "动能 = 势能", exact: true }).click();
  const before = await snapshot(page);
  const frame = await geometry(page);
  await toggle.check();
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  expect(await geometry(page)).toEqual(frame);
  expect((await snapshot(page)).time).toBe(before.time);
  for (const mode of ["看变化", "看能量", "看运动"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    await expect(toggle).toBeChecked();
    expect((await snapshot(page)).time).toBe(before.time);
  }
  await page.reload();
  await open(page);
  await expect(toggle).toBeChecked();
  expect((await snapshot(page)).time).toBe(before.time);
  await toggle.uncheck();
  await expect(page.locator(".phase-tip")).toHaveAttribute("tabindex", "-1");
  expect(await geometry(page)).toEqual(frame);
  expect((await snapshot(page)).params).toEqual(before.params);
  await page.getByRole("button", { name: "▷ 播放", exact: true }).click();
  await toggle.check();
  await expect(
    page.getByRole("button", { name: "Ⅱ 暂停", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await snapshot(page)).time)
    .toBeGreaterThan(before.time + 0.1);
  await toggle.uncheck();
  await expect(
    page.getByRole("button", { name: "Ⅱ 暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  await page.reload();
  await open(page);
  await expect(toggle).not.toBeChecked();
});

test("reference-circle projection matches the mass throughout all quadrants and parameter changes", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("switch", { name: "旋转矢量" }).check();
  for (const [amplitude, mass, stiffness, phi] of [
    [0.01, 0.2, 50, 0.8],
    [0.3, 1, 10, 0],
    [0.8, 5, 1, 5.7],
  ]) {
    await range(page, "振幅", amplitude);
    await range(page, "质量", mass);
    await range(page, "劲度系数", stiffness);
    await range(page, "初相位", phi);
    const saved = await snapshot(page);
    const period = stateAt(saved.params, 0).period;
    for (const fraction of [0, 0.125, 0.25, 0.5, 0.75, 1.125]) {
      await range(page, "拖动时间游标", fraction * period);
      const current = await snapshot(page);
      const g = await geometry(page);
      const angle =
        Math.sqrt(saved.params.k / saved.params.m) * current.time +
        saved.params.phi;
      expect(g.mx).toBe(g.x);
      expect(g.x1).toBe(g.x2);
      expect(g.x2).toBe(g.x);
      expect(g.y1).toBe(g.my);
      expect(g.y2).toBe(g.y);
      expect(g.ox + g.radius * Math.cos(angle)).toBeCloseTo(g.mx, 8);
      expect(g.oy - g.radius * Math.sin(angle)).toBeCloseTo(g.my, 8);
      expect(Math.hypot(g.mx - g.ox, g.my - g.oy)).toBeCloseTo(g.radius, 8);
      expect(g.oy - g.radius).toBeGreaterThanOrEqual(0);
      expect(g.oy + g.radius).toBeLessThanOrEqual(560);
    }
  }
  await range(page, "振幅", 0);
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".phase-tip")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".scene-scale")).toHaveText("小球处于静止状态");
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
  await expect(page.getByRole("switch", { name: "旋转矢量" })).toBeChecked();
  await range(page, "振幅", 0.3);
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
});

test("vector dragging and keyboard scrub the shared clock without changing initial conditions", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("switch", { name: "旋转矢量" }).check();
  await page.getByRole("button", { name: "动能 = 势能", exact: true }).click();
  const before = await snapshot(page);
  const points = await page.locator(".scene").evaluate((node) => {
    const svg = node as SVGSVGElement;
    const matrix = svg.getScreenCTM()!;
    const circle = svg.querySelector<SVGCircleElement>(".reference-circle")!;
    const tip = svg.querySelector<SVGCircleElement>(".phase-tip")!;
    const start = new DOMPoint(
      tip.cx.baseVal.value,
      tip.cy.baseVal.value,
    ).matrixTransform(matrix);
    const target = new DOMPoint(
      circle.cx.baseVal.value - circle.r.baseVal.value / Math.sqrt(2),
      circle.cy.baseVal.value - circle.r.baseVal.value / Math.sqrt(2),
    ).matrixTransform(matrix);
    return {
      start: { x: start.x, y: start.y },
      target: { x: target.x, y: target.y },
    };
  });
  await page.mouse.move(points.start.x, points.start.y);
  await page.mouse.down();
  await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "▷ 播放", exact: true }),
  ).toBeVisible();
  const dragged = await snapshot(page);
  expect(dragged.params).toEqual(before.params);
  expect(dragged.time).toBeCloseTo(
    (3 * Math.PI) / 4 / Math.sqrt(before.params.k / before.params.m),
    2,
  );
  expect((await geometry(page)).x).toBeLessThan((await geometry(page)).ox);
  const handle = page.getByRole("slider", {
    name: "拖动矢量端点，调整时间",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "140");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "155");
  await range(
    page,
    "拖动时间游标",
    (1.25 * TAU) / Math.sqrt(before.params.k / before.params.m),
  );
  await handle.focus();
  await page.keyboard.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "0");
  expect((await snapshot(page)).time).toBeCloseTo(
    TAU / Math.sqrt(before.params.k / before.params.m),
    6,
  );
  expect((await snapshot(page)).params).toEqual(before.params);
});

test("desktop phasor scene remains readable in both themes and offline", async ({
  page,
  context,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await open(page);
  await page.getByRole("switch", { name: "旋转矢量" }).check();
  await range(page, "振幅", 0.6);
  await page.getByRole("button", { name: "动能 = 势能", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("phasor-light.png") });
  await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await open(page);
  await page.screenshot({ path: testInfo.outputPath("phasor-dark.png") });
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const circle = await page.locator(".reference-circle").boundingBox();
    const scene = await page.locator(".scene").boundingBox();
    expect(circle!.x).toBeGreaterThanOrEqual(scene!.x);
    expect(circle!.y).toBeGreaterThanOrEqual(scene!.y);
    expect(circle!.x + circle!.width).toBeLessThanOrEqual(
      scene!.x + scene!.width,
    );
    expect(circle!.y + circle!.height).toBeLessThanOrEqual(
      scene!.y + scene!.height,
    );
    await expect(page.getByRole("switch", { name: "旋转矢量" })).toBeVisible();
  }
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Rotating vector" }),
  ).toBeChecked();
  await settingsPage(page, "cache");
  await expect(
    page.getByText("✓ Ready for offline use", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Rotating vector" }),
  ).toBeChecked();
  await page.getByRole("switch", { name: "Rotating vector" }).uncheck();
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

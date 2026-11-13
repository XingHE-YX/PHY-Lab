import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/lc-oscillator/model/snapshot";
import {
  at,
  derived,
  momentTime,
} from "../../experiments/lc-oscillator/model/physics";
const key = "phy-lab:experiment:lc-oscillator:state:1";
async function open(page: Page) {
  await page.goto("/#/experiments/lc-oscillator");
  await expect(
    page.getByRole("heading", { name: "LC 电磁振荡", exact: true }),
  ).toBeVisible();
}
async function saved(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: number) {
  await page
    .getByRole("slider", { name, exact: true })
    .evaluate((node, value) => {
      (node as HTMLInputElement).value = String(value);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}
test("LC charging, switch, synchronized current and key moments obey one physical clock", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("textbox").fill("LC");
  await page.getByRole("link", { name: /LC 电磁振荡/ }).click();
  expect((await saved(page)).closed).toBe(false);
  const switchControl = page.locator(".circuit-switch");
  await switchControl.focus();
  await page.keyboard.press("Enter");
  expect((await saved(page)).closed).toBe(true);
  expect((await saved(page)).time).toBe(0);
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  const snapshot = await saved(page),
    s = at(snapshot.params, snapshot.time);
  expect(snapshot.time).toBe(momentTime(snapshot.params, 1));
  await expect(page.locator(".circuit-scene")).toHaveAttribute(
    "data-current",
    String(s.current),
  );
  await expect(page.locator(".circuit-scene")).toHaveAttribute(
    "data-q",
    String(s.q),
  );
  await expect(page.locator('[data-readout="current"]')).toContainText(
    (s.current * 1e3).toFixed(2),
  );
  await expect(page.locator('.chart-point[data-metric="q"]')).toHaveAttribute(
    "data-value",
    String(s.q * 1e6),
  );
  await expect(
    page.locator('.chart-point[data-metric="current"]'),
  ).toHaveAttribute("data-value", String(s.current * 1e3));
  await expect(page.locator(".current-arrows")).toHaveAttribute(
    "data-direction",
    "1",
  );
  await expect(page.locator(".electric-field")).toHaveCount(0);
  await page.getByRole("button", { name: /反向充电/ }).click();
  await expect(page.locator(".capacitor")).toHaveAttribute(
    "data-polarity",
    "-1",
  );
  await expect(page.locator(".current-arrows")).toHaveCount(0);
  await page.getByRole("button", { name: /电流反向/ }).click();
  await expect(page.locator(".current-arrows")).toHaveAttribute(
    "data-direction",
    "-1",
  );
  await page.getByRole("button", { name: /▷ 继续/ }).click();
  await expect
    .poll(async () => (await saved(page)).time)
    .toBeGreaterThan(momentTime(snapshot.params, 3));
  await page.getByRole("button", { name: /Ⅱ 暂停/ }).click();
  const paused = await saved(page);
  await page.getByLabel("场示意", { exact: true }).uncheck();
  await page.getByLabel("电流方向", { exact: true }).uncheck();
  expect((await saved(page)).time).toBe(paused.time);
  await expect(
    page.locator(".magnetic-field, .electric-field, .current-arrows"),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".circuit-scene")).toBeVisible();
  expect(await saved(page)).toEqual({
    ...paused,
    layers: { fields: false, current: false },
  });
  await page
    .getByRole("button", { name: "重新充电", exact: true })
    .first()
    .click();
  expect((await saved(page)).closed).toBe(false);
  expect((await saved(page)).time).toBe(0);
  expect(errors).toEqual([]);
});
test("LC parameter changes recharge, reverse polarity and preserve finite zero-energy behavior", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  await range(page, "初始电压 U₀", -6);
  expect((await saved(page)).closed).toBe(false);
  expect((await saved(page)).time).toBe(0);
  await expect(page.locator(".capacitor")).toHaveAttribute(
    "data-polarity",
    "-1",
  );
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  await expect(page.locator(".current-arrows")).toHaveAttribute(
    "data-direction",
    "-1",
  );
  await range(page, "初始电压 U₀", 0);
  await expect(page.getByRole("button", { name: /磁场能最大/ })).toBeDisabled();
  await expect(page.locator(".observation-summary")).toContainText("未储能");
  expect(at((await saved(page)).params, (await saved(page)).time).total).toBe(
    0,
  );
  await expect(
    page.locator(".magnetic-field, .electric-field, .current-arrows"),
  ).toHaveCount(0);
  await range(page, "电感 L", 200);
  await range(page, "电容 C", 200);
  expect(derived((await saved(page)).params).period).toBeGreaterThan(0);
  await page.getByRole("button", { name: "模型说明", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "模型说明", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).version,
      key,
    ),
  ).toBe(1);
});
test("LC energy ratios and shared-unit curves conserve energy while views preserve state", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  const before = await saved(page),
    energy = derived(before.params).energy;
  await page.getByRole("tab", { name: "看能量", exact: true }).click();
  expect((await saved(page)).time).toBe(before.time);
  const bar = page.locator(".energy-bar");
  expect(Number(await bar.getAttribute("data-electric"))).toBeCloseTo(0.5, 12);
  expect(Number(await bar.getAttribute("data-magnetic"))).toBeCloseTo(0.5, 12);
  for (const metric of ["electric", "magnetic", "total"]) {
    const point = page.locator(`.chart-point[data-metric="${metric}"]`);
    expect(Number(await point.getAttribute("data-value"))).toBeCloseTo(
      energy * 1e3 * (metric === "total" ? 1 : 0.5),
      12,
    );
  }
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  expect(Number(await bar.getAttribute("data-magnetic"))).toBeCloseTo(1, 12);
  await expect(page.locator('[data-readout="electric"]')).toHaveText("0.000");
  await page.getByRole("tab", { name: "看能量", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "看振荡", exact: true }),
  ).toBeFocused();
  expect((await saved(page)).time).toBe(momentTime(before.params, 1));
  await page.getByRole("button", { name: /▷ 继续/ }).click();
  await page.getByRole("tab", { name: "看能量", exact: true }).click();
  await expect(page.getByRole("button", { name: /Ⅱ 暂停/ })).toBeVisible();
  await page.getByRole("button", { name: /Ⅱ 暂停/ }).click();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "看能量", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await range(page, "初始电压 U₀", -6);
  await page.getByRole("button", { name: /能量相等/ }).click();
  expect(Number(await bar.getAttribute("data-magnetic"))).toBeCloseTo(0.5, 12);
  await range(page, "初始电压 U₀", 0);
  await expect(bar).toHaveAttribute("data-electric", "0");
  await expect(bar).toHaveAttribute("data-magnetic", "0");
  for (const value of await page
    .locator(".chart-point")
    .evaluateAll((nodes) =>
      nodes.map((n) => Number(n.getAttribute("data-value"))),
    ))
    expect(value).toBe(0);
});
test("LC exploration presets use an explicit common reference and actual measured ratios", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page.getByRole("button", { name: /把初始电压加倍/ }).click();
  const voltage = await saved(page),
    base = { ...voltage.params, voltage: 6 };
  expect(voltage.params.voltage).toBe(12);
  expect(voltage.closed).toBe(false);
  expect(derived(voltage.params).period).toBe(derived(base).period);
  expect(derived(voltage.params).energy).toBe(derived(base).energy * 4);
  await expect(page.locator(".task-comparison")).toContainText("E/Eref = 4.00");
  await page.getByRole("button", { name: /把电感变为四倍/ }).click();
  const inductance = await saved(page);
  expect(inductance.params.voltage).toBe(6);
  expect(derived(inductance.params).period).toBeCloseTo(
    derived(base).period * 2,
    12,
  );
  await expect(page.locator(".task-comparison")).toContainText(
    "Iₘ/Iref = 0.50",
  );
  await page.getByRole("button", { name: /电荷为零，电流也为零吗/ }).click();
  const current = await saved(page),
    s = at(current.params, current.time);
  expect(current.time).toBe(momentTime(base, 1));
  expect(current.closed).toBe(true);
  expect(s.q).toBeCloseTo(0, 12);
  expect(s.magnetic).toBeCloseTo(derived(base).energy, 12);
  await expect(page.locator(".task-reference")).toContainText(
    "50 mH · 100 μF · 6 V",
  );
  await page.getByRole("tab", { name: "探索", exact: true }).focus();
  await page.keyboard.press("Home");
  expect((await saved(page)).time).toBe(current.time);
  await page.keyboard.press("End");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "探索", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect((await saved(page)).task).toBe("current");
});
test("LC spring analogy uses normalized charge and opposite current, including reversed polarity and zero energy", async ({
  page,
}) => {
  await open(page);
  const tab = page.getByRole("tab", { name: "看振荡", exact: true });
  await tab.focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "类比弹簧", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  await expect(page.locator(".spring-velocity")).toHaveAttribute(
    "data-direction",
    "-1",
  );
  await expect(
    page.locator('.chart-point[data-metric="velocity"]'),
  ).toHaveAttribute("data-value", "-1");
  expect(
    Number(await page.locator(".spring-analogy").getAttribute("data-position")),
  ).toBeCloseTo(0, 12);
  const time = (await saved(page)).time;
  await page.getByRole("tab", { name: "类比弹簧", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  expect((await saved(page)).time).toBe(time);
  await range(page, "初始电压 U₀", -6);
  await expect(page.locator(".spring-analogy")).toHaveAttribute(
    "data-position",
    "-1",
  );
  await page.getByRole("button", { name: /磁场能最大/ }).click();
  await expect(page.locator(".spring-velocity")).toHaveAttribute(
    "data-direction",
    "1",
  );
  await expect(
    page.locator('.chart-point[data-metric="velocity"]'),
  ).toHaveAttribute("data-value", "1");
  await range(page, "初始电压 U₀", 0);
  await expect(page.locator(".normalization-empty")).toContainText(
    "归一化峰值不存在",
  );
  await expect(page.locator(".spring-analogy, .lc-chart")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "类比弹簧", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".katex-error")).toHaveCount(0);
});

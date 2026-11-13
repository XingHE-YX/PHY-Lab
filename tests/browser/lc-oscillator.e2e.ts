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
  await page.getByRole("button", { name: /磁场能最大/ }).click();
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

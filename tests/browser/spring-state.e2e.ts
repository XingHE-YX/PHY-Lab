import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import {
  normalizeSnapshot,
  type Snapshot,
} from "../../experiments/spring-oscillator/model/snapshot";
import { stateAt } from "../../experiments/spring-oscillator/model/dynamics";

const stateKey = "phy-lab:experiment:spring-oscillator:state:";
async function open(page: Page) {
  await page.goto("/#/experiments/spring-oscillator");
  await expect(page.locator(".model-switch")).toBeVisible();
}
async function snapshot(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: number) {
  await page
    .getByRole("slider", { name, exact: true })
    .evaluate((node, value) => {
      const input = node as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
}

test("legacy state is migrated and retained for rollback while version 2 takes precedence", async ({
  page,
}) => {
  const legacy = JSON.stringify({
    params: { A: 0.4, m: 2, k: 17, phi: 1.3 },
    time: 2.3,
    speed: 0.5,
    mode: "energy",
    phasor: true,
    curves: { potential: false },
    exploration: { version: 1, completed: [true, false, true], active: null },
  });
  await page.addInitScript(
    ({ key, legacy }) => {
      if (localStorage.getItem(key + "1") === null)
        localStorage.setItem(key + "1", legacy);
    },
    { key: stateKey, legacy },
  );
  await open(page);
  const saved = await snapshot(page);
  expect(saved.params.model).toBe("ideal");
  expect(saved.time).toBe(2.3);
  expect(saved.params.phi).toBeCloseTo(1.3, 10);
  expect(saved.phasor).toBe(true);
  expect(saved.curves.potential).toBe(false);
  expect(saved.exploration.completed).toEqual([true, false, true]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key + "1"), stateKey),
  ).toBe(legacy);
  await range(page, "质量", 3);
  await page.reload();
  await expect(page.locator(".model-switch")).toBeVisible();
  expect((await snapshot(page)).params.m).toBe(3);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key + "2")!).version,
      stateKey,
    ),
  ).toBe(2);
  expect(
    await page.evaluate((key) => localStorage.getItem(key + "1"), stateKey),
  ).toBe(legacy);
});

test("an unopened experiment and all new mode preferences work through an offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("link", { name: /弹簧振子/ }).click();
  await page.getByRole("button", { name: "受迫振动", exact: true }).click();
  await range(page, "阻尼比", 0.35);
  await page.getByRole("button", { name: "初始", exact: true }).click();
  await range(page, "初始位移", -0.45);
  await range(page, "初始速度", 0.6);
  await page.getByRole("button", { name: "驱动", exact: true }).click();
  await range(page, "驱动力幅值", 2);
  await page.getByRole("tab", { name: "看能量", exact: true }).click();
  await page.getByRole("button", { name: "能量收支", exact: true }).click();
  await page.getByRole("tab", { name: "看共振", exact: true }).click();
  await page.getByRole("button", { name: "相频", exact: true }).click();
  await range(page, "共振图频率比", 0.85);
  await range(page, "拖动时间游标", 0.623);
  await page.getByRole("tab", { name: "探索任务", exact: true }).click();
  const before = await snapshot(page);
  await page.reload();
  await expect(page.locator(".model-switch")).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "受迫振动", exact: true }),
  ).toHaveClass("selected");
  await expect(
    page.getByRole("tab", { name: "探索任务", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "公式", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "相频", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".resonance-point")).toBeVisible();
  await page.getByRole("tab", { name: "看能量", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "能量收支", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect((await snapshot(page)).time).toBe(before.time);
});

test("corrupt JSON and null state recover without a blank experiment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((key) => {
    localStorage.setItem(key + "1", "{broken");
    localStorage.setItem(key + "2", "null");
  }, stateKey);
  await open(page);
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
  expect((await snapshot(page)).params.model).toBe("ideal");
  expect(errors).toEqual([]);
});

test("large resonant motion zooms the scene without clipping physical values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const saved = normalizeSnapshot({
    params: { model: "driven", zeta: 0, ratio: 1, force: 5, m: 5, k: 1 },
    time: 1e6,
    mode: "energy",
    energyView: "balance",
  });
  await page.addInitScript(
    ({ key, saved }) => localStorage.setItem(key + "2", JSON.stringify(saved)),
    { key: stateKey, saved },
  );
  await open(page);
  const actual = await snapshot(page);
  const expected = stateAt(actual.params, actual.time);
  const geometry = await page.locator(".scene").evaluate((el) => ({
    x: Number(el.querySelector(".mass-surface")!.getAttribute("cx")),
    scale: Number(el.getAttribute("data-scale")),
  }));
  expect((geometry.x - 430) / geometry.scale).toBeCloseTo(expected.x, 4);
  expect(geometry.x).toBeGreaterThan(180);
  expect(geometry.x).toBeLessThan(680);
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
  await expect(page.locator(".energy-values")).not.toContainText(
    /NaN|Infinity/,
  );
  const overflow = await page
    .locator(".readouts, .energy-values, .timeline")
    .evaluateAll((nodes) =>
      nodes.some((node) => node.scrollWidth > node.clientWidth + 1),
    );
  expect(overflow).toBe(false);
});

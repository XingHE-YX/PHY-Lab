import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/spring-oscillator/experiment";

const root = resolve(import.meta.dirname, "../..");
const origin = "http://127.0.0.1:5184";
async function start(script: string, environment: Record<string, string>) {
  const child = spawn("bun", [script], {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: "ignore",
  });
  await expect
    .poll(async () => {
      try {
        return (await fetch(origin + "/catalog.json")).ok;
      } catch {
        return false;
      }
    })
    .toBe(true);
  return child;
}
async function stop(child?: ChildProcess) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
  });
}

test("a cached production page retires its worker when the same origin becomes development", async ({
  page,
}) => {
  let preview: ChildProcess | undefined, development: ChildProcess | undefined;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    preview = await start("scripts/preview.ts", { PORT: "5184" });
    await page.goto(origin);
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("link", { name: /弹簧振子/ }).click();
    await expect(
      page.getByRole("heading", { name: "弹簧振子", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("slider", { name: "质量", exact: true })
      .evaluate((node) => {
        const input = node as HTMLInputElement;
        input.value = "2";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page.getByRole("tab", { name: "看能量" }).click();
    await page
      .getByRole("button", { name: "动能 = 势能", exact: true })
      .click();
    const original = await page
      .locator("phy-experiment-page")
      .evaluate(
        (element) =>
          (element as ExperimentPage).instance!.snapshot() as Snapshot,
      );
    const cachedBefore = await page.evaluate(() => caches.keys());
    expect(cachedBefore.length).toBeGreaterThan(0);
    await stop(preview);
    preview = undefined;
    development = await start("scripts/dev.ts", { PHY_DEV_PORT: "5184" });
    const response = await page.request.get(origin + "/sw.js");
    expect(response.headers()["content-type"]).toContain(
      "application/javascript",
    );
    expect(await response.text()).toContain("registration.unregister()");
    await page.reload();
    await expect
      .poll(async () =>
        page
          .evaluate(() =>
            Boolean(document.querySelector('script[src*="/src/main.ts"]')),
          )
          .catch(() => false),
      )
      .toBe(true);
    await expect(
      page.getByRole("heading", { name: "弹簧振子", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(
          async () =>
            navigator.serviceWorker.controller === null &&
            (await navigator.serviceWorker.getRegistrations()).length === 0,
        ),
      )
      .toBe(true);
    const restored = await page
      .locator("phy-experiment-page")
      .evaluate(
        (element) =>
          (element as ExperimentPage).instance!.snapshot() as Snapshot,
      );
    expect(restored.params.m).toBe(2);
    expect(restored.mode).toBe("energy");
    expect(restored.time).toBeCloseTo(original.time, 6);
    expect(await page.evaluate(() => caches.keys())).toEqual(cachedBefore);
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(
      page.getByText("开发模式 · 离线缓存未启用", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await stop(preview);
    await stop(development);
  }
});

test("fresh development pages never register an offline worker", async ({
  page,
}) => {
  let development: ChildProcess | undefined;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    development = await start("scripts/dev.ts", { PHY_DEV_PORT: "5184" });
    await page.goto(origin);
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(
      page.getByText("开发模式 · 离线缓存未启用", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await stop(development);
  }
});

import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/mechanical-waves/model/snapshot";
import {
  duration,
  waveAt,
} from "../../experiments/mechanical-waves/model/physics";

const stateKey = "phy-lab:experiment:mechanical-waves:state:1";
async function open(page: Page) {
  await page.goto("/#/experiments/mechanical-waves");
  await expect(
    page.getByRole("heading", { name: "机械波实验台", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: number) {
  await page
    .getByRole("slider", { name, exact: true })
    .evaluate((node, next) => {
      const input = node as HTMLInputElement;
      input.value = String(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}

test("an unvisited wave experiment opens offline and restores all preferences independently", async ({
  page,
  context,
}) => {
  const springKey = "phy-lab:experiment:spring-oscillator:state:2";
  const springState = JSON.stringify({
    version: 2,
    params: { model: "driven", m: 2, k: 10, zeta: 0.2 },
    time: 0.623,
  });
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: springKey, value: springState },
  );
  await page.goto("/");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), stateKey),
  ).toBeNull();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("link", { name: /机械波实验台/ }).click();
  await page.getByRole("button", { name: "发出向下波包", exact: true }).click();
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  await range(page, "拖动时间游标", 2.6);
  await expect(page.locator(".readout").first()).toContainText("-");
  await page.getByRole("button", { name: "波的反射", exact: true }).click();
  await page.getByRole("button", { name: "自由端", exact: true }).click();
  await page.getByRole("button", { name: "波峰到右端", exact: true }).click();
  await expect(page.locator(".boundary-ring")).toHaveAttribute(
    "data-y",
    "-0.44",
  );
  await page.getByRole("button", { name: "驻波", exact: true }).click();
  await range(page, "传播速度", 1.2);
  await range(page, "观察长度", 10);
  await page.getByRole("button", { name: "波源", exact: true }).click();
  await range(page, "入射振幅", 0.34);
  await range(page, "频率", 1.4);
  await range(page, "跟踪位置 xₚ", 0.723);
  await page.getByRole("button", { name: "横向速度 vᵧ", exact: true }).click();
  await page
    .getByRole("combobox", { name: "播放速率", exact: true })
    .selectOption("0.25");
  await page.getByLabel("入射波 →", { exact: true }).check();
  await page.getByLabel("反射波 ←", { exact: true }).check();
  await page.getByLabel("合成波", { exact: true }).uncheck();
  await page.getByLabel("波节与波腹", { exact: true }).uncheck();
  await page.getByLabel("质点速度箭头", { exact: true }).uncheck();
  await range(page, "拖动时间游标", 0.623);
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  const before = await snapshot(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "机械波实验台", exact: true }),
  ).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "▷ 播放", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "探索", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "公式", exact: true }).click();
  const expected = waveAt(
    before.params,
    before.probe * before.params.length,
    before.time,
  );
  await expect(page.locator('.chart-point[data-metric="v"]')).toHaveAttribute(
    "data-value",
    String(expected.v),
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), springKey),
  ).toBe(springState);
});

test("dragging, chart selection and keyboard views keep a consistent paused state", async ({
  page,
}) => {
  await open(page);
  await range(page, "拖动时间游标", 2.6);
  const before = await snapshot(page);
  const bead = page.locator(".tracked-particle"),
    box = (await bead.boundingBox())!,
    scene = (await page.locator(".wave-scene").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(scene.x + scene.width * 0.72, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  const moved = await snapshot(page);
  expect(moved.probe).toBeGreaterThan(0.65);
  expect(moved.time).toBe(before.time);
  await expect(
    page.getByRole("slider", { name: "跟踪位置 xₚ", exact: true }),
  ).toHaveAttribute(
    "aria-valuetext",
    (moved.probe * moved.params.length).toFixed(2) + " m",
  );
  const tab = page.getByRole("tab", { name: "质点记录", exact: true });
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "空间剖面", exact: true }),
  ).toBeFocused();
  expect((await snapshot(page)).time).toBe(before.time);
  await page.keyboard.press("Home");
  const chart = page.locator(".wave-chart");
  await chart.click({
    position: { x: (await chart.boundingBox())!.width / 2, y: 60 },
  });
  const scrubbed = await snapshot(page);
  expect(Math.abs(scrubbed.time - before.time)).toBeGreaterThan(0.1);
  await expect(page.locator('.chart-point[data-metric="y"]')).toHaveAttribute(
    "data-value",
    String(
      waveAt(
        scrubbed.params,
        scrubbed.probe * scrubbed.params.length,
        scrubbed.time,
      ).y,
    ),
  );
  await range(page, "拖动时间游标", duration(scrubbed.params));
  await page.getByRole("button", { name: "前进一步", exact: true }).click();
  expect((await snapshot(page)).time).toBe(duration(scrubbed.params));
});

test("leaving an active wave stops its clock and removes its toolbar", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "▷ 播放", exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(0);
  await page.locator("phy-experiment-page").evaluate((el) => {
    (window as unknown as { departedWave: HTMLElement }).departedWave = (
      el as ExperimentPage
    ).instance!.element;
  });
  await page.getByRole("link", { name: "返回控制台", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeVisible();
  const oldState = () =>
    page.evaluate(() => {
      const wave = (
        window as unknown as {
          departedWave: HTMLElement & {
            playing: boolean;
            snapshot(): Snapshot;
          };
        }
      ).departedWave;
      return {
        time: wave.snapshot().time,
        playing: wave.playing,
        connected: wave.isConnected,
      };
    });
  const saved = await oldState();
  expect(saved.playing).toBe(false);
  expect(saved.connected).toBe(false);
  // This checks cleanup across real animation frames, not an arbitrary load wait.
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  );
  expect(await oldState()).toEqual(saved);
  await expect(
    page.getByRole("combobox", { name: "播放速率", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /机械波实验台/ }).click();
  expect((await snapshot(page)).time).toBe(saved.time);
  await expect(
    page.getByRole("button", { name: "▷ 播放", exact: true }),
  ).toBeVisible();
});

test("corrupt state recovers without non-finite scene values", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    stateKey,
  );
  await open(page);
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
  expect((await snapshot(page)).params.mode).toBe("travel");
  expect(errors).toEqual([]);
});

test("supported parameter extremes keep the physical scene and controls in range", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole("button", { name: "连续驱动", exact: true }).click();
  await range(page, "入射振幅", 0.4);
  await range(page, "频率", 2);
  for (const mode of ["波的传播", "波的反射", "驻波"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "介质", exact: true }).click();
    await range(page, "传播速度", 1);
    await range(page, "观察长度", 12);
    if (mode !== "波的传播")
      await page.getByRole("button", { name: "自由端", exact: true }).click();
    await range(page, "拖动时间游标", mode === "驻波" ? 0.16 : 12.16);
    const saved = await snapshot(page);
    await expect(page.locator(".tracked-particle")).toHaveAttribute(
      "data-y",
      String(
        waveAt(saved.params, saved.probe * saved.params.length, saved.time).y,
      ),
    );
    await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
    expect(
      await page.locator(".wave-scene").evaluate((node) => {
        const svg = node as SVGSVGElement;
        return [
          ...node.querySelectorAll(
            ".tracked-particle, .boundary-ring, .wave-total",
          ),
        ].every((element) => {
          const box = (element as SVGGraphicsElement).getBBox();
          return box.y >= 0 && box.y + box.height <= svg.viewBox.baseVal.height;
        });
      }),
    ).toBe(true);
    expect(
      await page
        .locator(".readouts, .parameter-body, .moments")
        .evaluateAll((nodes) =>
          nodes.some(
            (node) =>
              node.scrollWidth > node.clientWidth + 1 ||
              node.scrollHeight > node.clientHeight + 1,
          ),
        ),
    ).toBe(false);
  }
  await range(page, "传播速度", 6);
  await range(page, "观察长度", 4);
  await page.getByRole("button", { name: "波源", exact: true }).click();
  await range(page, "频率", 0.2);
  await expect(
    page.getByRole("button", { name: "定位波节", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".node-marker")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "定位波腹", exact: true }),
  ).toBeEnabled();
});

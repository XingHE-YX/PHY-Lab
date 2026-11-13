import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/lc-oscillator/model/snapshot";
import type { LCExperiment } from "../../experiments/lc-oscillator/experiment";
import { settingsPage } from "./helpers/settings";
import {
  at,
  derived,
  momentTime,
  duration,
} from "../../experiments/lc-oscillator/model/physics";
const key = "phy-lab:experiment:lc-oscillator:state:1";
async function layoutViolations(page: Page) {
  return page.locator("phy-experiment-page").evaluate((el) => {
    const root = (el as ExperimentPage).instance!.element.shadowRoot!;
    const nodes = root.querySelectorAll<HTMLElement>(
      ".heading,.panel,.scene-wrap,.readouts,.energy-strip,.timeline,.moments,.chart-stack,.lc-chart,.support,.task-content,.formula-content,.comparison-summary,button,phy-slider,phy-tabs,phy-checkbox",
    );
    return Array.from(nodes).flatMap((node) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return [];
      const html = node instanceof HTMLElement;
      return rect.top < 0 ||
        rect.bottom > innerHeight + 1 ||
        rect.left < 0 ||
        rect.right > innerWidth + 1 ||
        (html &&
          (node.scrollWidth > node.clientWidth + 1 ||
            node.scrollHeight > node.clientHeight + 1))
        ? [
            `${node.tagName}.${node.className}: ${Math.round(rect.bottom)} / ${innerHeight}`,
          ]
        : [];
    });
  });
}
async function open(page: Page) {
  await page.goto("/#/experiments/lc-oscillator");
  await expect(
    page.getByRole("heading", { name: /^(LC 电磁振荡|LC oscillations)$/ }),
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
  await page.getByRole("searchbox").fill("LC");
  await page.getByRole("link", { name: /LC 电磁振荡/ }).click();
  await expect(page.locator(".circuit-scene")).toBeVisible();
  expect((await saved(page)).closed).toBe(false);
  const switchControl = page.locator(".circuit-switch");
  await switchControl.focus();
  await page.keyboard.press("Enter");
  expect((await saved(page)).closed).toBe(true);
  await expect(switchControl).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await saved(page)).time).toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect(switchControl).toHaveAttribute("aria-pressed", "false");
  const pausedAtSwitch = (await saved(page)).time;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect((await saved(page)).time).toBe(pausedAtSwitch);
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
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).time)
    .toBeGreaterThan(momentTime(snapshot.params, 3));
  await page.getByRole("button", { name: "暂停", exact: true }).click();
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
  await expect(page.locator(".katex-error, .math-error")).toHaveCount(0);
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
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("tab", { name: "看能量", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
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
  await page
    .getByRole("article", { name: /把初始电压加倍/ })
    .getByRole("button", { name: "载入预设", exact: true })
    .click();
  const voltage = await saved(page),
    base = { ...voltage.params, voltage: 6 };
  expect(voltage.params.voltage).toBe(12);
  expect(voltage.closed).toBe(false);
  expect(derived(voltage.params).period).toBe(derived(base).period);
  expect(derived(voltage.params).energy).toBe(derived(base).energy * 4);
  expect(voltage.support).toBe("formula");
  await expect(
    page.getByRole("tab", { name: "看能量", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".task-comparison")).toContainText("E/Eref = 4.00");
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page
    .getByRole("article", { name: /把电感变为四倍/ })
    .getByRole("button", { name: "载入预设", exact: true })
    .click();
  const inductance = await saved(page);
  expect(inductance.params.voltage).toBe(6);
  expect(derived(inductance.params).period).toBeCloseTo(
    derived(base).period * 2,
    12,
  );
  await expect(page.locator(".task-comparison")).toContainText(
    "Iₘ/Iref = 0.50",
  );
  await expect(
    page.getByRole("tab", { name: "看振荡", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page
    .getByRole("article", { name: /电荷为零，电流也为零吗/ })
    .getByRole("button", { name: "载入预设", exact: true })
    .click();
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
test("LC exploration replaces the plots and every observation tab returns without resetting the circuit", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  const before = await saved(page);
  const scene = await page.locator(".scene-wrap").boundingBox();
  for (const [observation, name] of [
    ["oscillation", "看振荡"],
    ["energy", "看能量"],
    ["analogy", "类比弹簧"],
  ] as const) {
    const tab = page.getByRole("tab", { name, exact: true });
    await tab.click();
    await page.getByRole("tab", { name: "探索", exact: true }).click();
    await expect(page.locator(".task")).toHaveCount(3);
    await expect(page.locator(".lc-chart, .spring-analogy")).toHaveCount(0);
    const tasks = await page.locator(".support").boundingBox();
    const right = await page.locator(".observation-panel").boundingBox();
    expect(tasks!.height).toBeGreaterThan(right!.height - 50);
    expect(await saved(page)).toEqual({
      ...before,
      observation,
      support: "tasks",
    });
    await tab.click();
    await expect(page.locator(".lc-chart").first()).toBeVisible();
    await expect(page.locator(".task")).toHaveCount(0);
    expect(await saved(page)).toEqual({ ...before, observation });
    expect(await page.locator(".scene-wrap").boundingBox()).toEqual(scene);
  }
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  const exploring = (await saved(page)).time;
  await expect
    .poll(async () => (await saved(page)).time)
    .toBeGreaterThan(exploring);
  await page.getByRole("tab", { name: "类比弹簧", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
});
test("LC main controls, all observations and tasks fit both desktop sizes in both themes and languages", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    for (const theme of ["light", "dark"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", { name: /^(切换明暗|Toggle theme)$/ })
          .click();
      for (const locale of ["zh-CN", "en"]) {
        if ((await page.locator("html").getAttribute("lang")) !== locale)
          await page
            .getByRole("button", { name: /^(切换语言|Switch language)$/ })
            .click();
        for (const view of [0, 1, 2]) {
          await page
            .getByRole("tablist", { name: /^(观察方式|Observation)$/ })
            .getByRole("tab")
            .nth(view)
            .click();
          await expect
            .poll(() => layoutViolations(page), {
              message: `${size.width} ${theme} ${locale} ${view}`,
            })
            .toEqual([]);
          const chart = page.locator(".lc-chart").first();
          const box = await chart.boundingBox();
          expect(box!.height).toBeGreaterThan(95);
          await expect(page.locator(".katex-error, .math-error")).toHaveCount(
            0,
          );
        }
        await page.screenshot({
          path: info.outputPath(`lc-${size.width}-${theme}-${locale}.png`),
          animations: "disabled",
        });
        for (const task of [0, 1, 2]) {
          await page.locator(".support-tabs").getByRole("tab").nth(1).click();
          await expect(page.locator(".lc-chart, .spring-analogy")).toHaveCount(
            0,
          );
          await expect
            .poll(() => layoutViolations(page), {
              message: `${size.width} ${theme} ${locale} tasks`,
            })
            .toEqual([]);
          if (task === 0)
            await page.screenshot({
              path: info.outputPath(
                `lc-explore-${size.width}-${theme}-${locale}.png`,
              ),
              animations: "disabled",
            });
          await page.locator(".task").nth(task).getByRole("button").click();
          await expect(page.locator(".lc-chart").first()).toBeVisible();
          await expect
            .poll(() => layoutViolations(page), {
              message: `${size.width} ${theme} ${locale} preset ${task}`,
            })
            .toEqual([]);
        }
      }
    }
  }
});
test("LC time charts scrub with pointer capture and keyboard, and playback stops at four physical periods", async ({
  page,
}) => {
  await open(page);
  const params = (await saved(page)).params;
  const plot = page.locator(".lc-chart").first();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const point = await plot.evaluate((node) => {
    const svg = node as SVGSVGElement;
    const p = new DOMPoint(
      49 + 269 / 4,
      svg.viewBox.baseVal.height / 2,
    ).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  // Pointer coordinates are quantized to screen pixels.
  const secondsPerPixel =
    (duration(params) * 332) / ((await plot.boundingBox())!.width * 269);
  expect(
    Math.abs((await saved(page)).time - derived(params).period),
  ).toBeLessThan(secondsPerPixel);
  await page.mouse.move((await plot.boundingBox())!.x - 30, point.y);
  await page.mouse.up();
  expect((await saved(page)).time).toBe(0);
  const slider = page.getByRole("slider", {
    name: "拖动实验时间",
    exact: true,
  });
  await slider.focus();
  await page.keyboard.press("End");
  expect((await saved(page)).time).toBeCloseTo(duration(params), 8);
  await page.keyboard.press("ArrowLeft");
  const nearEnd = (await saved(page)).time;
  expect(nearEnd).toBeLessThan(duration(params));
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).time)
    .toBe(duration(params));
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect.poll(async () => (await saved(page)).time).toBeLessThan(nearEnd);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await slider.focus();
  await page.keyboard.press("Home");
  expect((await saved(page)).time).toBe(0);
});
test("LC appearance changes preserve playback, and hidden or disposed experiments stop advancing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  const before = await saved(page),
    scene = await page.locator(".scene-wrap").boundingBox();
  const lightWire = await page
    .locator(".wire")
    .evaluate((node) => getComputedStyle(node).stroke);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  const darkWire = await page
    .locator(".wire")
    .evaluate((node) => getComputedStyle(node).stroke);
  expect(darkWire).not.toBe(lightWire);
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await page.getByRole("tab", { name: "Spring analogy", exact: true }).click();
  await page.getByLabel("Field guides", { exact: true }).uncheck();
  expect((await saved(page)).params).toEqual(before.params);
  expect((await saved(page)).time).toBeGreaterThan(before.time);
  expect(await page.locator(".scene-wrap").boundingBox()).toEqual(scene);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  const element = await page
    .locator("phy-experiment-page")
    .evaluateHandle(
      (el) => (el as ExperimentPage).instance!.element as LCExperiment,
    );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const hidden = (await saved(page)).time;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect((await saved(page)).time).toBe(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page
    .getByRole("link", { name: "Back to console", exact: true })
    .click();
  await expect
    .poll(() => element.evaluate((el) => el.isConnected || el.playing))
    .toBe(false);
  const departed = await element.evaluate((el) => el.snapshot());
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await element.evaluate((el) => el.snapshot())).toEqual(departed);
  await expect(page.getByRole("button", { name: /Pause|Resume/ })).toHaveCount(
    0,
  );
  await open(page);
  expect((await saved(page)).time).toBe(departed.time);
});
test("LC is available offline before its first visit and restores independent preferences and time", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await settingsPage(page, "cache");
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  await page.getByRole("tab", { name: "类比弹簧", exact: true }).click();
  await page.getByLabel("场示意", { exact: true }).uncheck();
  await page
    .getByRole("combobox", { name: "慢放速度", exact: true })
    .selectOption("0.25");
  const snapshot = await saved(page);
  await page.reload();
  await expect(page.locator(".spring-analogy")).toBeVisible();
  expect(await saved(page)).toEqual(snapshot);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key),
  ).toEqual(snapshot);
  await context.setOffline(false);
});
test("LC corrupt storage recovers finite defaults without touching other experiment saves", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          params: { inductance: -5, capacitance: 0, voltage: "bad" },
          closed: true,
          time: 999,
          rate: -1,
          observation: "unknown",
          layers: { fields: 5 },
        }),
      );
      localStorage.setItem(
        "phy-lab:experiment:mechanical-waves:state:1",
        '{"sentinel":true}',
      );
    },
    { key },
  );
  await open(page);
  const snapshot = await saved(page);
  expect(snapshot.time).toBe(duration(snapshot.params));
  expect(snapshot.params.inductance).toBe(0.01);
  expect(snapshot.params.capacitance).toBe(10e-6);
  expect(snapshot.params.voltage).toBe(6);
  expect(Number.isFinite(at(snapshot.params, snapshot.time).current)).toBe(
    true,
  );
  expect(snapshot.observation).toBe("oscillation");
  expect(snapshot.rate).toBe(1);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("phy-lab:experiment:mechanical-waves:state:1"),
    ),
  ).toBe('{"sentinel":true}');
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
});
test("LC v2 preserves v1 saves and independent observation and support preferences", async ({
  page,
}) => {
  const legacy: Snapshot = {
    version: 1,
    params: { inductance: 0.1, capacitance: 50e-6, voltage: -3 },
    time: 0.003,
    closed: true,
    rate: 0.5,
    observation: "analogy",
    support: "tasks",
    task: "current",
    layers: { fields: false, current: false },
  };
  await page.addInitScript(
    ({ key, legacy }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(legacy));
    },
    { key, legacy },
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "电磁学", exact: true }).click();
  await expect(page.locator(".card")).toHaveCount(1);
  await page.getByRole("link", { name: /LC 电磁振荡/ }).click();
  await expect(page.locator(".task")).toHaveCount(3);
  await expect(page.locator(".spring-analogy")).toHaveCount(0);
  expect(await saved(page)).toEqual(legacy);
  await expect(
    page.getByRole("combobox", { name: "慢放速度", exact: true }),
  ).toHaveValue("0.5");
  await expect(
    page.getByRole("checkbox", { name: "场示意", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("tab", { name: "公式", exact: true }).click();
  const expected = { ...legacy, support: "formula" };
  expect(await saved(page)).toEqual(expected);
  await expect(
    page.getByRole("tab", { name: "类比弹簧", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.locator(".spring-analogy")).toBeVisible();
  expect(await saved(page)).toEqual(expected);
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
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
  await expect(page.locator(".katex-error, .math-error")).toHaveCount(0);
});
test("LC platform formulas and help follow locale changes and experiment cleanup", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole("button", { name: /能量相等/ }).click();
  const snapshot = await saved(page);
  await expect(page.locator(".formula-content phy-math .katex")).toHaveCount(3);
  const help = page.getByRole("button", { name: "模型说明", exact: true });
  await help.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("理想 LC 回路");
  await expect(dialog).toHaveCSS("width", "720px");
  await expect(dialog.locator("phy-math .katex")).toHaveCount(1);
  await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0);
  await expect(help).toBeFocused();
  await help.click();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "切换语言", exact: true }).click();
  await other.close();
  await expect(dialog).toHaveAccessibleName("The ideal LC circuit");
  await expect(dialog).toContainText("An ideal linear capacitor and inductor");
  await expect(dialog.locator("phy-math .katex")).toHaveCount(1);
  await expect(page.locator(".math-error")).toHaveCount(0);
  expect(await saved(page)).toEqual(snapshot);
  await page.screenshot({ path: info.outputPath("lc-help-1280-en.png") });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const englishHelp = page.getByRole("button", {
    name: "Model notes",
    exact: true,
  });
  await expect(englishHelp).toBeFocused();
  await englishHelp.click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "All experiments", exact: true }),
  ).toBeVisible();
  await open(page);
  await englishHelp.click();
  await expect(dialog).toHaveAccessibleName("The ideal LC circuit");
  await page.keyboard.press("Escape");
  await expect(englishHelp).toBeFocused();
  expect(errors).toEqual([]);
});

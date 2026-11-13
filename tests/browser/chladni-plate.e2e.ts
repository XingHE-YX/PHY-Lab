import { settingsPage } from "./helpers/settings";
import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/chladni-plate/model/snapshot";
import { plate } from "../../experiments/chladni-plate/model/catalog";
import {
  pointAt,
  response,
  field,
} from "../../experiments/chladni-plate/model/response";
import { geometry } from "../../experiments/chladni-plate/components/renderer";
const key = "phy-lab:experiment:chladni-plate:state:1";
async function open(page: Page) {
  await page.goto("/#/experiments/chladni-plate");
  await expect(
    page.getByRole("heading", { name: "克拉尼图形", exact: true }),
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
async function sandHash(page: Page) {
  return page.locator("phy-experiment-page").evaluate((el) => {
    const node = (el as ExperimentPage).instance!.element as unknown as {
      sand: { positions: Float32Array };
    };
    let hash = 0;
    for (const value of new Uint32Array(node.sand.positions.buffer))
      hash = Math.imul(hash ^ value, 16777619);
    return hash;
  });
}
test("Chladni WebGL, probes, overlays and charts share one physical state", async ({
  page,
}, info) => {
  const errors: string[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("克拉尼");
  await page.getByRole("link", { name: /克拉尼图形/ }).click();
  await expect(page.locator(".webgl")).toBeVisible();
  await range(page, "振动周期数", 24.183);
  const before = await saved(page),
    expected = pointAt(
      plate,
      response(plate, before.params),
      before.params,
      before.probe.x,
      before.probe.y,
      before.cycles,
    );
  await expect(page.locator(".webgl")).toHaveAttribute(
    "data-w",
    String(expected.w),
  );
  await expect(page.locator(".readout").first()).toContainText(
    (expected.w * 1e6).toFixed(2),
  );
  await expect(page.locator(".chart-point")).toHaveAttribute(
    "data-value",
    String(expected.w * 1e6),
  );
  const hash = await sandHash(page);
  await page.getByLabel("低振幅线", { exact: true }).check();
  await page.getByLabel("振幅场", { exact: true }).check();
  await page.getByRole("radio", { name: "倾斜", exact: true }).click();
  await page.getByRole("tab", { name: "看振型", exact: true }).click();
  expect((await saved(page)).cycles).toBe(before.cycles);
  expect((await saved(page)).params).toEqual(before.params);
  expect(await sandHash(page)).toBe(hash);
  const probe = page.getByRole("button", { name: "移动测点 P", exact: true });
  await probe.focus();
  await page.keyboard.press("ArrowRight");
  expect((await saved(page)).probe.x).toBeCloseTo(before.probe.x + 0.02, 10);
  expect((await saved(page)).cycles).toBe(before.cycles);
  await page.getByRole("tab", { name: "看共振", exact: true }).click();
  const frequencyCursor = page.getByRole("slider", {
    name: "选择驱动频率",
    exact: true,
  });
  await frequencyCursor.focus();
  await page.keyboard.press("ArrowRight");
  expect((await saved(page)).params.frequency).toBeGreaterThan(
    before.params.frequency,
  );
  expect((await saved(page)).cycles).toBe(0);
  await page.getByRole("button", { name: /^模态 13 ·/ }).click();
  await range(page, "振动周期数", 60.183);
  await page.getByRole("tab", { name: "看沙纹", exact: true }).click();
  await expect(page.locator(".katex-error")).toHaveCount(0);
  if ((await page.locator("html").getAttribute("data-theme")) !== "dark")
    await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("chladni-desktop.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "模型说明", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "模型说明", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
test("sand rewind, reset, storage and zero drive remain deterministic", async ({
  page,
}) => {
  await open(page);
  await range(page, "振动周期数", 47.125);
  const snapshot = await saved(page),
    hash = await sandHash(page);
  await range(page, "振动周期数", 5.125);
  await range(page, "振动周期数", 47.125);
  expect(await sandHash(page)).toBe(hash);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "克拉尼图形", exact: true }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(snapshot);
  expect(await sandHash(page)).toBe(hash);
  await page.getByRole("button", { name: "清空砂粒", exact: true }).click();
  expect((await saved(page)).empty).toBe(true);
  await page.getByRole("button", { name: "重新撒沙", exact: true }).click();
  expect((await saved(page)).seed).toBe(snapshot.seed + 1);
  expect((await saved(page)).empty).toBe(false);
  await range(page, "驱动力幅值", 0);
  const initial = await sandHash(page);
  await range(page, "振动周期数", 40.125);
  expect(await sandHash(page)).toBe(initial);
  await expect(page.locator(".webgl")).toHaveAttribute("data-w", "0");
  await page.getByRole("button", { name: "▷ 开始", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).cycles)
    .toBeGreaterThan(40.125);
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const paused = (await saved(page)).cycles;
  await page.getByRole("button", { name: "移动激励点 S", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await saved(page)).params.driveX).toBeCloseTo(
    snapshot.params.driveX - 0.02,
    10,
  );
  expect((await saved(page)).cycles).toBe(0);
  expect(paused).toBeGreaterThan(40.125);
});
test("surface picking and dragging match the physical probe in both viewpoints", async ({
  page,
}) => {
  await open(page);
  await range(page, "振动周期数", 18.18);
  await page.getByRole("radio", { name: "移动测点", exact: true }).click();
  const before = await saved(page),
    hash = await sandHash(page);
  for (const tilt of [false, true]) {
    if (tilt)
      await page.getByRole("radio", { name: "倾斜", exact: true }).click();
    const box = (await page.locator(".scene-wrap").boundingBox())!,
      cam = geometry(box.width, box.height, tilt),
      g = field(plate, response(plate, before.params)),
      target = { x: 0.3125, y: -0.375 },
      point = pointAt(
        plate,
        response(plate, before.params),
        before.params,
        target.x,
        target.y,
        before.cycles,
      ),
      screen = cam.project(target.x, target.y, (0.13 * point.w) / g.peak);
    await page.mouse.click(box.x + screen.x, box.y + screen.y);
    expect((await saved(page)).probe.x).toBeCloseTo(target.x, 3);
    expect((await saved(page)).probe.y).toBeCloseTo(target.y, 3);
    const handle = (await page
      .getByRole("button", { name: "移动测点 P", exact: true })
      .boundingBox())!;
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(box.x + screen.x + 25, box.y + screen.y, {
      steps: 5,
    });
    await page.mouse.up();
    expect((await saved(page)).probe.x).toBeGreaterThan(target.x + 0.05);
    expect((await saved(page)).cycles).toBe(before.cycles);
    expect((await saved(page)).params).toEqual(before.params);
    expect(await sandHash(page)).toBe(hash);
  }
  await page
    .getByRole("spinbutton", { name: "测点横坐标", exact: true })
    .fill("999");
  await page.keyboard.press("Tab");
  expect((await saved(page)).probe.x).toBe(1);
  await page
    .getByRole("spinbutton", { name: "测点横坐标", exact: true })
    .fill("");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("spinbutton", { name: "测点横坐标", exact: true }),
  ).toHaveValue("18.0");
  await page.getByRole("radio", { name: "俯视", exact: true }).click();
  const exciter = page.getByRole("button", {
      name: "移动激励点 S",
      exact: true,
    }),
    handle = (await exciter.boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 - 35,
    handle.y + handle.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  expect((await saved(page)).params.driveX).toBeLessThan(
    before.params.driveX - 0.1,
  );
  expect((await saved(page)).cycles).toBe(0);
});
test("leaving and losing the GPU context preserve a paused recoverable state", async ({
  page,
}) => {
  await open(page);
  await range(page, "振动周期数", 22.22);
  await page.getByRole("radio", { name: "倾斜", exact: true }).click();
  const before = await saved(page),
    hash = await sandHash(page);
  await page.locator(".webgl").evaluate((node) => {
    (node as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!
      .loseContext();
  });
  await expect(page.locator(".fallback")).toBeVisible();
  expect(await saved(page)).toEqual(before);
  expect(await sandHash(page)).toBe(hash);
  await page.getByRole("button", { name: "▷ 开始", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).cycles)
    .toBeGreaterThan(before.cycles);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(
    page.getByRole("button", { name: "▷ 开始", exact: true }),
  ).toBeVisible();
  const hidden = await saved(page);
  await page.getByRole("button", { name: "▷ 开始", exact: true }).click();
  await page.getByRole("link", { name: "返回控制台", exact: true }).click();
  await expect(page.locator("phy-experiment-page")).toHaveCount(0);
  const persisted = JSON.parse(
    (await page.evaluate((key) => localStorage.getItem(key), key))!,
  );
  expect(persisted.cycles).toBeGreaterThanOrEqual(hidden.cycles);
  await open(page);
  expect(await saved(page)).toEqual(persisted);
  await expect(
    page.getByRole("button", { name: "▷ 开始", exact: true }),
  ).toBeVisible();
});
test("Chladni controls fit both desktop sizes, languages and themes", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
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
        for (let group = 0; group < 2; group++)
          for (let observation = 0; observation < 3; observation++) {
            await page
              .locator(".parameter-tabs")
              .getByRole("tab")
              .nth(group)
              .click();
            await page
              .locator(".observation-tabs")
              .getByRole("tab")
              .nth(observation)
              .click();
            await expect
              .poll(
                () =>
                  page.locator("phy-experiment-page").evaluate((el) => {
                    const root = (el as ExperimentPage).instance!.element
                      .shadowRoot!;
                    return [
                      ".heading",
                      ".parameter-body",
                      ".parameter-footer",
                      ".stage",
                      ".scene-tools",
                      ".scene-wrap",
                      ".readouts",
                      ".timeline",
                      ".observation-content",
                      ".support",
                      ".preset-block",
                    ].flatMap((selector) => {
                      const node = root.querySelector<HTMLElement>(selector)!,
                        r = node.getBoundingClientRect();
                      return r.top < 0 ||
                        r.bottom > innerHeight + 1 ||
                        node.scrollWidth > node.clientWidth + 1 ||
                        node.scrollHeight > node.clientHeight + 1
                        ? [selector]
                        : [];
                    });
                  }),
                {
                  message: `${size.width} ${theme} ${locale} ${group} ${observation}`,
                },
              )
              .toEqual([]);
          }
        await page.screenshot({
          path: info.outputPath(`chladni-${size.width}-${theme}-${locale}.png`),
          animations: "disabled",
        });
      }
    }
  }
});
test("an unvisited Chladni experiment loads offline with isolated state", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await settingsPage(page, "cache");
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await open(page);
  await range(page, "振动周期数", 36.125);
  await page.getByLabel("低振幅线", { exact: true }).check();
  const before = await saved(page),
    hash = await sandHash(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "克拉尼图形", exact: true }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  expect(await sandHash(page)).toBe(hash);
  expect(
    await page.evaluate((key) => localStorage.getItem(key) !== null, key),
  ).toBe(true);
  await context.setOffline(false);
});
test("unavailable WebGL falls back to an operable planar experiment", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2") return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await open(page);
  await expect(page.locator(".fallback")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "倾斜", exact: true }),
  ).toBeDisabled();
  await range(page, "振动周期数", 20.12);
  expect((await saved(page)).cycles).toBe(20.12);
  await expect(page.locator(".layer-controls")).toContainText("基础平面绘制");
});

test("vibration audio follows drive frequency, mutes in settings and releases on exit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = AudioContext;
    const observed: Array<{
      context: AudioContext;
      gain?: GainNode;
      tone?: OscillatorNode;
      analyser?: AnalyserNode;
    }> = [];
    (window as any).plateAudio = observed;
    window.AudioContext = class extends NativeAudio {
      constructor(options?: AudioContextOptions) {
        super(options);
        observed.push({ context: this });
      }
      override createGain() {
        const gain = super.createGain();
        observed.find((item) => item.context === this)!.gain = gain;
        return gain;
      }
      override createOscillator() {
        const tone = super.createOscillator();
        observed.find((item) => item.context === this)!.tone = tone;
        return tone;
      }
    };
  });
  await open(page);
  await expect(
    page.getByRole("button", { name: /步进 1\/16 周期|Step 1\/16 cycle/ }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).plateAudio.length)).toBe(0);
  await page.getByRole("button", { name: "▷ 开始", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0]?.context.state),
    )
    .toBe("running");
  expect(
    await page.evaluate(
      () => (window as any).plateAudio[0].tone.frequency.value,
    ),
  ).toBeCloseTo((await saved(page)).params.frequency, 3);
  await page.evaluate(() => {
    const output = (window as any).plateAudio[0];
    output.analyser = output.context.createAnalyser();
    output.analyser.fftSize = 2048;
    output.gain.connect(output.analyser);
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const output = (window as any).plateAudio[0],
          samples = new Float32Array(2048);
        output.analyser.getFloatTimeDomainData(samples);
        return Math.sqrt(
          samples.reduce((sum, value) => sum + value * value, 0) /
            samples.length,
        );
      }),
    )
    .toBeGreaterThan(0.001);
  await settingsPage(page, "experiment");
  const settings = page.getByRole("region", { name: "实验设置", exact: true });
  await settings.getByRole("switch", { name: "静音", exact: true }).check();
  expect((await saved(page)).muted).toBe(true);
  const before = (await saved(page)).cycles;
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0].context.state),
    )
    .toBe("suspended");
  await expect
    .poll(async () => (await saved(page)).cycles)
    .toBeGreaterThan(before);
  await settings.getByRole("switch", { name: "静音", exact: true }).uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0].context.state),
    )
    .toBe("running");
  await settingsPage(page, "appearance");
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "切换语言", exact: true })
    .selectOption("en");
  await settingsPage(page, "experiment");
  await expect(
    page
      .getByRole("region", { name: "Experiment settings", exact: true })
      .getByRole("switch", { name: "Mute", exact: true }),
  ).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Playback speed", exact: true })
    .selectOption("0.25");
  expect(
    await page.evaluate(
      () => (window as any).plateAudio[0].tone.frequency.value,
    ),
  ).toBeCloseTo((await saved(page)).params.frequency, 3);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0].context.state),
    )
    .toBe("suspended");
  await range(page, "Drive frequency", 180);
  const changedFrequency = (await saved(page)).params.frequency;
  await page.getByRole("button", { name: "▷ Play", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0].tone.frequency.value),
    )
    .toBeCloseTo(changedFrequency, 3);
  await settingsPage(page, "experiment");
  await page.getByRole("switch", { name: "Mute", exact: true }).check();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Chladni figures", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).muted).toBe(true);
  await page.getByRole("button", { name: "▷ Play", exact: true }).click();
  expect(await page.evaluate(() => (window as any).plateAudio.length)).toBe(0);
  await settingsPage(page, "experiment");
  await expect(
    page.getByRole("switch", { name: "Mute", exact: true }),
  ).toBeChecked();
  await page.getByRole("switch", { name: "Mute", exact: true }).uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0]?.context.state),
    )
    .toBe("running");
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Back to console", exact: true })
    .click();
  await expect(page.locator("phy-experiment-page")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).plateAudio[0].context.state),
    )
    .toBe("closed");
  await settingsPage(page, "appearance");
  await expect(
    page.getByRole("region", { name: "Experiment settings", exact: true }),
  ).toHaveCount(0);
});

test("unavailable audio leaves the experiment operable with a localized explanation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", { value: undefined });
  });
  await open(page);
  await page.getByRole("button", { name: "▷ 开始", exact: true }).click();
  await expect.poll(async () => (await saved(page)).cycles).toBeGreaterThan(0);
  await settingsPage(page, "experiment");
  await expect(
    page.getByRole("switch", { name: "静音", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("当前浏览器无法播放声音，其他实验操作仍可使用。", {
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

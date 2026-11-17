import { expect, test, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { YoungExperiment } from "../../experiments/young-double-slit/experiment";
import type { Snapshot } from "../../experiments/young-double-slit/model/snapshot";
import {
  at,
  derived,
  defaults,
  fringePosition,
} from "../../experiments/young-double-slit/model/physics";
import { settingsPage } from "./helpers/settings";

const key = "phy-lab:experiment:young-double-slit:state:1";
async function open(page: Page) {
  await page.goto("/#/experiments/young-double-slit");
  await expect(page.locator(".optical-scene")).toBeVisible();
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
async function layoutViolations(page: Page) {
  return page.locator("phy-experiment-page").evaluate((el) => {
    const root = (el as ExperimentPage).instance!.element.shadowRoot!;
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        ".heading,.panel,.scene-wrap,.readouts,.probe-control,.fringe-controls,.clock-control,.scene-caption,.plot-wrap,.observation-summary,.formula-content,.task-grid,.task,phy-tabs,phy-slider,phy-button,phy-checkbox",
      ),
    ).flatMap((node) => {
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) return [];
      return r.top < 0 ||
        r.bottom > innerHeight + 1 ||
        r.left < 0 ||
        r.right > innerWidth + 1 ||
        node.scrollWidth > node.clientWidth + 1 ||
        node.scrollHeight > node.clientHeight + 1
        ? [
            `${node.tagName}.${node.className}: bottom=${r.bottom} overflow=${node.scrollHeight - node.clientHeight}/${node.scrollWidth - node.clientWidth}`,
          ]
        : [];
    });
  });
}
test("Young: exact bright/dark positions, paths, intensity and phase share the same model", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("双缝");
  await page.getByRole("link", { name: /杨氏双缝干涉/ }).click();
  await expect(page.locator(".optical-scene")).toBeVisible();
  await expect(page.locator('[data-readout="intensity"]')).toHaveText(
    "100.0 %",
  );
  await page.getByRole("button", { name: "下一明纹", exact: true }).click();
  let snapshot = await saved(page);
  expect(snapshot.probe).toBe(fringePosition(snapshot.params, 1));
  await expect(page.locator(".path-s1")).toHaveAttribute(
    "data-length",
    String(at(snapshot.params, snapshot.probe).r1),
  );
  await expect(page.locator(".intensity-point")).toHaveAttribute(
    "data-value",
    String(at(snapshot.params, snapshot.probe).intensity),
  );
  await page.getByRole("button", { name: "第一暗纹", exact: true }).click();
  snapshot = await saved(page);
  expect(at(snapshot.params, snapshot.probe).order).toBeCloseTo(0.5, 12);
  await expect(page.locator('[data-readout="intensity"]')).toHaveText("0.0 %");
  await expect(page.locator('[data-readout="phase"]')).toHaveText("1.00 π");
  await page.getByRole("tab", { name: "看相位", exact: true }).click();
  await range(page, "相位回看 t/T", 0.25);
  await expect(page.locator(".field-point")).toHaveAttribute(
    "data-value",
    String(at(snapshot.params, snapshot.probe, 0.25).field),
  );
  await expect(page.locator(".phasor-sum")).toHaveAttribute(
    "data-real",
    String(at(snapshot.params, snapshot.probe, 0.25).field),
  );
  await expect(page.locator('[data-readout="intensity"]')).toHaveText("0.0 %");
  await page.getByRole("button", { name: "中央明纹", exact: true }).click();
  await expect(page.locator('[data-readout="intensity"]')).toHaveText(
    "100.0 %",
  );
  expect(
    Math.abs(
      Number(await page.locator(".field-point").getAttribute("data-value")),
    ),
  ).toBeLessThan(1e-12);
  await range(page, "波长 λ", 650);
  expect((await saved(page)).cycles).toBe(0);
  expect((await saved(page)).probe).toBe(0);
  await page.getByRole("button", { name: "模型说明", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "不是完整的双缝衍射实验",
  );
  await expect(page.locator(".katex-error,.math-error")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "模型说明", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("Young: pointer capture and keyboard move the same screen and chart probe without changing phase", async ({
  page,
}) => {
  await open(page);
  await range(page, "相位回看 t/T", 1.25);
  const probe = page.getByRole("slider", { name: "屏上探针 P", exact: true });
  await probe.focus();
  await page.keyboard.press("ArrowUp");
  expect((await saved(page)).probe).toBeCloseTo(0.05e-3, 12);
  await page.keyboard.press("Shift+ArrowDown");
  expect((await saved(page)).probe).toBeCloseTo(-0.45e-3, 12);
  const point = await page.locator(".optical-scene").evaluate((node) => {
    const p = new DOMPoint(502, 125).matrixTransform(
      (node as SVGSVGElement).getScreenCTM()!,
    );
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 60, point.y - 45, { steps: 4 });
  await page.mouse.up();
  expect((await saved(page)).probe).toBeGreaterThan(3e-3);
  const chartPoint = await page.locator(".intensity-chart").evaluate((node) => {
    const p = new DOMPoint(108, 130).matrixTransform(
      (node as SVGSVGElement).getScreenCTM()!,
    );
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(chartPoint.x, chartPoint.y);
  expect((await saved(page)).probe).toBeCloseTo(-6e-3, 4);
  expect((await saved(page)).cycles).toBe(1.25);
  await page.getByRole("slider", { name: "光强曲线探针", exact: true }).focus();
  await page.keyboard.press("Home");
  expect((await saved(page)).probe).toBe(0);
  await page.keyboard.press("End");
  expect((await saved(page)).probe).toBe(0.012);
});

test("Young: replay, parameter changes, visual layers and lifecycle preserve consistent saved state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await open(page);
  await page.getByRole("button", { name: "▷ 播放", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).cycles)
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const before = await saved(page),
    box = await page.locator(".scene-wrap").boundingBox();
  await page.getByLabel("示意波前", { exact: true }).uncheck();
  await page.getByLabel("传播路径", { exact: true }).uncheck();
  await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  expect((await saved(page)).cycles).toBe(before.cycles);
  expect(await page.locator(".scene-wrap").boundingBox()).toEqual(box);
  await expect(page.locator(".wavefronts,.light-paths")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".optical-scene")).toBeVisible();
  expect((await saved(page)).cycles).toBe(before.cycles);
  await expect(
    page.getByRole("button", { name: "▷ Play", exact: true }),
  ).toBeVisible();
  await range(page, "Screen distance L", 3);
  expect((await saved(page)).cycles).toBe(0);
  await page.getByRole("button", { name: "▷ Play", exact: true }).click();
  await expect.poll(async () => (await saved(page)).cycles).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "▷ Play", exact: true }),
  ).toBeVisible();
  const hidden = await saved(page);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await saved(page)).toEqual(hidden);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
  });
  await range(page, "Phase replay t/T", 3.995);
  await page.getByRole("button", { name: "▷ Play", exact: true }).click();
  await expect.poll(async () => (await saved(page)).cycles).toBe(4);
  await expect(
    page.getByRole("button", { name: "▷ Play", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).cycles).toBe(4);
  await page.getByRole("button", { name: "▷ Play", exact: true }).click();
  await expect.poll(async () => (await saved(page)).cycles).toBeGreaterThan(0);
  expect((await saved(page)).cycles).toBeLessThan(1);
  await page.locator("phy-experiment-page").evaluate((el) => {
    (window as unknown as { oldYoung: HTMLElement }).oldYoung = (
      el as ExperimentPage
    ).instance!.element;
  });
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await expect(page.getByRole("searchbox")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { oldYoung: YoungExperiment }).oldYoung.playing,
    ),
  ).toBe(false);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!) as Snapshot,
    key,
  );
  await open(page);
  expect(await saved(page)).toEqual(stored);
});

test("Young: exploration uses an explicit fixed reference, and active observation tabs return from tasks", async ({
  page,
}) => {
  await open(page);
  for (const [index, ratio] of [650 / 550, 0.5, 2].entries()) {
    await page.getByRole("tab", { name: "探索", exact: true }).click();
    await expect(page.locator(".optical-chart")).toHaveCount(0);
    await page.locator(".task").nth(index).getByRole("button").click();
    const snapshot = await saved(page);
    expect(snapshot.reference).toEqual(defaults);
    expect(
      derived(snapshot.params).spacing / derived(snapshot.reference!).spacing,
    ).toBeCloseTo(ratio, 12);
    expect(snapshot.support).toBe("formula");
    await expect(page.locator('[data-readout="comparison"]')).toContainText(
      ratio.toFixed(3),
    );
    await expect(
      page.getByRole("tab", { name: "看光强", exact: true }),
    ).toBeFocused();
  }
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page.getByRole("tab", { name: "看光强", exact: true }).click();
  await expect(page.locator(".intensity-chart")).toBeVisible();
  await page.getByRole("tab", { name: "看光强", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "看相位", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".phase-chart")).toBeVisible();
});

test("Young: desktop controls and graphs fit both viewports, languages and themes", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
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
        for (const view of [0, 1]) {
          await page
            .locator(".observation-tabs")
            .getByRole("tab")
            .nth(view)
            .click();
          await expect
            .poll(() => layoutViolations(page), {
              message: `${size.width} ${theme} ${locale} ${view}`,
            })
            .toEqual([]);
          expect(
            (await page.locator(".optical-chart").boundingBox())!.height,
          ).toBeGreaterThan(200);
          await page.screenshot({
            path: info.outputPath(
              `young-${size.width}-${theme}-${locale}-${view}.png`,
            ),
            animations: "disabled",
          });
        }
        await page.locator(".support-tabs").getByRole("tab").nth(1).click();
        await expect
          .poll(() => layoutViolations(page), {
            message: `${size.width} ${theme} ${locale} explore`,
          })
          .toEqual([]);
        await page.screenshot({
          path: info.outputPath(
            `young-${size.width}-${theme}-${locale}-tasks.png`,
          ),
          animations: "disabled",
        });
        await page.locator(".task").first().getByRole("button").click();
        await expect
          .poll(() => layoutViolations(page), {
            message: `${size.width} ${theme} ${locale} comparison`,
          })
          .toEqual([]);
        await expect(page.locator(".katex-error,.math-error")).toHaveCount(0);
      }
    }
  }
});

test("Young: the first home cache includes unopened experiment, themed assets and math for offline use", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await settingsPage(page, "cache");
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.getByRole("link", { name: /杨氏双缝干涉/ }).click();
  await expect(page.locator(".optical-scene")).toBeVisible();
  await page.getByRole("button", { name: "第一暗纹", exact: true }).click();
  await page.getByRole("button", { name: "模型说明", exact: true }).click();
  await expect(page.locator("phy-math .katex").first()).toBeVisible();
  await page.keyboard.press("Escape");
  const snapshot = await saved(page);
  await page.reload();
  await expect(page.locator(".optical-scene")).toBeVisible();
  expect(await saved(page)).toEqual(snapshot);
  await page.evaluate(() => {
    location.hash = "#/";
  });
  const thumbnail = page.locator(
    '.card[href="#/experiments/young-double-slit"] .thumb',
  );
  await expect(thumbnail).toHaveAttribute("src", /thumbnail-light\.svg$/);
  await page.getByRole("button", { name: "切换明暗", exact: true }).click();
  await expect(thumbnail).toHaveAttribute("src", /thumbnail-dark\.svg$/);
  expect(
    await thumbnail.evaluate(
      (node) =>
        (node as HTMLImageElement).complete &&
        (node as HTMLImageElement).naturalWidth > 0,
    ),
  ).toBe(true);
});

test("Young: corrupt saved data and the densest fringe configuration keep finite reachable controls", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          params: { wavelength: 0, separation: 100, distance: -1 },
          probe: 100,
          cycles: "bad",
          layers: { paths: "off" },
          observation: "missing",
        }),
      ),
    key,
  );
  await open(page);
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
  await range(page, "波长 λ", 400);
  await range(page, "缝距 d", 1);
  await range(page, "屏距 L", 0.5);
  await range(page, "探针位置 y", -12);
  await expect(
    page.getByRole("button", { name: "前一明纹", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "下一明纹", exact: true }).click();
  expect(
    at((await saved(page)).params, (await saved(page)).probe).intensity,
  ).toBeCloseTo(1, 10);
  await expect.poll(() => layoutViolations(page)).toEqual([]);
});

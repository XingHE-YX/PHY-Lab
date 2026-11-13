import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/spring-oscillator/experiment";
import {
  stateAt,
  responseAt,
} from "../../experiments/spring-oscillator/model/dynamics";

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

test("all physical modes share the clock, scene, forces and energy", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("switch", { name: "旋转矢量" }).check();
  await page.getByRole("button", { name: "阻尼振动", exact: true }).click();
  await expect(page.getByRole("switch", { name: "旋转矢量" })).toBeDisabled();
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".damper")).toBeVisible();
  await range(page, "阻尼比", 0.25);
  await range(page, "拖动时间游标", 0.65);
  let saved = await snapshot(page);
  expect(saved.params.model).toBe("damped");
  const expected = stateAt(saved.params, saved.time);
  const geometry = await page.locator(".scene").evaluate((el) => ({
    x: Number(el.querySelector(".mass-surface")!.getAttribute("cx")),
    scale: Number(el.getAttribute("data-scale")),
  }));
  expect((geometry.x - 430) / geometry.scale).toBeCloseTo(expected.x, 8);
  await expect(page.locator(".readout").first()).toContainText(
    expected.x.toFixed(3),
  );
  await page.getByRole("tab", { name: "看能量" }).click();
  await page.getByRole("button", { name: "能量收支", exact: true }).click();
  await expect(page.locator(".energy-values")).toContainText("累计耗散");
  expect((await snapshot(page)).time).toBe(saved.time);
  await page.getByRole("button", { name: "受迫振动", exact: true }).click();
  await page.getByRole("button", { name: "驱动", exact: true }).click();
  await range(page, "驱动力幅值", 1.8);
  await range(page, "驱动频率比", 0.8);
  await range(page, "拖动时间游标", 1.15);
  await expect(page.locator(".force-readouts")).toContainText("驱动力");
  saved = await snapshot(page);
  expect(saved.params.force).toBe(1.8);
  expect(saved.params.ratio).toBe(0.8);
  await page.getByRole("button", { name: "理想振动", exact: true }).click();
  await expect(page.getByRole("switch", { name: "旋转矢量" })).toBeChecked();
  await expect(page.locator("#phasor-layer")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
});

test("critical relaxation reports unavailable events and dragging releases from rest", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "阻尼振动", exact: true }).click();
  await page.getByRole("button", { name: "临界阻尼", exact: true }).click();
  await page.getByRole("button", { name: "左端点", exact: true }).click();
  await expect(page.locator(".moment-hint")).toContainText("未找到");
  expect((await snapshot(page)).time).toBe(0);
  const ball = page.getByRole("slider", {
    name: "拖动小球，松手释放",
    exact: true,
  });
  await ball.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const saved = await snapshot(page);
  expect(saved.params.x0).toBeCloseTo(-0.02);
  expect(saved.params.v0).toBe(0);
  await page
    .getByRole("button", { name: "模型说明与推导", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "模型说明与推导", exact: true }),
  ).toBeFocused();
});

test("frequency response has an editable working point and distinguishes steady state", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "受迫振动", exact: true }).click();
  await page.getByRole("tab", { name: "看运动", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "看共振" })).toBeFocused();
  await range(page, "共振图频率比", 0.8);
  let saved = await snapshot(page);
  const expected = responseAt(saved.params);
  await expect(page.locator(".resonance-point")).toHaveAttribute(
    "data-value",
    String(expected.amplitude),
  );
  await expect(page.locator(".observation-note")).toContainText("仅表示稳态");
  await page.getByRole("button", { name: "相频", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.locator(".resonance-point").getAttribute("data-value")),
    )
    .toBeCloseTo((expected.phase! * 180) / Math.PI, 8);
  const target = await page.locator(".response-chart").evaluate((el) => {
    const svg = el as SVGSVGElement;
    const point = new DOMPoint(52 + (1.4 / 3) * (394 - 52), 70).matrixTransform(
      svg.getScreenCTM()!,
    );
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(target.x, target.y);
  saved = await snapshot(page);
  expect(saved.params.ratio).toBeCloseTo(1.4, 2);
  expect(saved.time).toBe(0);
  expect(saved.previous?.ratio).toBe(0.8);
  await page.getByRole("tab", { name: "看运动", exact: true }).click();
  await page.getByRole("button", { name: "▷ 播放", exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).time)
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const time = (await snapshot(page)).time;
  await page.getByRole("tab", { name: "看共振", exact: true }).click();
  expect((await snapshot(page)).time).toBe(time);
});

test("undamped resonance and zero drive have honest finite displays", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "受迫振动", exact: true }).click();
  await range(page, "阻尼比", 0);
  await page.getByRole("tab", { name: "看共振", exact: true }).click();
  await range(page, "共振图频率比", 1);
  await expect(page.locator(".response-values")).toContainText("无有限稳态");
  await expect(page.locator(".response-values")).toContainText("无确定相位");
  await expect(page.locator(".observation-note")).toContainText("持续增长");
  await expect(page.locator(".resonance-point")).toHaveCount(0);
  await page.getByRole("button", { name: "驱动", exact: true }).click();
  await range(page, "驱动力幅值", 0);
  await page.getByRole("button", { name: "相频", exact: true }).click();
  await expect(page.locator(".response-chart")).not.toContainText("∞");
  await expect(page.locator(".plot")).not.toContainText(/NaN|Infinity/);
  await expect(page.locator(".katex-error")).toHaveCount(0);
});

async function layoutViolations(page: Page) {
  return page.locator("phy-experiment-page").evaluate((el) => {
    const root = (el as ExperimentPage).instance!.element.shadowRoot!;
    const selectors = [
      ".heading",
      ".parameter-body",
      ".stage",
      ".plot",
      ".timeline",
      ".readouts",
      ".moments",
      ".support",
    ];
    return selectors.flatMap((selector) => {
      const node = root.querySelector<HTMLElement>(selector)!;
      const box = node.getBoundingClientRect();
      return box.top < 0 ||
        box.bottom > innerHeight + 1 ||
        node.scrollHeight > node.clientHeight + 1 ||
        node.scrollWidth > node.clientWidth + 1
        ? [selector]
        : [];
    });
  });
}

test("core controls and charts fit desktop viewports in both languages and themes", async ({
  page,
}, testInfo) => {
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
        for (const model of [0, 1, 2]) {
          await page.locator(".model-switch button").nth(model).click();
          const tabs = page.locator(".parameter-tabs button");
          for (let i = 0; i < (await tabs.count()); i++) {
            await tabs.nth(i).click();
            await expect.poll(() => layoutViolations(page)).toEqual([]);
          }
          for (const mode of model === 2 ? [0, 1, 2, 3] : [0, 1, 2]) {
            await page.locator(".tabs button").nth(mode).click();
            const variants = page.locator(".energy-tabs button");
            const count = Math.max(1, await variants.count());
            for (let i = 0; i < count; i++) {
              if (await variants.count()) await variants.nth(i).click();
              await expect
                .poll(() => layoutViolations(page), {
                  message: `${size.width}×${size.height} ${theme} ${locale} model=${model} view=${mode}`,
                })
                .toEqual([]);
              await expect(page.locator(".chart").first()).toBeVisible();
            }
          }
        }
        await page.screenshot({
          path: testInfo.outputPath(
            `spring-${size.width}-${theme}-${locale}.png`,
          ),
          animations: "disabled",
        });
      }
    }
  }
});

import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/spring-oscillator/experiment";
import { stateAt } from "../../experiments/spring-oscillator/model/dynamics";

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

test("core controls and charts fit desktop viewports in both languages and themes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    for (const locale of ["zh", "en"]) {
      for (const model of [0, 1, 2]) {
        await page.locator(".model-switch button").nth(model).click();
        for (const mode of [0, 1, 2]) {
          await page.locator(".tabs button").nth(mode).click();
          const violations = await page
            .locator("phy-experiment-page")
            .evaluate((el) => {
              const root = (el as ExperimentPage).instance!.element.shadowRoot!;
              const selectors = [
                ".parameter-body",
                ".stage",
                ".plot",
                ".timeline",
                ".readouts",
                ".moments",
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
          expect(
            violations,
            `${size.width}×${size.height} ${locale} model=${model} view=${mode}`,
          ).toEqual([]);
          await expect(page.locator(".chart").first()).toBeVisible();
        }
      }
      if (locale === "zh")
        await page
          .getByRole("button", { name: "切换语言", exact: true })
          .click();
    }
    await page
      .getByRole("button", { name: "Toggle theme", exact: true })
      .click();
    await page.evaluate(async () => {
      for (const animation of document.getAnimations()) animation.finish();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    await page.screenshot({
      path: testInfo.outputPath(`spring-${size.width}.png`),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Switch language", exact: true })
      .click();
  }
});

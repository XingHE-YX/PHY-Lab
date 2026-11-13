import { expect, test, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/lc-oscillator/model/snapshot";
import { at, format } from "../../experiments/lc-oscillator/model/physics";
import {
  buildTransient,
  sampleTransient,
} from "../../experiments/lc-oscillator/model/transient";
import { settingsPage } from "./helpers/settings";
async function saved(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function openTransient(page: Page, moment = "磁场能最大") {
  await page.goto("/#/experiments/lc-oscillator");
  await expect(
    page.getByRole("heading", { name: "LC 电磁振荡", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: new RegExp(moment) }).click();
  await page.locator(".circuit-switch").click();
  await expect(page.locator(".circuit-switch")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(
    page.getByRole("tab", { name: "瞬态", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Ⅱ 暂停回放", exact: true }).click();
}
test("opening is immediate and all spike readouts, plots, replay and residual charge share the computed record", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openTransient(page);
  const initial = await saved(page),
    event = initial.transient!;
  const before = at(initial.params, event.at, initial.seed);
  expect(event.initial.q).toBe(before.q);
  expect(event.initial.current).toBe(before.current);
  expect(event.initial.current).toBeGreaterThan(0.2);
  const profile = buildTransient(initial.params, event.initial, event.model);
  await expect(page.locator('[data-transient="peak"]')).toHaveText(
    `${format(profile.peakVoltage)} V`,
  );
  expect(profile.peakVoltage).toBeGreaterThan(600);
  await page.locator(".transient-chart").focus();
  await page.keyboard.press("Home");
  await expect(page.locator('[data-readout="current"]')).toHaveText(
    format(event.initial.current * 1e3),
  );
  await expect(page.locator('[data-readout="switch-voltage"]')).toHaveText(
    "0.00",
  );
  await page.keyboard.press("ArrowRight");
  const current = await saved(page),
    point = sampleTransient(profile, current.transient!.elapsed);
  await expect(page.locator('[data-readout="switch-voltage"]')).toHaveText(
    format(point.switchVoltage),
  );
  await expect(page.locator('[data-transient="balance"]')).toHaveText(
    "0.000000%",
  );
  await page
    .getByRole("combobox", { name: "瞬态范围", exact: true })
    .selectOption("full");
  await page.locator(".transient-chart").focus();
  await page.keyboard.press("End");
  const last = profile.points.at(-1)!;
  await expect(page.locator('[data-readout="current"]')).toHaveText("0.00");
  await expect(page.locator('[data-readout="voltage"]')).toHaveText(
    format(last.voltage),
  );
  expect(Math.abs(last.voltage)).toBeGreaterThan(0.001);
  expect((await saved(page)).closed).toBe(false);
  await page.locator(".circuit-switch").click();
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const reclosed = await saved(page);
  expect(reclosed.seed.q).toBeCloseTo(
    last.voltage * initial.params.capacitance,
    14,
  );
  expect(reclosed.seed.current).toBe(0);
  await page.getByRole("button", { name: "重新充电", exact: true }).click();
  const charged = await saved(page);
  expect(charged.closed).toBe(false);
  expect(charged.transient).toBeNull();
  await expect(page.locator('[data-readout="voltage"]')).toHaveText("6.00");
  expect(errors).toEqual([]);
});

test("zero-current opening retains capacitor charge and its captured model survives offline reload and later edits", async ({
  page,
  context,
}) => {
  await openTransient(page, "电场能最大");
  const snapshot = await saved(page),
    profile = buildTransient(
      snapshot.params,
      snapshot.transient!.initial,
      snapshot.transient!.model,
    );
  expect(profile.arcOccurred).toBe(false);
  expect(profile.points.at(-1)!.voltage).toBeCloseTo(6, 3);
  await page.getByRole("tab", { name: "开关", exact: true }).click();
  await page
    .getByRole("slider", { name: "击穿阈值 Uᵦ", exact: true })
    .evaluate((node) => {
      (node as HTMLInputElement).value = "1200";
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
  const changed = await saved(page);
  expect(changed.switch.breakdown).toBe(1200);
  expect(changed.transient!.model.breakdown).toBe(600);
  const dialog = await settingsPage(page, "cache");
  await expect(dialog.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".transient-chart")).toBeVisible();
  expect(await saved(page)).toEqual(changed);
  await context.setOffline(false);
});

test("slow replay pauses in the background and settles without resetting the capacitor", async ({
  page,
}) => {
  await openTransient(page);
  await page.getByRole("button", { name: "▷ 继续回放", exact: true }).click();
  const before = (await saved(page)).transient!.elapsed;
  await expect
    .poll(async () => (await saved(page)).transient!.elapsed)
    .toBeGreaterThan(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "▷ 继续回放", exact: true }),
  ).toBeVisible();
  const hidden = (await saved(page)).transient!.elapsed;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect((await saved(page)).transient!.elapsed).toBe(hidden);
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByRole("button", { name: "▷ 继续回放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ 暂停回放", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "▷ 继续回放", exact: true }),
  ).toBeVisible();
  const settled = await saved(page),
    event = settled.transient!;
  const profile = buildTransient(settled.params, event.initial, event.model);
  expect(event.elapsed).toBeCloseTo(profile.duration, 10);
  await expect(page.locator('[data-readout="current"]')).toHaveText("0.00");
  expect(settled.closed).toBe(false);
});

test("opening an uncharged circuit produces a finite zero record with no dead playback controls", async ({
  page,
}) => {
  await page.goto("/#/experiments/lc-oscillator");
  await page
    .getByRole("slider", { name: "初始电压 U₀", exact: true })
    .evaluate((node) => {
      (node as HTMLInputElement).value = "0";
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
  const control = page.locator(".circuit-switch");
  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await control.click();
  await expect(page.locator(".transient-chart")).toBeVisible();
  await expect(page.locator('[data-transient="peak"]')).toHaveText("0.00 V");
  await expect(
    page.getByRole("button", { name: "重放瞬态", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /暂停回放|继续回放/ }),
  ).toHaveCount(0);
  await expect(page.locator(".readouts")).not.toContainText(/NaN|Infinity/);
});

test("transient controls and both parameter groups fit desktop viewports in both languages and themes", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await openTransient(page);
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
        for (const group of [0, 1]) {
          await page
            .locator(".parameter-tabs")
            .getByRole("tab")
            .nth(group)
            .click();
          for (const metric of [0, 1, 2]) {
            await page
              .locator(".transient-content phy-radio-group")
              .getByRole("radio")
              .nth(metric)
              .check();
            await expect
              .poll(
                () =>
                  page.locator("phy-experiment-page").evaluate((el) => {
                    const root = (el as ExperimentPage).instance!.element
                      .shadowRoot!;
                    return [
                      ...root.querySelectorAll<HTMLElement>(
                        ".panel,.parameter-footer,.clock-readout,.readouts,.transient-content,.transient-plot,.transient-tools,.transient-summary,phy-tabs,phy-radio-group,phy-slider",
                      ),
                    ].flatMap((node) => {
                      const r = node.getBoundingClientRect();
                      if (!r.width || !r.height) return [];
                      return r.bottom > innerHeight + 1 ||
                        r.right > innerWidth + 1 ||
                        node.scrollHeight > node.clientHeight + 1 ||
                        node.scrollWidth > node.clientWidth + 1
                        ? [node.className || node.tagName]
                        : [];
                    });
                  }),
                {
                  message: `${size.width} ${theme} ${locale} ${group} ${metric}`,
                },
              )
              .toEqual([]);
          }
        }
        await page
          .locator(".transient-content phy-radio-group")
          .getByRole("radio")
          .first()
          .check();
        await page.screenshot({
          path: info.outputPath(
            `lc-transient-${size.width}-${theme}-${locale}.png`,
          ),
          animations: "disabled",
        });
      }
    }
  }
});

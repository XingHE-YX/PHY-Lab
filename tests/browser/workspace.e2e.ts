import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";
import type { Snapshot } from "../../experiments/spring-oscillator/experiment";
async function openExperiment(page: Page) {
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page
    .locator("phy-experiment-page")
    .evaluate((el) => (el as ExperimentPage).instance!.snapshot() as Snapshot);
}
async function range(page: Page, name: string, value: string) {
  await page.getByRole("slider", { name, exact: true }).evaluate((node, v) => {
    const input = node as HTMLInputElement;
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
test("workspace search, navigation and locale persistence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "全部实验" })).toBeVisible();
  const search = page.getByRole("textbox");
  await search.fill("不存在");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配的实验" }),
  ).toBeVisible();
  await search.fill("energy");
  await expect(page.getByRole("link", { name: /弹簧振子/ })).toBeVisible();
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "All experiments" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "All experiments" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Home" }),
  ).toBeVisible();
});
test("theme transition, settings dialog and focus restoration", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换明暗" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const settings = page.getByRole("button", { name: "设置", exact: true });
  await settings.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("PHY Lab v0.1.0");
  await expect(page.locator("footer")).toHaveCount(0);
  await page.getByLabel("减少界面动画").check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(settings).toBeFocused();
});
test("one clock drives motion, pauses and survives reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openExperiment(page);
  await page.getByRole("button", { name: "▷ 播放", exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).time)
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const saved = await snapshot(page);
  await page.getByRole("tab", { name: "看变化" }).click();
  await expect(page.locator(".chart")).toHaveCount(3);
  expect((await snapshot(page)).time).toBe(saved.time);
  await page.reload();
  expect((await snapshotAfterLoad(page)).time).toBeCloseTo(saved.time, 6);
  expect(errors).toEqual([]);
});
async function snapshotAfterLoad(page: Page) {
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  return snapshot(page);
}
test("key moments, energy proportions and phase stay consistent", async ({
  page,
}) => {
  await openExperiment(page);
  await page.getByRole("tab", { name: "看能量" }).click();
  await page.getByRole("button", { name: "动能 = 势能", exact: true }).click();
  await expect(page.locator(".energy-caption")).toContainText("50%");
  await page.getByRole("button", { name: "右端点", exact: true }).click();
  await expect(page.locator(".energy-caption")).toContainText("弹性势能 100%");
  await expect(page.locator('path[marker-end="url(#v-arrow)"]')).toHaveCount(0);
  await page.getByRole("button", { name: "经过平衡位置", exact: true }).click();
  await expect(page.locator(".energy-caption")).toContainText("动能 100%");
  await expect(page.locator('path[marker-end="url(#a-arrow)"]')).toHaveCount(0);
  await range(page, "初相位", "1.57");
  await page.getByRole("button", { name: "左端点", exact: true }).click();
  const state = await page.locator("phy-experiment-page").evaluate(
    (el) =>
      (
        (el as ExperimentPage).instance!.element as HTMLElement & {
          state: { x: number; v: number; a: number };
        }
      ).state,
  );
  expect(state.x).toBeCloseTo(-0.3);
  expect(state.v).toBeCloseTo(0);
  expect(state.a).toBeGreaterThan(0);
});
test("drag and keyboard release start from rest in either direction", async ({
  page,
}) => {
  await openExperiment(page);
  const ball = page.getByRole("slider", {
    name: "拖动小球，松手释放",
    exact: true,
  });
  const box = await ball.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 - 150,
    box!.y + box!.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  expect((await snapshot(page)).params.A).toBeGreaterThan(0);
  await ball.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ⅱ 暂停", exact: true }).click();
  const saved = await snapshot(page);
  expect(saved.params.A).toBeCloseTo(0.02);
  expect(saved.params.phi).toBeCloseTo(Math.PI);
});
test("parameters preserve comparison and zero amplitude has finite displays", async ({
  page,
}) => {
  await openExperiment(page);
  await range(page, "振幅", "0.6");
  expect((await snapshot(page)).previous?.A).toBe(0.3);
  await expect(page.locator(".compare")).toContainText("上一轮");
  await range(page, "振幅", "0");
  await page.getByRole("tab", { name: "看能量" }).click();
  await expect(page.locator(".energy-caption")).toContainText("动能 0%");
  await expect(page.locator(".energy-values")).not.toContainText("NaN");
  await page.getByLabel("动能", { exact: true }).uncheck();
  await page.getByLabel("弹性势能", { exact: true }).uncheck();
  await page.getByLabel("总能量", { exact: true }).uncheck();
  await expect(page.locator(".chart")).toHaveCount(1);
});
test("first home visit preloads an unopened experiment for offline refresh", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("link", { name: /弹簧振子/ }).click();
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  await range(page, "质量", "2");
  await page.reload();
  expect((await snapshotAfterLoad(page)).params.m).toBe(2);
  await page.getByRole("tab", { name: "看能量" }).click();
  await expect(page.locator(".energy-values")).toBeVisible();
});
test("small windows show a desktop requirement instead of a mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "请使用桌面大小的窗口" }),
  ).toBeVisible();
  await expect(
    page.getByText("PHY Lab 的实验台需要至少 1280 px 的窗口宽度。"),
  ).toBeVisible();
  await expect(page.locator(".toolbar")).toBeHidden();
  const response = await page.request.get("/experiments/missing.js");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("<html");
});

test("observation tabs support keyboard navigation without changing time", async ({
  page,
}) => {
  await openExperiment(page);
  await page.getByRole("button", { name: "动能 = 势能", exact: true }).click();
  const before = (await snapshot(page)).time;
  await page.getByRole("tab", { name: "看运动" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "看变化" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: "看变化" })).toBeFocused();
  expect((await snapshot(page)).time).toBe(before);
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "看能量" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("console content aligns with toolbar and experiment navigation is minimal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".card")).toBeVisible();
  await expect(page.locator(".hero, .method, .number")).toHaveCount(0);
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const toolbar = await page.locator(".toolbar").boundingBox();
    const grid = await page.locator(".grid").boundingBox();
    expect(grid!.x).toBe(toolbar!.x + 30);
    expect(grid!.width).toBe(toolbar!.width - 60 - 4);
  }
  await page.getByRole("textbox").fill("energy");
  await page.getByRole("link", { name: /弹簧振子/ }).click();
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开导航" })).toHaveCount(0);
  await expect(page.locator(".toolbar .brand")).toHaveCount(0);
  await expect(page.locator("phy-experiment-page .top")).toHaveCount(0);
  await expect(
    page
      .locator(".experiment-controls")
      .getByRole("button", { name: "▷ 播放", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "返回控制台" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("energy");
});

test.describe("toolbar API", () => {
  test.use({ serviceWorkers: "block" });

  test("experiment toolbar controls interact and cannot remount after disposal", async ({
    page,
  }) => {
    await page.route("**/manifest.json", async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.entry = "/toolbar-fixture.js";
      await route.fulfill({ response, json: manifest });
    });
    await page.route("**/toolbar-fixture.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `export async function mount(context) {
      const element = document.createElement('h1');
      element.textContent = 'Toolbar fixture';
      const controls = document.createElement('button');
      controls.textContent = 'Fixture control';
      controls.onclick = () => { element.textContent = 'Control clicked'; };
      context.toolbar.setControls(controls);
      window.fixtureContext = context;
      return { element, update() {}, pause() {}, snapshot() { return {}; }, dispose() {} };
    }`,
      }),
    );
    await page.goto("/#/experiments/spring-oscillator");
    const control = page.getByRole("button", { name: "Fixture control" });
    await expect(control).toBeVisible();
    await control.click();
    await expect(
      page.getByRole("heading", { name: "Control clicked" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "返回控制台" }).click();
    await expect(page.getByRole("textbox")).toBeVisible();
    await page.evaluate(() => {
      const context = (
        window as unknown as {
          fixtureContext: {
            toolbar: { setControls(element: HTMLElement): void };
          };
        }
      ).fixtureContext;
      const stale = document.createElement("button");
      stale.textContent = "Stale control";
      context.toolbar.setControls(stale);
    });
    await expect(
      page.getByRole("button", { name: "Stale control" }),
    ).toHaveCount(0);
    await expect(control).toHaveCount(0);
  });
});

test("spring toolbar and exploration preserve experiment actions", async ({
  page,
}) => {
  await openExperiment(page);
  await expect(
    page
      .locator(".toolbar")
      .getByRole("button", { name: "▷ 播放", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".controls phy-button")).toHaveCount(0);
  await expect(page.locator(".eyebrow, .model, .scene-stamp")).toHaveCount(0);
  await expect(page.getByText("两周期观察窗口", { exact: true })).toHaveCount(
    0,
  );
  await page.getByText("查看推导", { exact: true }).click();
  await expect(page.locator(".derivation p")).toBeVisible();
  await page.getByRole("tab", { name: "探索任务", exact: true }).click();
  await expect(page.locator(".task")).toHaveCount(3);
  const amplitude = (await snapshot(page)).params.A;
  await page.getByRole("button", { name: "振幅 × 2", exact: true }).click();
  expect((await snapshot(page)).params.A).toBe(amplitude * 2);
  await expect(page.locator(".task.completed")).toHaveCount(1);
  await expect(page.locator(".task").first()).toContainText(
    "周期不变，总能量变为四倍",
  );
  await expect(page.locator(".task").first().locator("h3")).toHaveCount(0);
  await page.getByRole("button", { name: "定位端点", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "看变化", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".task.completed")).toHaveCount(2);
  await page.getByRole("button", { name: "观察一周期", exact: true }).click();
  await expect(page.locator(".task-progress")).toBeVisible();
  await expect(page.locator(".task.completed")).toHaveCount(3);
  await expect(page.locator(".task").nth(2)).toContainText("两次");
  await page.getByRole("tab", { name: "公式", exact: true }).click();
  await expect(page.locator(".equation")).toContainText("E");
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await expect(
    page
      .locator(".toolbar")
      .getByRole("button", { name: "▷ Play", exact: true }),
  ).toBeVisible();
});

test("workspace scrollbar stays below toolbar and spring remains inside viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".card")).toBeVisible();
  const before = await page.locator(".toolbar").boundingBox();
  const gridBefore = await page.locator(".grid").boundingBox();
  await page.locator("phy-app").evaluate((el) => {
    const spacer = document.createElement("div");
    spacer.id = "scroll-fixture";
    spacer.style.height = "2000px";
    el.shadowRoot!.querySelector("main")!.append(spacer);
  });
  expect(await page.locator(".toolbar").boundingBox()).toEqual(before);
  expect((await page.locator(".grid").boundingBox())!.width).toBe(
    gridBefore!.width,
  );
  const scroll = await page.locator("phy-app").evaluate((el) => {
    const main = el.shadowRoot!.querySelector("main")!;
    return {
      top: main.getBoundingClientRect().top,
      width: getComputedStyle(main, "::-webkit-scrollbar").width,
    };
  });
  expect(scroll.top).toBe(66);
  expect(scroll.width).toBe("4px");
  await page.locator("#scroll-fixture").evaluate((el) => el.remove());
  await openExperiment(page);
  await expect(
    page.getByRole("slider", { name: "初相位", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".toolbar").getByRole("combobox", { name: "播放速度" }),
  ).toBeVisible();
  await expect(page.locator(".timeline span")).toHaveCount(3);
  const title = await page.locator(".heading-copy h1").boundingBox();
  const subtitle = await page.locator(".heading-copy .intro").boundingBox();
  expect(title!.y + title!.height).toBe(subtitle!.y + subtitle!.height);
  await expect(
    page.getByText("各箭头按自身峰值缩放", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".stage")
      .evaluate((el) => el.lastElementChild?.className),
  ).toBe("moments");
  await expect(
    page
      .locator(".stage .moments")
      .getByRole("checkbox", { name: "速度箭头", exact: true }),
  ).toBeVisible();

  for (const height of [720, 1000]) {
    await page.setViewportSize({ width: 1280, height });
    for (const mode of ["看运动", "看变化", "看能量"]) {
      await page.getByRole("tab", { name: mode, exact: true }).click();
      if (mode !== "看运动") {
        const options = await page.locator(".plot-top .toggles").boundingBox();
        const time = await page.locator(".plot-time").boundingBox();
        expect(
          Math.abs(
            options!.y + options!.height / 2 - time!.y - time!.height / 2,
          ),
        ).toBeLessThan(1);
      }

      await page.getByRole("tab", { name: "公式", exact: true }).click();
      const details = page.locator(".derivation");
      await details.evaluate((el) => ((el as HTMLDetailsElement).open = true));
      const momentButtons = await page.locator(".moment-buttons").boundingBox();
      const arrows = await page.locator(".moments .toggles").boundingBox();
      const footer = await page.locator(".moments").boundingBox();
      expect(arrows!.x + arrows!.width).toBe(footer!.x + footer!.width - 14);
      expect(
        Math.abs(
          momentButtons!.y +
            momentButtons!.height / 2 -
            arrows!.y -
            arrows!.height / 2,
        ),
      ).toBeLessThan(1);
      await expect(
        page.getByText("调整参数，看看什么发生了变化。", { exact: true }),
      ).toHaveCount(0);
      const bounds = await page.locator("phy-experiment-page").boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      const support = await page.locator(".support").boundingBox();
      expect(support!.y + support!.height).toBeLessThanOrEqual(height - 15);
      const dimensions = await page.locator("phy-app").evaluate((el) => {
        const main = el.shadowRoot!.querySelector("main")!;
        return {
          height: main.clientHeight,
          scroll: main.scrollHeight,
          body: document.documentElement.scrollHeight,
        };
      });
      expect(dimensions.scroll).toBe(dimensions.height);
      expect(dimensions.body).toBe(height);
    }
    await page.getByRole("tab", { name: "探索任务", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "观察一周期", exact: true }),
    ).toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "切换明暗" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "/tmp/phy-lab-spring-compact.png",
    fullPage: true,
  });
});

test("energy exploration requires playback and resets after seeking", async ({
  page,
}) => {
  await openExperiment(page);
  await range(page, "振幅", "0");
  await page.getByRole("tab", { name: "探索任务", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "观察一周期", exact: true }),
  ).toBeDisabled();
  await range(page, "振幅", "0.3");
  await page.getByRole("button", { name: "观察一周期", exact: true }).click();
  await range(page, "拖动时间游标", "1");
  await expect(page.locator(".task.completed")).toHaveCount(0);
  await expect(page.locator(".task-progress")).toHaveCount(0);
  await page.getByRole("button", { name: "观察一周期", exact: true }).click();
  await expect(page.locator(".task.completed")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "弹簧振子", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "探索任务", exact: true }).click();
  await expect(page.locator(".task.completed")).toHaveCount(1);
});

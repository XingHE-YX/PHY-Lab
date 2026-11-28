import { expect, test, type Locator, type Page } from "@playwright/test";
import { measure, presets } from "../model/electrostatics";

const route = "/#/experiments/electric-field-potential";
const title = /^(电场与电势|Electric field & potential)$/;
const read = (page: Page, key: string) =>
  page.locator(`[data-readout="${key}"]`);
const probe = (page: Page) =>
  page.getByRole("group", { name: "探针 P", exact: true });

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function loadScenario(page: Page, id: string) {
  await page.getByRole("tab", { name: "探索", exact: true }).click();
  await page.locator(`[data-scenario="${id}"]`).click();
  await expect(
    page.getByRole("tab", { name: "公式", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
}

async function center(handle: Locator) {
  const box = (await handle.locator(".handle-core").boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  handle: Locator,
  deltaX: number,
  deltaY: number,
) {
  const points = await handle.evaluate(
    (node, [dx, dy]) => {
      const matrix = (node as SVGGraphicsElement).getScreenCTM()!;
      return [
        [0, 0],
        [56 * dx, -56 * dy],
      ].map(([x, y]) => {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        return { x: point.x, y: point.y };
      });
    },
    [deltaX, deltaY],
  );
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 4 });
  await page.mouse.up();
}

test("catalog opens the dipole and reverses the lesson with equal positive charges", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("searchbox").fill("等势线");
  await page.getByRole("link", { name: /电场与电势/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(read(page, "potential")).toHaveText("0.00 V");
  const strength = measure({ x: 0, y: 0 }, presets.dipole)!.magnitude;
  await expect(read(page, "strength")).toHaveText(`${strength.toFixed(2)} V/m`);
  await expect(page.locator('[data-case="zeroPotential"]')).toBeVisible();
  await expect(page.locator('.contour[data-level="0"]')).toHaveCount(1);
  await expect(page.locator(".component-arrow")).toHaveCount(2);
  await expect(
    page.locator('[data-contribution="first"] [data-component="potential"]'),
  ).toHaveText("25.68");
  await expect(
    page.locator('[data-contribution="second"] [data-component="potential"]'),
  ).toHaveText("-25.68");
  await probe(page).press("Shift+ArrowUp");
  await expect(probe(page)).toHaveAttribute("data-world-y", "0.5");
  await expect(read(page, "potential")).toHaveText("0.00 V");
  const along = measure({ x: 0, y: 0.5 }, presets.dipole)!.magnitude;
  await expect(read(page, "strength")).toHaveText(`${along.toFixed(2)} V/m`);
  expect(along).toBeLessThan(strength);
  await loadScenario(page, "like");
  await expect(page.locator('[data-case="zeroField"]')).toBeVisible();
  await expect(read(page, "potential")).toHaveText("51.36 V");
  await expect(read(page, "strength")).toHaveText("0.00 V/m");
  await expect(page.locator(".probe-arrow")).toHaveCount(0);
  await expect(page.locator(".component-arrow")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("drag both charges, update geometry, recover tilted zero line, and drag slice chart", async ({
  page,
}) => {
  await open(page);
  const first = page.getByRole("group", { name: "电荷 A", exact: true });
  const second = page.getByRole("group", { name: "电荷 B", exact: true });
  const zero = page.locator('.contour[data-level="0"]');
  const initial = await zero.getAttribute("d");
  await drag(page, first, 0, 1);
  await expect(first).toHaveAttribute("data-world-y", "1");
  await drag(page, second, 0, -0.5);
  await expect(second).toHaveAttribute("data-world-y", "-0.5");
  await expect(zero).not.toHaveAttribute("d", initial!);
  await page.getByRole("button", { name: "探针移到中点", exact: true }).click();
  await expect(probe(page)).toHaveAttribute("data-world-y", "0.25");
  await expect(read(page, "potential")).toHaveText("0.00 V");
  await expect(page.locator('[data-case="zeroPotential"]')).toBeVisible();
  const fieldY = Number(
    await page.locator(".probe-arrow").getAttribute("data-field-y"),
  );
  expect(fieldY).toBeLessThan(0);
  await page.getByRole("tab", { name: "电势剖面", exact: true }).click();
  await expect(page.locator(".slice-guide")).toBeVisible();
  await expect(page.locator(".profile-trace")).toHaveCount(3);
  expect(
    Number(await page.locator(".profile-probe").getAttribute("data-potential")),
  ).toBeCloseTo(0, 12);

  // Dragging along the potential slice chart moves probe P
  const chartBox = await page.locator(".slice-chart").boundingBox();
  expect(chartBox).not.toBeNull();
  const beforeX = Number(await probe(page).getAttribute("data-world-x"));
  await page.mouse.click(
    chartBox!.x + chartBox!.width * 0.78,
    chartBox!.y + chartBox!.height * 0.5,
  );
  expect(
    Number(await probe(page).getAttribute("data-world-x")),
  ).not.toBeCloseTo(beforeX, 2);
});

test("moving the probe onto a charged point masks every readout; a zero source does not mask", async ({
  page,
}) => {
  await open(page);
  const first = page.getByRole("group", { name: "电荷 A", exact: true });
  const start = await center(probe(page));
  const end = await center(first);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('[data-case="masked"]')).toBeVisible();
  for (const key of ["potential", "strength", "fieldX", "fieldY"])
    await expect(read(page, key)).toHaveText("—");
  await expect(page.locator(".probe-arrow")).toHaveCount(0);
  for (const label of ["电荷 A", "电荷 B"]) {
    await page
      .getByRole("slider", { name: label, exact: true })
      .evaluate((node) => {
        (node as HTMLInputElement).value = "0";
        node.dispatchEvent(new Event("input", { bubbles: true }));
      });
  }
  await expect(page.locator('[data-case="zeroBoth"]')).toBeVisible();
  await expect(read(page, "potential")).toHaveText("0.00 V");
  await expect(page.locator(".contour")).toHaveCount(0);
  await expect(page.locator(".excluded-zone")).toHaveCount(0);
});

test("layer toggles and profile persist without moving the probe or changing its reading", async ({
  page,
}) => {
  await open(page);
  await probe(page).press("Shift+ArrowRight");
  const potential = await read(page, "potential").textContent();
  await page.getByRole("checkbox", { name: "电场箭头", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "等势线", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "分量矢量", exact: true }).uncheck();
  await page.getByRole("tab", { name: "电势剖面", exact: true }).click();
  await expect(page.locator(".field-arrows")).toHaveCount(0);
  await expect(page.locator(".contour")).toHaveCount(0);
  await expect(page.locator(".component-arrow")).toHaveCount(0);
  await expect(page.locator(".probe-arrow")).toBeVisible();
  await page.reload();
  await expect(probe(page)).toHaveAttribute("data-world-x", "0.5");
  await expect(read(page, "potential")).toHaveText(potential!.trim());
  await expect(
    page.getByRole("checkbox", { name: "电场箭头", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "等势线", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "分量矢量", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("tab", { name: "电势剖面", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`field map and readings fit ${viewport.width}×${viewport.height} in both locales and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page);
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .derived-metrics, .parameter-footer, .scene-wrap, .layer-controls, .readouts, .shortcuts, .contributions, .superposition-visual, .slice-panel, .model-formula, phy-math [part="formula"]',
    );
    for (const language of ["zh", "en"]) {
      if (language === "en")
        await page.getByRole("button", { name: "切换语言" }).click();
      for (const theme of ["light", "dark"]) {
        if (theme === "dark")
          await page
            .getByRole("button", { name: /切换明暗|Toggle theme/ })
            .click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const name of language === "en"
          ? ["Potential slice", "Probe sums"]
          : ["电势剖面", "探针叠加"]) {
          await page.getByRole("tab", { name, exact: true }).click();
          await expect(page.locator(".model-formula .math-error")).toHaveCount(
            0,
          );
          const overflow = await keys.evaluateAll((nodes) =>
            nodes.flatMap((node) => {
              const rect = node.getBoundingClientRect();
              return rect.bottom > innerHeight + 1 ||
                rect.right > innerWidth + 1 ||
                rect.top < 0 ||
                rect.left < 0 ||
                node.scrollHeight > node.clientHeight + 1 ||
                node.scrollWidth > node.clientWidth + 1
                ? [
                    `${node.className}: ${rect.width}×${rect.height} (${node.scrollWidth}×${node.scrollHeight})`,
                  ]
                : [];
            }),
          );
          expect(overflow).toEqual([]);
          expect(await scene.boundingBox()).toEqual(bounds);
        }
        if (theme === "dark")
          await page
            .getByRole("button", { name: /切换明暗|Toggle theme/ })
            .click();
      }
    }
    const help = page.getByRole("button", {
      name: "Model & controls",
      exact: true,
    });
    await help.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Model & controls" }),
    ).toContainText("perpendicular bisector");
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  });
}

test("first offline visit and reload preserve the selected configuration", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("tab", { name: "缓存设置", exact: true }).click();
  await expect(page.getByText("✓ 可离线使用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await context.setOffline(true);
  await open(page);
  await loadScenario(page, "unequal");
  const value = await read(page, "potential").textContent();
  await page.reload();
  await expect(
    page.getByRole("slider", { name: "电荷 B", exact: true }),
  ).toHaveValue("-2");
  await expect(read(page, "potential")).toHaveText(value!.trim());
});

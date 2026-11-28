import { expect, test, type Page } from "@playwright/test";

const route = "/#/experiments/thin-lens-imaging";
const title = /^(薄透镜成像|Thin-lens imaging)$/;
const read = (page: Page, key: string) =>
  page.locator(`[data-readout="${key}"]`);
const objectHandle = (page: Page) =>
  page.getByRole("slider", { name: "物体位置", exact: true });
const virtualExtensions = (page: Page) =>
  page.getByRole("checkbox", { name: "虚像延长线", exact: true });

async function open(page: Page) {
  await page.goto(route);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("catalog opens real and virtual images with signed distances, magnification and proper extensions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("薄透镜");
  await page.getByRole("link", { name: /薄透镜成像/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(read(page, "distance")).toHaveText("+37.33 cm");
  await expect(read(page, "magnification")).toHaveText("-1.33 ×");
  await expect(page.locator('[data-image="real"]')).toBeVisible();
  await expect(page.locator(".backward")).toHaveCount(0);
  await expect(virtualExtensions(page)).toBeDisabled();
  await page.getByRole("button", { name: "焦点外 · 2f", exact: true }).click();
  await expect(read(page, "distance")).toHaveText("+32.00 cm");
  await expect(read(page, "magnification")).toHaveText("-1.00 ×");
  await page.getByRole("button", { name: "焦点内", exact: true }).click();
  await expect(read(page, "distance")).toHaveText("-26.67 cm");
  await expect(read(page, "magnification")).toHaveText("+2.67 ×");
  await expect(page.locator('[data-image="virtual"]')).toBeVisible();
  await expect(page.locator(".backward")).toHaveCount(3);
  const scene = await page.locator(".scene-wrap").boundingBox();
  await virtualExtensions(page).uncheck();
  await expect(page.locator(".backward")).toHaveCount(0);
  await expect(read(page, "distance")).toHaveText("-26.67 cm");
  expect(await page.locator(".scene-wrap").boundingBox()).toEqual(scene);
  await page.getByRole("slider", { name: "焦距 f", exact: true }).press("Home");
  await expect(read(page, "focal")).toHaveText("8.0 cm");
  await expect(read(page, "object")).toHaveText("10.0 cm");
  await expect(read(page, "distance")).toHaveText("+40.00 cm");
  await expect(page.locator('[data-image="real"]')).toBeVisible();
});

test("at focus, outgoing rays are mutually parallel and no finite image is fabricated", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await page.getByRole("button", { name: "恰在焦点", exact: true }).click();
  await expect(read(page, "object")).toHaveText("16.0 cm");
  await expect(page.locator('[data-regime="afocal"]')).toBeVisible();
  await expect(page.locator(".outgoing")).toHaveCount(2);
  const slopes = await page
    .locator(".outgoing")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-slope"))),
    );
  expect(slopes[0]).toBe(slopes[1]);
  expect(slopes[0]).not.toBe(0);
  await expect(page.locator("[data-image]")).toHaveCount(0);
  await expect(page.locator(".backward")).toHaveCount(0);
  await expect(read(page, "distance")).toHaveText("—");
  await expect(read(page, "magnification")).toHaveText("—");
  await expect(page.locator(".notice")).toContainText("没有有限的像");
  expect(errors).toEqual([]);
});

test("dragging and arrow keys move the object through focus without changing focal length", async ({
  page,
}) => {
  await open(page);
  const handle = objectHandle(page);
  const points = await handle.evaluate((node) => {
    const group = node as SVGGraphicsElement;
    const hit = group.querySelector(".object-hit") as SVGRectElement;
    const matrix = group.getScreenCTM()!;
    return [0, 3.42 * 18].map((shift) => {
      const point = new DOMPoint(
        hit.x.baseVal.value + hit.width.baseVal.value / 2 + shift,
        hit.y.baseVal.value + hit.height.baseVal.value / 2,
      ).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 5 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "10");
  await expect(
    page.getByRole("slider", { name: "物距 u", exact: true }),
  ).toHaveValue("10");
  await expect(page.locator('[data-regime="virtual"]')).toBeVisible();
  await handle.press("Shift+ArrowLeft");
  await handle.press("ArrowLeft");
  await handle.press("ArrowLeft");
  await expect(page.locator('[data-regime="afocal"]')).toBeVisible();
  await expect(read(page, "focal")).toHaveText("16.0 cm");
});

test("offscreen images retain finite values and the state survives reload", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "恰在焦点", exact: true }).click();
  await objectHandle(page).press("ArrowRight");
  await expect(read(page, "distance")).toHaveText("-496.00 cm");
  await expect(read(page, "magnification")).toHaveText("+32.00 ×");
  await expect(page.locator(".notice")).toContainText("像超出画面");
  await expect(page.locator("[data-image]")).toHaveCount(0);
  await expect(page.locator('.outgoing[data-ray="frontFocus"]')).toHaveCount(0);
  await virtualExtensions(page).uncheck();
  await page.getByRole("tab", { name: "三种情况", exact: true }).click();
  await page.reload();
  await expect(read(page, "object")).toHaveText("15.5 cm");
  await expect(virtualExtensions(page)).not.toBeChecked();
  await expect(
    page.getByRole("tab", { name: "三种情况", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-scenario]")).toHaveCount(3);
  await expect(page.locator('[data-scenario="outside"]')).toContainText(
    "+32.00",
  );
  await expect(page.locator('[data-scenario="atFocus"]')).toContainText(
    "平行出射光",
  );
  await objectHandle(page).press("ArrowLeft");
  await objectHandle(page).press("ArrowLeft");
  await expect(read(page, "distance")).toHaveText("+528.00 cm");
  await expect(read(page, "magnification")).toHaveText("-32.00 ×");
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`scene and comparison fit ${viewport.width}×${viewport.height} in both locales and themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page);
    const scene = page.locator(".scene-wrap");
    const bounds = await scene.boundingBox();
    const keys = page.locator(
      '.heading, .panel, .parameters, .presets, .footer, .scene-wrap, .legend, .notice, .readouts, .detail-card, .comparison-panel, .model-formula, phy-math [part="formula"]',
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
        await page
          .getByRole("button", {
            name: language === "en" ? "At focus" : "恰在焦点",
            exact: true,
          })
          .click();
        for (const name of language === "en"
          ? ["Three cases", "Image details"]
          : ["三种情况", "成像读数"]) {
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
    ).toContainText("not necessarily to the optical axis");
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  });
}

test("first visit and reload work offline with the selected focal geometry", async ({
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
  await page.getByRole("slider", { name: "焦距 f", exact: true }).press("End");
  await page.getByRole("button", { name: "恰在焦点", exact: true }).click();
  await page.reload();
  await expect(read(page, "focal")).toHaveText("24.0 cm");
  await expect(read(page, "object")).toHaveText("24.0 cm");
  await expect(page.locator('[data-regime="afocal"]')).toBeVisible();
});

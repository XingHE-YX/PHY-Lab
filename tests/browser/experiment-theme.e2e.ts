import { test, expect, type Page } from "@playwright/test";
import type { ExperimentPage } from "../../src/pages/experiment-page";

async function toggle(page: Page, dark: boolean) {
  if (
    ((await page.locator("html").getAttribute("data-theme")) === "dark") !==
    dark
  )
    await page.getByRole("button", { name: "切换明暗", exact: true }).click();
}
test("wave thumbnails follow the app theme against the system preference", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  const brightness = async () =>
    page.locator(".thumb").evaluateAll(async (nodes) => {
      const values: number[] = [];
      for (const node of nodes as HTMLImageElement[]) {
        if (!/chladni-plate|mechanical-waves/.test(node.src)) continue;
        await node.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(node, 0, 0, 640, 360);
        const pixel = ctx.getImageData(2, 2, 1, 1).data;
        values.push((pixel[0] + pixel[1] + pixel[2]) / 3);
      }
      return values;
    });
  await toggle(page, false);
  await expect
    .poll(brightness)
    .toEqual([expect.any(Number), expect.any(Number)]);
  expect((await brightness()).every((v) => v > 220)).toBe(true);
  await toggle(page, true);
  await expect
    .poll(async () => (await brightness()).every((v) => v < 40))
    .toBe(true);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  expect((await brightness()).every((v) => v < 40)).toBe(true);
});
for (const fallback of [false, true]) {
  test(`Chladni theme changes materials without changing simulation (${fallback ? "Canvas" : "WebGL"})`, async ({
    page,
  }) => {
    if (fallback)
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          type: string,
          ...args: unknown[]
        ) {
          if (type === "webgl2") return null;
          return Reflect.apply(original, this, [type, ...args]);
        } as typeof original;
      });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#/experiments/chladni-plate");
    await expect(page.locator(fallback ? ".fallback" : ".webgl")).toBeVisible();
    await page
      .getByRole("slider", { name: "振动周期数", exact: true })
      .fill("12.12");
    const state = async () =>
      page.locator("phy-experiment-page").evaluate((node) => {
        const instance = (node as ExperimentPage).instance!;
        const element = instance.element as unknown as {
          sand: { positions: Float32Array };
          playing: boolean;
        };
        return {
          snapshot: instance.snapshot(),
          sand: Array.from(element.sand.positions),
          playing: element.playing,
        };
      });
    const material = async () =>
      page.locator("phy-experiment-page").evaluate((node) => {
        const element = (node as ExperimentPage).instance!
          .element as unknown as { draw(): void; renderRoot: ShadowRoot };
        element.draw();
        const canvas = element.renderRoot.querySelector<HTMLCanvasElement>(
          "canvas:not([hidden])",
        )!;
        const gl = canvas.getContext("webgl2");
        const pixels = new Uint8Array(4);
        if (gl)
          gl.readPixels(
            Math.floor(canvas.width / 2 + 40),
            Math.floor(canvas.height / 2 + 40),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
        else
          pixels.set(
            canvas
              .getContext("2d")!
              .getImageData(
                Math.floor(canvas.width / 2 + 40),
                Math.floor(canvas.height / 2 + 40),
                1,
                1,
              ).data,
          );
        return (pixels[0] + pixels[1] + pixels[2]) / 3;
      });
    const before = await state();
    await toggle(page, false);
    expect(await material()).toBeGreaterThan(160);
    expect(await state()).toEqual(before);
    await toggle(page, true);
    expect(await material()).toBeLessThan(90);
    expect(await state()).toEqual(before);
    await toggle(page, false);
    expect(await material()).toBeGreaterThan(160);
    expect(await state()).toEqual(before);
  });
}

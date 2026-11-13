import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
async function fixture(page: Page) {
  await page.route("**/manifest.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    const oldEntry = manifest.entry;
    manifest.apiVersion = 2;
    manifest.apiRevision = 0;
    manifest.entry = "/dialog-fixture.js";
    manifest.resources = manifest.resources.map((r: { url: string }) =>
      r.url === oldEntry ? { ...r, url: manifest.entry } : r,
    );
    await route.fulfill({ response, json: manifest });
  });
  await page.route("**/dialog-fixture.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export async function mount(context) {
    const element = document.createElement('div');
    const trigger = document.createElement('button');
    trigger.textContent = 'Open fixture dialog';
    trigger.onclick = () => {
      const content = document.createElement('div');
      const inside = document.createElement('button');
      inside.textContent = 'Inside fixture dialog';
      content.append(inside);
      const handle = context.dialog.open({ title: 'Fixture dialog', content, width: 'md', initialFocus: inside, returnFocus: trigger });
      window.dialogFixture.handle = handle;
      handle.closed.then(result => window.dialogFixture.result = result);
    };
    element.append(trigger);
    window.dialogFixture = { api: context.dialog };
    return { element, update() {}, pause() {}, snapshot() { return {}; }, dispose() {} };
  }`,
    }),
  );
  await page.goto("/#/experiments/spring-oscillator");
  await page.getByRole("button", { name: "Open fixture dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Fixture dialog" }),
  ).toBeVisible();
}

test("dialog supports presets, custom widths and content identity", async ({
  page,
}) => {
  await fixture(page);
  const dialog = page.getByRole("dialog", { name: "Fixture dialog" });
  await expect(dialog).toHaveCSS("width", "720px");
  await expect(
    page.getByRole("button", { name: "Inside fixture dialog" }),
  ).toBeFocused();
  for (const [width, expected] of [
    ["sm", 440],
    ["lg", 960],
    ["xl", 1200],
    [880, 880],
  ] as const) {
    await page.evaluate(
      (value) => (window as any).dialogFixture.handle.update({ width: value }),
      width,
    );
    await expect(dialog).toHaveCSS("width", `${expected}px`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() =>
    (window as any).dialogFixture.handle.update({ width: 2000 }),
  );
  await expect(dialog).toHaveCSS("width", "1248px");
  await expect(
    page.getByRole("button", { name: "Inside fixture dialog" }),
  ).toBeFocused();
  await page.evaluate(() =>
    (window as any).dialogFixture.handle.update({ title: "Updated dialog" }),
  );
  await expect(
    page.getByRole("dialog", { name: "Updated dialog" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open fixture dialog" }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => (window as any).dialogFixture.result.reason),
  ).toBe("escape");
});

test("backdrop policy and programmatic results use the same lifecycle", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() =>
    (window as any).dialogFixture.handle.update({ closeOnBackdrop: false }),
  );
  await page.mouse.click(1, 1);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() =>
    (window as any).dialogFixture.handle.update({ closeOnBackdrop: true }),
  );
  await page.mouse.click(1, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).dialogFixture.result.reason),
  ).toBe("backdrop");
  await page.getByRole("button", { name: "Open fixture dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() =>
    (window as any).dialogFixture.handle.close("confirmed"),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).dialogFixture.result),
  ).toEqual({ reason: "close", value: "confirmed" });
});

test("leaving the experiment aborts dialogs and rejects later opens", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).dialogFixture.result.reason),
  ).toBe("abort");
  expect(
    await page.evaluate(() => {
      try {
        (window as any).dialogFixture.api.open({
          title: "Late",
          content: document.createElement("div"),
        });
        return "opened";
      } catch (error) {
        return (error as DOMException).name;
      }
    }),
  ).toBe("AbortError");
});

test("aborting before the dialog finishes rendering settles its result", async ({
  page,
}) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const fixture = (window as any).dialogFixture;
    fixture.handle.close();
    const pending = fixture.api.open({
      title: "Pending",
      content: document.createElement("div"),
    });
    location.hash = "#/";
    return pending.closed;
  });
  expect(result.reason).toBe("abort");
  await expect(page.locator("phy-dialog")).toHaveCount(0);
});

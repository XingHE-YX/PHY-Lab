import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
async function install(page: Page, apiVersion: number, apiRevision?: number) {
  let imported = false;
  await page.route("**/manifest.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    const oldEntry = manifest.entry;
    manifest.apiVersion = apiVersion;
    if (apiRevision === undefined) delete manifest.apiRevision;
    else manifest.apiRevision = apiRevision;
    manifest.author = {
      name: "Fixture author",
      url: "https://example.com/author",
    };
    manifest.repository = "https://example.com/repository";
    manifest.license = "Apache-2.0";
    manifest.entry = "/protocol-fixture.js";
    manifest.resources = manifest.resources.map((resource: { url: string }) =>
      resource.url === oldEntry
        ? { ...resource, url: manifest.entry }
        : resource,
    );
    await route.fulfill({ response, json: manifest });
  });
  await page.route("**/protocol-fixture.js", (route) => {
    imported = true;
    return route.fulfill({
      contentType: "text/javascript",
      body: `export async function mount(context) {
      window.protocolFixture = { protocol: context.protocol ?? null, hasDialog: typeof context.dialog?.open === 'function', info: context.experiment ?? null };
      if (window.waitForProtocolMount) await new Promise(resolve => window.releaseProtocolMount = resolve);
      const element = document.createElement('h1');
      element.textContent = 'Protocol fixture';
      return { element, update(next) { if (window.waitForProtocolMount) window.protocolFixture.locale = next.locale; }, pause() {}, snapshot() { return {}; }, dispose() {} };
    }`,
    });
  });
  return () => imported;
}

for (const apiVersion of [1, 2]) {
  test(`protocol v${apiVersion} mounts through its own context`, async ({
    page,
  }) => {
    await install(page, apiVersion);
    await page.goto("/#/experiments/spring-oscillator");
    await expect(
      page.getByRole("heading", { name: "Protocol fixture" }),
    ).toBeVisible();
    const received = await page.evaluate(() => (window as any).protocolFixture);
    if (apiVersion === 1)
      expect(received).toEqual({
        protocol: null,
        hasDialog: false,
        info: null,
      });
    else {
      expect(received.protocol).toMatchObject({ version: 2, revision: 0 });
      expect(received.protocol.capabilities.components).toContain("phy-tabs");
      expect(received.hasDialog).toBe(true);
      expect(received.info).toMatchObject({
        apiVersion: 2,
        apiRevision: 0,
        stateVersion: 2,
        author: { name: "Fixture author" },
        repository: "https://example.com/repository",
        license: "Apache-2.0",
      });
    }
  });
}

test("a newer revision is rejected before importing the experiment", async ({
  page,
}) => {
  const imported = await install(page, 2, 1);
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByText("Update the platform: protocol v2 revision 1 is required", {
      exact: true,
    }),
  ).toBeVisible();
  expect(imported()).toBe(false);
});

test("an unknown main protocol is rejected instead of falling back", async ({
  page,
}) => {
  const imported = await install(page, 99, 0);
  await page.goto("/#/experiments/spring-oscillator");
  await expect(
    page.getByText("Unsupported experiment protocol v99", { exact: true }),
  ).toBeVisible();
  expect(imported()).toBe(false);
});

test("language changes during asynchronous mount reach the new instance", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).waitForProtocolMount = true;
  });
  await install(page, 2);
  await page.goto("/#/experiments/spring-oscillator");
  await page.waitForFunction(
    () => typeof (window as any).releaseProtocolMount === "function",
  );
  await page.getByRole("button", { name: "切换语言", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.evaluate(() => (window as any).releaseProtocolMount());
  await expect(
    page.getByRole("heading", { name: "Protocol fixture" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).protocolFixture.locale),
  ).toBe("en");
});

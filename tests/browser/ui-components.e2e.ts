import { expect, test } from "@playwright/test";

test("inputs support arbitrary slots, native forms, reset and one event per edit", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.id = "controls-fixture";
    form.innerHTML = `<phy-input name="query" label="Fixture query" required><span slot="start">Prefix</span><button type="button" slot="end">Suffix action</button></phy-input>
      <phy-input name="password" type="password" label="Fixture password" autocomplete="current-password"></phy-input>
      <phy-checkbox name="trail">Fixture trail</phy-checkbox>
      <phy-switch name="sound" label="Fixture sound"></phy-switch>
      <phy-select name="speed" label="Fixture speed"></phy-select>
      <phy-slider name="position" label="Fixture position" value="10"></phy-slider>`;
    const select = form.querySelector("phy-select") as HTMLElement & {
      options: unknown[];
      value: string;
    };
    select.options = [
      { value: "1", label: "1×" },
      { value: "0.5", label: "0.5×" },
    ];
    select.value = "1";
    document.body.append(form);
    (window as any).fixtureEvents = [];
    form
      .querySelector("phy-input")!
      .addEventListener("input", (e) =>
        (window as any).fixtureEvents.push(e.target === e.currentTarget),
      );
  });
  const fixture = page.locator("#controls-fixture");
  await expect(fixture.getByText("Prefix")).toBeVisible();
  await expect(
    fixture.getByRole("button", { name: "Suffix action" }),
  ).toBeVisible();
  expect(
    await fixture.evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(false);
  await fixture.getByRole("textbox", { name: "Fixture query" }).fill("physics");
  expect(await page.evaluate(() => (window as any).fixtureEvents)).toEqual([
    true,
  ]);
  await fixture.getByLabel("Fixture password").fill("test-password");
  await fixture.getByLabel("Fixture trail", { exact: true }).check();
  await fixture.locator("phy-checkbox").evaluate((el) => {
    el.textContent = "Translated trail";
  });
  await expect(
    fixture.getByLabel("Translated trail", { exact: true }),
  ).toBeChecked();
  await fixture.getByRole("switch", { name: "Fixture sound" }).check();
  await fixture
    .getByRole("combobox", { name: "Fixture speed" })
    .selectOption("0.5");
  await fixture.getByRole("slider", { name: "Fixture position" }).focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await fixture.evaluate((form) =>
      Object.fromEntries(new FormData(form as HTMLFormElement)),
    ),
  ).toEqual({
    query: "physics",
    password: "test-password",
    trail: "on",
    sound: "on",
    speed: "0.5",
    position: "11",
  });
  expect(
    await fixture.evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(true);
  await fixture.evaluate((form) => (form as HTMLFormElement).reset());
  await expect(
    fixture.getByRole("textbox", { name: "Fixture query" }),
  ).toHaveValue("");
  await expect(
    fixture.getByRole("checkbox", { name: "Translated trail" }),
  ).not.toBeChecked();
  await expect(
    fixture.getByRole("slider", { name: "Fixture position" }),
  ).toHaveValue("10");
});

test("fieldset disabling reaches controls and removes their submitted values", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.id = "disabled-fixture";
    form.innerHTML =
      '<fieldset><phy-input name="value" label="Disabled fixture" value="saved"></phy-input></fieldset>';
    document.body.append(form);
  });
  const input = page.getByRole("textbox", { name: "Disabled fixture" });
  await expect(input).toBeEnabled();
  await page
    .locator("#disabled-fixture fieldset")
    .evaluate((el) => ((el as HTMLFieldSetElement).disabled = true));
  await expect(input).toBeDisabled();
  expect(
    await page
      .locator("#disabled-fixture")
      .evaluate((form) => [...new FormData(form as HTMLFormElement)]),
  ).toEqual([]);
  await page
    .locator("#disabled-fixture fieldset")
    .evaluate((el) => ((el as HTMLFieldSetElement).disabled = false));
  await expect(input).toBeEnabled();
});

test("tabs own valid panel associations and radio groups share keyboard selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const tabs = document.createElement("phy-tabs") as HTMLElement & {
      items: unknown[];
      value: string;
      label: string;
    };
    tabs.label = "Fixture views";
    tabs.items = [
      { value: "first", label: "First view" },
      { value: "disabled", label: "Disabled view", disabled: true },
      { value: "last", label: "Last view" },
    ];
    tabs.value = "first";
    (window as any).tabEvents = { change: 0, activate: 0 };
    for (const type of ["change", "activate"])
      tabs.addEventListener(type, () => (window as any).tabEvents[type]++);
    tabs.innerHTML =
      '<p slot="first">First content</p><p slot="last">Last content</p>';
    const radio = document.createElement("phy-radio-group") as HTMLElement & {
      options: unknown[];
      value: string;
      label: string;
    };
    radio.label = "Fixture boundary";
    radio.setAttribute("variant", "segmented");
    radio.options = [
      { value: "fixed", label: "Fixture fixed" },
      { value: "free", label: "Fixture free" },
    ];
    radio.value = "fixed";
    document.body.append(tabs, radio);
  });
  await page.getByRole("tab", { name: "First view" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Last view" })).toBeFocused();
  expect(await page.evaluate(() => (window as any).tabEvents)).toEqual({
    change: 1,
    activate: 1,
  });
  await page.getByRole("tab", { name: "Last view" }).click();
  expect(await page.evaluate(() => (window as any).tabEvents)).toEqual({
    change: 1,
    activate: 2,
  });
  await expect(page.getByRole("tabpanel", { name: "Last view" }))
    .toMatchAriaSnapshot(`
    - tabpanel "Last view":
      - paragraph: Last content
  `);
  await expect(page.getByText("First content")).not.toBeVisible();
  expect(
    await page
      .getByRole("tab", { name: "Last view" })
      .evaluate(
        (tab) =>
          (tab.getRootNode() as ShadowRoot)
            .querySelector?.(`#${tab.getAttribute("aria-controls")}`)
            ?.getAttribute("aria-labelledby") === tab.id,
      ),
  ).toBe(true);
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "First view" })).toBeFocused();
  await page.getByRole("radio", { name: "Fixture free" }).click();
  await expect(page.getByRole("radio", { name: "Fixture free" })).toBeChecked();
  await page.getByRole("radio", { name: "Fixture fixed" }).click();
  await page.getByRole("radio", { name: "Fixture fixed" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Fixture free" })).toBeChecked();
});

test("progress remains determinate and math keeps accessible output", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const progress = document.createElement("phy-progress");
    progress.setAttribute("label", "Fixture progress");
    progress.setAttribute("value", "125");
    const formula = document.createElement("phy-math");
    formula.setAttribute("source", String.raw`T=2\pi\sqrt{m/k}`);
    document.body.append(progress, formula);
  });
  await expect(
    page.getByRole("progressbar", { name: "Fixture progress" }),
  ).toHaveAttribute("value", "100");
  await expect(page.locator("phy-math math")).toHaveAttribute(
    "xmlns",
    "http://www.w3.org/1998/Math/MathML",
  );
  await expect(page.locator("phy-math .math-error")).toHaveCount(0);
});

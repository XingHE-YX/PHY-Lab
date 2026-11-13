import type { Page } from "@playwright/test";
export type SettingsPage = "appearance" | "cache" | "about" | "experiment";
export async function settingsPage(page: Page, target: SettingsPage) {
  const dialog = page.getByRole("dialog", { name: /^(设置|Settings)$/ });
  if (!(await dialog.isVisible()))
    await page
      .getByRole("button", { name: /^(设置|Settings)$/, exact: true })
      .click();
  const names = {
    appearance: /^(外观|Appearance)$/,
    cache: /^(缓存设置|Cache settings)$/,
    about: /^(关于|About)$/,
    experiment: /^(实验设置|Experiment settings)$/,
  };
  await dialog.getByRole("tab", { name: names[target] }).click();
  return dialog;
}

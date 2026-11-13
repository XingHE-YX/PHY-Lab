import { expect, test } from "bun:test";
import { dialogWidth } from "../../src/ui/components/dialog-width";

test("dialog presets and custom widths always respect the viewport", () => {
  expect(dialogWidth()).toBe("min(720px, calc(100vw - 32px))");
  expect(dialogWidth("sm")).toBe("min(440px, calc(100vw - 32px))");
  expect(dialogWidth("lg")).toBe("min(960px, calc(100vw - 32px))");
  expect(dialogWidth("xl")).toBe("min(1200px, calc(100vw - 32px))");
  expect(dialogWidth("full")).toBe("calc(100vw - 32px)");
  expect(dialogWidth(880)).toBe("min(880px, calc(100vw - 32px))");
  for (const width of [0, -1, Infinity, NaN, "bad"])
    expect(() => dialogWidth(width as number)).toThrow();
});

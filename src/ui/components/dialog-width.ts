import type { DialogWidth } from "../../infra/platform/protocols/v2/api/dialog";
const widths = { sm: 440, md: 720, lg: 960, xl: 1200 } as const;
export function dialogWidth(width: DialogWidth = "md"): string {
  if (width === "full") return "calc(100vw - 32px)";
  const pixels = typeof width === "number" ? width : widths[width];
  if (!Number.isFinite(pixels) || pixels <= 0)
    throw new TypeError(
      "Dialog width must be a preset or a finite positive number",
    );
  return `min(${pixels}px, calc(100vw - 32px))`;
}

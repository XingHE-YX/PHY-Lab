export const limits = {
  focal: { min: 8, max: 24, step: 0.5 },
  object: { min: 5, max: 72, step: 0.5 },
} as const;
export type Parameter = keyof typeof limits;
export type Parameters = Record<Parameter, number>;
export const defaults: Parameters = { focal: 16, object: 28 };
export const objectHeight = 2.4;
export const aperture = 8;

export const scenarios = ["outside", "inside", "atFocus"] as const;
export type Scenario = (typeof scenarios)[number];

export type Image =
  | { kind: "afocal"; distance: null; magnification: null; height: null }
  | {
      kind: "real" | "virtual";
      distance: number;
      magnification: number;
      height: number;
    };

export type RayKind = "parallel" | "center" | "frontFocus";
export interface Ray {
  kind: RayKind;
  lensHeight: number;
  slope: number;
}

export function parameterValue(key: Parameter, raw: unknown) {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return defaults[key];
  const { min, max, step } = limits[key];
  return Math.round(Math.min(max, Math.max(min, raw)) / step) * step;
}

export function objectFor(scenario: Scenario, focal: number) {
  switch (scenario) {
    case "outside":
      return 2 * focal;
    case "inside":
      return parameterValue("object", 0.625 * focal);
    case "atFocus":
      return focal;
  }
}

export function solve({ focal, object }: Parameters) {
  const gap = object - focal;
  const magnification = gap === 0 ? null : -focal / gap;
  const image: Image =
    magnification === null
      ? { kind: "afocal", distance: null, magnification: null, height: null }
      : {
          kind: gap > 0 ? "real" : "virtual",
          distance: (focal * object) / gap,
          magnification,
          height: magnification * objectHeight,
        };
  const rays: Ray[] = [
    {
      kind: "parallel",
      lensHeight: objectHeight,
      slope: -objectHeight / focal,
    },
    { kind: "center", lensHeight: 0, slope: -objectHeight / object },
  ];
  if (image.height !== null && Math.abs(image.height) <= aperture)
    rays.push({ kind: "frontFocus", lensHeight: image.height, slope: 0 });
  return { image, rays };
}

export type Optics = ReturnType<typeof solve>;

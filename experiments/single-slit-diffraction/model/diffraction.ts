export const limits = {
  slit: { min: 40, max: 160, step: 5, digits: 0, unit: "μm" },
  wavelength: { min: 400, max: 700, step: 10, digits: 0, unit: "nm" },
  distance: { min: 0.8, max: 2, step: 0.05, digits: 2, unit: "m" },
} as const;
export type Parameter = keyof typeof limits;
export type Parameters = Record<Parameter, number>;
export const defaults: Parameters = {
  slit: 80,
  wavelength: 550,
  distance: 1.2,
};
export const screenExtent = 40;
export const defaultReference = 160;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function probeValue(raw: unknown) {
  return typeof raw === "number" && Number.isFinite(raw)
    ? Number(clamp(raw, -screenExtent, screenExtent).toFixed(2)) || 0
    : 0;
}

export function parameterValue(
  key: Parameter,
  raw: unknown,
  fallback = defaults[key],
) {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  const { min, max, step, digits } = limits[key];
  return Number(
    (min + Math.round((clamp(raw, min, max) - min) / step) * step).toFixed(
      digits,
    ),
  );
}

const wavelengthToSlit = (parameters: Parameters) =>
  parameters.wavelength / (1000 * parameters.slit);

export function intensityAt(position: number, parameters: Parameters) {
  const positionMeters = position / 1000;
  const sine = positionMeters / Math.hypot(parameters.distance, positionMeters);
  const beta = (Math.PI * sine) / wavelengthToSlit(parameters);
  return beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2;
}

export function minimum(parameters: Parameters, order: number) {
  if (!Number.isInteger(order) || order < 1) return null;
  const sine = order * wavelengthToSlit(parameters);
  return sine >= 1
    ? null
    : (1000 * parameters.distance * sine) / Math.sqrt(1 - sine ** 2);
}

export function width(parameters: Parameters) {
  return 2 * minimum(parameters, 1)!;
}

export function profile(parameters: Parameters) {
  const divisions = 480;
  const positions = new Set(
    Array.from(
      { length: divisions + 1 },
      (_, index) => -screenExtent + (2 * screenExtent * index) / divisions,
    ),
  );
  for (let order = 1; ; order++) {
    const dark = minimum(parameters, order);
    if (dark === null || dark > screenExtent) break;
    positions.add(-dark);
    positions.add(dark);
  }
  return [...positions]
    .sort((left, right) => left - right)
    .map((position) => ({
      position,
      intensity: intensityAt(position, parameters),
    }));
}

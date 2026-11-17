/** Two in-phase, monochromatic, equally polarized narrow slits in vacuum.
 * SI units throughout. Per-slit amplitude at the screen is taken as constant;
 * finite slit width, the diffraction envelope and inverse-distance loss are omitted.
 */
export interface Parameters {
  wavelength: number;
  separation: number;
  distance: number;
}
export const limits = {
  wavelength: [400e-9, 700e-9],
  separation: [0.1e-3, 1e-3],
  distance: [0.5, 3],
} as const;
export const defaults: Parameters = {
  wavelength: 550e-9,
  separation: 0.25e-3,
  distance: 1.5,
};
export const lightSpeed = 299_792_458;
export const screenHalf = 12e-3;
export const cyclesPerSecond = 0.4;
export const tau = 2 * Math.PI;
export const clamp = (x: number, low: number, high: number) =>
  Math.min(high, Math.max(low, x));
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function finite(
  value: unknown,
  fallback: number,
  low: number,
  high: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, low, high)
    : fallback;
}
export function parameters(value: unknown): Parameters {
  const input = record(value);
  return {
    wavelength: finite(
      input.wavelength,
      defaults.wavelength,
      ...limits.wavelength,
    ),
    separation: finite(
      input.separation,
      defaults.separation,
      ...limits.separation,
    ),
    distance: finite(input.distance, defaults.distance, ...limits.distance),
  };
}
export function derived(p: Parameters) {
  return {
    spacing: (p.wavelength * p.distance) / p.separation,
    period: p.wavelength / lightSpeed,
    frequency: lightSpeed / p.wavelength,
    flight: p.distance / lightSpeed,
  };
}
export function at(p: Parameters, y: number, cycles = 0) {
  const r1 = Math.hypot(p.distance, y - p.separation / 2);
  const r2 = Math.hypot(p.distance, y + p.separation / 2);
  // Rationalization avoids subtracting nearly equal metre-scale paths to get nm.
  const delta = (2 * y * p.separation) / (r1 + r2);
  const order = delta / p.wavelength;
  const phase = tau * order;
  // Common phase is relative to S1's field at P, not to the slit emission time.
  const e1 = Math.cos(tau * (cycles % 1));
  const e2 = Math.cos(tau * (cycles % 1) - phase);
  return {
    y,
    r1,
    r2,
    delta,
    order,
    phase,
    e1,
    e2,
    field: (e1 + e2) / 2,
    intensity: Math.cos(phase / 2) ** 2,
    approximateDelta: (p.separation * y) / p.distance,
  };
}
export type State = ReturnType<typeof at>;
/** Exact position for Δ = order λ; null if no point can reach that difference. */
export function fringePosition(p: Parameters, order: number): number | null {
  if (!Number.isFinite(order)) return null;
  const delta = order * p.wavelength;
  if (Math.abs(delta) >= p.separation) return null;
  return (
    (delta / 2) *
    Math.sqrt(1 + (4 * p.distance ** 2) / (p.separation ** 2 - delta ** 2))
  );
}
export function adjacentFringe(
  p: Parameters,
  y: number,
  direction: -1 | 1,
  dark: boolean,
) {
  const order = at(p, y).order,
    offset = dark ? 0.5 : 0;
  const next =
    direction > 0
      ? Math.floor(order - offset + 1e-8) + 1 + offset
      : Math.ceil(order - offset - 1e-8) - 1 + offset;
  const position = fringePosition(p, next);
  return position !== null && Math.abs(position) <= screenHalf
    ? position
    : null;
}
export function fringes(p: Parameters) {
  const max = Math.floor(at(p, screenHalf).order);
  return Array.from({ length: 2 * max + 1 }, (_, i) => {
    const order = i - max;
    return { order, y: fringePosition(p, order)! };
  });
}
/** Qualitative spectral hue, not a colorimetric prediction of a display/eye. */
export function lightColor(wavelength: number) {
  const nm = wavelength * 1e9;
  const stops = [
    [400, 270],
    [450, 235],
    [490, 185],
    [530, 125],
    [580, 50],
    [630, 5],
    [700, 0],
  ];
  let i = 0;
  while (i < stops.length - 2 && nm > stops[i + 1][0]) i++;
  const [a, hueA] = stops[i],
    [b, hueB] = stops[i + 1];
  return `hsl(${hueA + (hueB - hueA) * clamp((nm - a) / (b - a), 0, 1)} 85% 60%)`;
}
export function format(value: number, digits = 2) {
  return (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
}

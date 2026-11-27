export const distances = { min: 0.07, max: 0.26, initial: 0.23 } as const;
export const coilRadius = 0.04;
const dipoleMoment = 2;
const fluxFactor = 2 * Math.PI * 1e-7 * dipoleMoment * coilRadius ** 2;
export const stepSeconds = 1 / 60;
export const maxSpeed = 0.6;
export const maxSteps = 12 / stepSeconds;

export interface Parameters {
  turns: number;
  resistance: number;
  polarity: 1 | -1;
}

export const limits = {
  turns: { min: 40, max: 240, step: 10 },
  resistance: { min: 5, max: 50, step: 1 },
} as const;
export type Control = keyof typeof limits;
export const defaults: Parameters = { turns: 120, resistance: 15, polarity: 1 };
export type Direction = "clockwise" | "counterclockwise" | "noCurrent";
export type Motion = "approaching" | "retreating" | "stationary";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parameterValue(control: Control, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return defaults[control];
  const { min, max, step } = limits[control];
  return min + Math.round((clamp(value, min, max) - min) / step) * step;
}

export function boundDistance(
  value: unknown,
  fallback: number = distances.initial,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, distances.min, distances.max)
    : fallback;
}

export function advance(distance: number, target: number, speed = maxSpeed) {
  const delta = target - distance;
  const stride = speed * stepSeconds;
  return Math.abs(delta) <= stride + 1e-12
    ? target
    : distance + Math.sign(delta) * stride;
}

export function atDistance(
  parameters: Parameters,
  distance: number,
  velocity: number,
) {
  const radiusSquared = coilRadius ** 2 + distance ** 2;
  const flux = (-parameters.polarity * fluxFactor) / radiusSquared ** 1.5;
  const gradient = (-3 * distance * flux) / radiusSquared;
  const emf = velocity === 0 ? 0 : -parameters.turns * gradient * velocity;
  const current = emf / parameters.resistance;
  const direction: Direction =
    current > 0 ? "counterclockwise" : current < 0 ? "clockwise" : "noCurrent";
  const motion: Motion =
    velocity < 0 ? "approaching" : velocity > 0 ? "retreating" : "stationary";
  return { distance, velocity, flux, emf, current, direction, motion };
}

export type Sample = ReturnType<typeof atDistance>;

export function intervalSample(
  parameters: Parameters,
  start: number,
  end: number,
  fraction: number,
) {
  return atDistance(
    parameters,
    start + (end - start) * fraction,
    (end - start) / stepSeconds,
  );
}

export function sampleAt(
  parameters: Parameters,
  path: readonly number[],
  cursor: number,
) {
  const step = clamp(cursor, 0, path.length - 1);
  const end = Math.ceil(step);
  return end === 0
    ? atDistance(parameters, path[0], 0)
    : intervalSample(parameters, path[end - 1], path[end], step - end + 1);
}

export function withStop(path: readonly number[]) {
  const end = path.at(-1)!;
  return path.length > 1 && path.at(-2) !== end && path.length <= maxSteps
    ? [...path, end]
    : path;
}

export const demonstration = {
  approach: 1.75,
  hold: 3.25,
  retreat: 4.25,
  duration: 7,
};

function ease(fraction: number) {
  const value = clamp(fraction, 0, 1);
  return value ** 2 * (3 - 2 * value);
}

export function demoPath() {
  const near = 0.085;
  return Array.from(
    { length: Math.round(demonstration.duration / stepSeconds) + 1 },
    (_, index) => {
      const time = index * stepSeconds;
      const inwards = ease((time - 0.5) / 1.75);
      const outwards = ease((time - 3.75) / 1.75);
      return (
        distances.initial + (near - distances.initial) * (inwards - outwards)
      );
    },
  );
}

const elementaryCharge = 1.602176634e-19;
const atomicMass = 1.66053907e-27;
const microsecond = 1e-6;
const revolution = 2 * Math.PI;

export const replaySpan = 2;
export const fallbackTime = microsecond;
export const limits = {
  charge: { min: -3, max: 3, step: 1, unit: "e" },
  mass: { min: 1, max: 8, step: 0.1, unit: "u" },
  field: { min: -200, max: 200, step: 10, unit: "mT" },
  speed: { min: 0, max: 250, step: 1, unit: "km/s" },
  angle: { min: 0, max: 359, step: 1, unit: "°" },
} as const;

export type Parameters = Record<keyof typeof limits, number>;
export const defaults: Parameters = {
  charge: 1,
  mass: 1,
  field: 100,
  speed: 100,
  angle: 0,
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function bounded(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

export function parameters(value: unknown): Parameters {
  const source = value as Partial<Parameters> | null | undefined;
  const result = { ...defaults };
  for (const key of Object.keys(limits) as (keyof Parameters)[]) {
    const { min, max, step } = limits[key];
    const safe = bounded(source?.[key], min, max, defaults[key]);
    result[key] = clamp(
      Number((Math.round(safe / step) * step).toFixed(1)),
      min,
      max,
    );
  }
  return result;
}

export function orbit(params: Parameters) {
  const mass = params.mass * atomicMass;
  const qB = params.charge * elementaryCharge * params.field * 1e-3;
  const speed = params.speed * 1e3;
  const angle = (params.angle * Math.PI) / 180;
  const spin = -qB / mass;
  const vx0 = speed * Math.cos(angle);
  const vy0 = speed * Math.sin(angle);
  const kind = speed === 0 ? "rest" : spin === 0 ? "straight" : "circle";
  const radius = kind === "circle" ? speed / Math.abs(spin) : null;
  const period = radius === null ? null : revolution / Math.abs(spin);
  return {
    kind,
    qB,
    spin,
    speed,
    vx0,
    vy0,
    radius,
    period,
    timeUnit: period ?? fallbackTime,
    energy: (mass * speed ** 2) / (2 * elementaryCharge),
    center: radius === null ? null : { x: -vy0 / spin, y: vx0 / spin },
  } as const;
}

export type Orbit = ReturnType<typeof orbit>;

export function at(model: Orbit, progress: number) {
  const time = progress * model.timeUnit;
  const phase = model.kind === "circle" ? model.spin * time : 0;
  const cosine = Math.cos(phase);
  const sine = Math.sin(phase);
  const vx = model.vx0 * cosine - model.vy0 * sine;
  const vy = model.vx0 * sine + model.vy0 * cosine;
  const tangent = model.kind === "circle" ? sine / model.spin : time;
  const normal =
    model.kind === "circle" ? (2 * Math.sin(phase / 2) ** 2) / model.spin : 0;
  return {
    x: model.vx0 * tangent - model.vy0 * normal,
    y: model.vy0 * tangent + model.vx0 * normal,
    vx,
    vy,
    fx: model.qB * vy,
    fy: -model.qB * vx,
    force: Math.abs(model.qB) * model.speed,
    time,
  };
}

export function sample(model: Orbit, end: number, segments: number) {
  return Array.from({ length: segments + 1 }, (_, index) =>
    at(model, (index / segments) * end),
  );
}

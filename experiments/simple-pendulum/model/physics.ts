export const radians = Math.PI / 180;
export const limits = {
  angle: { min: -170, max: 170, step: 1, unit: "°", digits: 0 },
  length: { min: 0.5, max: 2.5, step: 0.05, unit: "m", digits: 2 },
  gravity: { min: 1, max: 20, step: 0.01, unit: "m/s²", digits: 2 },
} as const;
export type Parameter = keyof typeof limits;
export type Parameters = Record<Parameter, number>;

export const defaults: Parameters = { angle: 60, length: 1, gravity: 9.81 };
export const presets = {
  small: { ...defaults, angle: 10 },
  large: { ...defaults, angle: 120 },
  extreme: { ...defaults, angle: 165 },
} as const;
export type Preset = keyof typeof presets;

export function parameterValue(key: Parameter, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return defaults[key];
  const { min, max, step, digits } = limits[key];
  const bounded = Math.max(min, Math.min(max, value));
  return Number(
    (min + Math.round((bounded - min) / step) * step).toFixed(digits),
  );
}

export function periodRatio(angle: number) {
  let arithmetic = 1;
  let geometric = Math.cos((angle * radians) / 2);
  while (arithmetic - geometric > 1e-15) {
    const next = (arithmetic + geometric) / 2;
    geometric = Math.sqrt(arithmetic * geometric);
    arithmetic = next;
  }
  return 1 / arithmetic;
}

export function timing(parameters: Parameters) {
  const angularFrequency = Math.sqrt(parameters.gravity / parameters.length);
  const approximate = (2 * Math.PI) / angularFrequency;
  const ratio = periodRatio(parameters.angle);
  const period = parameters.angle === 0 ? null : approximate * ratio;
  return {
    angularFrequency,
    approximate,
    period,
    ratio,
    duration: 2 * (period ?? approximate),
  };
}

const halfPi = Math.PI / 2;
const segments = 512;
const interval = halfPi / segments;

function orbit(angle: number) {
  const initial = angle * radians;
  const modulus = Math.sin(Math.abs(initial) / 2);
  const weight = (phase: number) =>
    1 / Math.sqrt(1 - (modulus * Math.sin(phase)) ** 2);
  const quadrature = (left: number, right: number) =>
    ((right - left) / 6) *
    (weight(left) + 4 * weight((left + right) / 2) + weight(right));
  const table = new Float64Array(segments + 1);
  for (let index = 1; index <= segments; index++) {
    table[index] =
      table[index - 1] + quadrature((index - 1) * interval, index * interval);
  }

  function phaseAt(fraction: number) {
    if (fraction <= 0) return 0;
    if (fraction >= 1) return halfPi;
    const target = fraction * table[segments];
    let left = 0;
    let right = segments;
    while (right - left > 1) {
      const middle = (left + right) >>> 1;
      if (table[middle] > target) right = middle;
      else left = middle;
    }
    const from = left * interval;
    const area = target - table[left];
    let phase = from + (interval * area) / (table[right] - table[left]);
    for (let iteration = 0; iteration < 2; iteration++)
      phase -= (quadrature(from, phase) - area) / weight(phase);
    return phase;
  }

  return { initial, modulus, phaseAt };
}

export function makePendulum(parameters: Parameters) {
  const { length, gravity } = parameters;
  const times = timing(parameters);
  const { period, angularFrequency } = times;
  const { initial, modulus, phaseAt } = orbit(parameters.angle);
  const side = Math.sign(initial);
  const total = 2 * gravity * length * modulus ** 2;

  function at(time: number) {
    let angle = 0;
    let angularVelocity = 0;
    if (period !== null) {
      const quarterTurns = (time / period) * 4;
      const quadrant = Math.floor(quarterTurns) % 4;
      const within = quarterTurns % 1;
      const range = quadrant % 2 === 0 ? 1 - within : within;
      const phase = phaseAt(range);
      angle =
        (quadrant === 0 || quadrant === 3 ? side : -side) *
        2 *
        Math.asin(modulus * Math.sin(phase));
      if (range < 1)
        angularVelocity =
          (quadrant < 2 ? -side : side) *
          2 *
          angularFrequency *
          modulus *
          Math.cos(phase);
    }
    const speed = length * angularVelocity;
    return {
      angle,
      angleLinear: initial * Math.cos(angularFrequency * time),
      angularVelocity,
      speed,
      tangentialAcceleration: -gravity * Math.sin(angle),
      kinetic: speed ** 2 / 2,
      potential: 2 * gravity * length * Math.sin(angle / 2) ** 2,
      total,
    };
  }

  return { ...times, at };
}

export type Pendulum = ReturnType<typeof makePendulum>;
export type Sample = ReturnType<Pendulum["at"]>;

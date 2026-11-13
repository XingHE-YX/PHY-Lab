import {
  parameters as idealParameters,
  stateAt as idealState,
  keyTime as idealKeyTime,
  clamp,
  TAU,
  type Parameters,
} from "./physics";

export type PhysicalModel = "ideal" | "damped" | "driven";
export type Metric =
  "x" | "v" | "a" | "kinetic" | "potential" | "total" | "dissipated" | "work";
export type Moment = "right" | "left" | "equilibrium" | "equal";
export interface OscillatorParameters extends Parameters {
  model: PhysicalModel;
  zeta: number;
  force: number;
  ratio: number;
  x0: number;
  v0: number;
}
const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function parameters(value: unknown): OscillatorParameters {
  const p = (
    value && typeof value === "object" ? value : {}
  ) as Partial<OscillatorParameters>;
  return {
    ...idealParameters(p),
    model: p.model === "damped" || p.model === "driven" ? p.model : "ideal",
    zeta: clamp(finite(p.zeta, 0.15), 0, 2),
    force: clamp(finite(p.force, 1), 0, 5),
    ratio: clamp(finite(p.ratio, 1), 0, 3),
    x0: clamp(finite(p.x0, 0.3), -0.8, 0.8),
    v0: clamp(finite(p.v0, 0), -3, 3),
  };
}

export function coefficients(p: OscillatorParameters) {
  const omega = Math.sqrt(p.k / p.m);
  const gamma = p.model === "ideal" ? 0 : p.zeta * omega;
  return {
    omega,
    gamma,
    b: 2 * p.m * gamma,
    driving: p.model === "driven" ? p.force : 0,
    frequency: p.ratio * omega,
  };
}

export function responseAt(p: OscillatorParameters, ratio = p.ratio) {
  const denominator = Math.hypot(1 - ratio * ratio, 2 * p.zeta * ratio);
  return {
    amplitude:
      p.force === 0
        ? 0
        : denominator === 0
          ? null
          : p.force / p.k / denominator,
    phase:
      denominator === 0 || p.force === 0
        ? null
        : Math.atan2(2 * p.zeta * ratio, 1 - ratio * ratio),
  };
}
export function resonanceRatio(p: OscillatorParameters) {
  return p.force > 0 && p.zeta > 0 && p.zeta < Math.SQRT1_2
    ? Math.sqrt(1 - 2 * p.zeta ** 2)
    : null;
}
export function regime(p: OscillatorParameters) {
  return p.zeta === 0
    ? "undamped"
    : p.zeta < 1
      ? "under"
      : p.zeta === 1
        ? "critical"
        : "over";
}

// Complex integrals are only used for the work done by the sinusoidal drive.
// Taylor expansion avoids cancellation at zero frequency and short times.
type Complex = [number, number];
const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
const div = (a: Complex, b: Complex): Complex => {
  const d = b[0] ** 2 + b[1] ** 2;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
function integral(rate: Complex, t: number, power: 0 | 1 = 0): Complex {
  const z: Complex = [rate[0] * t, rate[1] * t];
  if (Math.hypot(...z) < 0.5) {
    let term: Complex = [1, 0],
      sum: Complex = [0, 0];
    for (let n = 0; n < 24; n++) {
      sum = add(sum, [term[0] / (n + power + 1), term[1] / (n + power + 1)]);
      term = mul(term, [z[0] / (n + 1), z[1] / (n + 1)]);
    }
    return [sum[0] * t ** (power + 1), sum[1] * t ** (power + 1)];
  }
  const exp: Complex = [
    Math.exp(z[0]) * Math.cos(z[1]),
    Math.exp(z[0]) * Math.sin(z[1]),
  ];
  const first = div(add(exp, [-1, 0]), rate);
  return power === 0
    ? first
    : div(add([t * exp[0], t * exp[1]], [-first[0], -first[1]]), rate);
}

function homogeneous(omega: number, gamma: number, x0: number, v0: number) {
  if (gamma === omega)
    return {
      at: (t: number) => {
        const e = Math.exp(-gamma * t),
          q = v0 + gamma * x0;
        return { x: e * (x0 + q * t), v: e * (v0 - gamma * q * t) };
      },
      workIntegral: (f: number, t: number) =>
        v0 * integral([-gamma, f], t)[0] -
        gamma * (v0 + gamma * x0) * integral([-gamma, f], t, 1)[0],
    };
  if (gamma < omega) {
    const w = Math.sqrt((omega - gamma) * (omega + gamma));
    const q = v0 + gamma * x0,
      h = -(gamma * v0 + omega * omega * x0) / w;
    return {
      at: (t: number) => {
        const e = Math.exp(-gamma * t),
          c = Math.cos(w * t),
          sinc = Math.sin(w * t) / w;
        return {
          x: e * (x0 * c + q * sinc),
          v: e * (v0 * c - (gamma * v0 + omega * omega * x0) * sinc),
        };
      },
      workIntegral: (f: number, t: number) => {
        const a = mul([v0 / 2, -h / 2], integral([-gamma, f + w], t));
        const b = mul([v0 / 2, h / 2], integral([-gamma, f - w], t));
        return a[0] + b[0];
      },
    };
  }
  const d = Math.sqrt((gamma - omega) * (gamma + omega));
  const r1 = (-omega * omega) / (gamma + d),
    r2 = -gamma - d;
  const c1 = (v0 - r2 * x0) / (r1 - r2),
    c2 = x0 - c1;
  return {
    at: (t: number) => ({
      x: c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t),
      v: r1 * c1 * Math.exp(r1 * t) + r2 * c2 * Math.exp(r2 * t),
    }),
    workIntegral: (f: number, t: number) =>
      r1 * c1 * integral([r1, f], t)[0] + r2 * c2 * integral([r2, f], t)[0],
  };
}

function compile(p: OscillatorParameters) {
  const { omega, gamma, driving: force, frequency: f, b } = coefficients(p);
  const initial =
    p.model === "ideal"
      ? { x: p.A * Math.cos(p.phi), v: -p.A * omega * Math.sin(p.phi) }
      : { x: p.x0, v: p.v0 };
  const initialEnergy = 0.5 * (p.m * initial.v ** 2 + p.k * initial.x ** 2);
  const undampedDrive = force > 0 && gamma === 0;
  const d = omega * omega - f * f,
    denominator = d * d + 4 * gamma * gamma * f * f;
  const c = !undampedDrive && force ? ((force / p.m) * d) / denominator : 0;
  const q =
    !undampedDrive && force ? ((force / p.m) * 2 * gamma * f) / denominator : 0;
  const free = homogeneous(omega, gamma, initial.x - c, initial.v - q * f);
  const at = (t: number) => {
    const h = free.at(t),
      cosine = Math.cos(f * t),
      sine = Math.sin(f * t);
    // The sinc form includes exact resonance and avoids subtracting two huge
    // almost-equal particular/transient solutions near undamped resonance.
    const half = ((omega - f) * t) / 2;
    const sinc = half === 0 ? 1 : Math.sin(half) / half;
    const middle = (omega + f) / 2;
    const gain = force / p.m / (omega + f);
    const x =
      h.x +
      (undampedDrive
        ? gain * t * Math.sin(middle * t) * sinc
        : c * cosine + q * sine);
    const v =
      h.v +
      (undampedDrive
        ? gain *
          (middle * t * Math.cos(middle * t) * sinc +
            Math.sin(middle * t) * Math.cos(half))
        : f * (-c * sine + q * cosine));
    return { x, v, a: (force * cosine - b * v - p.k * x) / p.m };
  };
  return {
    at,
    state: (t: number) => {
      const s = p.model === "ideal" ? idealState(p, t) : at(t);
      const kinetic = 0.5 * p.m * s.v ** 2,
        potential = 0.5 * p.k * s.x ** 2;
      const total = kinetic + potential;
      const work =
        force === 0
          ? 0
          : gamma === 0
            ? total - initialEnergy
            : force *
              (free.workIntegral(f, t) -
                (c / 2) * Math.sin(f * t) ** 2 +
                (q * f * t) / 2 +
                (q / 4) * Math.sin(2 * f * t));
      // Integrate external power analytically, then apply the energy balance.
      const dissipated =
        gamma === 0 ? 0 : Math.max(0, initialEnergy + work - total);
      return {
        ...s,
        omega,
        period: TAU / omega,
        kinetic,
        potential,
        total,
        initialEnergy,
        work,
        dissipated,
        springForce: -p.k * s.x,
        dampingForce: -b * s.v,
        drivingForce: force * Math.cos(f * t),
      };
    },
  };
}
const cache = new Map<string, ReturnType<typeof compile>>();
function solution(p: OscillatorParameters) {
  const key = JSON.stringify(p);
  if (!cache.has(key)) {
    if (cache.size >= 24) cache.delete(cache.keys().next().value!);
    cache.set(key, compile(p));
  }
  return cache.get(key)!;
}
export function motionAt(p: OscillatorParameters, time: number) {
  return solution(p).at(Math.max(0, time));
}
export function stateAt(p: OscillatorParameters, time: number) {
  return solution(p).state(Math.max(0, time));
}
export type OscillatorState = ReturnType<typeof stateAt>;
export function sample(
  p: OscillatorParameters,
  start: number,
  end: number,
  count = 301,
) {
  return Array.from({ length: count }, (_, i) => {
    const t = start + ((end - start) * i) / (count - 1);
    return { t, ...stateAt(p, t) };
  });
}
export function timeWindow(p: OscillatorParameters, time: number) {
  const duration = (2 * TAU) / Math.sqrt(p.k / p.m);
  const start = Math.floor(Math.max(0, time - 1e-9) / duration) * duration;
  return { start, end: start + duration, duration };
}
export function momentTime(
  p: OscillatorParameters,
  target: Moment,
  after = 0,
): number | null {
  if (p.model === "ideal")
    return p.A > 0 ? idealKeyTime(p, target, after) : null;
  const period = TAU / Math.sqrt(p.k / p.m),
    dt = period / (128 * Math.max(1, p.ratio));
  const fn = (t: number) => {
    const s = motionAt(p, t);
    return target === "equal"
      ? p.m * s.v ** 2 - p.k * s.x ** 2
      : target === "equilibrium"
        ? s.x
        : s.v;
  };
  const valid = (t: number) => {
    const s = motionAt(p, t);
    return (
      p.m * s.v ** 2 + p.k * s.x ** 2 > 1e-14 &&
      (target !== "right" || s.a < 0) &&
      (target !== "left" || s.a > 0)
    );
  };
  if (Math.abs(fn(after)) < 1e-10 && valid(after)) return after;
  let left = after,
    a = fn(left);
  for (let i = 1; i <= Math.ceil((12 * period) / dt); i++) {
    const right = after + i * dt,
      b = fn(right);
    if (a * b < 0 || b === 0) {
      let lo = left,
        hi = right;
      for (let j = 0; j < 45; j++) {
        const mid = (lo + hi) / 2;
        if (fn(lo) * fn(mid) <= 0) hi = mid;
        else lo = mid;
      }
      const time = (lo + hi) / 2;
      if (valid(time)) return time;
    }
    left = right;
    a = b;
  }
  return null;
}

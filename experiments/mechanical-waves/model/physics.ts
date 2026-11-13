export type WaveMode = "travel" | "reflection" | "standing";
export interface WaveParameters {
  mode: WaveMode;
  source: "pulse" | "sine";
  boundary: "fixed" | "free";
  amplitude: number;
  speed: number;
  frequency: number;
  length: number;
  duration: number;
  polarity: 1 | -1;
}
export const TAU = 2 * Math.PI;
export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const finite = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export function parameters(value: unknown): WaveParameters {
  const v = record(value);
  return {
    mode: v.mode === "reflection" || v.mode === "standing" ? v.mode : "travel",
    source: v.source === "sine" ? "sine" : "pulse",
    boundary: v.boundary === "free" ? "free" : "fixed",
    amplitude: clamp(finite(v.amplitude, 0.22), 0, 0.4),
    speed: clamp(finite(v.speed, 2), 1, 6),
    frequency: clamp(finite(v.frequency, 0.5), 0.2, 2),
    length: clamp(finite(v.length, 8), 4, 12),
    duration: clamp(finite(v.duration, 1.2), 0.4, 2),
    polarity: v.polarity === -1 ? -1 : 1,
  };
}
export const harmonic = (p: WaveParameters) =>
  p.mode === "standing" || p.source === "sine";
export function derived(p: WaveParameters) {
  return {
    omega: TAU * p.frequency,
    waveNumber: (TAU * p.frequency) / p.speed,
    wavelength: p.speed / p.frequency,
    period: 1 / p.frequency,
    transit: p.length / p.speed,
    pulseLength: p.speed * p.duration,
    reflection: p.mode === "travel" ? 0 : p.boundary === "fixed" ? -1 : 1,
  };
}
interface Displacement {
  y: number;
  v: number;
  a: number;
}
const zero: Displacement = { y: 0, v: 0, a: 0 };
export function sourceAt(p: WaveParameters, time: number): Displacement {
  if (time <= 0) return zero;
  if (p.source === "pulse") {
    if (time >= p.duration) return zero;
    const w = Math.PI / p.duration,
      a = p.amplitude * p.polarity;
    return {
      y: a * Math.sin(w * time) ** 2,
      v: a * w * Math.sin(2 * w * time),
      a: 2 * a * w * w * Math.cos(2 * w * time),
    };
  }
  const omega = TAU * p.frequency,
    ramp = 1 / p.frequency,
    q = Math.PI / ramp;
  const e = time < ramp ? (1 - Math.cos(q * time)) / 2 : 1;
  const de = time < ramp ? (q * Math.sin(q * time)) / 2 : 0;
  const dde = time < ramp ? (q * q * Math.cos(q * time)) / 2 : 0;
  const s = Math.sin(omega * time),
    c = Math.cos(omega * time),
    A = p.amplitude;
  return {
    y: A * e * s,
    v: A * (de * s + e * omega * c),
    a: A * (dde * s + 2 * de * omega * c - e * omega * omega * s),
  };
}
export function waveAt(p: WaveParameters, x: number, time: number) {
  const { reflection: r, omega, waveNumber: q } = derived(p);
  let incident: Displacement, reflected: Displacement;
  if (p.mode === "standing") {
    const incidentPhase = omega * time + q * (p.length - x);
    const reflectedPhase = omega * time - q * (p.length - x);
    const sine = (phase: number, sign: number): Displacement => ({
      y: sign * p.amplitude * Math.sin(phase),
      v: sign * p.amplitude * omega * Math.cos(phase),
      a: -sign * p.amplitude * omega * omega * Math.sin(phase),
    });
    incident = sine(incidentPhase, 1);
    reflected = sine(reflectedPhase, r);
  } else {
    incident = sourceAt(p, time - x / p.speed);
    const incoming = r
      ? sourceAt(p, time - (2 * p.length - x) / p.speed)
      : zero;
    reflected = { y: r * incoming.y, v: r * incoming.v, a: r * incoming.a };
  }
  return {
    x,
    time,
    incident: incident.y,
    reflected: reflected.y,
    y: incident.y + reflected.y,
    v: incident.v + reflected.v,
    a: incident.a + reflected.a,
    slope: (reflected.v - incident.v) / p.speed,
  };
}
export type WaveState = ReturnType<typeof waveAt>;

export function standingAmplitude(p: WaveParameters, x: number) {
  const phase = derived(p).waveNumber * (p.length - x);
  return (
    2 *
    p.amplitude *
    Math.abs(p.boundary === "fixed" ? Math.sin(phase) : Math.cos(phase))
  );
}
export function standingSites(p: WaveParameters, kind: "node" | "antinode") {
  if (p.mode !== "standing" || p.amplitude === 0) return [];
  const half = derived(p).wavelength / 2;
  const offset = (p.boundary === "fixed") === (kind === "node") ? 0 : half / 2;
  const points: number[] = [];
  for (let n = 0; offset + n * half <= p.length + 1e-10; n++)
    points.push(clamp(p.length - offset - n * half, 0, p.length));
  return points.reverse();
}
export function duration(p: WaveParameters) {
  if (p.mode === "standing") return 4 / p.frequency;
  const transit = p.length / p.speed;
  if (p.source === "pulse")
    return transit * (p.mode === "travel" ? 1 : 2) + p.duration;
  return Math.max(4 / p.frequency, 2 * transit + 2 / p.frequency);
}
export function timeWindow(p: WaveParameters, time: number) {
  const span = duration(p);
  const start = Math.floor(Math.max(0, time - 1e-8) / span) * span;
  return { start, end: start + span, span };
}
export function spatialSamples(p: WaveParameters, time: number, count = 401) {
  return Array.from({ length: count }, (_, i) =>
    waveAt(p, (i * p.length) / (count - 1), time),
  );
}
export function temporalSamples(
  p: WaveParameters,
  x: number,
  start: number,
  end: number,
) {
  const count = Math.min(
    4097,
    Math.max(
      241,
      Math.ceil((end - start) * Math.max(p.frequency, 1 / p.duration) * 50) + 1,
    ),
  );
  return Array.from({ length: count }, (_, i) =>
    waveAt(p, x, start + (i * (end - start)) / (count - 1)),
  );
}
export function format(value: number, digits = 2) {
  if (Math.abs(value) >= 1e4) return value.toExponential(2);
  return (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
}

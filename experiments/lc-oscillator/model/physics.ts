export interface LCParameters {
  /** H */
  inductance: number;
  /** F */
  capacitance: number;
  /** Upper plate voltage before closing the switch, V. */
  voltage: number;
}
export const limits = {
  inductance: { min: 0.01, max: 0.2, initial: 0.05 },
  capacitance: { min: 10e-6, max: 200e-6, initial: 100e-6 },
  voltage: { min: -12, max: 12, initial: 6 },
} as const;
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function parameters(value: unknown): LCParameters {
  const input = record(value);
  const bounded = (key: keyof LCParameters) => {
    const v = input[key],
      range = limits[key];
    return typeof v === "number" && Number.isFinite(v)
      ? clamp(v, range.min, range.max)
      : range.initial;
  };
  return {
    inductance: bounded("inductance"),
    capacitance: bounded("capacitance"),
    voltage: bounded("voltage"),
  };
}
export function derived(p: LCParameters) {
  const omega = 1 / Math.sqrt(p.inductance * p.capacitance);
  const period = (2 * Math.PI) / omega;
  const charge = p.capacitance * p.voltage;
  return {
    omega,
    period,
    frequency: 1 / period,
    charge,
    current: Math.abs(charge * omega),
    energy: (p.capacitance * p.voltage ** 2) / 2,
  };
}
export function duration(p: LCParameters) {
  return 4 * derived(p).period;
}
/** Fixed physical time per playback second; L and C still change the visible period. */
export const playbackScale = 0.004;
export function at(p: LCParameters, time: number) {
  const d = derived(p);
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const phase = (t * d.omega) % (2 * Math.PI);
  const q = d.charge * Math.cos(phase);
  // Positive conventional current leaves the upper capacitor plate, clockwise.
  const current = d.charge * d.omega * Math.sin(phase);
  const voltage = q / p.capacitance;
  const electric = (q * q) / (2 * p.capacitance);
  const magnetic = (p.inductance * current * current) / 2;
  return {
    time: t,
    phase,
    q,
    current,
    voltage,
    currentRate: voltage / p.inductance,
    electric,
    magnetic,
    total: electric + magnetic,
  };
}
export type LCState = ReturnType<typeof at>;
export const moments = [0, 0.25, 0.5, 0.75, 0.125] as const;
export function momentTime(p: LCParameters, index: number) {
  return (moments[index] ?? 0) * derived(p).period;
}
export function format(value: number, digits = 2) {
  return (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
}

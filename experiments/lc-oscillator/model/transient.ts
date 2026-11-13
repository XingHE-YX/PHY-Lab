import { clamp, record, type LCParameters, type LCSeed } from "./physics";

export const switchLimits = {
  capacitance: { min: 0.1e-9, max: 10e-9, initial: 1e-9 },
  breakdown: { min: 50, max: 2000, initial: 600 },
  resistance: { min: 50, max: 2000, initial: 500 },
} as const;
export interface SwitchParameters {
  /** Effective capacitance across the open contacts, F. */
  capacitance: number;
  /** Bidirectional breakdown clamp threshold, V. */
  breakdown: number;
  /** Effective high-frequency series loss during switch-off, ohm. */
  resistance: number;
}
export function switchParameters(value: unknown): SwitchParameters {
  const input = record(value);
  const bounded = (key: keyof SwitchParameters) => {
    const range = switchLimits[key],
      v = input[key];
    return typeof v === "number" && Number.isFinite(v)
      ? clamp(v, range.min, range.max)
      : range.initial;
  };
  return {
    capacitance: bounded("capacitance"),
    breakdown: bounded("breakdown"),
    resistance: bounded("resistance"),
  };
}
// A passive piecewise-linear breakdown branch, not an air/plasma simulation.
export const arcResistance = 20;
export function arcCurrent(voltage: number, model: SwitchParameters) {
  return (
    (Math.sign(voltage) * Math.max(0, Math.abs(voltage) - model.breakdown)) /
    arcResistance
  );
}
export interface TransientPoint {
  time: number;
  voltage: number;
  current: number;
  switchVoltage: number;
  resistanceLoss: number;
  arcLoss: number;
}
export interface TransientProfile {
  points: TransientPoint[];
  initialEnergy: number;
  duration: number;
  timeScale: number;
  peakVoltage: number;
  peakInductorVoltage: number;
  peakTime: number;
  arcOccurred: boolean;
  model: SwitchParameters;
}
export function transientValues(
  p: LCParameters,
  model: SwitchParameters,
  point: TransientPoint,
) {
  const electric = (p.capacitance * point.voltage ** 2) / 2;
  const magnetic = (p.inductance * point.current ** 2) / 2;
  const contactEnergy = (model.capacitance * point.switchVoltage ** 2) / 2;
  const inductorVoltage =
    point.voltage - point.switchVoltage - model.resistance * point.current;
  return {
    electric,
    magnetic,
    contactEnergy,
    stored: electric + magnetic + contactEnergy,
    dissipated: point.resistanceLoss + point.arcLoss,
    inductorVoltage,
    arcPower: point.switchVoltage * arcCurrent(point.switchVoltage, model),
  };
}

/** Implicit midpoint, solved exactly in each clamp branch. Its discrete energy
 * change equals -h R I_mid² - h U_mid I_arc(U_mid), so loss cannot create energy. */
function step(
  p: LCParameters,
  m: SwitchParameters,
  s: TransientPoint,
  h: number,
): TransientPoint {
  const a =
    1 +
    (h * m.resistance) / (2 * p.inductance) +
    (h * h) / (4 * p.inductance * p.capacitance);
  const current0 = (s.current + (h * s.voltage) / (2 * p.inductance)) / a;
  const coupling = h / (2 * p.inductance * a);
  const k = 1 + (h * coupling) / (2 * m.capacitance);
  const rhs = s.switchVoltage + (h * current0) / (2 * m.capacitance);
  let voltageMid = rhs / k;
  if (Math.abs(voltageMid) > m.breakdown) {
    const conductance = h / (2 * m.capacitance * arcResistance);
    voltageMid =
      (rhs + Math.sign(rhs) * conductance * m.breakdown) / (k + conductance);
  }
  const currentMid = current0 - coupling * voltageMid;
  return {
    time: s.time + h,
    voltage: s.voltage - (h * currentMid) / p.capacitance,
    current: 2 * currentMid - s.current,
    switchVoltage: 2 * voltageMid - s.switchVoltage,
    resistanceLoss: s.resistanceLoss + h * m.resistance * currentMid ** 2,
    arcLoss: s.arcLoss + h * voltageMid * arcCurrent(voltageMid, m),
  };
}

export function buildTransient(
  p: LCParameters,
  seed: LCSeed,
  model: SwitchParameters,
): TransientProfile {
  let state: TransientPoint = {
    time: 0,
    voltage: seed.q / p.capacitance,
    current: seed.current,
    switchVoltage: 0,
    resistanceLoss: 0,
    arcLoss: 0,
  };
  const initialEnergy = transientValues(p, model, state).stored;
  const effectiveC =
    (p.capacitance * model.capacitance) / (p.capacitance + model.capacitance);
  const timeScale = Math.sqrt(p.inductance * effectiveC);
  const result: TransientProfile = {
    points: [state],
    initialEnergy,
    duration: 0,
    timeScale,
    peakVoltage: 0,
    peakInductorVoltage: Math.abs(
      state.voltage - model.resistance * state.current,
    ),
    peakTime: 0,
    arcOccurred: false,
    model: { ...model },
  };
  if (initialEnergy === 0) return result;
  const end = Math.max((24 * p.inductance) / model.resistance, 16 * timeScale);
  const scaleV = Math.sqrt((2 * initialEnergy) / p.capacitance);
  const scaleI = Math.sqrt((2 * initialEnergy) / p.inductance);
  const scaleSwitch = Math.sqrt((2 * initialEnergy) / model.capacitance);
  const tolerance = 2e-7;
  let h = timeScale / 32;
  let peakPoint = state;
  const notePeak = (point: TransientPoint) => {
    if (Math.abs(point.switchVoltage) > result.peakVoltage) {
      result.peakVoltage = Math.abs(point.switchVoltage);
      result.peakTime = point.time;
      peakPoint = point;
    }
    result.peakInductorVoltage = Math.max(
      result.peakInductorVoltage,
      Math.abs(transientValues(p, model, point).inductorVoltage),
    );
    if (point.arcLoss > initialEnergy * 1e-12) result.arcOccurred = true;
  };
  // Log-spaced output retains the fast edge and the much longer settling tail.
  for (let n = 1; n <= 1200; n++) {
    const target =
      timeScale * Math.expm1((Math.log1p(end / timeScale) * n) / 1200);
    while (state.time < target) {
      const dt = Math.min(h, target - state.time);
      const coarse = step(p, model, state, dt);
      const half = step(p, model, state, dt / 2);
      const fine = step(p, model, half, dt / 2);
      const error = Math.max(
        Math.abs(coarse.voltage - fine.voltage) / scaleV,
        Math.abs(coarse.current - fine.current) / scaleI,
        Math.abs(coarse.switchVoltage - fine.switchVoltage) / scaleSwitch,
      );
      if (error > tolerance && dt > timeScale * 1e-9) {
        h = dt / 2;
        continue;
      }
      notePeak(half);
      notePeak(fine);
      state = fine;
      h = Math.min(
        timeScale / 4,
        dt *
          clamp(0.9 * (tolerance / Math.max(error, 1e-16)) ** (1 / 3), 0.5, 2),
      );
      if (target - state.time < Math.max(1e-18, target * 1e-14))
        state = { ...state, time: target };
    }
    result.points.push(state);
    const remainder =
      (p.inductance * state.current ** 2) / 2 +
      (effectiveC * (state.voltage - state.switchVoltage) ** 2) / 2;
    if (state.time >= 8 * timeScale && remainder <= initialEnergy * 1e-10) {
      // Resolve the negligible remaining dissipative tail to its DC equilibrium.
      const voltage =
        (p.capacitance * state.voltage +
          model.capacitance * state.switchVoltage) /
        (p.capacitance + model.capacitance);
      state = {
        ...state,
        voltage,
        switchVoltage: voltage,
        current: 0,
        resistanceLoss: state.resistanceLoss + remainder,
      };
      result.points[result.points.length - 1] = state;
      break;
    }
  }
  result.duration = state.time;
  if (!result.points.some((point) => point.time === peakPoint.time)) {
    result.points.push(peakPoint);
    result.points.sort((a, b) => a.time - b.time);
  }
  return result;
}

export function sampleTransient(
  profile: TransientProfile,
  time: number,
): TransientPoint {
  const points = profile.points;
  let low = 0,
    high = points.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (points[middle].time <= time) low = middle;
    else high = middle - 1;
  }
  // Use an actual solver sample so the displayed energy budget remains exact.
  return points[low];
}

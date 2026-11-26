export const limits = {
  amplitudeFirst: { min: 0, max: 4, step: 0.1, unit: "cm", digits: 1 },
  amplitudeSecond: { min: 0, max: 4, step: 0.1, unit: "cm", digits: 1 },
  frequencyFirst: { min: 0.5, max: 3, step: 0.05, unit: "Hz", digits: 2 },
  frequencySecond: { min: 0.5, max: 3, step: 0.05, unit: "Hz", digits: 2 },
  phaseSecond: { min: -180, max: 180, step: 5, unit: "°", digits: 0 },
} as const;

export type Parameter = keyof typeof limits;
export type Parameters = Record<Parameter, number>;
export type Moment = "reinforce" | "cancel";

export const defaults: Parameters = {
  amplitudeFirst: 3,
  amplitudeSecond: 3,
  frequencyFirst: 1,
  frequencySecond: 1.2,
  phaseSecond: 0,
};

export const presets = {
  close: defaults,
  unequal: { ...defaults, amplitudeSecond: 1.5 },
  locked: { ...defaults, frequencySecond: 1, phaseSecond: 180 },
} as const;
export type Preset = keyof typeof presets;

const turn = 2 * Math.PI;
const wrap = (cycles: number) => cycles - Math.floor(cycles);

export function parameterValue(parameter: Parameter, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return defaults[parameter];
  const { min, max, step, digits } = limits[parameter];
  const bounded = Math.min(max, Math.max(min, value));
  return Number(
    (min + Math.round((bounded - min) / step) * step).toFixed(digits),
  );
}

export function derive(parameters: Parameters) {
  const signedGap = parameters.frequencySecond - parameters.frequencyFirst;
  const gap = Math.abs(signedGap);
  const active =
    parameters.amplitudeFirst > 0 && parameters.amplitudeSecond > 0;
  const beatPeriod = active && gap > 0 ? 1 / gap : null;
  const waveWindow =
    4 / Math.min(parameters.frequencyFirst, parameters.frequencySecond);
  return {
    signedGap,
    gap,
    active,
    beatPeriod,
    waveWindow,
    duration: Math.max(waveWindow, beatPeriod === null ? 0 : 2 * beatPeriod),
    maximum: parameters.amplitudeFirst + parameters.amplitudeSecond,
    minimum: Math.abs(parameters.amplitudeFirst - parameters.amplitudeSecond),
  };
}

export function at(parameters: Parameters, time: number) {
  const first = turn * wrap(parameters.frequencyFirst * time);
  const relative =
    turn *
    wrap(
      (parameters.frequencySecond - parameters.frequencyFirst) * time +
        parameters.phaseSecond / 360,
    );
  const second = first + relative;
  const firstX = parameters.amplitudeFirst * Math.cos(first);
  const firstY = parameters.amplitudeFirst * Math.sin(first);
  const secondX = parameters.amplitudeSecond * Math.cos(second);
  const secondY = parameters.amplitudeSecond * Math.sin(second);
  const sumX = firstX + secondX;
  const sumY = firstY + secondY;
  return { firstX, firstY, secondX, secondY, sumX, sumY };
}

export function envelope(parameters: Parameters, time: number) {
  const {
    amplitudeFirst,
    amplitudeSecond,
    frequencyFirst,
    frequencySecond,
    phaseSecond,
  } = parameters;
  const relative =
    turn * wrap((frequencySecond - frequencyFirst) * time + phaseSecond / 360);
  return Math.hypot(
    amplitudeFirst - amplitudeSecond,
    2 * Math.sqrt(amplitudeFirst * amplitudeSecond) * Math.cos(relative / 2),
  );
}

export function nextMoment(
  parameters: Parameters,
  moment: Moment,
  time = 0,
): number | null {
  const { signedGap, beatPeriod, duration } = derive(parameters);
  if (beatPeriod === null) return null;
  const direction = Math.sign(signedGap);
  const target = moment === "reinforce" ? 0 : 0.5;
  const phase = parameters.phaseSecond / 360;
  const offset = wrap(direction * (target - phase));
  const cycle = Math.floor(time / beatPeriod - offset + 1e-12) + 1;
  const next = (cycle + offset) * beatPeriod;
  if (next <= duration + 1e-10) return Math.min(next, duration);
  return offset * beatPeriod;
}

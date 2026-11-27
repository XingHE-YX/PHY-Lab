import {
  clamp,
  defaults,
  duration,
  parameterValue,
  type Parameters,
} from "./physics";

export type Observation = "arrivals" | "comparison";
export type Support = "formula" | "explore";
export type Rate = 1 | 0.5 | 0.25;
export interface Snapshot {
  parameters: Parameters;
  time: number;
  observation: Observation;
  support: Support;
  rate: Rate;
  wavefronts: boolean;
  wavelengthGuide: boolean;
  vectors: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const raw = record(value);
  const saved = record(raw.parameters);
  return {
    parameters: {
      mover: saved.mover === "observer" ? saved.mover : defaults.mover,
      motion:
        saved.motion === "rest" || saved.motion === "retreat"
          ? saved.motion
          : defaults.motion,
      speed: parameterValue("speed", saved.speed),
      frequency: parameterValue("frequency", saved.frequency),
    },
    time:
      typeof raw.time === "number" && Number.isFinite(raw.time)
        ? clamp(raw.time, 0, duration)
        : 0,
    observation:
      raw.observation === "comparison" ? raw.observation : "arrivals",
    support: raw.support === "explore" ? "explore" : "formula",
    rate: raw.rate === 0.5 || raw.rate === 0.25 ? raw.rate : 1,
    wavefronts: raw.wavefronts !== false,
    wavelengthGuide: raw.wavelengthGuide !== false,
    vectors: raw.vectors !== false,
  };
}

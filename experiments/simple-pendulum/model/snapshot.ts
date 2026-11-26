import {
  defaults,
  limits,
  parameterValue,
  timing,
  type Parameter,
  type Parameters,
} from "./physics";

export type Observation = "period" | "motion" | "energy";
export type Rate = 1 | 0.5 | 0.25;
export interface Snapshot {
  parameters: Parameters;
  time: number;
  rate: Rate;
  observation: Observation;
  comparison: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const raw = record(value);
  const saved = record(raw.parameters);
  const parameters = { ...defaults };
  for (const key of Object.keys(limits) as Parameter[])
    parameters[key] = parameterValue(key, saved[key]);
  const { period, duration } = timing(parameters);
  return {
    parameters,
    time:
      period && typeof raw.time === "number" && Number.isFinite(raw.time)
        ? Math.max(0, Math.min(duration, raw.time))
        : 0,
    rate: raw.rate === 0.5 || raw.rate === 0.25 ? raw.rate : 1,
    observation:
      raw.observation === "motion" || raw.observation === "energy"
        ? raw.observation
        : "period",
    comparison: raw.comparison !== false,
  };
}

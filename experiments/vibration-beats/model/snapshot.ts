import {
  defaults,
  derive,
  limits,
  parameterValue,
  type Parameter,
} from "./physics";

export type Observation = "waves" | "envelope";
export type Rate = 1 | 0.5 | 0.25;

export interface Snapshot {
  parameters: typeof defaults;
  time: number;
  rate: Rate;
  observation: Observation;
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
  const parameters = { ...defaults };
  for (const name of Object.keys(limits) as Parameter[])
    parameters[name] = parameterValue(name, saved[name]);
  return {
    parameters,
    time:
      typeof raw.time === "number" && Number.isFinite(raw.time)
        ? Math.max(0, Math.min(raw.time, derive(parameters).duration))
        : 0,
    rate: raw.rate === 0.5 || raw.rate === 0.25 ? raw.rate : 1,
    observation: raw.observation === "envelope" ? "envelope" : "waves",
    vectors: raw.vectors !== false,
  };
}

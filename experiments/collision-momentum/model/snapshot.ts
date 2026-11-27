import {
  clamp,
  defaults,
  limits,
  makeTrial,
  parameterValue,
  type Metric,
  type Parameter,
  type Parameters,
} from "./physics";

export type Support = "formula" | "explore";
export type Rate = 1 | 0.5 | 0.25;
export interface Snapshot {
  parameters: Parameters;
  time: number;
  metric: Metric;
  support: Support;
  rate: Rate;
  vectors: boolean;
  centerOfMass: boolean;
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
  if (saved.mode === "inelastic") parameters.mode = "inelastic";
  return {
    parameters,
    time:
      typeof raw.time === "number" && Number.isFinite(raw.time)
        ? clamp(raw.time, 0, makeTrial(parameters).duration)
        : 0,
    metric: raw.metric === "kinetic" ? "kinetic" : "momentum",
    support: raw.support === "explore" ? "explore" : "formula",
    rate: raw.rate === 0.5 || raw.rate === 0.25 ? raw.rate : 1,
    vectors: raw.vectors !== false,
    centerOfMass: raw.centerOfMass !== false,
  };
}

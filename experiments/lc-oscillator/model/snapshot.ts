import {
  parameters,
  record,
  clamp,
  duration,
  type LCParameters,
} from "./physics";
export interface Snapshot {
  version: 1;
  params: LCParameters;
  time: number;
  closed: boolean;
  rate: number;
  observation: "oscillation" | "energy" | "analogy";
  support: "formula" | "tasks";
  task: "voltage" | "inductance" | "current";
  layers: { fields: boolean; current: boolean };
}
export function normalizeSnapshot(value: unknown): Snapshot {
  const input = record(value),
    layers = record(input.layers),
    params = parameters(input.params);
  const closed = input.closed === true;
  return {
    version: 1,
    params,
    closed,
    time:
      closed && typeof input.time === "number" && Number.isFinite(input.time)
        ? clamp(input.time, 0, duration(params))
        : 0,
    rate:
      typeof input.rate === "number" && [0.25, 0.5, 1].includes(input.rate)
        ? input.rate
        : 1,
    observation:
      input.observation === "energy" || input.observation === "analogy"
        ? input.observation
        : "oscillation",
    support: input.support === "tasks" ? "tasks" : "formula",
    task:
      input.task === "inductance" || input.task === "current"
        ? input.task
        : "voltage",
    layers: {
      fields: typeof layers.fields === "boolean" ? layers.fields : true,
      current: typeof layers.current === "boolean" ? layers.current : true,
    },
  };
}

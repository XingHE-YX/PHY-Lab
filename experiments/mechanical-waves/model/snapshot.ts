import {
  parameters,
  clamp,
  record,
  duration,
  harmonic,
  type WaveParameters,
} from "./physics";
export interface Snapshot {
  version: 1;
  params: WaveParameters;
  time: number;
  rate: number;
  probe: number;
  parameterTab: "source" | "medium";
  observation: "record" | "profile";
  metric: "y" | "v";
  support: "formula" | "tasks";
  layers: {
    total: boolean;
    incident: boolean;
    reflected: boolean;
    velocity: boolean;
    sites: boolean;
  };
}
export function normalizeSnapshot(value: unknown): Snapshot {
  const v = record(value),
    layers = record(v.layers),
    params = parameters(v.params);
  const bounded = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) =>
    typeof value === "number" && Number.isFinite(value)
      ? clamp(value, min, max)
      : fallback;
  const flag = (v: unknown, fallback: boolean) =>
    typeof v === "boolean" ? v : fallback;
  return {
    version: 1,
    params,
    time: bounded(v.time, 0, 0, harmonic(params) ? 1e5 : duration(params)),
    rate:
      typeof v.rate === "number" && [0.25, 0.5, 1].includes(v.rate)
        ? v.rate
        : 1,
    probe: bounded(v.probe, 0.5, 0, 1),
    parameterTab: v.parameterTab === "medium" ? "medium" : "source",
    observation: v.observation === "profile" ? "profile" : "record",
    metric: v.metric === "v" ? "v" : "y",
    support: v.support === "tasks" ? "tasks" : "formula",
    layers: {
      total: flag(layers.total, true),
      incident: flag(layers.incident, false),
      reflected: flag(layers.reflected, false),
      velocity: flag(layers.velocity, true),
      sites: flag(layers.sites, true),
    },
  };
}

import {
  parameters,
  record,
  clamp,
  derived,
  type LCParameters,
  type LCSeed,
} from "./physics";
import { switchParameters, type SwitchParameters } from "./transient";
export interface TransientEvent {
  at: number;
  initial: LCSeed;
  model: SwitchParameters;
  elapsed: number;
}
export interface Snapshot {
  version: 1;
  params: LCParameters;
  time: number;
  closed: boolean;
  seed: LCSeed;
  switch: SwitchParameters;
  transient: TransientEvent | null;
  parameterTab: "circuit" | "switch";
  transientMetric: "voltage" | "current" | "energy";
  transientZoom: "impulse" | "full";
  rate: number;
  observation: "oscillation" | "energy" | "analogy";
  support: "formula" | "tasks" | "transient";
  task: "voltage" | "inductance" | "current";
  layers: { fields: boolean; current: boolean };
}
function seed(value: unknown, p: LCParameters): LCSeed {
  const input = record(value),
    d = derived(p);
  let q =
    typeof input.q === "number" && Number.isFinite(input.q)
      ? clamp(input.q, -Math.abs(d.charge), Math.abs(d.charge))
      : d.charge;
  let current =
    typeof input.current === "number" && Number.isFinite(input.current)
      ? clamp(input.current, -d.current, d.current)
      : 0;
  const energy =
    (q * q) / (2 * p.capacitance) + (p.inductance * current * current) / 2;
  if (energy > d.energy && energy > 0) {
    const scale = Math.sqrt(d.energy / energy);
    q *= scale;
    current *= scale;
  }
  return { q, current };
}
export function normalizeSnapshot(value: unknown): Snapshot {
  const input = record(value),
    layers = record(input.layers),
    params = parameters(input.params);
  const closed = input.closed === true;
  const event = record(input.transient);
  const initial = record(event.initial);
  const transient: TransientEvent | null =
    typeof event.at === "number" &&
    Number.isFinite(event.at) &&
    event.at >= 0 &&
    typeof initial.q === "number" &&
    Number.isFinite(initial.q) &&
    typeof initial.current === "number" &&
    Number.isFinite(initial.current)
      ? {
          at: clamp(event.at, 0, Number.MAX_SAFE_INTEGER),
          initial: seed(initial, params),
          model: switchParameters(event.model),
          elapsed:
            typeof event.elapsed === "number" && Number.isFinite(event.elapsed)
              ? clamp(event.elapsed, 0, 1)
              : 0,
        }
      : null;
  return {
    version: 1,
    params,
    closed,
    seed: seed(input.seed, params),
    switch: switchParameters(input.switch),
    transient,
    parameterTab: input.parameterTab === "switch" ? "switch" : "circuit",
    transientMetric:
      input.transientMetric === "current" || input.transientMetric === "energy"
        ? input.transientMetric
        : "voltage",
    transientZoom: input.transientZoom === "full" ? "full" : "impulse",
    time:
      (closed || transient) &&
      typeof input.time === "number" &&
      Number.isFinite(input.time)
        ? clamp(input.time, 0, Number.MAX_SAFE_INTEGER)
        : 0,
    rate:
      typeof input.rate === "number" && [0.25, 0.5, 1].includes(input.rate)
        ? input.rate
        : 1,
    observation:
      input.observation === "energy" || input.observation === "analogy"
        ? input.observation
        : "oscillation",
    support:
      input.support === "transient" && transient
        ? "transient"
        : input.support === "tasks"
          ? "tasks"
          : "formula",
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

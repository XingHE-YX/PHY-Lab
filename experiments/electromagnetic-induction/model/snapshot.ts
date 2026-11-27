import {
  advance,
  boundDistance,
  clamp,
  defaults,
  demoPath,
  maxSteps,
  parameterValue,
  withStop,
  type Parameters,
} from "./physics";

export type Observation = "flux" | "emf" | "current";
export type Rate = 1 | 0.5 | 0.25;
export type Recording = "manual" | "demo";

export interface Snapshot {
  parameters: Parameters;
  path: readonly number[];
  cursor: number;
  rate: Rate;
  observation: Observation;
  fields: boolean;
  recording: Recording;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function restorePath(value: unknown) {
  const nodes = Array.isArray(value) ? value.slice(0, maxSteps) : [];
  const path = [boundDistance(nodes[0])];
  for (const point of nodes.slice(1)) {
    const previous = path.at(-1)!;
    path.push(advance(previous, boundDistance(point, previous)));
  }
  return withStop(path);
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const raw = record(value);
  const settings = record(raw.parameters);
  const parameters: Parameters = {
    ...defaults,
    turns: parameterValue("turns", settings.turns),
    resistance: parameterValue("resistance", settings.resistance),
    polarity: settings.polarity === -1 ? -1 : 1,
  };
  const recording = raw.recording === "demo" ? "demo" : "manual";
  const path = recording === "demo" ? demoPath() : restorePath(raw.path);
  return {
    parameters,
    path,
    cursor:
      typeof raw.cursor === "number" && Number.isFinite(raw.cursor)
        ? clamp(raw.cursor, 0, path.length - 1)
        : path.length - 1,
    observation:
      raw.observation === "flux" || raw.observation === "current"
        ? raw.observation
        : "emf",
    rate: raw.rate === 0.5 || raw.rate === 0.25 ? raw.rate : 1,
    fields: raw.fields !== false,
    recording,
  };
}

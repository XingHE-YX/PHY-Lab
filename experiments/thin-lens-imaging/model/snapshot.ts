import { parameterValue, type Parameters } from "./optics";

export type Observation = "reading" | "compare";
export interface Snapshot {
  parameters: Parameters;
  observation: Observation;
  extensions: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const raw = record(value);
  const settings = record(raw.parameters);
  return {
    parameters: {
      focal: parameterValue("focal", settings.focal),
      object: parameterValue("object", settings.object),
    },
    observation: raw.observation === "compare" ? "compare" : "reading",
    extensions: raw.extensions !== false,
  };
}

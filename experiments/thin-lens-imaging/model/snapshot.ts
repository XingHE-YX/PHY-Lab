import { parameterValue, type Parameters } from "./optics";

export type Observation = "reading" | "compare";
export type Support = "formula" | "explore";
export interface Snapshot {
  parameters: Parameters;
  observation: Observation;
  support: Support;
  extensions: boolean;
  guides: boolean;
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
    support: raw.support === "explore" ? "explore" : "formula",
    extensions: raw.extensions !== false,
    guides: raw.guides !== false,
  };
}

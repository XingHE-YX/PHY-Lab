import {
  defaultReference,
  parameterValue,
  probeValue,
  type Parameters,
} from "./diffraction";

export interface Snapshot {
  parameters: Parameters;
  reference: number;
  probe: number;
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
      slit: parameterValue("slit", settings.slit),
      wavelength: parameterValue("wavelength", settings.wavelength),
      distance: parameterValue("distance", settings.distance),
    },
    reference: parameterValue("slit", raw.reference, defaultReference),
    probe: probeValue(raw.probe),
    guides: raw.guides !== false,
  };
}

import {
  finite,
  parameters,
  record,
  screenHalf,
  type Parameters,
} from "./physics";
export interface Snapshot {
  version: 1;
  params: Parameters;
  probe: number;
  cycles: number;
  rate: number;
  observation: "intensity" | "phase";
  support: "formula" | "tasks";
  layers: { paths: boolean; wavefronts: boolean; orders: boolean };
  reference: Parameters | null;
}
export function normalizeSnapshot(value: unknown): Snapshot {
  const input = record(value),
    layers = record(input.layers);
  return {
    version: 1,
    params: parameters(input.params),
    probe: finite(input.probe, 0, -screenHalf, screenHalf),
    cycles: finite(input.cycles, 0, 0, 4),
    rate: [0.25, 0.5, 1].includes(input.rate as number)
      ? (input.rate as number)
      : 1,
    observation: input.observation === "phase" ? "phase" : "intensity",
    support: input.support === "tasks" ? "tasks" : "formula",
    layers: {
      paths: typeof layers.paths === "boolean" ? layers.paths : true,
      wavefronts:
        typeof layers.wavefronts === "boolean" ? layers.wavefronts : true,
      orders: typeof layers.orders === "boolean" ? layers.orders : false,
    },
    reference:
      input.reference !== null &&
      typeof input.reference === "object" &&
      !Array.isArray(input.reference)
        ? parameters(input.reference)
        : null,
  };
}

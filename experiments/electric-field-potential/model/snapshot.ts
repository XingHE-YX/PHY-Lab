import {
  board,
  bounded,
  chargeBounds,
  chargeValue,
  presets,
  separated,
  type Charges,
  type Point,
} from "./electrostatics";

export type Observation = "contributions" | "profile";
export type Support = "formula" | "explore";
export interface Snapshot {
  charges: Charges;
  probe: Point;
  vectors: boolean;
  equipotential: boolean;
  components: boolean;
  observation: Observation;
  support: Support;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function position(value: unknown, fallback: Point, bounds: Point) {
  const raw = record(value);
  return bounded(
    { x: finite(raw.x, fallback.x), y: finite(raw.y, fallback.y) },
    bounds,
  );
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const raw = record(value);
  const stored = Array.isArray(raw.charges) ? raw.charges : [];
  const restore = (index: 0 | 1) => {
    const initial = presets.dipole[index];
    return {
      ...position(stored[index], initial, chargeBounds),
      nanoCoulombs: chargeValue(
        finite(record(stored[index]).nanoCoulombs, initial.nanoCoulombs),
      ),
    };
  };
  const charges = [restore(0), restore(1)] as const;
  return {
    charges: separated(...charges)
      ? charges
      : [
          { ...presets.dipole[0], nanoCoulombs: charges[0].nanoCoulombs },
          { ...presets.dipole[1], nanoCoulombs: charges[1].nanoCoulombs },
        ],
    probe: position(raw.probe, { x: 0, y: 0 }, board),
    vectors: raw.vectors !== false,
    equipotential: raw.equipotential !== false,
    components: raw.components !== false,
    observation: raw.observation === "profile" ? "profile" : "contributions",
    support: raw.support === "explore" ? "explore" : "formula",
  };
}

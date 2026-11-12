import type { ExperimentContext } from "../../../src/infra/platform/contract";
import { parameters, type OscillatorParameters, type Metric } from "./dynamics";
import { clamp, parameters as idealParameters } from "./physics";
import type { Challenge, ChallengeIndex } from "./exploration";

export interface Snapshot {
  version: 2;
  params: OscillatorParameters;
  time: number;
  speed: number;
  mode: "motion" | "changes" | "energy" | "resonance";
  velocity: boolean;
  acceleration: boolean;
  phasor: boolean;
  previous: OscillatorParameters | null;
  curves: Record<Metric, boolean>;
  parameterTab: "structure" | "initial" | "drive";
  energyView: "split" | "balance";
  responseView: "amplitude" | "phase";
  supportTab: "formula" | "tasks";
  exploration: {
    version: 1;
    completed: boolean[];
    active: Challenge | null;
  };
}
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const boolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export function normalizeSnapshot(value: unknown): Snapshot {
  const saved = record(value) ?? {};
  const params = parameters(saved.params);
  const curves = record(saved.curves) ?? {};
  const progress = record(saved.exploration);
  const exploration = progress?.version === 1 ? progress : null;
  const completed = [0, 1, 2].map(
    (i) =>
      Array.isArray(exploration?.completed) &&
      exploration.completed[i] === true,
  );
  const active = record(exploration?.active);
  const index = active?.index;
  const baseline = record(active?.baseline);
  return {
    version: 2,
    params,
    time: clamp(finite(saved.time, 0), 0, 1e6),
    speed: [0.25, 0.5, 1].includes(finite(saved.speed, 0))
      ? (saved.speed as number)
      : 1,
    mode:
      saved.mode === "changes" ||
      saved.mode === "energy" ||
      (saved.mode === "resonance" && params.model === "driven")
        ? saved.mode
        : "motion",
    velocity: boolean(saved.velocity, true),
    acceleration: boolean(saved.acceleration, true),
    phasor: boolean(saved.phasor, false),
    previous: record(saved.previous) ? parameters(saved.previous) : null,
    curves: {
      x: boolean(curves.x, true),
      v: boolean(curves.v, true),
      a: boolean(curves.a, true),
      kinetic: boolean(curves.kinetic, true),
      potential: boolean(curves.potential, true),
      total: boolean(curves.total, true),
      dissipated: boolean(curves.dissipated, true),
      work: boolean(curves.work, true),
    },
    parameterTab:
      saved.parameterTab === "initial" && params.model !== "ideal"
        ? "initial"
        : saved.parameterTab === "drive" && params.model === "driven"
          ? "drive"
          : "structure",
    energyView: saved.energyView === "balance" ? "balance" : "split",
    responseView: saved.responseView === "phase" ? "phase" : "amplitude",
    supportTab: saved.supportTab === "tasks" ? "tasks" : "formula",
    exploration: {
      version: 1,
      completed,
      active:
        params.model === "ideal" &&
        typeof index === "number" &&
        [0, 1, 2].includes(index) &&
        !completed[index] &&
        baseline
          ? {
              index: index as ChallengeIndex,
              baseline: idealParameters(baseline),
            }
          : null,
    },
  };
}

export function restoreSnapshot(
  storage: ExperimentContext["storage"],
): Snapshot {
  const current = record(storage.read<unknown>(null));
  const saved =
    current?.version === 2 && record(current.params)
      ? current
      : storage.readVersion<unknown>(1, null);
  const snapshot = normalizeSnapshot(saved);
  // Migration writes only the new namespace; version 1 remains available for rollback.
  storage.write(snapshot);
  return snapshot;
}

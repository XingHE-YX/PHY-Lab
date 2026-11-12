import { plate } from "./catalog";
import { parameters, record, clamp, frequency } from "./plate";
import { MAX_CYCLES } from "./sand";
export interface Snapshot {
  version: 1;
  params: ReturnType<typeof parameters>;
  cycles: number;
  seed: number;
  count: number;
  empty: boolean;
  rate: number;
  observation: "sand" | "mode" | "resonance";
  parameterTab: "drive" | "plate";
  probe: { x: number; y: number };
  target: "drive" | "probe";
  tilt: boolean;
  heat: boolean;
  nodes: boolean;
  metric: "w" | "v" | "a";
  muted: boolean;
}
export function frequencyRange(p: Snapshot["params"]) {
  return {
    min: Math.max(5, frequency(plate.modes[0], p) * 0.7),
    max: Math.min(3000, frequency(plate.modes.at(-1)!, p) * 0.98),
  };
}
export function normalizeSnapshot(value: unknown): Snapshot {
  const v = record(value),
    raw = record(v.params),
    probe = record(v.probe),
    p = parameters(raw),
    range = frequencyRange(p);
  if (typeof raw.frequency !== "number" || !Number.isFinite(raw.frequency))
    p.frequency = frequency(plate.modes[12], p);
  p.frequency = clamp(p.frequency, range.min, range.max);
  const num = (v: unknown, d: number, a: number, b: number) =>
    typeof v === "number" && Number.isFinite(v) ? clamp(v, a, b) : d;
  const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    version: 1,
    params: p,
    cycles: num(v.cycles, 0, 0, MAX_CYCLES),
    seed: Math.floor(num(v.seed, 123456, 0, 4294967295)),
    count: Math.round(num(v.count, 3600, 500, 6000)),
    empty: flag(v.empty, false),
    rate: [0.25, 0.5, 1].includes(Number(v.rate)) ? Number(v.rate) : 1,
    observation:
      v.observation === "mode" || v.observation === "resonance"
        ? v.observation
        : "sand",
    parameterTab: v.parameterTab === "plate" ? "plate" : "drive",
    probe: { x: num(probe.x, -0.35, -1, 1), y: num(probe.y, 0.25, -1, 1) },
    target: v.target === "probe" ? "probe" : "drive",
    tilt: flag(v.tilt, false),
    heat: flag(v.heat, false),
    nodes: flag(v.nodes, false),
    metric: v.metric === "v" || v.metric === "a" ? v.metric : "w",
    muted: flag(v.muted, false),
  };
}

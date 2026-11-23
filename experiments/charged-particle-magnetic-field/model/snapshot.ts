import { bounded, parameters, replaySpan, type Parameters } from "./physics";

export const rates = [1, 0.5, 0.25] as const;
type Rate = (typeof rates)[number];

export interface Snapshot {
  params: Parameters;
  progress: number;
  launched: boolean;
  rate: Rate;
  view: "velocity" | "energy";
  trail: boolean;
  vectors: boolean;
}

export function normalizeSnapshot(value: unknown): Snapshot {
  const source = value as Partial<Snapshot> | null | undefined;
  const launched = source?.launched === true;
  return {
    params: parameters(source?.params),
    progress: launched ? bounded(source?.progress, 0, replaySpan, 0) : 0,
    launched,
    rate: source?.rate === 0.25 || source?.rate === 0.5 ? source.rate : 1,
    view: source?.view === "energy" ? "energy" : "velocity",
    trail: source?.trail !== false,
    vectors: source?.vectors !== false,
  };
}

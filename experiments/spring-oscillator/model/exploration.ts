import { stateAt, type Parameters } from "./physics";

export type ChallengeIndex = 0 | 1 | 2;
export interface Challenge {
  index: ChallengeIndex;
  baseline: Parameters;
}
export const challengeTolerance = 0.02;

export function meetsChallenge(
  challenge: Challenge,
  current: Parameters,
  time: number,
  dragging = false,
) {
  const { index, baseline } = challenge;
  if (dragging || current.A <= 0 || baseline.A <= 0) return false;
  const same = (key: keyof Parameters) =>
    Math.abs(current[key] - baseline[key]) < 1e-8;
  const state = stateAt(current, time);
  if (index === 0)
    return (
      same("A") &&
      same("k") &&
      Math.abs(state.period / (2 * stateAt(baseline, 0).period) - 1) <=
        challengeTolerance
    );
  if (index === 1)
    return (
      same("A") &&
      same("m") &&
      same("k") &&
      same("phi") &&
      Math.abs(state.kinetic / state.total - 0.5) <= challengeTolerance
    );
  return (
    same("A") &&
    same("m") &&
    same("k") &&
    time === 0 &&
    Math.abs(state.x / current.A) <= challengeTolerance &&
    Math.abs(state.v) / (current.A * state.omega) >= 1 - challengeTolerance
  );
}

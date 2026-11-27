import { expect, test } from "bun:test";
import { defaults, duration } from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("preserves phase, role, motion, layers and observation options without auto-playing", () => {
  const saved: Snapshot = {
    parameters: {
      mover: "observer",
      motion: "retreat",
      frequency: 650,
      speed: 125,
    },
    time: 0.02549123,
    observation: "comparison",
    support: "explore",
    rate: 0.25,
    wavefronts: false,
    wavelengthGuide: false,
    vectors: false,
  };
  expect(
    normalizeSnapshot({ ...JSON.parse(JSON.stringify(saved)), playing: true }),
  ).toEqual(saved);
});

test("clamps finite inputs and defaults invalid or legacy missing values without admitting supersonic motion", () => {
  const saved = normalizeSnapshot({
    parameters: { mover: "broken", motion: 1, speed: 9000, frequency: 396 },
    observation: NaN,
    support: "unknown",
    rate: 5,
    wavefronts: "false",
    time: 500,
  });
  expect(saved.parameters).toEqual({ ...defaults, speed: 170, frequency: 400 });
  expect(saved.time).toBe(duration);
  expect([
    saved.observation,
    saved.support,
    saved.rate,
    saved.wavefronts,
    saved.wavelengthGuide,
    saved.vectors,
  ]).toEqual(["arrivals", "formula", 1, true, true, true]);
  expect(normalizeSnapshot({ time: NaN })).toEqual(normalizeSnapshot(null));
});

import { expect, test } from "bun:test";
import { defaults, duration } from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("preserves phase, role, motion and observation options without auto-playing", () => {
  const saved: Snapshot = {
    parameters: {
      mover: "observer",
      motion: "retreat",
      frequency: 650,
      speed: 125,
    },
    time: 0.02549123,
    observation: "comparison",
    rate: 0.25,
    wavefronts: false,
  };
  expect(
    normalizeSnapshot({ ...JSON.parse(JSON.stringify(saved)), playing: true }),
  ).toEqual(saved);
});

test("clamps finite inputs and defaults invalid values without admitting supersonic motion", () => {
  const saved = normalizeSnapshot({
    parameters: { mover: "broken", motion: 1, speed: 9000, frequency: 396 },
    observation: NaN,
    rate: 5,
    wavefronts: "false",
    time: 500,
  });
  expect(saved.parameters).toEqual({ ...defaults, speed: 170, frequency: 400 });
  expect(saved.time).toBe(duration);
  expect([saved.observation, saved.rate, saved.wavefronts]).toEqual([
    "arrivals",
    1,
    true,
  ]);
  expect(normalizeSnapshot({ time: NaN })).toEqual(normalizeSnapshot(null));
});

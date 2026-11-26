import { expect, test } from "bun:test";
import { defaults, timing } from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("valid state restores the exact cursor and display preferences", () => {
  const snapshot: Snapshot = {
    parameters: { ...defaults, angle: -120 },
    time: 1.5298625,
    rate: 0.25,
    observation: "energy",
    support: "tasks",
    comparison: false,
    velocity: false,
    acceleration: false,
  };
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(
    snapshot,
  );
});

test("legacy snapshots without new layout fields restore with safe defaults", () => {
  expect(
    normalizeSnapshot({
      parameters: { ...defaults, angle: 120 },
      time: 1.2,
      rate: 0.5,
      observation: "motion",
      comparison: false,
    }),
  ).toEqual({
    parameters: { ...defaults, angle: 120 },
    time: 1.2,
    rate: 0.5,
    observation: "motion",
    support: "formula",
    comparison: false,
    velocity: true,
    acceleration: true,
  });
});

test("invalid values are bounded or replaced and cannot restore playback", () => {
  const invalid = {
    parameters: { angle: 999, length: Infinity, gravity: false },
    time: 999,
    rate: -10,
    observation: "invalid",
    support: "invalid",
    comparison: "false",
    velocity: "false",
    acceleration: "false",
    playing: true,
  };
  const parameters = { ...defaults, angle: 170 };
  expect(normalizeSnapshot(invalid)).toEqual({
    parameters,
    time: timing(parameters).duration,
    rate: 1,
    observation: "period",
    support: "formula",
    comparison: true,
    velocity: true,
    acceleration: true,
  });
  expect(normalizeSnapshot({ parameters: { angle: 0 }, time: 3 }).time).toBe(0);
  expect(normalizeSnapshot(null)).toEqual(normalizeSnapshot({ time: NaN }));
});

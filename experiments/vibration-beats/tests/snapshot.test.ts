import { expect, test } from "bun:test";
import { defaults, derive, presets } from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("valid preferences and exact replay time round-trip", () => {
  const data: Snapshot = {
    parameters: presets.unequal,
    time: 2.51289,
    rate: 0.25,
    observation: "envelope",
    vectors: false,
  };
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(data)))).toEqual(data);
});

test("invalid and unbounded storage cannot start a run or send the playhead out of range", () => {
  const raw = {
    parameters: {
      amplitudeFirst: -1,
      amplitudeSecond: "1",
      frequencyFirst: Infinity,
      phaseSecond: 999,
    },
    time: 900,
    rate: -10,
    observation: "unknown",
    vectors: "false",
    playing: true,
  };
  const parameters = { ...defaults, amplitudeFirst: 0, phaseSecond: 180 };
  expect(normalizeSnapshot(raw)).toEqual({
    parameters,
    time: derive(parameters).duration,
    rate: 1,
    observation: "waves",
    vectors: true,
  });
  expect(normalizeSnapshot({ time: NaN })).toEqual(normalizeSnapshot(null));
  expect(normalizeSnapshot({ time: -4 }).time).toBe(0);
});

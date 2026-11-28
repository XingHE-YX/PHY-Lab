import { expect, test } from "bun:test";
import { defaults, makeTrial } from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("preserves a paused post-contact sample and view preferences", () => {
  const parameters = { ...defaults, mode: "inelastic" as const };
  const saved: Snapshot = {
    parameters,
    time: makeTrial(parameters).contact!,
    rate: 0.25,
    metric: "kinetic",
    support: "explore",
    vectors: false,
    centerOfMass: false,
  };
  expect(
    normalizeSnapshot({ ...JSON.parse(JSON.stringify(saved)), playing: true }),
  ).toEqual(saved);
});

test("limits invalid masses, signed velocities and legacy missing fields before restoring", () => {
  const saved = normalizeSnapshot({
    parameters: {
      leftMass: -10,
      rightMass: NaN,
      leftVelocity: "bad",
      rightVelocity: 900,
      mode: "invalid",
    },
    time: 900,
    metric: "invalid",
    support: "unknown",
    rate: -1,
    vectors: "false",
  });
  const parameters = { ...defaults, leftMass: 0.5, rightVelocity: 3 };
  expect(saved).toEqual({
    parameters,
    time: makeTrial(parameters).duration,
    metric: "momentum",
    support: "formula",
    rate: 1,
    vectors: true,
    centerOfMass: true,
  });
  expect(normalizeSnapshot(null)).toEqual(normalizeSnapshot({ time: NaN }));
});

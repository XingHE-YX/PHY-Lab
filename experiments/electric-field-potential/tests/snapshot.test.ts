import { expect, test } from "bun:test";
import {
  board,
  chargeBounds,
  presets,
  separated,
} from "../model/electrostatics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("restores precise probe position and independent view preferences", () => {
  const snapshot: Snapshot = {
    charges: [{ x: -1.65, y: 1, nanoCoulombs: 3.5 }, presets.dipole[1]],
    probe: { x: -0.125, y: 0.5 },
    vectors: false,
    equipotential: true,
    observation: "profile",
  };
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(
    snapshot,
  );
});

test("invalid values are bounded and colliding positions recover without losing charge values", () => {
  const state = normalizeSnapshot({
    charges: [
      { x: 800, y: 30, nanoCoulombs: 56 },
      { x: 900, y: 34, nanoCoulombs: -3.4 },
    ],
    probe: { x: -440, y: NaN },
    equipotential: "false",
    observation: "bad",
  });
  expect(separated(...state.charges)).toBe(true);
  expect(state.charges.map(({ nanoCoulombs }) => nanoCoulombs)).toEqual([
    8, -3.5,
  ]);
  expect(state.charges[0].x).toBe(presets.dipole[0].x);
  expect(state.probe).toEqual({ x: -board.x, y: 0 });
  expect(state.observation).toBe("contributions");
  expect(state.equipotential).toBe(true);
  expect(
    normalizeSnapshot({ charges: [{ x: -88, y: 98 }] }).charges[0],
  ).toEqual({ x: -chargeBounds.x, y: chargeBounds.y, nanoCoulombs: 4 });
});

import { expect, test } from "bun:test";
import { plate } from "../model/catalog";
import { frequency } from "../model/plate";
import { response, field, pointAt, responseCurve } from "../model/response";
import { normalizeSnapshot, frequencyRange } from "../model/snapshot";

test("malformed saves recover finite defaults and bounded plate parameters", () => {
  const defaults = normalizeSnapshot(null);
  for (const value of [null, false, [], "bad", { params: [], probe: false }])
    expect(normalizeSnapshot(value)).toEqual(defaults);
  const recovered = normalizeSnapshot({
    params: {
      length: -5,
      thickness: Infinity,
      force: -1,
      damping: 0,
      frequency: NaN,
      driveX: 15,
      driveY: -15,
    },
    cycles: Infinity,
    count: -1,
    seed: -5,
    probe: { x: 50, y: NaN },
    observation: "bad",
    rate: 5,
    tilt: "true",
  });
  expect(recovered.params.length).toBe(0.24);
  expect(recovered.params.thickness).toBe(defaults.params.thickness);
  expect(recovered.params.force).toBe(0);
  expect(recovered.params.damping).toBe(0.005);
  expect(recovered.params.frequency).toBe(
    frequency(plate.modes[12], recovered.params),
  );
  expect([recovered.params.driveX, recovered.params.driveY]).toEqual([
    0.94, -0.94,
  ]);
  expect(recovered.cycles).toBe(0);
  expect(recovered.count).toBe(500);
  expect(recovered.seed).toBe(0);
  expect(recovered.probe).toEqual({ x: 1, y: defaults.probe.y });
  expect(recovered.observation).toBe("sand");
  expect(recovered.rate).toBe(1);
  expect(recovered.tilt).toBe(false);
  const saved = normalizeSnapshot({
    ...defaults,
    cycles: 47.125,
    tilt: true,
    nodes: true,
    metric: "a",
  });
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

test("the computed frequency band and physical readouts remain finite at all parameter bounds", () => {
  for (const length of [0.24, 0.5])
    for (const thickness of [0.0006, 0.0015])
      for (const damping of [0.005, 0.08])
        for (const force of [0, 0.15]) {
          for (const f of [0, 3000]) {
            const s = normalizeSnapshot({
                params: {
                  length,
                  thickness,
                  damping,
                  force,
                  frequency: f,
                  driveX: 0.94,
                  driveY: -0.94,
                },
              }),
              range = frequencyRange(s.params),
              r = response(plate, s.params),
              g = field(plate, r, 17),
              p = pointAt(plate, r, s.params, 1, 1, 80),
              curve = responseCurve(plate, s.params, range.min, range.max);
            expect(range.min).toBeLessThan(range.max);
            expect(s.params.frequency).toBe(f === 0 ? range.min : range.max);
            expect(
              [
                ...r.real,
                ...r.imaginary,
                ...g.real,
                ...g.imaginary,
                ...Object.values(p),
                ...curve.map((p) => p.amplitude),
              ].every(Number.isFinite),
            ).toBe(true);
            expect(g.peak).toBeGreaterThanOrEqual(0);
            if (force === 0) expect(g.peak).toBe(0);
          }
        }
});

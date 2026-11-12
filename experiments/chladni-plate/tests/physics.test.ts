import { describe, expect, test } from "bun:test";
import { plate } from "../model/catalog";
import { modeAt, solvePlate, frequency, parameters } from "../model/plate";
import {
  response,
  displacement,
  pointAt,
  field,
  energies,
  sample,
} from "../model/response";
import { SandSimulation } from "../model/sand";

describe("free-edge thin plate with nine center supports", () => {
  test("modes satisfy the support constraints and mass orthogonality", () => {
    expect(plate.residual).toBeLessThan(1e-6);
    for (const m of plate.modes) {
      expect(m.eigenvalue).toBeGreaterThan(0);
      for (const x of [-0.1, 0, 0.1])
        for (const y of [-0.1, 0, 0.1])
          expect(Math.abs(modeAt(plate, m, x, y).value)).toBeLessThan(1e-8);
    }
    plate.modes.forEach((a, i) =>
      plate.modes.forEach((b, j) => {
        const mass = a.coefficients.reduce(
          (sum, v, k) => sum + v * b.coefficients[k],
          0,
        );
        expect(mass).toBeCloseTo(i === j ? 1 : 0, 9);
      }),
    );
  });
  test("increasing the Ritz order lowers the first 24 frequencies by under 3 percent", () => {
    const lower = solvePlate(16, 24);
    plate.modes.forEach((m, i) => {
      const ratio = Math.sqrt(lower.modes[i].eigenvalue / m.eigenvalue);
      expect(ratio).toBeGreaterThan(1 - 1e-6);
      expect(ratio).toBeLessThan(1.03);
    });
    // Square symmetry yields repeated frequencies; no artificial mode splitting.
    expect(plate.modes[0].eigenvalue).toBeCloseTo(plate.modes[1].eigenvalue, 6);
    expect(plate.modes[5].eigenvalue).toBeCloseTo(plate.modes[6].eigenvalue, 5);
  });
  test("bending frequencies scale with thickness and inverse length squared", () => {
    const p = parameters(null),
      m = plate.modes[12],
      f = frequency(m, p);
    expect(frequency(m, { ...p, length: p.length * 2 })).toBeCloseTo(f / 4, 10);
    expect(frequency(m, { ...p, thickness: p.thickness * 2 })).toBeCloseTo(
      f * 2,
      10,
    );
  });
});
test("steady response is linear, dissipative and shares one physical time", () => {
  const p = parameters({
    frequency: frequency(plate.modes[12], parameters(null)),
  });
  const r = response(plate, p),
    double = response(plate, { ...p, force: p.force * 2 });
  const s = pointAt(plate, r, p, 0.4, 0.6, 0.183),
    h = 1e-7;
  const before = pointAt(plate, r, p, 0.4, 0.6, 0.183 - h * p.frequency),
    after = pointAt(plate, r, p, 0.4, 0.6, 0.183 + h * p.frequency);
  expect((after.w - before.w) / (2 * h)).toBeCloseTo(s.v, 7);
  expect((after.v - before.v) / (2 * h)).toBeCloseTo(s.a, 5);
  expect(s.time).toBe(0.183 / p.frequency);
  r.real.forEach((v, i) => {
    expect(double.real[i]).toBeCloseTo(v * 2, 12);
    expect(
      r.imaginary[i] *
        p.force *
        modeAt(plate, plate.modes[i], p.driveX, p.driveY).value,
    ).toBeLessThanOrEqual(1e-14);
  });
  const e = energies(r, p, 0.183);
  expect(e.kinetic).toBeGreaterThan(0);
  expect(e.potential).toBeGreaterThan(0);
  // Average input power equals average modal viscous dissipation.
  const atDrive = displacement(plate, r, p.driveX, p.driveY);
  expect(e.averagePower).toBeCloseTo(
    -p.force * Math.PI * p.frequency * atDrive.imaginary,
    10,
  );
  const damped = response(plate, { ...p, damping: p.damping * 2 });
  expect(Math.hypot(damped.real[12], damped.imaginary[12])).toBeCloseTo(
    Math.hypot(r.real[12], r.imaginary[12]) / 2,
    12,
  );
});
test("field sampling agrees with direct evaluation and does not create false center motion", () => {
  const p = parameters(null),
    r = response(plate, p),
    g = field(plate, r);
  for (const [x, y] of [
    [-0.5, 0.25],
    [0.5, 0.5],
    [0, 0],
  ]) {
    const s = displacement(plate, r, x, y);
    expect(sample(g, g.real, x, y)).toBeCloseTo(s.real, 10);
    expect(sample(g, g.imaginary, x, y)).toBeCloseTo(s.imaginary, 10);
  }
});
test("sand migrates toward low vibration and rewind is exactly reproducible", () => {
  const p = parameters({
      frequency: frequency(plate.modes[12], parameters(null)),
    }),
    g = field(plate, response(plate, p));
  const sand = new SandSimulation(g, 42, 1500, p.frequency),
    initial = sand.lowAmplitudeFraction;
  const late = sand.seek(60).slice();
  expect(sand.lowAmplitudeFraction).toBeGreaterThan(initial + 0.15);
  sand.seek(7.3);
  expect(sand.seek(60)).toEqual(late);
  const restored = new SandSimulation(g, 42, 1500, p.frequency);
  expect(restored.seek(60)).toEqual(late);
  const still = new SandSimulation(
      field(plate, response(plate, { ...p, force: 0 })),
      42,
      50,
      p.frequency,
    ),
    start = still.positions.slice();
  expect(still.seek(80)).toEqual(start);
});

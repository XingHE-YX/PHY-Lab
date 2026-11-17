import { expect, test } from "bun:test";
import {
  at,
  defaults,
  derived,
  fringePosition,
  adjacentFringe,
  parameters,
  screenHalf,
  tau,
} from "../model/physics";
import { normalizeSnapshot } from "../model/snapshot";

test("central maximum and exact signed extrema obey the coherent two-slit conditions", () => {
  expect(at(defaults, 0).delta).toBe(0);
  expect(at(defaults, 0).intensity).toBe(1);
  expect(derived(defaults).spacing).toBeCloseTo(0.0033, 12);
  for (const order of [-3, -2.5, -1, -0.5, 0, 0.5, 1, 2.5, 3]) {
    const y = fringePosition(defaults, order)!;
    const s = at(defaults, y);
    expect(s.order).toBeCloseTo(order, 12);
    expect(s.phase).toBeCloseTo(tau * order, 11);
    expect(s.intensity).toBeCloseTo(Number(Number.isInteger(order)), 12);
    expect(at(defaults, -y).delta).toBeCloseTo(-s.delta, 15);
    expect(at(defaults, -y).intensity).toBeCloseTo(s.intensity, 12);
  }
  expect(
    fringePosition(defaults, defaults.separation / defaults.wavelength),
  ).toBeNull();
});

test("stable path difference resolves sub-nanometre differences near the axis", () => {
  const s = at(defaults, 1e-12);
  expect(s.delta).toBeGreaterThan(0);
  expect(
    s.delta / ((defaults.separation * 1e-12) / defaults.distance),
  ).toBeCloseTo(1, 7);
  expect(
    Math.abs(
      at(defaults, screenHalf).delta /
        at(defaults, screenHalf).approximateDelta -
        1,
    ),
  ).toBeLessThan(0.00004);
});

test("intensity is the cycle mean, not the instantaneous squared electric field", () => {
  for (const order of [0, 0.25, 0.5, 1.3, -2.1]) {
    const y = fringePosition(defaults, order)!;
    let mean = 0;
    for (let i = 0; i < 512; i++)
      mean += (2 * at(defaults, y, i / 512).field ** 2) / 512;
    expect(mean).toBeCloseTo(at(defaults, y).intensity, 12);
    expect(at(defaults, y, 0).intensity).toBe(at(defaults, y, 0.25).intensity);
    expect(at(defaults, y, 0.37).field).toBeCloseTo(
      at(defaults, y, 3.37).field,
      12,
    );
  }
});

test("parameter trends, screen bounds and all supported corners remain physical", () => {
  expect(
    derived({ ...defaults, wavelength: 2 * defaults.wavelength }).spacing,
  ).toBe(2 * derived(defaults).spacing);
  expect(
    derived({ ...defaults, distance: 2 * defaults.distance }).spacing,
  ).toBe(2 * derived(defaults).spacing);
  expect(
    derived({ ...defaults, separation: 2 * defaults.separation }).spacing,
  ).toBe(derived(defaults).spacing / 2);
  for (const wavelength of [400e-9, 700e-9])
    for (const separation of [0.1e-3, 1e-3])
      for (const distance of [0.5, 3]) {
        const p = { wavelength, separation, distance };
        for (const y of [-screenHalf, 0, screenHalf]) {
          const s = at(p, y);
          expect(Object.values(s).every(Number.isFinite)).toBe(true);
          expect(s.intensity).toBeGreaterThanOrEqual(0);
          expect(s.intensity).toBeLessThanOrEqual(1);
          expect(Math.abs(s.delta)).toBeLessThan(separation);
          const next = adjacentFringe(p, y, 1, false);
          if (next !== null) expect(next).toBeLessThanOrEqual(screenHalf);
        }
      }
  const next = adjacentFringe(defaults, 0, 1, true)!;
  expect(at(defaults, next).order).toBeCloseTo(0.5, 12);
  expect(
    at(defaults, adjacentFringe(defaults, next, -1, true)!).order,
  ).toBeCloseTo(-0.5, 12);
});

test("invalid saves cannot leak NaN, invalid modes or out-of-range parameters", () => {
  for (const value of [
    null,
    [],
    "bad",
    {
      params: { wavelength: NaN, separation: -1, distance: Infinity },
      cycles: Infinity,
      probe: -99,
      rate: 4,
      layers: { paths: "no" },
      reference: [],
    },
  ]) {
    const data = normalizeSnapshot(value);
    expect(Object.values(data.params).every(Number.isFinite)).toBe(true);
    expect(data.probe).toBeGreaterThanOrEqual(-screenHalf);
    expect(data.cycles).toBe(0);
    expect(data.rate).toBe(1);
    expect(data.layers.paths).toBe(true);
    expect(data.reference).toBeNull();
  }
  const data = normalizeSnapshot({
    params: defaults,
    probe: 0.003,
    cycles: 3.75,
    rate: 0.5,
    observation: "phase",
    support: "tasks",
    layers: { paths: false, orders: true },
    reference: defaults,
  });
  expect(normalizeSnapshot(data)).toEqual(data);
  expect(parameters({ distance: 0 }).distance).toBe(0.5);
});

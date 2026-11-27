import { expect, test } from "bun:test";
import { contours, polylines } from "../model/contours";
import {
  board,
  chargeAxis,
  coulombInNano,
  distance,
  excludedRadius,
  measure,
  midpoint,
  presets,
  type Charges,
} from "../model/electrostatics";
import { profile } from "../model/profile";

test("potential and radial field follow the point-charge laws; zero charges are nonsingular", () => {
  const charges: Charges = [
    { x: 0, y: 0, nanoCoulombs: 2 },
    { x: 2, y: 0, nanoCoulombs: 0 },
  ];
  const reading = measure({ x: 2, y: 0 }, charges)!;
  expect(reading.potential).toBeCloseTo(coulombInNano, 11);
  expect(reading.fieldX).toBeCloseTo(coulombInNano / 2, 11);
  expect(reading.fieldY).toBe(0);
  expect(reading.parts[1]).toEqual({ potential: 0, fieldX: 0, fieldY: 0 });
  expect(measure({ x: 0, y: 0 }, charges)).toBeNull();
  expect(measure({ x: excludedRadius, y: 0 }, charges)).toBeNull();
  expect(measure({ x: excludedRadius + 0.001, y: 0 }, charges)).not.toBeNull();
});

test("electric field equals minus the gradient of independently sampled potential", () => {
  const point = { x: 0.7, y: 1.1 };
  const delta = 1e-5;
  for (const charges of Object.values(presets)) {
    const reading = measure(point, charges)!;
    const potential = (x: number, y: number) =>
      measure({ x, y }, charges)!.potential;
    expect(reading.fieldX).toBeCloseTo(
      -(
        potential(point.x + delta, point.y) -
        potential(point.x - delta, point.y)
      ) /
        (2 * delta),
      7,
    );
    expect(reading.fieldY).toBeCloseTo(
      -(
        potential(point.x, point.y + delta) -
        potential(point.x, point.y - delta)
      ) /
        (2 * delta),
      7,
    );
  }
});

test("the dipole bisector has zero potential but a nonzero perpendicular field, even after rotation", () => {
  const charges: Charges = [
    { x: -1, y: 1, nanoCoulombs: 2 },
    { x: 1, y: -1, nanoCoulombs: -2 },
  ];
  const zero = contours(charges).find(({ level }) => level === 0)!;
  expect(zero.segments).toHaveLength(1);
  const { from, to } = zero.segments[0];
  expect(Math.abs(from.y)).toBeCloseTo(board.y, 12);
  expect(Math.abs(to.y)).toBeCloseTo(board.y, 12);
  const axis = chargeAxis(charges);
  for (const point of [from, { x: -0.5, y: -0.5 }, midpoint(charges), to]) {
    const reading = measure(point, charges)!;
    expect(reading.potential).toBeCloseTo(0, 12);
    expect(reading.magnitude).toBeGreaterThan(0);
    expect(reading.fieldX / reading.magnitude).toBeCloseTo(axis.x, 12);
    expect(reading.fieldY / reading.magnitude).toBeCloseTo(axis.y, 12);
  }
  const same = measure(midpoint(presets.like), presets.like)!;
  expect(same.magnitude).toBeCloseTo(0, 12);
  expect(same.potential).toBeGreaterThan(0);
});

test("numeric contours reproduce the single-charge circle, while all-zero fields have no isolated lines", () => {
  const active = { x: 0, y: 0, nanoCoulombs: 4 };
  const inactive = { x: 2, y: 0, nanoCoulombs: 0 };
  const curves = contours([active, inactive]);
  const circle = curves.find(({ level }) => level === 20)!;
  expect(circle.segments.length).toBeGreaterThan(60);
  const paths = polylines(circle.segments);
  expect(paths).toHaveLength(1);
  expect(distance(paths[0][0], paths[0].at(-1)!)).toBeLessThan(1e-9);
  for (const { from, to } of circle.segments) {
    expect(
      Math.abs(
        distance(from, active) - (coulombInNano * active.nanoCoulombs) / 20,
      ),
    ).toBeLessThan(0.002);
    expect(
      Math.abs(
        distance(to, active) - (coulombInNano * active.nanoCoulombs) / 20,
      ),
    ).toBeLessThan(0.002);
  }
  expect(
    curves
      .filter(({ level }) => level <= 0)
      .every(({ segments }) => !segments.length),
  ).toBe(true);
  expect(
    contours([{ ...active, nanoCoulombs: 0 }, inactive]).every(
      ({ segments }) => !segments.length,
    ),
  ).toBe(true);
});

test("profile uses finite positions along the probe axis and never bridges a masked region", () => {
  const slice = profile(presets.dipole, { x: 0, y: 0 });
  expect(slice.start).toBe(-board.x);
  expect(slice.end).toBe(board.x);
  expect(slice.segments).toHaveLength(3);
  for (const segment of slice.segments)
    for (const { offset, value } of segment)
      expect(value).toBe(
        measure({ x: offset, y: 0 }, presets.dipole)!.potential,
      );
  expect(slice.segments[0].at(-1)!.offset).toBeLessThan(-1.4 - excludedRadius);
  expect(slice.segments[2][0].offset).toBeGreaterThan(1.4 + excludedRadius);
});

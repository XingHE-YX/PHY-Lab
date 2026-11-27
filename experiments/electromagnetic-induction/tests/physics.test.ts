import { expect, test } from "bun:test";
import {
  advance,
  atDistance,
  coilRadius,
  defaults,
  demoPath,
  demonstration,
  distances,
  maxSpeed,
  sampleAt,
  stepSeconds,
  withStop,
} from "../model/physics";

test("flux matches numerical integration of the dipole field over a finite loop", () => {
  for (const distance of [distances.min, 0.15, distances.max]) {
    const cells = 4000;
    const width = coilRadius / cells;
    let integral = 0;
    for (let index = 0; index < cells; index++) {
      const radius = (index + 0.5) * width;
      const field =
        (-2e-7 * (2 * distance ** 2 - radius ** 2)) /
        (distance ** 2 + radius ** 2) ** 2.5;
      integral += field * 2 * Math.PI * radius * width;
    }
    expect(atDistance(defaults, distance, 0).flux / integral).toBeCloseTo(1, 7);
  }
});

test("the stationary magnet has flux but produces no EMF or current", () => {
  const near = atDistance(defaults, distances.min, 0);
  const far = atDistance(defaults, distances.max, 0);
  expect(Math.abs(near.flux)).toBeGreaterThan(Math.abs(far.flux));
  expect(near.emf).toBe(0);
  expect(near.current).toBe(0);
  expect(near.direction).toBe("noCurrent");
});

test("EMF is minus N times the flux derivative, and flips with velocity or pole", () => {
  const distance = 0.12;
  const velocity = -0.16;
  const approach = atDistance(defaults, distance, velocity);
  const retreat = atDistance(defaults, distance, -velocity);
  const reversed = atDistance(
    { ...defaults, polarity: -1 },
    distance,
    velocity,
  );
  const dt = 1e-5;
  const fluxBefore = atDistance(defaults, distance - dt * velocity, 0).flux;
  const fluxAfter = atDistance(defaults, distance + dt * velocity, 0).flux;
  const finiteDifference =
    (-defaults.turns * (fluxAfter - fluxBefore)) / (2 * dt);
  expect(approach.emf / finiteDifference).toBeCloseTo(1, 8);
  expect(approach.flux).toBe(retreat.flux);
  expect(approach.direction).toBe("counterclockwise");
  expect(retreat.direction).toBe("clockwise");
  expect(approach.emf).toBe(-retreat.emf);
  expect(reversed.emf).toBe(-approach.emf);
  expect(reversed.flux).toBe(-approach.flux);
  expect(reversed.direction).toBe("clockwise");
  const moreTurns = atDistance(
    { ...defaults, turns: defaults.turns * 2 },
    distance,
    velocity,
  );
  const largerResistance = atDistance(
    { ...defaults, resistance: defaults.resistance * 2 },
    distance,
    velocity,
  );
  expect(moreTurns.emf).toBe(2 * approach.emf);
  expect(moreTurns.flux).toBe(approach.flux);
  expect(largerResistance.emf).toBe(approach.emf);
  expect(largerResistance.current).toBe(approach.current / 2);
});

test("captured motion is bounded, interpolated on the same clock and ends at rest", () => {
  const next = advance(distances.initial, distances.min);
  expect((distances.initial - next) / stepSeconds).toBeCloseTo(maxSpeed, 10);
  const path = withStop([distances.initial, next]);
  const halfway = sampleAt(defaults, path, 0.5);
  expect(halfway.distance).toBeCloseTo((distances.initial + next) / 2, 12);
  expect(halfway.velocity).toBeCloseTo(-maxSpeed, 12);
  expect(sampleAt(defaults, path, 1).distance).toBe(next);
  expect(sampleAt(defaults, path, 1).direction).toBe("counterclockwise");
  expect(sampleAt(defaults, path, 2).direction).toBe("noCurrent");
  expect(sampleAt(defaults, path, 2).distance).toBe(next);
  expect(sampleAt(defaults, path, 0.5)).toEqual(halfway);
});

test("the built-in trial has equal-distance approach and retreat, with a stationary plateau", () => {
  const path = demoPath();
  const read = (time: number) =>
    sampleAt(defaults, path, Math.round(time / stepSeconds));
  expect(read(demonstration.approach).distance).toBeCloseTo(
    read(demonstration.retreat).distance,
    12,
  );
  expect(read(demonstration.approach).direction).toBe("counterclockwise");
  expect(read(demonstration.retreat).direction).toBe("clockwise");
  const hold = read(demonstration.hold);
  expect(hold.velocity).toBe(0);
  expect(hold.emf).toBe(0);
  expect(hold.flux).toBe(read(3.5).flux);
  expect(read(demonstration.duration).velocity).toBe(0);
});

import { describe, expect, test } from "bun:test";
import {
  at,
  defaults,
  orbit,
  parameters,
  replaySpan,
  sample,
} from "../model/physics";
import { normalizeSnapshot } from "../model/snapshot";

describe("motion in a perpendicular magnetic field", () => {
  test("matches the default orbit; positive charge and out-of-page field turn clockwise", () => {
    const model = orbit(defaults);
    const start = at(model, 0);
    const quarter = at(model, 0.25);
    const round = at(model, 1);
    expect(model.radius! * 100).toBeCloseTo(1.0364, 4);
    expect(model.period! * 1e6).toBeCloseTo(0.6512, 4);
    expect(start.fy).toBeLessThan(0);
    expect(quarter.x).toBeCloseTo(model.radius!, 12);
    expect(quarter.y).toBeCloseTo(-model.radius!, 12);
    expect(quarter.vy).toBeCloseTo(-1e5, 8);
    expect(round.x).toBeCloseTo(0, 12);
    expect(round.vx).toBeCloseTo(start.vx, 8);
  });

  test("either sign reversal mirrors the path without changing radius, period or energy", () => {
    const model = orbit(defaults);
    const point = at(model, 0.22);
    for (const variation of [{ charge: -1 }, { field: -100 }]) {
      const reversed = orbit({ ...defaults, ...variation });
      const other = at(reversed, 0.22);
      expect(other.x).toBeCloseTo(point.x, 12);
      expect(other.y).toBeCloseTo(-point.y, 12);
      expect(reversed.radius).toBe(model.radius);
      expect(reversed.period).toBe(model.period);
      expect(reversed.energy).toBe(model.energy);
    }
  });

  test("with an oblique launch the force points inward and does no work over the entire replay", () => {
    const model = orbit({
      mass: 7.9,
      charge: -3,
      field: 10,
      speed: 250,
      angle: 73,
    });
    const center = model.center!;
    for (const point of sample(model, replaySpan, 80)) {
      expect(Math.hypot(point.vx, point.vy) / model.speed).toBeCloseTo(1, 12);
      expect(Math.hypot(point.x - center.x, point.y - center.y)).toBeCloseTo(
        model.radius!,
        12,
      );
      expect(
        (point.vx * point.fx + point.vy * point.fy) /
          (model.speed * point.force),
      ).toBeCloseTo(0, 12);
      expect(
        point.fx * (center.x - point.x) + point.fy * (center.y - point.y),
      ).toBeGreaterThan(0);
    }
  });

  test("doubling speed doubles radius and quadruples kinetic energy without changing period", () => {
    const model = orbit(defaults);
    const faster = orbit({ ...defaults, speed: 2 * defaults.speed });
    expect(faster.period).toBe(model.period);
    expect(faster.radius).toBe(2 * model.radius!);
    expect(faster.energy).toBe(4 * model.energy);
  });

  test("zero charge or field yields straight motion; zero speed stays at the origin", () => {
    for (const variation of [{ charge: 0 }, { field: 0 }, { speed: 0 }]) {
      const model = orbit({ ...defaults, angle: 90, ...variation });
      const end = at(model, replaySpan);
      expect(model.kind).toBe("speed" in variation ? "rest" : "straight");
      expect(model.period).toBeNull();
      expect(model.radius).toBeNull();
      expect(end.force).toBe(0);
      expect(end.time).toBe(2e-6);
      expect(end.x).toBeCloseTo(0, 12);
      expect(end.y).toBeCloseTo("speed" in variation ? 0 : 0.2, 12);
    }
  });
});

test("untrusted snapshots are bounded, quantized and never resume animation", () => {
  expect(
    parameters({
      charge: -20,
      mass: 2.34,
      field: 194,
      speed: Infinity,
      angle: "90",
    }),
  ).toEqual({
    charge: -3,
    mass: 2.3,
    field: 190,
    speed: defaults.speed,
    angle: defaults.angle,
  });
  expect(
    normalizeSnapshot({
      launched: true,
      progress: 9,
      rate: 2,
      view: "wrong",
      trail: false,
    }),
  ).toMatchObject({
    launched: true,
    progress: replaySpan,
    rate: 1,
    view: "velocity",
    vectors: true,
    trail: false,
  });
  expect(
    normalizeSnapshot({ progress: 1, launched: "true", playing: true })
      .progress,
  ).toBe(0);
  expect(normalizeSnapshot({ progress: NaN, launched: true }).progress).toBe(0);
  expect(normalizeSnapshot(null).params).toEqual(defaults);
});

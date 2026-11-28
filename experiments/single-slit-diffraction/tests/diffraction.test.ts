import { describe, expect, test } from "bun:test";
import {
  defaults,
  intensityAt,
  limits,
  minimum,
  profile,
  screenExtent,
  width,
} from "../model/diffraction";

describe("Fraunhofer single slit", () => {
  test("the central limit, symmetry and dark fringes agree with the model", () => {
    expect(intensityAt(0, defaults)).toBe(1);
    expect(intensityAt(1e-10, defaults)).toBeCloseTo(1, 14);
    expect(intensityAt(-4, defaults)).toBe(intensityAt(4, defaults));
    expect(intensityAt(4, defaults)).toBeGreaterThan(intensityAt(6, defaults));
    for (const order of [1, 2, 3]) {
      const position = minimum(defaults, order)!;
      const sine = position / Math.hypot(position, 1000 * defaults.distance);
      expect(defaults.slit * sine).toBeCloseTo(
        (order * defaults.wavelength) / 1000,
        12,
      );
      expect(intensityAt(position, defaults)).toBeLessThan(1e-25);
      expect(intensityAt(-position, defaults)).toBeLessThan(1e-25);
    }
    expect(minimum(defaults, 0)).toBeNull();
    expect(minimum(defaults, 1.5)).toBeNull();
    expect(minimum(defaults, 1000)).toBeNull();
  });

  test("the central width increases as the slit narrows, wavelength grows, or screen recedes", () => {
    const reference = { ...defaults, slit: 160 };
    expect(width(defaults)).toBeCloseTo(16.5, 2);
    expect(width(reference)).toBeCloseTo(8.25, 2);
    expect(width(defaults) / width(reference)).toBeCloseTo(2, 3);
    expect(width({ ...defaults, slit: 40 })).toBeGreaterThan(width(defaults));
    expect(width({ ...defaults, wavelength: 700 })).toBeGreaterThan(
      width(defaults),
    );
    expect(width({ ...defaults, distance: 1.8 }) / width(defaults)).toBeCloseTo(
      1.5,
      12,
    );
  });

  test("all parameter extremes keep the whole central band on the sampled screen", () => {
    for (const slit of [limits.slit.min, limits.slit.max]) {
      for (const wavelength of [limits.wavelength.min, limits.wavelength.max]) {
        for (const distance of [limits.distance.min, limits.distance.max]) {
          const settings = { slit, wavelength, distance };
          const first = minimum(settings, 1)!;
          const points = profile(settings);
          expect(first).toBeGreaterThan(0);
          expect(first).toBeLessThan(screenExtent);
          expect(points[0].position).toBe(-screenExtent);
          expect(points.at(-1)?.position).toBe(screenExtent);
          expect(points.find(({ position }) => position === 0)?.intensity).toBe(
            1,
          );
          expect(
            points.find(({ position }) => position === first)!.intensity,
          ).toBeLessThan(1e-25);
          expect(
            points.every(({ intensity }) => intensity >= 0 && intensity <= 1),
          ).toBe(true);
          expect(
            points
              .slice(1)
              .every(
                ({ position }, index) => position > points[index].position,
              ),
          ).toBe(true);
        }
      }
    }
  });
});

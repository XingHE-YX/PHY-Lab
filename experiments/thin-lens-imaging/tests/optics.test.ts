import { expect, test } from "bun:test";
import {
  aperture,
  defaults,
  limits,
  objectFor,
  objectHeight,
  scenarios,
  solve,
} from "../model/optics";
import { extension, frame, imageInView, outgoing } from "../model/ray-geometry";

test("twice the focal length gives an equal-size inverted real image", () => {
  const focal = defaults.focal;
  const model = solve({ focal, object: 2 * focal });
  expect(model.image).toEqual({
    kind: "real",
    distance: 2 * focal,
    magnification: -1,
    height: -objectHeight,
  });
  expect(model.rays).toHaveLength(3);
});

test("the principal rays meet the image for real and virtual distances", () => {
  for (const object of [10, 28, 32, 49]) {
    const model = solve({ ...defaults, object });
    const { image } = model;
    expect(image.kind).toBe(object < defaults.focal ? "virtual" : "real");
    expect(1 / object + 1 / image.distance!).toBeCloseTo(
      1 / defaults.focal,
      12,
    );
    expect(image.magnification).toBeCloseTo(-image.distance! / object, 12);
    for (const ray of model.rays)
      expect(ray.lensHeight + ray.slope * image.distance!).toBeCloseTo(
        image.height!,
        12,
      );
    const third = model.rays.find(({ kind }) => kind === "frontFocus")!;
    const incidentSlope = (third.lensHeight - objectHeight) / object;
    expect(third.lensHeight - defaults.focal * incidentSlope).toBeCloseTo(
      0,
      12,
    );
    if (image.kind === "virtual") {
      expect(image.height).toBeGreaterThan(objectHeight);
      for (const ray of model.rays) {
        const guide = extension(ray, image)!;
        expect(guide.to.x).toBeCloseTo(image.distance, 12);
        expect(guide.to.y).toBeCloseTo(image.height, 12);
      }
    } else {
      expect(image.height).toBeLessThan(0);
      expect(extension(model.rays[0], image)).toBeNull();
    }
  }
});

test("exact focus has equal slopes and no finite image; adjacent values stay finite", () => {
  const focus = solve({ focal: 16, object: 16 });
  expect(focus.image).toEqual({
    kind: "afocal",
    distance: null,
    magnification: null,
    height: null,
  });
  expect(focus.rays).toHaveLength(2);
  expect(focus.rays[0].slope).toBe(focus.rays[1].slope);
  expect(focus.rays[0].slope).not.toBe(0);
  expect(focus.rays[0].lensHeight - focus.rays[1].lensHeight).toBe(
    objectHeight,
  );
  expect(imageInView(focus.image)).toBe(false);
  for (const object of [15.5, 16.5]) {
    const trial = solve({ focal: 16, object });
    expect(trial.image.kind).toBe(object < 16 ? "virtual" : "real");
    expect(Number.isFinite(trial.image.distance)).toBe(true);
    expect(trial.image.magnification).toBe(object < 16 ? 32 : -32);
    expect(trial.rays).toHaveLength(2);
    expect(imageInView(trial.image)).toBe(false);
  }
});

test("presets stay within bounds and clipping retains only physical ray sections", () => {
  for (const focal of [limits.focal.min, 15.5, limits.focal.max]) {
    expect(
      scenarios.map(
        (scenario) =>
          solve({ focal, object: objectFor(scenario, focal) }).image.kind,
      ),
    ).toEqual(["real", "virtual", "afocal"]);
    for (const object of [
      limits.object.min,
      focal - 0.5,
      focal,
      focal + 0.5,
      limits.object.max,
    ]) {
      const { image, rays } = solve({ focal, object });
      for (const ray of rays) {
        expect(Math.abs(ray.lensHeight)).toBeLessThanOrEqual(aperture);
        const segment = outgoing(ray);
        expect(segment.from.x).toBe(0);
        expect(segment.to.x).toBeGreaterThan(0);
        expect(segment.to.x).toBeLessThanOrEqual(frame.x);
        expect(Math.abs(segment.to.y)).toBeLessThanOrEqual(frame.y + 1e-10);
        const guide = extension(ray, image);
        if (guide) {
          expect(guide.to.x).toBeLessThan(0);
          expect(guide.to.x).toBeGreaterThanOrEqual(-frame.x);
          expect(guide.to.x).toBeGreaterThanOrEqual(image.distance! - 1e-10);
          expect(Math.abs(guide.to.y)).toBeLessThanOrEqual(frame.y + 1e-10);
        }
      }
    }
  }
});

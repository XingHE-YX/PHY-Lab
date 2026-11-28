import { expect, test } from "bun:test";
import { defaultReference, defaults } from "../model/diffraction";
import { normalizeSnapshot } from "../model/snapshot";

test("empty or incompatible storage restores defaults", () => {
  const initial = {
    parameters: defaults,
    reference: defaultReference,
    probe: 0,
    guides: true,
  };
  expect(normalizeSnapshot(null)).toEqual(initial);
  expect(normalizeSnapshot("invalid")).toEqual(initial);
  expect(
    normalizeSnapshot({
      parameters: { slit: NaN, wavelength: Infinity, distance: "1.7" },
      reference: false,
      probe: -Infinity,
      guides: null,
    }),
  ).toEqual(initial);
});

test("stored controls are clamped and rounded while preserving preferences", () => {
  const restored = normalizeSnapshot({
    parameters: { slit: 17, wavelength: 728, distance: 1.721 },
    reference: 102,
    probe: -85,
    guides: false,
  });
  expect(restored).toEqual({
    parameters: { slit: 40, wavelength: 700, distance: 1.7 },
    reference: 100,
    probe: -40,
    guides: false,
  });
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(restored)))).toEqual(
    restored,
  );
  expect(normalizeSnapshot({ probe: 14.536 }).probe).toBe(14.54);
});

import { expect, test } from "bun:test";
import {
  defaults,
  demoPath,
  distances,
  maxSpeed,
  maxSteps,
  sampleAt,
} from "../model/physics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("a demonstration, fractional cursor and view preferences survive reload", () => {
  const saved: Snapshot = {
    parameters: { ...defaults, polarity: -1 },
    path: demoPath(),
    cursor: 202.33,
    recording: "demo",
    rate: 0.25,
    observation: "current",
    support: "tasks",
    fields: false,
    coilView: false,
  };
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  expect(normalizeSnapshot({ ...saved, path: [] })).toEqual(saved);
});

test("legacy snapshots without new layout fields restore with safe defaults", () => {
  const path = demoPath();
  expect(
    normalizeSnapshot({
      parameters: defaults,
      path,
      cursor: 100,
      recording: "demo",
      rate: 0.5,
      observation: "flux",
      fields: false,
    }),
  ).toEqual({
    parameters: defaults,
    path,
    cursor: 100,
    recording: "demo",
    rate: 0.5,
    observation: "flux",
    support: "formula",
    fields: false,
    coilView: true,
  });
});

test("corrupt histories are bounded in duration, position and speed", () => {
  const {
    parameters,
    path,
    cursor,
    observation,
    support,
    rate,
    fields,
    coilView,
    recording,
  } = normalizeSnapshot({
    parameters: { turns: 723, resistance: -90, polarity: 6 },
    path: [
      0.9,
      -0.4,
      NaN,
      ...Array.from({ length: 1000 }, (_, index) => (index % 2 ? 10 : 0)),
    ],
    cursor: 9999,
    observation: "bad",
    support: "bad",
    rate: 9,
    fields: "wrong",
    coilView: "wrong",
  });
  expect(parameters).toEqual({ turns: 240, resistance: 5, polarity: 1 });
  expect(path[0]).toBe(distances.max);
  expect(path.length).toBeLessThanOrEqual(maxSteps + 1);
  expect(cursor).toBe(path.length - 1);
  expect(
    path.every(
      (distance) => distance >= distances.min && distance <= distances.max,
    ),
  ).toBe(true);
  const largestStep = Math.max(
    ...path.slice(1).map((distance, index) => Math.abs(distance - path[index])),
  );
  expect(largestStep).toBeLessThanOrEqual((maxSpeed * 1) / 60 + 1e-12);
  expect(sampleAt(parameters, path, cursor).velocity).toBe(0);
  expect([observation, support, rate, fields, coilView, recording]).toEqual([
    "emf",
    "formula",
    1,
    true,
    true,
    "manual",
  ]);
});

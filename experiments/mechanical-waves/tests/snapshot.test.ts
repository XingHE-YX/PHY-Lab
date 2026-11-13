import { expect, test } from "bun:test";
import { normalizeSnapshot } from "../model/snapshot";
import { duration, waveAt } from "../model/physics";

test("invalid saved state recovers to a finite, bounded experiment", () => {
  for (const value of [null, [], 7, "broken", { params: null, layers: [] }]) {
    const saved = normalizeSnapshot(value);
    expect(saved.version).toBe(1);
    expect(saved.params.mode).toBe("travel");
    expect(saved.probe).toBe(0.5);
    expect(saved.layers.total).toBe(true);
    expect(
      Object.values(waveAt(saved.params, 0, saved.time)).every(Number.isFinite),
    ).toBe(true);
  }
  const saved = normalizeSnapshot({
    time: 1e20,
    probe: -2,
    rate: NaN,
    params: { amplitude: Infinity, speed: 0, frequency: -3 },
    layers: { total: "false", velocity: false },
  });
  expect(saved.time).toBe(duration(saved.params));
  expect(saved.probe).toBe(0);
  expect(saved.rate).toBe(1);
  expect(saved.layers.total).toBe(true);
  expect(saved.layers.velocity).toBe(false);
});

test("all physical and observation preferences survive a JSON round trip", () => {
  const saved = normalizeSnapshot({
    params: {
      mode: "standing",
      boundary: "free",
      amplitude: 0.34,
      frequency: 1.4,
      speed: 1.2,
      length: 10,
      polarity: -1,
    },
    time: 12.623,
    probe: 0.723,
    rate: 0.25,
    parameterTab: "medium",
    observation: "profile",
    metric: "v",
    support: "tasks",
    layers: {
      total: false,
      incident: true,
      reflected: true,
      sites: false,
      velocity: false,
    },
  });
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  expect(saved.time).toBe(12.623);
  expect(saved.params.mode).toBe("standing");
});

test("missing new preferences receive defaults without discarding valid saved values", () => {
  const saved = normalizeSnapshot({
    params: { mode: "reflection" },
    time: 3.25,
    layers: { incident: true },
  });
  expect(saved.time).toBe(3.25);
  expect(saved.layers.incident).toBe(true);
  expect(saved.layers.sites).toBe(true);
  expect(saved.layers.velocity).toBe(true);
  expect(saved.support).toBe("formula");
});

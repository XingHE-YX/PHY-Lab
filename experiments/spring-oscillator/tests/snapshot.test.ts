import { expect, test } from "bun:test";
import { normalizeSnapshot, restoreSnapshot } from "../model/snapshot";
import { stateAt } from "../model/dynamics";

test("version 1 migrates without altering the original parameters, paused state or progress", () => {
  const legacy = {
    params: { A: 0.4, m: 2, k: 17, phi: 1.3 },
    time: 3.42,
    speed: 0.25,
    mode: "energy",
    phasor: true,
    velocity: false,
    acceleration: true,
    curves: { kinetic: false },
    previous: { A: 0.2, m: 1, k: 10, phi: 0 },
    exploration: {
      version: 1,
      completed: [true, false, false],
      active: { index: 1, baseline: { A: 0.4, m: 2, k: 17, phi: 1.3 } },
    },
  };
  const unchanged = JSON.stringify(legacy);
  let written: unknown;
  const saved = restoreSnapshot({
    read: (fallback) => fallback,
    readVersion: <T>(version: number, fallback: T): T =>
      version === 1 ? (legacy as T) : fallback,
    write: (value) => {
      written = value;
    },
  });
  expect(saved.version).toBe(2);
  expect(saved.params).toMatchObject({ A: 0.4, m: 2, k: 17, model: "ideal" });
  expect(saved.params.phi).toBeCloseTo(legacy.params.phi, 12);
  expect(saved.time).toBe(legacy.time);
  expect(saved.mode).toBe("energy");
  expect(saved.speed).toBe(0.25);
  expect(saved.phasor).toBe(true);
  expect(saved.velocity).toBe(false);
  expect(saved.curves.kinetic).toBe(false);
  expect(saved.curves.dissipated).toBe(true);
  expect(saved.previous?.model).toBe("ideal");
  expect(saved.exploration.completed).toEqual(legacy.exploration.completed);
  expect(saved.exploration.active?.index).toBe(1);
  expect(saved.exploration.active?.baseline.phi).toBeCloseTo(1.3, 12);
  expect(written).toEqual(saved);
  expect(JSON.stringify(legacy)).toBe(unchanged);
});

test("current state keeps independent response, energy and parameter preferences", () => {
  const original = normalizeSnapshot({
    params: {
      model: "driven",
      zeta: 0.35,
      force: 2.1,
      ratio: 0.85,
      x0: -0.5,
      v0: 0.3,
    },
    time: 10,
    mode: "resonance",
    parameterTab: "drive",
    energyView: "balance",
    responseView: "phase",
    supportTab: "tasks",
    phasor: true,
  });
  const saved = restoreSnapshot({
    read: <T>(_fallback: T): T => original as T,
    readVersion: () => {
      throw new Error("current state must take precedence");
    },
    write: () => {},
  });
  expect(saved).toEqual(original);
  expect(saved.exploration.active).toBeNull();
});

test("damaged state and invalid fields cannot enter the simulator", () => {
  for (const value of [null, [], 1, "wrong", { params: null }]) {
    const saved = normalizeSnapshot(value);
    expect(Number.isFinite(stateAt(saved.params, saved.time).total)).toBe(true);
  }
  const saved = normalizeSnapshot({
    params: {
      model: "damped",
      m: 0,
      k: Infinity,
      zeta: -3,
      ratio: 100,
      x0: NaN,
      v0: "fast",
    },
    time: Infinity,
    speed: 10,
    mode: "resonance",
    parameterTab: "drive",
    energyView: [],
    responseView: false,
    velocity: "false",
    previous: [],
    curves: { x: false, total: "false" },
    exploration: {
      version: 1,
      completed: "yes",
      active: { index: 4, baseline: {} },
    },
  });
  expect(saved.params.m).toBe(0.2);
  expect(saved.params.k).toBe(10);
  expect(saved.params.zeta).toBe(0);
  expect(saved.params.ratio).toBe(3);
  expect(saved.mode).toBe("motion");
  expect(saved.parameterTab).toBe("structure");
  expect(saved.speed).toBe(1);
  expect(saved.time).toBe(0);
  expect(saved.velocity).toBe(true);
  expect(saved.curves.x).toBe(false);
  expect(saved.curves.total).toBe(true);
  expect(saved.previous).toBeNull();
  expect(saved.exploration).toEqual({
    version: 1,
    completed: [false, false, false],
    active: null,
  });
  expect(normalizeSnapshot({ time: -5 }).time).toBe(0);
  expect(normalizeSnapshot({ time: 1e10 }).time).toBe(1e6);
  for (const invalid of [null, [], { version: 2, params: null }]) {
    const restored = restoreSnapshot({
      read: <T>(_fallback: T): T => invalid as T,
      readVersion: <T>(_version: number, _fallback: T): T =>
        ({ params: { m: 3 } }) as T,
      write: () => {},
    });
    expect(restored.params.m).toBe(3);
  }
});

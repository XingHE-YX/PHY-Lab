import { describe, test, expect } from "bun:test";
import {
  stateAt,
  defaults,
  keyTime,
  parameters,
  TAU,
  phaseAt,
  timeAtPhase,
} from "../model/physics";
describe("ideal spring model", () => {
  test("conserves energy for arbitrary phases, masses and stiffness", () => {
    for (const m of [0.2, 1, 5])
      for (const k of [1, 10, 50])
        for (const phi of [0, 0.8, 3, 5.7])
          for (let i = 0; i < 80; i++) {
            const s = stateAt({ ...defaults, m, k, phi }, i * 0.137);
            expect(s.kinetic + s.potential).toBeCloseTo(s.total, 10);
            expect(s.a).toBeCloseTo((-k / m) * s.x, 10);
          }
  });
  test("doubling amplitude preserves period and quadruples energy", () => {
    const a = stateAt(defaults, 0),
      b = stateAt({ ...defaults, A: defaults.A * 2 }, 0);
    expect(b.period).toBe(a.period);
    expect(b.total).toBeCloseTo(a.total * 4);
  });
  test("key moments respect initial phase", () => {
    for (const phi of [0, 0.3, Math.PI, 5.8]) {
      const p = { ...defaults, phi };
      const right = stateAt(p, keyTime(p, "right"));
      expect(right.x).toBeCloseTo(p.A);
      expect(right.v).toBeCloseTo(0);
      const middle = stateAt(p, keyTime(p, "equilibrium"));
      expect(middle.x).toBeCloseTo(0);
      expect(middle.a).toBeCloseTo(0);
      const equal = stateAt(p, keyTime(p, "equal"));
      expect(equal.kinetic).toBeCloseTo(equal.potential);
      expect(Math.abs(equal.x)).toBeCloseTo(p.A / Math.sqrt(2));
    }
  });
  test("kinetic energy repeats after half a period", () => {
    const first = stateAt(defaults, 0.35);
    expect(stateAt(defaults, 0.35 + first.period / 2).kinetic).toBeCloseTo(
      first.kinetic,
    );
  });
  test("invalid persisted parameters never create NaN or infinite frequency", () => {
    const p = parameters({ A: NaN, m: 0, k: Infinity, phi: -0.4 });
    expect(p.m).toBe(0.2);
    expect(p.phi).toBeCloseTo(TAU - 0.4);
    expect(Number.isFinite(stateAt(p, 0).omega)).toBe(true);
  });
  test("phase scrubbing preserves the oscillator state at the nearest valid cycle", () => {
    for (const phi of [0, 0.8, 3, 5.7])
      for (const m of [0.2, 5])
        for (const angle of [
          -0.01,
          0,
          0.01,
          Math.PI / 2,
          Math.PI,
          TAU + 0.01,
        ]) {
          const p = { ...defaults, phi, m };
          const period = stateAt(p, 0).period;
          for (const near of [0, 0.4 * period, 5.99 * period]) {
            const time = timeAtPhase(p, angle, near);
            expect(time).toBeGreaterThanOrEqual(0);
            expect(stateAt(p, time).x).toBeCloseTo(p.A * Math.cos(angle), 10);
            expect(stateAt(p, time).v).toBeCloseTo(
              -p.A * Math.sqrt(p.k / p.m) * Math.sin(angle),
              10,
            );
            expect(phaseAt(p, time)).toBeGreaterThanOrEqual(0);
            expect(phaseAt(p, time)).toBeLessThan(TAU);
            if (time >= period)
              expect(Math.abs(time - near)).toBeLessThanOrEqual(
                Math.abs(time - period - near) + 1e-10,
              );
            expect(Math.abs(time - near)).toBeLessThanOrEqual(
              Math.abs(time + period - near) + 1e-10,
            );
          }
        }
  });
  test("scrubbing counterclockwise across zero continues into the next cycle", () => {
    const omega = Math.sqrt(defaults.k / defaults.m);
    const before = (TAU - 0.01) / omega;
    const after = timeAtPhase(defaults, 0.01, before);
    expect(after - before).toBeCloseTo(0.02 / omega, 10);
    expect(timeAtPhase(defaults, -0.01, after)).toBeCloseTo(before, 10);
  });
});

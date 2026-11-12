import { describe, expect, test } from "bun:test";
import {
  parameters,
  stateAt,
  responseAt,
  resonanceRatio,
  momentTime,
  coefficients,
} from "../model/dynamics";
import { stateAt as idealState } from "../model/physics";

describe("damped and driven oscillator", () => {
  test("old parameters preserve the ideal solution", () => {
    const p = parameters({ A: 0.4, m: 2, k: 17, phi: 1.3 });
    expect(p.model).toBe("ideal");
    for (const t of [0, 0.1, 2, 21]) {
      const a = stateAt(p, t),
        b = idealState(p, t);
      expect(a.x).toBeCloseTo(b.x, 12);
      expect(a.v).toBeCloseTo(b.v, 12);
    }
  });
  test("all damping regimes satisfy initial conditions, Newton's law and power balance", () => {
    for (const model of ["damped", "driven"] as const)
      for (const zeta of [0, 0.03, 0.5, 1 - 1e-8, 1, 1 + 1e-8, 2])
        for (const ratio of [0, 0.6, 1, 2.8]) {
          const p = parameters({
            model,
            zeta,
            ratio,
            m: 1.7,
            k: 13,
            x0: -0.21,
            v0: 0.43,
          });
          const initial = stateAt(p, 0);
          expect(initial.x).toBeCloseTo(p.x0, 8);
          expect(initial.v).toBeCloseTo(p.v0, 8);
          for (const t of [0.2, 1.3, 5, 32]) {
            const s = stateAt(p, t),
              h = 1e-5;
            const before = stateAt(p, t - h),
              after = stateAt(p, t + h);
            expect((after.x - before.x) / (2 * h)).toBeCloseTo(s.v, 5);
            expect((after.v - before.v) / (2 * h)).toBeCloseTo(s.a, 5);
            expect(p.m * s.a).toBeCloseTo(
              s.springForce + s.dampingForce + s.drivingForce,
              9,
            );
            expect(
              (after.dissipated - before.dissipated) / (2 * h),
            ).toBeCloseTo(coefficients(p).b * s.v ** 2, 4);
            expect((after.work - before.work) / (2 * h)).toBeCloseTo(
              s.drivingForce * s.v,
              4,
            );
            expect(s.total + s.dissipated).toBeCloseTo(
              s.initialEnergy + s.work,
              7,
            );
          }
        }
  });
  test("matches independent RK4 integration including external work and heat", () => {
    for (const zeta of [0, 0.15, 1, 2]) {
      const p = parameters({
        model: "driven",
        zeta,
        ratio: 1,
        x0: 0.3,
        v0: -0.2,
      });
      const { b, frequency } = coefficients(p);
      const derivative = (t: number, y: number[]) => [
        y[1],
        (p.force * Math.cos(frequency * t) - b * y[1] - p.k * y[0]) / p.m,
        p.force * Math.cos(frequency * t) * y[1],
        b * y[1] ** 2,
      ];
      let y = [p.x0, p.v0, 0, 0];
      const h = 0.001;
      for (let i = 0; i < 10000; i++) {
        const t = i * h,
          a = derivative(t, y);
        const c = derivative(
          t + h / 2,
          y.map((v, j) => v + (h / 2) * a[j]),
        );
        const d = derivative(
          t + h / 2,
          y.map((v, j) => v + (h / 2) * c[j]),
        );
        const e = derivative(
          t + h,
          y.map((v, j) => v + h * d[j]),
        );
        y = y.map((v, j) => v + (h / 6) * (a[j] + 2 * c[j] + 2 * d[j] + e[j]));
      }
      const s = stateAt(p, 10);
      for (const [actual, expected] of [
        [s.x, y[0]],
        [s.v, y[1]],
        [s.work, y[2]],
        [s.dissipated, y[3]],
      ])
        expect(actual).toBeCloseTo(expected, 7);
    }
  });
  test("critical relaxation is continuous and has no false opposite endpoint", () => {
    const p = parameters({ model: "damped", zeta: 1 });
    for (const zeta of [1 - 1e-8, 1 + 1e-8])
      expect(stateAt({ ...p, zeta }, 1).x).toBeCloseTo(stateAt(p, 1).x, 7);
    expect(momentTime(p, "left")).toBeNull();
    expect(momentTime(p, "equilibrium")).toBeNull();
    const q = { ...p, zeta: 0.15 };
    const t = momentTime(q, "left")!;
    expect(t).toBeGreaterThan(0);
    expect(stateAt(q, t).v).toBeCloseTo(0, 8);
    expect(stateAt(q, t).x).toBeLessThan(0);
  });
  test("resonance grows without a finite steady state when undamped", () => {
    const p = parameters({ model: "driven", zeta: 0, x0: 0 });
    const s = stateAt(p, 100);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(s.dissipated).toBe(0);
    expect(s.total).toBeGreaterThan(100);
    expect(responseAt(p).amplitude).toBeNull();
    expect(resonanceRatio({ ...p, zeta: 0.2 })).toBeCloseTo(Math.sqrt(0.92));
    expect(resonanceRatio({ ...p, zeta: 1 })).toBeNull();
  });
  test("near-resonant undamped motion converges without cancellation", () => {
    const p = parameters({ model: "driven", zeta: 0, x0: -0.3, v0: 0.2 });
    for (const ratio of [1 - 1e-12, 1 + 1e-12])
      for (const time of [0, 0.1, 1, 50]) {
        const a = stateAt({ ...p, ratio }, time),
          b = stateAt(p, time);
        expect(a.x).toBeCloseTo(b.x, 8);
        expect(a.v).toBeCloseTo(b.v, 8);
      }
  });
  test("a constant drive can have two positive turning points", () => {
    const p = parameters({ model: "driven", zeta: 0.15, ratio: 0, x0: 0.05 });
    const right = momentTime(p, "right")!;
    const left = momentTime(p, "left", right + 0.01)!;
    expect(right).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(right);
    expect(stateAt(p, right).v).toBeCloseTo(0, 8);
    expect(stateAt(p, left).v).toBeCloseTo(0, 8);
    expect(stateAt(p, left).x).toBeGreaterThan(0);
    expect(stateAt(p, left).a).toBeGreaterThan(0);
    expect(momentTime(p, "equilibrium")).toBeNull();
    expect(resonanceRatio({ ...p, force: 0 })).toBeNull();
    expect(responseAt({ ...p, force: 0 }).amplitude).toBe(0);
  });
});

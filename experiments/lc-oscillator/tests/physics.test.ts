import { test, expect } from "bun:test";
import { at, derived, parameters, momentTime, limits } from "../model/physics";
import { normalizeSnapshot } from "../model/snapshot";

test("LC initial state, charge continuity, KVL and power balance use one sign convention", () => {
  for (const voltage of [-12, -1, 0, 6, 12]) {
    const p = parameters({ voltage }),
      d = derived(p);
    expect(at(p, 0).q).toBeCloseTo(p.capacitance * voltage, 12);
    expect(at(p, 0).current).toBeCloseTo(0, 12);
    for (let n = 1; n < 80; n++) {
      const t = (d.period * n) / 19,
        h = d.period * 1e-5;
      const s = at(p, t),
        before = at(p, t - h),
        after = at(p, t + h);
      expect((after.q - before.q) / (2 * h)).toBeCloseTo(-s.current, 7);
      expect(
        (p.inductance * (after.current - before.current)) / (2 * h),
      ).toBeCloseTo(s.voltage, 6);
      expect((after.electric - before.electric) / (2 * h)).toBeCloseTo(
        -s.voltage * s.current,
        6,
      );
      expect((after.magnetic - before.magnetic) / (2 * h)).toBeCloseTo(
        s.voltage * s.current,
        6,
      );
      expect(s.total).toBeCloseTo(d.energy, 12);
    }
  }
});
test("analytic charge and current agree with independent time integration at parameter bounds", () => {
  for (const inductance of [limits.inductance.min, limits.inductance.max])
    for (const capacitance of [limits.capacitance.min, limits.capacitance.max])
      for (const voltage of [-12, 0, 12]) {
        const p = parameters({ inductance, capacitance, voltage }),
          d = derived(p),
          h = d.period / 400;
        let q = d.charge,
          i = 0;
        const derivative = (q: number, i: number) => [
          -i,
          q / (inductance * capacitance),
        ];
        for (let n = 1; n <= 1600; n++) {
          const a = derivative(q, i),
            b = derivative(q + (h * a[0]) / 2, i + (h * a[1]) / 2);
          const c = derivative(q + (h * b[0]) / 2, i + (h * b[1]) / 2),
            e = derivative(q + h * c[0], i + h * c[1]);
          q += (h * (a[0] + 2 * b[0] + 2 * c[0] + e[0])) / 6;
          i += (h * (a[1] + 2 * b[1] + 2 * c[1] + e[1])) / 6;
          if (n % 17 === 0) {
            const s = at(p, n * h);
            expect(Math.abs(q - s.q)).toBeLessThan(1e-9);
            expect(Math.abs(i - s.current)).toBeLessThan(1e-7);
            expect(Number.isFinite(s.total)).toBe(true);
          }
        }
      }
});
test("key moments reverse polarity, preserve current through zero charge and split energy equally", () => {
  const p = parameters(null),
    d = derived(p);
  const quarter = at(p, momentTime(p, 1)),
    half = at(p, momentTime(p, 2)),
    reverse = at(p, momentTime(p, 3));
  expect(quarter.q).toBeCloseTo(0, 12);
  expect(quarter.current).toBeCloseTo(d.current, 12);
  expect(quarter.magnetic).toBeCloseTo(d.energy, 12);
  expect(half.q).toBeCloseTo(-d.charge, 12);
  expect(half.current).toBeCloseTo(0, 12);
  expect(reverse.current).toBeCloseTo(-d.current, 12);
  const equal = at(p, momentTime(p, 4));
  expect(equal.electric).toBeCloseTo(equal.magnetic, 12);
  expect(Math.abs(equal.q / d.charge)).toBeCloseTo(1 / Math.sqrt(2), 12);
});
test("period scaling, zero voltage and repeatable rewind remain physically consistent", () => {
  const p = parameters(null),
    d = derived(p);
  expect(derived({ ...p, voltage: p.voltage * 2 }).period).toBe(d.period);
  expect(derived({ ...p, voltage: p.voltage * 2 }).energy).toBe(d.energy * 4);
  expect(derived({ ...p, inductance: p.inductance * 4 }).period).toBe(
    d.period * 2,
  );
  expect(derived({ ...p, capacitance: p.capacitance * 4 }).period).toBe(
    d.period * 2,
  );
  for (let n = 0; n < 50; n++) {
    const t = (d.period * n) / 13,
      a = at(p, t),
      b = at(p, t + d.period / 2);
    expect(a.electric).toBeCloseTo(b.electric, 12);
    expect(a.magnetic).toBeCloseTo(b.magnetic, 12);
    expect(at(p, t)).toEqual(a);
    const zero = at({ ...p, voltage: 0 }, t);
    expect(zero.q).toBeCloseTo(0, 12);
    expect(zero.current).toBeCloseTo(0, 12);
    expect(zero.total).toBe(0);
  }
});
test("saved states are bounded, preparation cannot retain elapsed oscillation time, and preferences round trip", () => {
  for (const value of [
    null,
    undefined,
    [],
    "wrong",
    {
      params: { inductance: 0, capacitance: Infinity, voltage: NaN },
      closed: true,
      time: Infinity,
      layers: null,
    },
  ]) {
    const state = normalizeSnapshot(value);
    expect(Number.isFinite(derived(state.params).period)).toBe(true);
    expect(Number.isFinite(at(state.params, state.time).total)).toBe(true);
  }
  expect(normalizeSnapshot({ time: 20, closed: false }).time).toBe(0);
  const saved = normalizeSnapshot({
    params: { voltage: -6 },
    closed: true,
    time: 2,
    rate: 0.25,
    observation: "energy",
    support: "tasks",
    layers: { fields: false, current: false },
  });
  expect(saved.time).toBe(2);
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

import { expect, test } from "bun:test";
import { at, derived, parameters } from "../model/physics";
import {
  arcCurrent,
  arcResistance,
  buildTransient,
  sampleTransient,
  switchParameters,
  transientValues,
} from "../model/transient";

test("switch-off preserves capacitor charge and inductor current, limits voltage, and accounts for every energy transfer", () => {
  const p = parameters(null),
    m = switchParameters(null);
  for (const phase of [0, 0.125, 0.25, 0.5, 0.75]) {
    const initial = at(p, phase * derived(p).period);
    const profile = buildTransient(p, initial, m);
    expect(profile.points[0].voltage).toBe(initial.voltage);
    expect(profile.points[0].current).toBe(initial.current);
    expect(profile.points[0].switchVoltage).toBe(0);
    for (const point of profile.points) {
      const energy = transientValues(p, m, point);
      expect(
        Math.abs(energy.stored + energy.dissipated - profile.initialEnergy),
      ).toBeLessThan(1e-10);
      expect(energy.arcPower).toBeGreaterThanOrEqual(0);
      expect(point.arcLoss).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(point.switchVoltage)).toBe(true);
    }
    const last = profile.points.at(-1)!;
    expect(Math.abs(last.current)).toBeLessThan(1e-5);
    if (phase === 0 || phase === 0.5) {
      expect(profile.arcOccurred).toBe(false);
      expect(Math.abs(last.voltage)).toBeCloseTo(6, 3);
    } else if (phase === 0.25 || phase === 0.75) {
      expect(profile.arcOccurred).toBe(true);
      expect(profile.peakVoltage).toBeGreaterThan(m.breakdown);
      expect(profile.peakVoltage).toBeLessThan(
        m.breakdown + Math.abs(initial.current) * arcResistance * 1.1,
      );
    }
  }
});

test("the passive adaptive solver agrees with an independent explicit RK4 calculation through breakdown", () => {
  const p = parameters(null),
    m = switchParameters(null);
  for (const polarity of [-1, 1]) {
    const initial = at({ ...p, voltage: 6 * polarity }, derived(p).period / 4);
    const profile = buildTransient(p, initial, m);
    const target = sampleTransient(profile, 40e-6);
    let values = [initial.voltage, initial.current, 0];
    let time = 0;
    const derivative = ([u, i, v]: number[]) => [
      -i / p.capacitance,
      (u - v - m.resistance * i) / p.inductance,
      (i -
        (Math.sign(v) * Math.max(0, Math.abs(v) - m.breakdown)) /
          arcResistance) /
        m.capacitance,
    ];
    while (time < target.time) {
      const h = Math.min(1e-9, target.time - time);
      const a = derivative(values),
        b = derivative(values.map((v, i) => v + (h * a[i]) / 2));
      const c = derivative(values.map((v, i) => v + (h * b[i]) / 2)),
        d = derivative(values.map((v, i) => v + h * c[i]));
      values = values.map(
        (v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6,
      );
      time += h;
    }
    expect(target.voltage).toBeCloseTo(values[0], 5);
    expect(target.current).toBeCloseTo(values[1], 4);
    expect(target.switchVoltage).toBeCloseTo(values[2], 1);
    expect(
      arcCurrent(target.switchVoltage, m) * target.switchVoltage,
    ).toBeGreaterThanOrEqual(0);
  }
});

test("parameter extremes and an uncharged circuit produce bounded, reproducible transients", () => {
  for (const capacitance of [0.1e-9, 10e-9]) {
    const p = parameters({
      inductance: 0.2,
      capacitance: 200e-6,
      voltage: -12,
    });
    const m = switchParameters({ capacitance, breakdown: 50, resistance: 50 });
    const initial = at(p, derived(p).period / 4);
    const profile = buildTransient(p, initial, m);
    expect(profile.points.length).toBeLessThanOrEqual(1202);
    expect(profile.duration).toBeGreaterThan(0);
    const last = profile.points.at(-1)!;
    const energy = transientValues(p, m, last);
    expect(energy.stored + energy.dissipated).toBeCloseTo(
      profile.initialEnergy,
      9,
    );
    expect(Number.isFinite(profile.peakVoltage)).toBe(true);
  }
  const zero = buildTransient(
    parameters({ voltage: 0 }),
    { q: 0, current: 0 },
    switchParameters(null),
  );
  expect(zero.duration).toBe(0);
  expect(zero.initialEnergy).toBe(0);
  expect(zero.peakVoltage).toBe(0);
  expect(sampleTransient(zero, 100).current).toBe(0);
});

import { expect, test } from "bun:test";
import {
  parameters,
  sourceAt,
  waveAt,
  derived,
  standingSites,
  standingAmplitude,
  duration,
} from "../model/physics";

test("a wave packet propagates at c while material coordinates stay fixed", () => {
  const p = parameters({ speed: 2, amplitude: 0.3, duration: 1 });
  for (const time of [0.7, 1.2, 2, 3]) {
    const x = p.speed * (time - p.duration / 2),
      state = waveAt(p, x, time);
    expect(state.y).toBeCloseTo(p.amplitude, 10);
    expect(state.x).toBe(x);
    expect(state.v).toBeCloseTo(0, 10);
    expect(waveAt(p, p.speed * time + 0.001, time).y).toBe(0);
  }
  expect(waveAt(p, 1, duration(p)).y).toBe(0);
});
test("source derivatives and the linear wave equation agree independently", () => {
  for (const source of ["pulse", "sine"] as const)
    for (const mode of ["travel", "reflection", "standing"] as const) {
      const p = parameters({ source, mode });
      for (const time of [0.21, 0.53, 1.45, 5.21, 6.71, 10.51]) {
        const h = 1e-5,
          x = 3.1;
        const s = waveAt(p, x, time),
          before = waveAt(p, x, time - h),
          after = waveAt(p, x, time + h);
        expect((after.y - before.y) / (2 * h)).toBeCloseTo(s.v, 6);
        expect((after.v - before.v) / (2 * h)).toBeCloseTo(s.a, 5);
        const dx =
          (waveAt(p, x + h, time).y - waveAt(p, x - h, time).y) / (2 * h);
        expect(dx).toBeCloseTo(s.slope, 6);
        const spatialStep = 1e-4;
        const dxx =
          (waveAt(p, x + spatialStep, time).y -
            2 * s.y +
            waveAt(p, x - spatialStep, time).y) /
          spatialStep ** 2;
        expect(p.speed ** 2 * dxx).toBeCloseTo(s.a, 4);
      }
    }
  const p = parameters({ source: "sine" });
  expect(sourceAt(p, 0)).toEqual({ y: 0, v: 0, a: 0 });
  for (const t of [0.3, 0.7, 2.1, 3.3])
    expect(sourceAt(p, t).y).toBeLessThanOrEqual(p.amplitude);
  expect(derived(p).wavelength * p.frequency).toBe(p.speed);
});
test("reflection is causal, inverted at fixed ends and upright at free ends", () => {
  for (const boundary of ["fixed", "free"] as const) {
    const p = parameters({ mode: "reflection", boundary });
    const x = 5,
      centerTime = (2 * p.length - x) / p.speed + p.duration / 2;
    expect(
      waveAt(p, x, (2 * p.length - x) / p.speed - 0.01).reflected,
    ).toBeCloseTo(0, 10);
    expect(waveAt(p, x, centerTime).reflected).toBeCloseTo(
      (boundary === "fixed" ? -1 : 1) * p.amplitude,
      10,
    );
    for (const time of [1.3, 4.3, 4.6, 5.1, 20]) {
      const s = waveAt(p, p.length, time);
      if (boundary === "fixed") {
        expect(s.y).toBeCloseTo(0, 10);
        expect(s.v).toBeCloseTo(0, 10);
      } else expect(s.slope).toBeCloseTo(0, 10);
    }
  }
});
test("standing nodes never move; antinodes reach twice the incident amplitude", () => {
  for (const boundary of ["fixed", "free"] as const) {
    const p = parameters({ mode: "standing", boundary }),
      d = derived(p);
    const nodes = standingSites(p, "node"),
      antinodes = standingSites(p, "antinode");
    for (const x of nodes)
      for (const time of [0, 0.31, 0.92, 2.5, 100]) {
        const s = waveAt(p, x, time);
        expect(s.y).toBeCloseTo(0, 10);
        expect(s.v).toBeCloseTo(0, 10);
        expect(standingAmplitude(p, x)).toBeCloseTo(0, 10);
      }
    for (const x of antinodes) {
      expect(standingAmplitude(p, x)).toBeCloseTo(2 * p.amplitude, 10);
      expect(
        Math.abs(waveAt(p, x, boundary === "fixed" ? 0 : d.period / 4).y),
      ).toBeCloseTo(2 * p.amplitude, 10);
    }
    for (let i = 1; i < nodes.length; i++)
      expect(nodes[i] - nodes[i - 1]).toBeCloseTo(d.wavelength / 2, 10);
    expect(standingSites({ ...p, amplitude: 0 }, "node")).toEqual([]);
  }
});
test("invalid parameters stay finite and zero amplitude is a static medium", () => {
  for (const value of [
    null,
    [],
    9,
    {
      amplitude: NaN,
      speed: 0,
      frequency: Infinity,
      length: -3,
      duration: "bad",
    },
  ]) {
    const p = parameters(value);
    for (const time of [0, 1, 100000]) {
      const s = waveAt(p, p.length / 2, time);
      expect(Object.values(s).every(Number.isFinite)).toBe(true);
    }
  }
  for (const mode of ["travel", "reflection", "standing"] as const) {
    const p = parameters({ mode, amplitude: 0 });
    expect(waveAt(p, 2, 3).y).toBeCloseTo(0, 10);
    expect(waveAt(p, 2, 3).v).toBeCloseTo(0, 10);
  }
});

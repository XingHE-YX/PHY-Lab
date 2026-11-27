import { expect, test } from "bun:test";
import {
  compare,
  defaults,
  duration,
  makeTrial,
  motions,
  soundSpeed,
  type Mover,
} from "../model/physics";

const movers: Mover[] = ["source", "observer"];

test("equal speeds give distinct moving-source and moving-observer shifts", () => {
  const values = {
    source: { approach: 400 / 0.75, rest: 400, retreat: 400 / 1.25 },
    observer: { approach: 500, rest: 400, retreat: 300 },
  };
  for (const mover of movers)
    for (const motion of motions) {
      const scenario = compare({ ...defaults, mover, motion });
      expect(scenario.received).toBeCloseTo(values[mover][motion], 11);
      expect(scenario.emitted).toBe(400);
    }
});

test("wavefronts retain their emission origin and move through the medium at c", () => {
  for (const mover of movers) {
    for (const motion of motions) {
      const trial = makeTrial({ ...defaults, mover, motion });
      const index = -4;
      const earlier = trial.front(index, 0);
      const later = trial.front(index, 0.01);
      expect(later.center).toBe(earlier.center);
      expect(later.center).toBe(trial.at(trial.emission(index)).source);
      expect((later.radius - earlier.radius) / 0.01).toBeCloseTo(
        soundSpeed,
        10,
      );
      const next = trial.front(index + 1, 0.01);
      expect(earlier.radius).toBeGreaterThan(0);
      expect(
        later.center + later.radius - next.center - next.radius,
      ).toBeCloseTo(trial.toward, 11);
      expect(
        next.center - next.radius - (later.center - later.radius),
      ).toBeCloseTo(trial.behind, 11);
      if (mover === "observer") {
        expect(next.center).toBe(later.center);
        expect(trial.toward).toBe(soundSpeed / defaults.frequency);
      }
    }
  }
});

test("every measured arrival intersects its own crest at the moving or fixed observer", () => {
  for (const mover of movers)
    for (const motion of motions) {
      const trial = makeTrial({
        ...defaults,
        mover,
        motion,
        speed: 170,
        frequency: 700,
      });
      let time = trial.nextArrival(0);
      const firstTime = time;
      for (let count = 0; count < 7; count++) {
        const sample = trial.at(time);
        const wave = trial.front(sample.index, time);
        expect(wave.center + wave.radius).toBeCloseTo(sample.observer, 10);
        expect(sample.retarded).toBeCloseTo(trial.emission(sample.index), 11);
        expect(sample.phase).toBeCloseTo(0, 10);
        expect(
          trial.fronts(time).some(({ index }) => index === wave.index),
        ).toBe(true);
        const next = trial.nextArrival(time);
        expect(1 / (next - time)).toBeCloseTo(trial.received, 8);
        time = next;
      }
      expect(trial.nextArrival(duration)).toBe(firstTime);
    }
});

test("zero speed is stationary, while max speed keeps the actors separated and inside the scene", () => {
  for (const mover of movers)
    for (const motion of motions) {
      const stationary = makeTrial({ ...defaults, mover, motion, speed: 0 });
      expect(stationary.received).toBe(defaults.frequency);
      expect(stationary.at(0).source).toBe(stationary.at(duration).source);
      expect(stationary.at(0).observer).toBe(stationary.at(duration).observer);
      const fast = makeTrial({
        ...defaults,
        mover,
        motion,
        speed: 170,
        frequency: 700,
      });
      const end = fast.at(duration);
      expect(end.source).toBeGreaterThan(0);
      expect(end.observer).toBeLessThan(34);
      expect(end.observer - end.source).toBeGreaterThan(0);
      expect(fast.toward).toBeGreaterThan(0);
      expect(fast.received).toBeGreaterThan(0);
    }
});

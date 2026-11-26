import { expect, test } from "bun:test";
import {
  defaults,
  makePendulum,
  periodRatio,
  radians,
  timing,
  type Parameters,
} from "../model/physics";

function reference(parameters: Parameters, time: number) {
  const steps = Math.ceil(time / 0.0008);
  const dt = time / steps;
  const gravityScale = parameters.gravity / parameters.length;
  let angle = parameters.angle * radians;
  let speed = 0;
  const acceleration = (theta: number) => -gravityScale * Math.sin(theta);
  for (let index = 0; index < steps; index++) {
    const first = acceleration(angle);
    const midSpeed = speed + (first * dt) / 2;
    const second = acceleration(angle + (speed * dt) / 2);
    const nextMidSpeed = speed + (second * dt) / 2;
    const third = acceleration(angle + (midSpeed * dt) / 2);
    const endSpeed = speed + third * dt;
    const fourth = acceleration(angle + nextMidSpeed * dt);
    angle += ((speed + 2 * midSpeed + 2 * nextMidSpeed + endSpeed) * dt) / 6;
    speed += ((first + 2 * second + 2 * third + fourth) * dt) / 6;
  }
  return { angle, speed };
}

test("the small-angle limit, finite-angle benchmark and dimensional period scales", () => {
  expect(periodRatio(0)).toBe(1);
  expect(periodRatio(90)).toBeCloseTo(1.180340599016096, 12);
  expect(periodRatio(-90)).toBe(periodRatio(90));
  expect(periodRatio(10) - 1).toBeLessThan(0.002);
  const ranges = [1, 10, 30, 60, 90, 120, 150, 170];
  for (let index = 1; index < ranges.length; index++)
    expect(periodRatio(ranges[index])).toBeGreaterThan(
      periodRatio(ranges[index - 1]),
    );
  expect(periodRatio(170)).toBeGreaterThan(2.4);
  const initial = timing(defaults);
  for (const parameters of [
    { ...defaults, length: 2.25 },
    { ...defaults, gravity: defaults.gravity / 2.25 },
  ]) {
    const scaled = timing(parameters);
    expect(scaled.approximate / initial.approximate).toBeCloseTo(1.5, 12);
    expect(scaled.period! / initial.period!).toBeCloseTo(1.5, 12);
    expect(scaled.ratio).toBe(initial.ratio);
  }
});

test("the nonlinear trajectory agrees with independent integration through two periods", () => {
  for (const parameters of [
    { ...defaults, angle: 10 },
    { ...defaults, angle: 120 },
    { angle: -170, length: 0.5, gravity: 20 },
  ]) {
    const model = makePendulum(parameters);
    for (const fraction of [0.071, 0.224, 0.375, 0.719, 1, 1.832]) {
      const time = model.period! * fraction;
      const expected = reference(parameters, time);
      const sample = model.at(time);
      expect(sample.angle).toBeCloseTo(expected.angle, 7);
      expect(sample.angularVelocity).toBeCloseTo(expected.speed, 7);
    }
  }
});

test("turning points, center crossing and conservative energy share the same orbit", () => {
  const design = { ...defaults, angle: -120 };
  const model = makePendulum(design);
  const period = model.period!;
  expect(model.at(0).angle).toBeCloseTo(design.angle * radians, 12);
  expect(model.at(0).speed).toBe(0);
  expect(model.at(period / 4).angle).toBeCloseTo(0, 12);
  expect(model.at(period / 4).speed).toBeGreaterThan(0);
  expect(model.at(period / 2).angle).toBeCloseTo(-design.angle * radians, 12);
  expect(model.at(period / 2).speed).toBe(0);
  expect(model.at(period).angle).toBeCloseTo(design.angle * radians, 12);
  expect(model.at(model.approximate).angleLinear).toBeCloseTo(
    design.angle * radians,
    12,
  );
  expect(
    Math.abs(model.at(model.approximate).angle - design.angle * radians),
  ).toBeGreaterThan(0.4);
  for (let index = 0; index <= 64; index++) {
    const time = (period * (index + 0.17)) / 32;
    const sample = model.at(time);
    expect(sample.kinetic + sample.potential).toBeCloseTo(sample.total, 11);
    expect(sample.tangentialAcceleration).toBeCloseTo(
      -design.gravity * Math.sin(sample.angle),
      12,
    );
    expect(model.at(time)).toEqual(sample);
  }
});

test("releasing at rest creates no physical period or energy", () => {
  const model = makePendulum({ ...defaults, angle: 0 });
  expect(model.period).toBeNull();
  expect(model.approximate).toBeGreaterThan(0);
  const sample = model.at(model.duration);
  expect(
    [
      sample.angle,
      sample.angularVelocity,
      sample.kinetic,
      sample.potential,
      sample.total,
    ].every((value) => value === 0),
  ).toBe(true);
});

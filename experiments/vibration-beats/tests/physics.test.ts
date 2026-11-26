import { expect, test } from "bun:test";
import {
  at,
  defaults,
  derive,
  envelope,
  nextMoment,
  parameterValue,
  presets,
  relativePhase,
} from "../model/physics";

test("the sum is the horizontal projection of the resultant", () => {
  const parameters = { ...defaults, amplitudeSecond: 1.7, phaseSecond: -110 };
  for (const time of [0, 0.125, 0.25, 0.512, 2.1, 7, 10]) {
    const state = at(parameters, time);
    const secondPhase =
      2 *
      Math.PI *
      (parameters.frequencySecond * time + parameters.phaseSecond / 360);
    expect(state.firstX).toBeCloseTo(
      parameters.amplitudeFirst *
        Math.cos(2 * Math.PI * parameters.frequencyFirst * time),
      10,
    );
    expect(state.secondX).toBeCloseTo(
      parameters.amplitudeSecond * Math.cos(secondPhase),
      10,
    );
    expect(state.sumX).toBeCloseTo(state.firstX + state.secondX, 12);
    expect(Math.hypot(state.sumX, state.sumY)).toBeCloseTo(
      envelope(parameters, time),
      10,
    );
    expect(Math.abs(state.sumX)).toBeLessThanOrEqual(
      envelope(parameters, time) + 1e-10,
    );
  }
});

test("envelope crests repeat at the frequency gap, with residual amplitude at opposition", () => {
  for (const parameters of [defaults, presets.unequal]) {
    const { beatPeriod, maximum, minimum } = derive(parameters);
    expect(beatPeriod).toBeCloseTo(5, 10);
    expect(envelope(parameters, 0)).toBeCloseTo(maximum, 10);
    expect(envelope(parameters, beatPeriod!)).toBeCloseTo(maximum, 10);
    expect(envelope(parameters, beatPeriod! / 2)).toBeCloseTo(minimum, 10);
    const quarterCarrier =
      1 / (4 * ((parameters.frequencyFirst + parameters.frequencySecond) / 2));
    if (minimum === 0)
      expect(at(parameters, quarterCarrier).sumX).toBeCloseTo(0, 10);
    expect(envelope(parameters, quarterCarrier)).toBeGreaterThan(0);
  }
});

test("phase jumps account for either sign of the frequency gap and wrap within the timeline", () => {
  for (const [frequencyFirst, frequencySecond] of [
    [1, 1.2],
    [1.2, 1],
  ]) {
    const parameters = {
      ...presets.unequal,
      frequencyFirst,
      frequencySecond,
      phaseSecond: 40,
    };
    const { duration, beatPeriod, maximum, minimum } = derive(parameters);
    const reinforce = nextMoment(parameters, "reinforce")!;
    const cancel = nextMoment(parameters, "cancel")!;
    const quadrature = nextMoment(parameters, "quadrature")!;
    expect(reinforce).toBeGreaterThan(0);
    expect(cancel).toBeGreaterThan(0);
    expect(quadrature).toBeGreaterThan(0);
    expect(envelope(parameters, reinforce)).toBeCloseTo(maximum, 10);
    expect(envelope(parameters, cancel)).toBeCloseTo(minimum, 10);
    expect(envelope(parameters, quadrature)).toBeCloseTo(
      Math.hypot(parameters.amplitudeFirst, parameters.amplitudeSecond),
      10,
    );
    expect(Math.abs(relativePhase(parameters, quadrature))).toBeCloseTo(90, 8);
    expect(nextMoment(parameters, "cancel", cancel)).toBeCloseTo(
      cancel + beatPeriod!,
      10,
    );
    expect(nextMoment(parameters, "quadrature", quadrature)).toBeCloseTo(
      quadrature + beatPeriod! / 2,
      10,
    );
    expect(nextMoment(parameters, "reinforce", duration)).toBe(reinforce);
  }
  expect(nextMoment(defaults, "reinforce", derive(defaults).duration)).toBe(0);
});

test("locked phase, inactive sources and parameter limits do not invent beats", () => {
  const cases = [
    { parameters: presets.locked, expected: 0 },
    { parameters: { ...presets.locked, phaseSecond: 0 }, expected: 6 },
    { parameters: { ...defaults, amplitudeFirst: 0 }, expected: 3 },
    { parameters: { ...defaults, amplitudeSecond: 0 }, expected: 3 },
    {
      parameters: { ...defaults, amplitudeFirst: 0, amplitudeSecond: 0 },
      expected: 0,
    },
  ];
  for (const { parameters, expected } of cases) {
    const { beatPeriod, duration } = derive(parameters);
    expect(beatPeriod).toBeNull();
    expect(nextMoment(parameters, "cancel")).toBeNull();
    expect(nextMoment(parameters, "reinforce")).toBeNull();
    expect(Number.isFinite(duration)).toBe(true);
    expect(envelope(parameters, 0.123)).toBeCloseTo(expected, 10);
  }
  const closest = { ...defaults, frequencyFirst: 2.95, frequencySecond: 3 };
  expect(derive(closest).duration).toBeCloseTo(40, 10);
  expect(parameterValue("phaseSecond", 181)).toBe(180);
  expect(parameterValue("frequencySecond", 1.223)).toBe(1.2);
  expect(parameterValue("amplitudeSecond", -10)).toBe(0);
});

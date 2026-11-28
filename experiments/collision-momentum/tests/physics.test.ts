import { expect, test } from "bun:test";
import {
  defaults,
  makeTrial,
  presets,
  width,
  type Mode,
  type Parameters,
} from "../model/physics";

test("equal-mass elastic carts exchange velocities at their first contact", () => {
  const trial = makeTrial(presets.exchange);
  const contact = trial.contact!;
  expect(contact).toBeCloseTo(2.6 / presets.exchange.leftVelocity, 12);
  expect(trial.at(trial.preContact!).phase).toBe("before");
  const impact = trial.at(contact);
  expect(impact.phase).toBe("after");
  expect(impact.position.right - impact.position.left).toBeCloseTo(width, 12);
  expect(impact.velocity).toEqual({ left: 0, right: 2.5 });
  expect(trial.transfer).toBe(0);
  expect(
    trial.at(contact + 1).position.right - trial.at(contact + 1).position.left,
  ).toBeGreaterThan(width);
});

test("both models conserve total signed momentum; only elastic conserves kinetic energy", () => {
  for (const parameters of [
    defaults,
    {
      ...defaults,
      leftMass: 4,
      rightMass: 0.5,
      leftVelocity: 3,
      rightVelocity: -3,
    },
    {
      ...defaults,
      leftMass: 0.5,
      rightMass: 4,
      leftVelocity: 3,
      rightVelocity: 2.75,
    },
    {
      ...defaults,
      leftMass: 2,
      rightMass: 2,
      leftVelocity: 1,
      rightVelocity: -1,
    },
    {
      ...defaults,
      leftMass: 2,
      rightMass: 2,
      leftVelocity: -1,
      rightVelocity: -2,
    },
  ]) {
    const elastic = makeTrial({ ...parameters, mode: "elastic" });
    const sticky = makeTrial({ ...parameters, mode: "inelastic" });
    for (const trial of [elastic, sticky]) {
      expect(trial.after!.momentum.total).toBeCloseTo(
        trial.before.momentum.total,
        11,
      );
      expect(
        trial.before.kinetic.total - trial.after!.kinetic.total,
      ).toBeCloseTo(trial.transfer!, 11);
    }
    expect(elastic.after!.kinetic.total).toBeCloseTo(
      elastic.before.kinetic.total,
      11,
    );
    expect(
      elastic.after!.velocity.right - elastic.after!.velocity.left,
    ).toBeCloseTo(parameters.leftVelocity - parameters.rightVelocity, 12);
    const joinedSpeed =
      sticky.before.momentum.total /
      (parameters.leftMass + parameters.rightMass);
    expect(sticky.after!.velocity).toEqual({
      left: joinedSpeed,
      right: joinedSpeed,
    });
    expect(sticky.after!.kinetic.total).toBeLessThan(
      sticky.before.kinetic.total,
    );
    expect(sticky.transfer).toBeGreaterThan(0);
  }
});

test("contact is position-continuous, never overlaps, and replays deterministically", () => {
  for (const mode of ["elastic", "inelastic"] as Mode[]) {
    const trial = makeTrial({ ...defaults, mode });
    const { contact } = trial;
    const beforeContact = trial.at(contact! - 1e-8);
    const impact = trial.at(contact!);
    expect(impact.position.left).toBeCloseTo(beforeContact.position.left, 7);
    expect(impact.position.right).toBeCloseTo(beforeContact.position.right, 7);
    for (let index = 0; index <= 32; index++) {
      const time = (index * trial.duration) / 32;
      const state = trial.at(time);
      const separation = state.position.right - state.position.left;
      expect(separation).toBeGreaterThanOrEqual(width - 1e-12);
      if (time >= contact! && mode === "inelastic") {
        expect(state.coupled).toBe(true);
        expect(separation).toBeCloseTo(width, 12);
      }
      expect(trial.at(time)).toEqual(state);
    }
  }
});

test("separating or equal velocities (including zero) never synthesize a collision", () => {
  const scenarios: Parameters[] = [
    presets.tandem,
    { ...defaults, leftVelocity: -3, rightVelocity: 3 },
    { ...defaults, leftVelocity: 0, rightVelocity: 0, mode: "inelastic" },
  ];
  for (const parameters of scenarios) {
    const trial = makeTrial(parameters);
    expect(trial.contact).toBeNull();
    expect(trial.after).toBeNull();
    expect(trial.transfer).toBeNull();
    expect(trial.at(trial.duration).velocity).toBe(trial.before.velocity);
    expect(trial.at(trial.duration).phase).toBe("noContact");
    expect(trial.at(trial.duration).coupled).toBe(false);
  }
});

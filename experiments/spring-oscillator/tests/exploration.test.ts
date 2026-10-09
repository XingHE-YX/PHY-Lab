import { test, expect } from "bun:test";
import { meetsChallenge } from "../model/exploration";
import { defaults, stateAt } from "../model/physics";

test("doubling period requires mass adjustment with other parameters unchanged", () => {
  const task = { index: 0 as const, baseline: defaults };
  expect(meetsChallenge(task, { ...defaults, m: 4 }, 0)).toBe(true);
  expect(meetsChallenge(task, { ...defaults, m: 3.9 }, 0)).toBe(true);
  expect(meetsChallenge(task, defaults, 0)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, k: 2.5 }, 0)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, m: 4, A: 0.4 }, 0)).toBe(false);
});

test("equal energy accepts time scrubbing with tolerance but excludes zero energy and parameter changes", () => {
  const task = { index: 1 as const, baseline: defaults };
  const time = stateAt(defaults, 0).period / 8;
  expect(meetsChallenge(task, defaults, time)).toBe(true);
  expect(meetsChallenge(task, defaults, time + 0.003)).toBe(true);
  expect(meetsChallenge(task, defaults, 0)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, A: 0 }, time)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, A: 0.6 }, time)).toBe(false);
  expect(meetsChallenge(task, defaults, time, true)).toBe(false);
});

test("equilibrium start requires initial phase, not reaching equilibrium later", () => {
  const task = { index: 2 as const, baseline: defaults };
  for (const phi of [1.57, 4.71])
    expect(meetsChallenge(task, { ...defaults, phi }, 0)).toBe(true);
  expect(meetsChallenge(task, defaults, stateAt(defaults, 0).period / 4)).toBe(
    false,
  );
  expect(meetsChallenge(task, { ...defaults, phi: 1.57 }, 0.1)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, phi: 1.57, m: 2 }, 0)).toBe(false);
  expect(meetsChallenge(task, { ...defaults, phi: 1.57, A: 0 }, 0)).toBe(false);
});

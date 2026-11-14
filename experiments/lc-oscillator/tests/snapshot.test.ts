import { expect, test } from "bun:test";
import { at, derived, parameters } from "../model/physics";
import { normalizeSnapshot } from "../model/snapshot";
import { buildTransient, switchParameters } from "../model/transient";

test("legacy saves retain elapsed time beyond four periods and acquire compatible switch defaults", () => {
  const p = parameters(null),
    time = 123 * derived(p).period;
  const state = normalizeSnapshot({
    version: 1,
    params: p,
    time,
    closed: true,
    observation: "energy",
  });
  expect(state.time).toBe(time);
  expect(state.seed).toEqual({ q: p.capacitance * p.voltage, current: 0 });
  expect(state.transient).toBeNull();
  expect(state.switch).toEqual(switchParameters(null));
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
});
test("captured switch parameters and residual initial conditions round trip independently of subsequent edits", () => {
  const p = parameters(null),
    initial = at(p, derived(p).period / 4),
    model = switchParameters(null);
  const profile = buildTransient(p, initial, model),
    last = profile.points.at(-1)!;
  const state = normalizeSnapshot({
    params: p,
    closed: false,
    time: initial.time,
    seed: { q: last.voltage * p.capacitance, current: 0 },
    switch: { ...model, breakdown: 1200 },
    transient: { at: initial.time, initial, model, elapsed: profile.duration },
    support: "transient",
    parameterTab: "switch",
  });
  expect(state.transient!.model.breakdown).toBe(600);
  expect(state.switch.breakdown).toBe(1200);
  expect(state.seed.q).toBe(last.voltage * p.capacitance);
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(state)))).toEqual(state);
});
test("malformed switch records never produce unbounded initial energy or nonfinite model inputs", () => {
  const state = normalizeSnapshot({
    closed: true,
    time: Infinity,
    seed: { q: 1e100, current: 1e100 },
    switch: { capacitance: -1, breakdown: Infinity, resistance: NaN },
    support: "transient",
    transient: { at: 0, initial: { q: null, current: Infinity } },
  });
  expect(state.time).toBe(0);
  expect(state.transient).toBeNull();
  expect(state.support).toBe("formula");
  expect(at(state.params, 0, state.seed).total).toBeLessThanOrEqual(
    derived(state.params).energy * (1 + 1e-12),
  );
  expect(Object.values(state.switch).every(Number.isFinite)).toBe(true);
});

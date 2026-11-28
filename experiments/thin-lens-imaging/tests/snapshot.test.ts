import { expect, test } from "bun:test";
import { defaults } from "../model/optics";
import { normalizeSnapshot, type Snapshot } from "../model/snapshot";

test("restores exact focal placement and independent display choices", () => {
  const snapshot: Snapshot = {
    parameters: { object: 13.5, focal: 13.5 },
    observation: "compare",
    extensions: false,
  };
  expect(normalizeSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(
    snapshot,
  );
});

test("invalid values cannot produce negative focal length or undefined geometry", () => {
  expect(
    normalizeSnapshot({
      parameters: { focal: -1, object: 1000000 },
      extensions: "false",
      observation: 99,
    }),
  ).toEqual({
    parameters: { focal: 8, object: 72 },
    extensions: true,
    observation: "reading",
  });
  expect(
    normalizeSnapshot({ parameters: { focal: NaN, object: "12" } }).parameters,
  ).toEqual(defaults);
  expect(
    normalizeSnapshot({ parameters: { focal: 17.1, object: 10.28 } })
      .parameters,
  ).toEqual({ focal: 17, object: 10.5 });
});

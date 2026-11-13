import { expect, test } from "bun:test";
import { collectCategories } from "../../src/infra/platform/categories";
import type { Catalog } from "../../src/infra/platform/types";
test("categories are deduplicated by stable id and reject conflicting translations", () => {
  const category = {
    id: "mechanics",
    title: { "zh-CN": "力学", en: "Mechanics" },
  };
  const entries = [
    { catagory: category },
    { catagory: category },
    {},
  ] as Catalog["experiments"];
  expect(collectCategories(entries)).toEqual([category]);
  expect(() =>
    collectCategories([
      ...entries,
      { catagory: { ...category, title: { "zh-CN": "光学", en: "Optics" } } },
    ] as Catalog["experiments"]),
  ).toThrow("Conflicting catagory");
});

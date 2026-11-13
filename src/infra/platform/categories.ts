import { record, text, localized } from "./metadata";
import type { Catalog, ExperimentCategory } from "./types";
export function parseCatagory(value: unknown): ExperimentCategory {
  const raw = record(value),
    id = text(raw.id, "catagory id");
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Invalid catagory id");
  return { id, title: localized(raw.title, "catagory title") };
}
export function collectCategories(
  entries: Catalog["experiments"],
): ExperimentCategory[] {
  const categories = new Map<string, ExperimentCategory>();
  for (const entry of entries) {
    if (!entry.catagory) continue;
    const category = parseCatagory(entry.catagory),
      existing = categories.get(category.id);
    if (
      existing &&
      (existing.title.en !== category.title.en ||
        existing.title["zh-CN"] !== category.title["zh-CN"])
    )
      throw new Error(`Conflicting catagory title: ${category.id}`);
    categories.set(category.id, category);
  }
  return [...categories.values()];
}

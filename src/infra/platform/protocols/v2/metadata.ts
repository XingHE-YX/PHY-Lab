import { parseCatagory } from "../../categories";
import type {
  ExperimentMetadata as Base,
  ExperimentManifest as Published,
} from "../../types";
import {
  baseMetadata,
  manifestWith,
  record,
  text,
  webUrl,
  localized,
} from "../../metadata";
export type {
  ExperimentAuthor,
  ExperimentCategory,
  ExperimentSettingsTab,
  ExperimentSettingsDefinition,
} from "../../types";
export interface ExperimentMetadata extends Omit<Base, "apiVersion"> {
  apiVersion: 2;
}
export type ExperimentManifest = ExperimentMetadata &
  Pick<Published, "buildId" | "entry" | "thumbnail" | "resources">;
export function parseMetadata(value: unknown): ExperimentMetadata {
  const raw = record(value),
    metadata = baseMetadata(raw);
  if (metadata.apiVersion !== 2) throw new Error("Expected protocol v2");
  const result: ExperimentMetadata = { ...metadata, apiVersion: 2 };
  if (raw.author !== undefined) {
    const parseAuthor = (value: unknown) => {
      const author = record(value);
      const result = {
        name: text(author.name, "author name"),
        ...(author.url === undefined
          ? {}
          : { url: webUrl(author.url, "author") }),
      };
      return result;
    };
    if (Array.isArray(raw.author)) {
      if (!raw.author.length) throw new Error("Author list must not be empty");
      result.author = raw.author.map(parseAuthor);
    } else result.author = parseAuthor(raw.author);
  }
  if (raw.catagory !== undefined) result.catagory = parseCatagory(raw.catagory);
  if (raw.settings !== undefined) {
    const settings = record(raw.settings);
    if (!Array.isArray(settings.tabs))
      throw new Error("Invalid experiment settings tabs");
    const ids = new Set<string>(),
      titles = new Set<string>();
    const reservedIds = ["appearance", "cache", "about"];
    const reservedTitles = [
      "外观",
      "缓存设置",
      "关于",
      "appearance",
      "cache settings",
      "about",
    ];
    result.settings = {
      tabs: settings.tabs.map((value) => {
        const rawTab = record(value),
          id = text(rawTab.id, "settings tab id"),
          title = localized(rawTab.title, "settings tab title");
        if (
          !/^[a-z][a-z0-9-]*$/.test(id) ||
          reservedIds.includes(id) ||
          ids.has(id)
        )
          throw new Error("Invalid or reserved settings tab id");
        for (const [locale, value] of Object.entries(title)) {
          const normalized = value.toLowerCase();
          const key = locale + ":" + normalized;
          if (reservedTitles.includes(normalized) || titles.has(key))
            throw new Error("Duplicate or reserved settings tab title");
          titles.add(key);
        }
        ids.add(id);
        return { id, title };
      }),
    };
  }
  if (raw.repository !== undefined)
    result.repository = webUrl(raw.repository, "repository");
  if (raw.license !== undefined) result.license = text(raw.license, "license");
  return result;
}
export const parseManifest = (value: unknown): ExperimentManifest =>
  manifestWith(value, parseMetadata);

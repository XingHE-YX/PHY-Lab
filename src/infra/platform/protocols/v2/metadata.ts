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
} from "../../metadata";
export type { ExperimentAuthor } from "../../types";
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
    const author = record(raw.author);
    result.author = { name: text(author.name, "author name") };
    if (author.url !== undefined)
      result.author.url = webUrl(author.url, "author");
  }
  if (raw.repository !== undefined)
    result.repository = webUrl(raw.repository, "repository");
  if (raw.license !== undefined) result.license = text(raw.license, "license");
  return result;
}
export const parseManifest = (value: unknown): ExperimentManifest =>
  manifestWith(value, parseMetadata);

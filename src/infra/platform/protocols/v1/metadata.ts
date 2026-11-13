import type {
  ExperimentMetadata as Base,
  ExperimentManifest as Published,
} from "../../types";
import { baseMetadata, manifestWith } from "../../metadata";
export interface ExperimentMetadata extends Omit<
  Base,
  "apiVersion" | "author" | "repository" | "license" | "catagory" | "settings"
> {
  apiVersion: 1;
}
export type ExperimentManifest = ExperimentMetadata &
  Pick<Published, "buildId" | "entry" | "thumbnail" | "resources">;
export function parseMetadata(value: unknown): ExperimentMetadata {
  const metadata = baseMetadata(value);
  if (metadata.apiVersion !== 1) throw new Error("Expected protocol v1");
  return { ...metadata, apiVersion: 1 };
}
export const parseManifest = (value: unknown): ExperimentManifest =>
  manifestWith(value, parseMetadata);

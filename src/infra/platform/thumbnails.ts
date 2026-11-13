import type { ExperimentThumbnail, Theme } from "./types";
export function thumbnailUrls(thumbnail: ExperimentThumbnail): string[] {
  return typeof thumbnail === "string"
    ? [thumbnail]
    : [thumbnail.light, thumbnail.dark];
}
export function thumbnailForTheme(
  thumbnail: ExperimentThumbnail,
  theme: Theme,
): string {
  return typeof thumbnail === "string" ? thumbnail : thumbnail[theme];
}

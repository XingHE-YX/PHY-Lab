import { realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ExperimentThumbnail } from "../src/infra/platform/types";
/** Source paths belong to assets; the copied build removes that directory prefix. */
export async function resolveThumbnails(
  source: string,
  thumbnail: ExperimentThumbnail = "assets/thumbnail.svg",
): Promise<ExperimentThumbnail> {
  const assets = await realpath(join(source, "assets"));
  const resolve = async (path: string) => {
    const parts = path.split("/");
    if (
      !path.startsWith("assets/") ||
      /[\\?#%]/.test(path) ||
      parts.some((part) => !part || part === "." || part === "..")
    )
      throw new Error("Thumbnail must be a file inside assets/");
    const relative = parts.slice(1).join("/");
    const file = await realpath(join(source, path));
    if (file !== join(assets, relative) || !(await stat(file)).isFile())
      throw new Error("Thumbnail must be a regular file inside assets/");
    return relative;
  };
  if (typeof thumbnail === "string") return resolve(thumbnail);
  return {
    light: await resolve(thumbnail.light),
    dark: await resolve(thumbnail.dark),
  };
}
export function publishThumbnails(
  thumbnail: ExperimentThumbnail,
  prefix: string,
): ExperimentThumbnail {
  return typeof thumbnail === "string"
    ? prefix + thumbnail
    : { light: prefix + thumbnail.light, dark: prefix + thumbnail.dark };
}

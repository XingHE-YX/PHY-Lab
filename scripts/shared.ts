import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, cp } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import type { Resource } from "../src/infra/platform/contract";

export const root = resolve(import.meta.dirname, "..");
export const dist = join(root, "dist");
export const base = normalizeBase(process.env.PHY_BASE ?? "/");
export function normalizeBase(input: string) {
  if (!/^\/[a-zA-Z0-9/_-]*\/?$/.test(input) || input.includes("//"))
    throw new Error("PHY_BASE must be an absolute path, e.g. /phy/");
  return input.endsWith("/") ? input : input + "/";
}
export const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8"));
}
export async function save(file: string, value: unknown) {
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n");
}
export async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
    ),
  );
  return groups.flat().sort();
}
export async function resources(
  dir: string,
  prefix: string,
): Promise<Resource[]> {
  return Promise.all(
    (await files(dir)).map(async (file) => {
      const bytes = await readFile(file);
      return {
        url: prefix + relative(dir, file).split("\\").join("/"),
        sha256: hash(bytes),
        size: bytes.length,
      };
    }),
  );
}
export function assertId(id: string) {
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new Error("Invalid experiment id: " + id);
}
export async function experimentIds() {
  return (await readdir(join(root, "experiments"), { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
export async function copyPublic() {
  await cp(join(root, "public"), dist, { recursive: true });
}

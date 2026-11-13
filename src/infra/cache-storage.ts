export function cachePrefix(base: string): string {
  return "phy-lab:" + base + ":v1:";
}
export interface CacheUsage {
  bytes: number;
  caches: number;
}
export async function cacheUsage(
  storage: CacheStorage,
  base: string,
): Promise<CacheUsage> {
  const names = (await storage.keys()).filter((name) =>
    name.startsWith(cachePrefix(base)),
  );
  let bytes = 0;
  for (const name of names) {
    const cache = await storage.open(name);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (response) bytes += (await response.arrayBuffer()).byteLength;
    }
  }
  return { bytes, caches: names.length };
}
export async function clearResourceCaches(
  storage: CacheStorage,
  base: string,
): Promise<number> {
  const names = (await storage.keys()).filter((name) =>
    name.startsWith(cachePrefix(base)),
  );
  return (await Promise.all(names.map((name) => storage.delete(name)))).filter(
    Boolean,
  ).length;
}

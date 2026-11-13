import { expect, test } from "bun:test";
import {
  cacheUsage,
  clearResourceCaches,
  cachePrefix,
} from "../../src/infra/cache-storage";

test("resource-cache accounting and removal stay inside the current deployment", async () => {
  const contents = new Map<string, Map<string, Response>>([
    [
      cachePrefix("/") + "app:current",
      new Map([["https://example.com/app.js", new Response("abc")]]),
    ],
    [
      cachePrefix("/other/") + "app:other",
      new Map([["https://example.com/other.js", new Response("other")]]),
    ],
    [
      "unrelated-cache",
      new Map([["https://example.com/data", new Response("data")]]),
    ],
  ]);
  const storage = {
    keys: async () => [...contents.keys()],
    delete: async (name: string) => contents.delete(name),
    open: async (name: string) => ({
      keys: async () =>
        [...(contents.get(name)?.keys() ?? [])].map((url) => new Request(url)),
      match: async (request: Request) =>
        contents.get(name)?.get(request.url)?.clone(),
    }),
  } as unknown as CacheStorage;
  expect(await cacheUsage(storage, "/")).toEqual({ bytes: 3, caches: 1 });
  expect(await clearResourceCaches(storage, "/")).toBe(1);
  expect(await cacheUsage(storage, "/")).toEqual({ bytes: 0, caches: 0 });
  expect(contents.has("unrelated-cache")).toBe(true);
  expect(contents.has(cachePrefix("/other/") + "app:other")).toBe(true);
});

import { describe, expect, test } from "bun:test";
import {
  parseExperimentMetadata,
  parseExperimentManifest,
  requireProtocol,
  supportsProtocol,
} from "../../src/infra/platform/compatibility";
import { getProtocol } from "../../src/infra/platform/protocols";
import { capabilityInfo } from "../../src/infra/platform/protocols/types";
import type { ProtocolHost } from "../../src/infra/platform/protocols/types";

const metadata = (apiVersion = 1) => ({
  id: "test-experiment",
  version: "1.0.0",
  apiVersion,
  stateVersion: 2,
  title: { "zh-CN": "测试", en: "Test" },
  description: { "zh-CN": "说明", en: "Description" },
  tags: { "zh-CN": ["测试"], en: ["Test"] },
});
const manifest = (apiVersion = 1) => ({
  ...metadata(apiVersion),
  buildId: "build",
  entry: "/entry.js",
  thumbnail: "/thumbnail.svg",
  resources: [{ url: "/entry.js", sha256: "a".repeat(64), size: 10 }],
});

describe("protocol selection and revisions", () => {
  test("missing revisions mean zero and main versions are matched exactly", () => {
    for (const apiVersion of [1, 2]) {
      expect(parseExperimentMetadata(metadata(apiVersion)).apiRevision).toBe(0);
      expect(requireProtocol({ apiVersion }).version).toBe(apiVersion);
      expect(supportsProtocol({ apiVersion, apiRevision: 0 })).toBe(true);
      expect(supportsProtocol({ apiVersion, apiRevision: 1 })).toBe(false);
    }
    for (const apiVersion of [-1, 0, 1.5, 3, 999, NaN])
      expect(supportsProtocol({ apiVersion })).toBe(false);
  });
  test("malformed and newer revisions fail before mounting", () => {
    for (const apiRevision of [-1, 0.5, NaN, Infinity, "0", null]) {
      expect(() =>
        parseExperimentMetadata({ ...metadata(2), apiRevision }),
      ).toThrow();
    }
    expect(() =>
      parseExperimentMetadata({ ...metadata(2), apiRevision: 1 }),
    ).toThrow("Update the platform");
  });
  test("capabilities follow their introduction revision", () => {
    const table = {
      api: { old: 0, added: 1 },
      components: { "phy-old": 0, "phy-added": 2 },
    };
    expect(capabilityInfo(2, 0, table).capabilities).toEqual({
      api: ["old"],
      components: ["phy-old"],
    });
    expect(capabilityInfo(2, 1, table).capabilities.api).toEqual([
      "old",
      "added",
    ]);
    expect(getProtocol(1)!.capabilities.api).not.toHaveProperty("dialog");
    expect(getProtocol(2)!.capabilities.api).toHaveProperty("dialog");
  });
});

describe("versioned metadata", () => {
  test("v2 preserves optional credits while v1 keeps its original contract", () => {
    const credits = {
      author: { name: "Author", url: "https://example.com" },
      repository: "https://example.com/repo",
      license: "Apache-2.0",
    };
    expect(
      parseExperimentMetadata({ ...metadata(2), ...credits }),
    ).toMatchObject(credits);
    expect(
      parseExperimentMetadata({ ...metadata(), ...credits }),
    ).not.toHaveProperty("author");
    expect(parseExperimentMetadata(metadata(2))).not.toHaveProperty("license");
    expect(
      parseExperimentManifest({ ...manifest(2), ...credits }),
    ).toMatchObject({ ...credits, stateVersion: 2 });
  });
  test("invalid optional fields and storage versions are rejected", () => {
    for (const patch of [
      { author: "Name" },
      { author: {} },
      { author: { name: " " } },
      { author: { name: "A", url: "javascript:alert(1)" } },
      { repository: "git@example.com:r.git" },
      { repository: "https://user:password@example.com" },
      { license: " " },
      { license: 1 },
      { stateVersion: 0 },
      { stateVersion: 1.5 },
    ]) {
      expect(() =>
        parseExperimentMetadata({ ...metadata(2), ...patch }),
      ).toThrow();
    }
  });
  test("resource integrity descriptions include the entry and unique URLs", () => {
    expect(parseExperimentManifest(manifest(2)).resources).toHaveLength(1);
    for (const patch of [
      { resources: [] },
      { resources: [...manifest().resources, ...manifest().resources] },
      { resources: [{ ...manifest().resources[0], size: -1 }] },
      { resources: [{ ...manifest().resources[0], sha256: "bad" }] },
    ]) {
      expect(() =>
        parseExperimentManifest({ ...manifest(2), ...patch }),
      ).toThrow();
    }
  });
});

test("v1 and v2 receive their own contexts without changing storage namespaces", async () => {
  let received: unknown;
  const instance = {
    element: {} as HTMLElement,
    update() {},
    pause() {},
    snapshot() {
      return {};
    },
    dispose() {},
  };
  const module = {
    async mount(context: unknown) {
      received = context;
      return instance;
    },
  };
  const storage = {
    read: <T>(fallback: T) => fallback,
    readVersion: <T>(_version: number, fallback: T) => fallback,
    write() {},
  };
  const host: ProtocolHost = {
    locale: "zh-CN",
    theme: "light",
    buildId: "build",
    signal: new AbortController().signal,
    storage,
    manifest: parseExperimentManifest(manifest()),
  };
  await getProtocol(1)!.mount(module, host);
  expect(received).not.toHaveProperty("dialog");
  expect(received).not.toHaveProperty("protocol");
  host.manifest = parseExperimentManifest(manifest(2));
  await expect(getProtocol(2)!.mount(module, host)).rejects.toThrow(
    "dialog service",
  );
  host.dialog = {
    open() {
      throw new Error("Not invoked in this test");
    },
  };
  await getProtocol(2)!.mount(module, host);
  expect(received).toMatchObject({
    protocol: { version: 2, revision: 0 },
    experiment: { id: "test-experiment", stateVersion: 2 },
    storage,
  });
});

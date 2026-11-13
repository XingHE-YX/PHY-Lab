import { base } from "../infra/platform/registry";
import { cacheUsage, clearResourceCaches } from "../infra/cache-storage";
import type { CacheUsage } from "../infra/cache-storage";
import { offline, askWorker } from "./offline";
class ResourceCache extends EventTarget {
  bytes: number | null = null;
  busy = false;
  error = "";
  removed: number | null = null;
  private operation = 0;
  private emit() {
    this.dispatchEvent(new Event("change"));
  }
  private async usage() {
    const worker = offline.registration?.active;
    return worker
      ? askWorker<CacheUsage>(worker, "CACHE_USAGE")
      : cacheUsage(caches, base);
  }
  async refresh() {
    if (this.busy) return;
    const operation = ++this.operation;
    this.error = "";
    try {
      const usage = await this.usage();
      if (operation === this.operation) this.bytes = usage.bytes;
    } catch (error) {
      if (operation === this.operation) this.error = String(error);
    }
    if (operation === this.operation) this.emit();
  }
  async clear() {
    if (this.busy) return;
    this.operation++;
    this.busy = true;
    this.error = "";
    this.removed = null;
    this.emit();
    try {
      const worker = offline.registration?.active;
      this.removed = worker
        ? (await askWorker<{ removed: number }>(worker, "CLEAR_CACHE")).removed
        : await clearResourceCaches(caches, base);
      await offline.refresh();
      this.bytes = (await this.usage()).bytes;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.busy = false;
      this.emit();
    }
  }
}
export const resourceCache = new ResourceCache();

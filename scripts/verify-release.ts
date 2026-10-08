import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { AppRelease, Catalog, ExperimentManifest, Resource } from '../src/infra/platform/contract';
import { dist, base, json, hash } from './shared';
async function verify(list: Resource[]) {
  for (const resource of list) {
    if (!resource.url.startsWith(base)) throw new Error('Invalid resource scope');
    const bytes = await readFile(join(dist, resource.url.slice(base.length)));
    if (hash(bytes) !== resource.sha256 || bytes.length !== resource.size) throw new Error('Resource mismatch: ' + resource.url);
  }
}
await verify((await json<AppRelease>(join(dist, 'release.json'))).resources);
for (const entry of (await json<Catalog>(join(dist, 'catalog.json'))).experiments) await verify((await json<ExperimentManifest>(join(dist, entry.manifest.slice(base.length)))).resources);
console.log('Release resources verified.');

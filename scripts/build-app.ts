import { build } from 'vite';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, dist, base, hash, resources, save, json } from './shared';
import type { AppRelease } from '../src/infra/platform/contract';

export async function buildApp() {
  const pkg = await json<{ version: string }>(join(root, 'package.json'));
  const stage = join(root, '.build', 'app');
  await build({ root, base, build: { outDir: stage, emptyOutDir: true } });
  const fingerprints = await resources(stage, '');
  const buildId = hash(JSON.stringify(fingerprints)).slice(0, 16);
  await mkdir(dist, { recursive: true });
  await cp(stage, dist, { recursive: true });
  const shellPath = 'app/' + pkg.version + '/' + buildId + '/index.html';
  await mkdir(join(dist, 'app', pkg.version, buildId), { recursive: true });
  await cp(join(stage, 'index.html'), join(dist, shellPath));
  const shellBytes = await readFile(join(dist, shellPath));
  const release: AppRelease = { version: pkg.version, buildId, base, shell: base + shellPath,
    resources: [...fingerprints.filter(r => r.url !== 'index.html').map(r => ({ ...r, url: base + r.url })), {url: base + shellPath, sha256: hash(shellBytes), size: shellBytes.length}] };
  await save(join(dist, 'release.json'), release);
  await build({ configFile: false, root, publicDir: false, define: { __APP_RELEASE__: JSON.stringify(release) }, build: {
    outDir: join(root, '.build', 'worker'), emptyOutDir: true, minify: true,
    lib: { entry: join(root, 'src/sw.ts'), name: 'PhyWorker', formats: ['iife'], fileName: () => 'sw.js' },
  } });
  await cp(join(root, '.build', 'worker', 'sw.js'), join(dist, 'sw.js'));
  console.log('Platform:', pkg.version, buildId);
  return release;
}
if (import.meta.main) await buildApp();

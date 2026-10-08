import { createServer } from 'vite';
import { watch } from 'node:fs';
import { resolve, join } from 'node:path';
import { buildExperiment } from './build-experiment';
import { generateCatalog } from './generate-catalog';
import { root, dist, base, experimentIds } from './shared';
for (const id of await experimentIds()) await buildExperiment(id);
await generateCatalog();
const server = await createServer({ root, base });
server.middlewares.use(async (req, res, next) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.slice(base.length);
  if (!url.pathname.startsWith(base) || !(path.startsWith('experiments/') || path === 'catalog.json')) return next();
  const target = resolve(dist, decodeURIComponent(path));
  if (!target.startsWith(dist + '/')) { res.statusCode = 403; res.end(); return; }
  const file = Bun.file(target);
  if (!await file.exists()) { res.statusCode = 404; res.end('Not found'); return; }
  res.setHeader('Content-Type', file.type);
  res.setHeader('Cache-Control', 'no-store');
  res.end(Buffer.from(await file.arrayBuffer()));
});
await server.listen();
server.printUrls();
let timer: ReturnType<typeof setTimeout>;
let rebuilding = false;
watch(join(root, 'experiments'), {recursive: true}, (_event, path) => {
  if (!path || /(^|\/)(pkg|target|node_modules)(\/|$)/.test(path)) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (rebuilding) return;
    rebuilding = true;
    try { for (const id of await experimentIds()) await buildExperiment(id); await generateCatalog(); server.ws.send({type: 'full-reload'}); }
    catch (error) { console.error(error); }
    finally { rebuilding = false; }
  }, 200);
});

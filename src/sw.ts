// Generated with the platform release. Experiment manifests remain independent.
export {};
declare const __APP_RELEASE__: import('./infra/platform/contract').AppRelease;
const worker = globalThis as unknown as ServiceWorkerGlobalScope;
worker.addEventListener('install', event => {
  event.waitUntil(caches.open('phy-lab:app:' + __APP_RELEASE__.buildId).then(cache => cache.addAll(__APP_RELEASE__.resources.map(r => r.url))));
});

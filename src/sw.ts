import type {AppRelease,Catalog,ExperimentManifest,Resource} from './infra/platform/contract';
export {};
declare const __APP_RELEASE__:AppRelease;
const worker=globalThis as unknown as ServiceWorkerGlobalScope;
const release=__APP_RELEASE__,prefix='phy-lab:'+release.base+':v1:';
const appCache=prefix+'app:'+release.buildId,registryCache=prefix+'catalog';
const marker=release.base+'__offline__/ready.json';
const tasks=new Map<string,Promise<void>>();
let lastError='';let syncing:Promise<void>|undefined;
const expCache=(m:ExperimentManifest)=>prefix+'experiment:'+m.id+':'+m.buildId;
function scoped(url:string){const target=new URL(url,worker.location.origin);if(target.origin!==worker.location.origin||!target.pathname.startsWith(release.base))throw new Error('Invalid resource scope');return target.href;}
async function request(url:string){const response=await fetch(scoped(url),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Download failed: '+response.status+' '+url);return response;}
async function sha256(bytes:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function cacheResources(cache:Cache,list:Resource[]){
  await Promise.all(list.map(async resource=>{
    scoped(resource.url);if(!/^[a-f0-9]{64}$/.test(resource.sha256))throw new Error('Invalid fingerprint');
    const existing=await cache.match(resource.url);
    if(existing){const bytes=await existing.clone().arrayBuffer();if(await sha256(bytes)===resource.sha256)return;}
    const response=await request(resource.url),bytes=await response.arrayBuffer();
    if(await sha256(bytes)!==resource.sha256||bytes.byteLength!==resource.size)throw new Error('Integrity check failed: '+resource.url);
    await cache.put(resource.url,new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers}));
  }));
}
async function allPresent(cache:Cache,list:Resource[]){if(!await cache.match(marker))return false;return (await Promise.all(list.map(r=>cache.match(r.url)))).every(Boolean);}
async function cached(url:string){for(const name of (await caches.keys()).filter(name=>name.startsWith(prefix))){const response=await (await caches.open(name)).match(url);if(response)return response;}return undefined;}
async function manifestAt(url:string){
  const response=await cached(scoped(url))??await request(url),manifest=await response.clone().json() as ExperimentManifest;
  if(manifest.apiVersion!==1||!manifest.id||!manifest.buildId||!Array.isArray(manifest.resources)||!manifest.resources.some(r=>r.url===manifest.entry))throw new Error('Incompatible manifest');
  scoped(manifest.entry);return {manifest,response};
}
async function cacheExperiment(url:string){
  if(tasks.has(url))return tasks.get(url)!;
  const task=(async()=>{
    const {manifest,response}=await manifestAt(url),cache=await caches.open(expCache(manifest));
    if(await allPresent(cache,manifest.resources))return;
    await cacheResources(cache,manifest.resources);
    await cache.put(scoped(url),response);
    await cache.put(marker,Response.json({kind:'experiment',manifest,url}));
    await broadcast('CACHE_PROGRESS');
  })();
  tasks.set(url,task);try{await task;}finally{tasks.delete(url);}
}
async function syncCatalog(){
  if(syncing)return syncing;
  syncing=(async()=>{
    lastError='';
    const response=await request(release.base+'catalog.json'),catalog=await response.clone().json() as Catalog;
    if(catalog.schemaVersion!==1||!Array.isArray(catalog.experiments))throw new Error('Unsupported catalog');
    const results=await Promise.allSettled(catalog.experiments.filter(e=>e.apiVersion===1).map(e=>cacheExperiment(e.manifest)));
    const failed=results.find(result=>result.status==='rejected');
    if(failed?.status==='rejected')throw failed.reason;
    await (await caches.open(registryCache)).put(release.base+'catalog.json',response);
    await broadcast('CACHE_READY');
  })();
  try{await syncing;}catch(error){lastError=error instanceof Error?error.message:String(error);await broadcast('CACHE_ERROR');throw error;}finally{syncing=undefined;}
}
async function status(){
  const cache=await caches.open(registryCache),response=await cache.match(release.base+'catalog.json');
  const catalog=response?await response.json() as Catalog:null;
  const entries=catalog?.experiments.filter(e=>e.apiVersion===1)??[];
  const ready=await Promise.all(entries.map(async e=>{try{const {manifest}=await manifestAt(e.manifest);return allPresent(await caches.open(expCache(manifest)),manifest.resources);}catch{return false;}}));
  const complete=ready.filter(Boolean).length,appReady=await allPresent(await caches.open(appCache),release.resources);
  return {state:catalog&&appReady&&complete===entries.length?'ready':lastError?'error':'loading',complete,total:entries.length,version:release.version,buildId:release.buildId,error:lastError};
}
async function broadcast(type:string){for(const client of await worker.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type});}
worker.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(appCache);await cacheResources(cache,release.resources);
  await cache.put(marker,Response.json({kind:'app',release}));
})()));
worker.addEventListener('activate',event=>event.waitUntil((async()=>{await worker.clients.claim();try{await syncCatalog();}catch{/* Keep a previously committed catalog and resources. */}})()));
worker.addEventListener('message',event=>{
  const reply=(data:unknown)=>event.ports[0]?.postMessage(data);
  const run=async()=>{
    try{
      if(event.data?.type==='STATUS')reply(await status());
      else if(event.data?.type==='SYNC'){await syncCatalog();reply(await status());}
      else if(event.data?.type==='CACHE_EXPERIMENT'){await cacheExperiment(event.data.url);reply({ok:true});}
      else if(event.data?.type==='ACTIVATE'){await worker.skipWaiting();reply({ok:true});}
    }catch(error){reply({error:error instanceof Error?error.message:String(error)});}
  };
  event.waitUntil(run());
});
worker.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==worker.location.origin||!url.pathname.startsWith(release.base))return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>await (await caches.open(appCache)).match(release.shell)??fetch(event.request))());return;
  }
  if(url.pathname===release.base+'sw.js'||url.pathname===release.base+'release.json')return;
  if(url.pathname===release.base+'catalog.json'){
    event.respondWith((async()=>{try{return await fetch(event.request,{cache:'no-cache',signal:AbortSignal.timeout(5000)});}catch{return await (await caches.open(registryCache)).match(release.base+'catalog.json')??new Response('Offline catalog unavailable',{status:503});}})());return;
  }
  event.respondWith((async()=>await cached(event.request.url)??fetch(event.request).catch(()=>new Response('Offline resource unavailable',{status:503})))());
});

import type {Catalog,ExperimentManifest} from './contract';
export const base=import.meta.env.BASE_URL;
export function scopedUrl(value:string){const url=new URL(value,location.href);if(url.origin!==location.origin||!url.pathname.startsWith(base))throw new Error('Resource outside platform scope');return url.href;}
export async function loadCatalog():Promise<Catalog>{
  const response=await fetch(base+'catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('Catalog unavailable');
  const catalog=await response.json() as Catalog;
  if(catalog.schemaVersion!==1||!Array.isArray(catalog.experiments))throw new Error('Unsupported catalog');
  const ids=new Set<string>();
  for(const e of catalog.experiments){if(!/^[a-z][a-z0-9-]*$/.test(e.id)||ids.has(e.id)||!e.title?.en||!e.title?.['zh-CN']||!e.tags?.en||!e.tags?.['zh-CN'])throw new Error('Invalid catalog entry');ids.add(e.id);scopedUrl(e.manifest);}
  return catalog;
}
export async function loadManifest(url:string,id:string):Promise<ExperimentManifest>{
  const response=await fetch(scopedUrl(url));if(!response.ok)throw new Error('Experiment unavailable');
  const manifest=await response.json() as ExperimentManifest;
  if(manifest.id!==id||manifest.apiVersion!==1||!Array.isArray(manifest.resources)||!manifest.buildId||!Number.isInteger(manifest.stateVersion))throw new Error('Incompatible experiment');
  scopedUrl(manifest.entry);
  for(const resource of manifest.resources){scopedUrl(resource.url);if(!/^[a-f0-9]{64}$/.test(resource.sha256))throw new Error('Invalid resource fingerprint');}
  return manifest;
}

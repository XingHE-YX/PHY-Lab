import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import type {AppRelease,Catalog,ExperimentManifest} from '../../src/infra/platform/contract';
import type {ExperimentPage} from '../../src/pages/experiment-page';
import type {Snapshot} from '../../experiments/spring-oscillator/experiment';
const dist=join(import.meta.dirname,'../../dist');
async function ready(page:Page){await page.goto('/');await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByText('✓ 可离线使用',{exact:true})).toBeVisible();await page.getByRole('button',{name:'关闭',exact:true}).click();}
async function check(page:Page){await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'检查更新',exact:true}).click();}
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function candidateExperiment(broken=false){
  const catalogText=await readFile(join(dist,'catalog.json'),'utf8'),catalog=JSON.parse(catalogText) as Catalog;
  const original=await readFile(join(dist,catalog.experiments[0].manifest.slice(1)),'utf8'),manifest=JSON.parse(original) as ExperimentManifest;
  const buildId='test'+Date.now(),prefix='/experiments/'+manifest.id+'/0.1.1/'+buildId+'/';
  const path=join(dist,prefix.slice(1));await mkdir(path,{recursive:true});
  const resources=[];
  for(const resource of manifest.resources){const name=resource.url.split('/').pop()!;let bytes=await readFile(join(dist,resource.url.slice(1)));if(name==='entry.js')bytes=Buffer.from(bytes.toString().replaceAll('弹簧振子','弹簧振子 · 新版'));await writeFile(join(path,name),bytes);resources.push({url:prefix+name,sha256:broken?'0'.repeat(64):sha(bytes),size:bytes.length});}
  const next:ExperimentManifest={...manifest,version:'0.1.1',buildId,entry:prefix+'entry.js',thumbnail:prefix+'thumbnail.svg',title:{...manifest.title,'zh-CN':'弹簧振子 · 新版'},resources};
  await writeFile(join(path,'manifest.json'),JSON.stringify(next));catalog.revision=buildId;catalog.experiments[0]={...catalog.experiments[0],version:'0.1.1',title:next.title,thumbnail:next.thumbnail,manifest:prefix+'manifest.json'};await writeFile(join(dist,'catalog.json'),JSON.stringify(catalog));
  return {catalogText,originalManifest:manifest};
}
test('experiment release changes without rebuilding platform and preserves the active instance',async({page})=>{
  await ready(page);await page.getByRole('link',{name:/弹簧振子/}).click();await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();
  const workerBefore=await readFile(join(dist,'sw.js'));const fixture=await candidateExperiment();
  try{
    await check(page);await expect(page.getByText('检查完成，已使用当前可用版本')).toBeVisible();await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();
    expect(await readFile(join(dist,'sw.js'))).toEqual(workerBefore);
    await page.getByRole('link',{name:'返回工作台'}).click();await page.getByRole('link',{name:/弹簧振子 · 新版/}).click();await expect(page.getByRole('heading',{name:'弹簧振子 · 新版',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'清理历史缓存'}).click();await expect(page.getByText(/已清理历史缓存/)).toBeVisible();
  }finally{await writeFile(join(dist,'catalog.json'),fixture.catalogText);}
});
test('failed experiment integrity keeps the committed offline catalog usable',async({page,context})=>{
  await ready(page);const fixture=await candidateExperiment(true);
  try{
    await check(page);await expect(page.getByText(/Integrity check failed/).first()).toBeVisible();await page.getByRole('button',{name:'关闭',exact:true}).click();
    await context.setOffline(true);await page.reload();await page.getByRole('link',{name:/弹簧振子/}).click();await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();
  }finally{await writeFile(join(dist,'catalog.json'),fixture.catalogText);}
});
test('platform activation coordinates tabs and restores experiment state',async({page,context})=>{
  await ready(page);await page.getByRole('link',{name:/弹簧振子/}).click();await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();await page.getByRole('tab',{name:'看能量'}).click();await page.getByRole('button',{name:'动能 = 势能',exact:true}).click();
  const saved=await page.locator('phy-experiment-page').evaluate(el=>(el as ExperimentPage).instance!.snapshot() as Snapshot);
  const second=await context.newPage();await ready(second);
  const swText=await readFile(join(dist,'sw.js'),'utf8'),release=JSON.parse(await readFile(join(dist,'release.json'),'utf8')) as AppRelease;
  const candidate=release.buildId+'test',newShell=release.shell.replace(release.buildId,candidate);await mkdir(join(dist,newShell.slice(1),'..'),{recursive:true});await cp(join(dist,release.shell.slice(1)),join(dist,newShell.slice(1)));
  try{
    await writeFile(join(dist,'sw.js'),swText.replaceAll(release.buildId,candidate));await check(page);await expect(page.getByRole('button',{name:'保存并更新'})).toBeVisible();
    const mainReload=page.waitForEvent('load'),secondReload=second.waitForEvent('load');await page.getByRole('button',{name:'保存并更新'}).click();await Promise.all([mainReload,secondReload]);
    await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();const restored=await page.locator('phy-experiment-page').evaluate(el=>(el as ExperimentPage).instance!.snapshot() as Snapshot);expect(restored.time).toBeCloseTo(saved.time,6);expect(restored.mode).toBe('energy');
    await expect(second.getByRole('heading',{name:'让物理，触手可及。'})).toBeVisible();
  }finally{await writeFile(join(dist,'sw.js'),swText);await second.close();}
});

import {test,expect,type Page} from '@playwright/test';
import type {ExperimentPage} from '../../src/pages/experiment-page';
import type {Snapshot} from '../../experiments/spring-oscillator/experiment';
async function openExperiment(page:Page){await page.goto('/#/experiments/spring-oscillator');await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();}
async function snapshot(page:Page){return page.locator('phy-experiment-page').evaluate(el=>(el as ExperimentPage).instance!.snapshot() as Snapshot);}
async function range(page:Page,name:string,value:string){await page.getByRole('slider',{name,exact:true}).evaluate((node,v)=>{const input=node as HTMLInputElement;input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);}
test('workspace search, navigation and locale persistence',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:'让物理，触手可及。'})).toBeVisible();
  const search=page.getByRole('textbox');await search.fill('不存在');await expect(page.getByRole('heading',{name:'没有找到匹配的实验'})).toBeVisible();
  await search.fill('energy');await expect(page.getByRole('link',{name:/弹簧振子/})).toBeVisible();
  await page.getByRole('button',{name:'切换语言',exact:true}).click();await expect(page.getByRole('heading',{name:'Physics, within reach.'})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'Physics, within reach.'})).toBeVisible();
  await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('navigation').getByRole('link',{name:'Home'})).toBeVisible();
});
test('theme transition, settings dialog and focus restoration',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'切换明暗'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const settings=page.getByRole('button',{name:'设置',exact:true});await settings.click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('减少界面动画').check();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(settings).toBeFocused();
});
test('one clock drives motion, pauses and survives reload',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await openExperiment(page);
  await page.getByRole('button',{name:'▷ 播放',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThan(.1);
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();const saved=await snapshot(page);
  await page.getByRole('tab',{name:'看变化'}).click();await expect(page.locator('.chart')).toHaveCount(3);expect((await snapshot(page)).time).toBe(saved.time);
  await page.reload();expect((await snapshotAfterLoad(page)).time).toBeCloseTo(saved.time,6);expect(errors).toEqual([]);
});
async function snapshotAfterLoad(page:Page){await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();return snapshot(page);}
test('key moments, energy proportions and phase stay consistent',async({page})=>{
  await openExperiment(page);await page.getByRole('tab',{name:'看能量'}).click();
  await page.getByRole('button',{name:'动能 = 势能',exact:true}).click();await expect(page.locator('.energy-caption')).toContainText('50%');
  await page.getByRole('button',{name:'右端点',exact:true}).click();await expect(page.locator('.energy-caption')).toContainText('弹性势能 100%');await expect(page.locator('path[marker-end="url(#v-arrow)"]')).toHaveCount(0);
  await page.getByRole('button',{name:'经过平衡位置',exact:true}).click();await expect(page.locator('.energy-caption')).toContainText('动能 100%');await expect(page.locator('path[marker-end="url(#a-arrow)"]')).toHaveCount(0);
  await page.getByText('进阶设置',{exact:true}).click();await range(page,'初相位','1.57');await page.getByRole('button',{name:'左端点',exact:true}).click();
  const state=await page.locator('phy-experiment-page').evaluate(el=>((el as ExperimentPage).instance!.element as HTMLElement&{state:{x:number;v:number;a:number}}).state);
  expect(state.x).toBeCloseTo(-.3);expect(state.v).toBeCloseTo(0);expect(state.a).toBeGreaterThan(0);
});
test('drag and keyboard release start from rest in either direction',async({page})=>{
  await openExperiment(page);const ball=page.getByRole('slider',{name:'拖动小球，松手释放',exact:true});
  const box=await ball.boundingBox();expect(box).not.toBeNull();await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2-150,box!.y+box!.height/2,{steps:5});await page.mouse.up();
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();expect((await snapshot(page)).params.A).toBeGreaterThan(0);
  await ball.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();const saved=await snapshot(page);expect(saved.params.A).toBeCloseTo(.02);expect(saved.params.phi).toBeCloseTo(Math.PI);
});
test('parameters preserve comparison and zero amplitude has finite displays',async({page})=>{
  await openExperiment(page);await range(page,'振幅','0.6');expect((await snapshot(page)).previous?.A).toBe(.3);await expect(page.locator('.compare')).toContainText('上一轮');
  await range(page,'振幅','0');await page.getByRole('tab',{name:'看能量'}).click();await expect(page.locator('.energy-caption')).toContainText('动能 0%');await expect(page.locator('.energy-values')).not.toContainText('NaN');
  await page.getByLabel('动能',{exact:true}).uncheck();await page.getByLabel('弹性势能',{exact:true}).uncheck();await page.getByLabel('总能量',{exact:true}).uncheck();await expect(page.locator('.chart')).toHaveCount(1);
});
test('first home visit preloads an unopened experiment for offline refresh',async({page,context})=>{
  await page.goto('/');await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByText('✓ 可离线使用',{exact:true})).toBeVisible();await page.getByRole('button',{name:'关闭',exact:true}).click();
  await context.setOffline(true);await page.getByRole('link',{name:/弹簧振子/}).click();await expect(page.getByRole('heading',{name:'弹簧振子',exact:true})).toBeVisible();
  await range(page,'质量','2');await page.reload();expect((await snapshotAfterLoad(page)).params.m).toBe(2);await page.getByRole('tab',{name:'看能量'}).click();await expect(page.locator('.energy-values')).toBeVisible();
});
test('mobile layout stays within viewport and resource 404 is not HTML',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openExperiment(page);await page.getByRole('tab',{name:'看能量'}).click();
  const bounds=await page.locator('.bench').boundingBox();expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);const plot=await page.locator('.plot-layout').boundingBox();expect(plot!.x+plot!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:'.build/mobile.png',fullPage:true});const response=await page.request.get('/experiments/missing.js');expect(response.status()).toBe(404);expect(await response.text()).not.toContain('<html');
});

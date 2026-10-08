import type {Locale} from '../infra/platform/contract';
import {readStored,writeStored} from './storage';
export interface Settings {schemaVersion:1;locale:Locale;theme:'light'|'dark'|'system';reduceMotion:boolean}
const defaults:Settings={schemaVersion:1,locale:'zh-CN',theme:'system',reduceMotion:false};
function validate(value:unknown):Settings {
  if(!value||typeof value!=='object')return {...defaults};
  const raw=value as Partial<Settings>;
  return {...defaults,locale:raw.locale==='en'?'en':raw.locale==='zh-CN'?'zh-CN':defaults.locale,theme:['light','dark','system'].includes(raw.theme??'')?raw.theme!:defaults.theme,reduceMotion:raw.reduceMotion===true};
}
class SettingsStore extends EventTarget {
  value=validate(readStored('phy-lab:settings',defaults));
  set(patch:Partial<Settings>){this.value=validate({...this.value,...patch});writeStored('phy-lab:settings',this.value);this.dispatchEvent(new Event('change'));}
}
export const settings=new SettingsStore();
window.addEventListener('storage',event=>{if(event.key==='phy-lab:settings'){settings.value=validate(readStored('phy-lab:settings',defaults));settings.dispatchEvent(new Event('change'));}});

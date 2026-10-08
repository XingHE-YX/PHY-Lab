import {LitElement,html,css} from 'lit';
import type {Catalog,Locale,ExperimentInstance,ExperimentModule} from '../infra/platform/contract';
import {loadManifest} from '../infra/platform/registry';
import {experimentStorage} from '../services/storage';
import {messages} from '../infra/locales/messages';
import {baseStyles} from '../ui/styles/shared';
import {icon} from '../ui/components/icons';
import {offline} from '../services/offline';
export class ExperimentPage extends LitElement {
  static properties={catalog:{attribute:false},experimentId:{type:String},locale:{type:String},theme:{type:String},status:{state:true},error:{state:true},version:{state:true}};
  declare catalog:Catalog|null;declare experimentId:string;declare locale:Locale;declare theme:'light'|'dark';declare status:string;declare error:string;declare version:string;
  instance?:ExperimentInstance;private controller?:AbortController;
  static styles=[baseStyles,css`:host{display:block;max-width:1240px;margin:auto;padding:25px 32px 50px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:23px;font-size:12px;color:var(--muted)}a{display:flex;gap:7px;align-items:center}.status{text-align:center;padding:90px 20px}.status p{font-size:13px;color:var(--muted)}@media(max-width:560px){:host{padding:20px 16px 36px}}`];
  constructor(){super();this.catalog=null;this.experimentId='';this.locale='zh-CN';this.theme='light';this.status='loading';this.error='';this.version='';}
  updated(changed:Map<PropertyKey,unknown>){
    if(changed.has('experimentId')||changed.has('catalog'))void this.load();
    if(changed.has('locale')||changed.has('theme'))this.instance?.update({locale:this.locale,theme:this.theme});
  }
  async load(){
    this.cleanup();this.status='loading';const controller=this.controller=new AbortController();
    try{
      const entry=this.catalog?.experiments.find(e=>e.id===this.experimentId);
      if(!entry)throw new Error(this.locale==='zh-CN'?'实验不存在':'Experiment not found');
      const manifest=await loadManifest(entry.manifest,entry.id);
      await offline.ensureExperiment(entry.manifest);
      const module=await import(/* @vite-ignore */ manifest.entry) as ExperimentModule;
      if(controller.signal.aborted)return;
      const instance=await module.mount({locale:this.locale,theme:this.theme,buildId:manifest.buildId,signal:controller.signal,storage:experimentStorage(entry.id,manifest.stateVersion)});
      if(controller.signal.aborted){instance.dispose();return;}
      this.instance=instance;this.version=manifest.version;this.status='ready';
    }catch(error){if(!controller.signal.aborted){this.error=error instanceof Error?error.message:String(error);this.status='error';}}
  }
  save(){if(this.instance){const entry=this.catalog?.experiments.find(e=>e.id===this.experimentId);if(entry)experimentStorage(entry.id,1).write(this.instance.snapshot());}}
  cleanup(){this.controller?.abort();this.instance?.pause();this.save();this.instance?.dispose();this.instance=undefined;}
  disconnectedCallback(){super.disconnectedCallback();this.cleanup();}
  render(){const t=messages(this.locale);return html`<div class="top"><a href="#/">${icon('back')}${t.back}</a><span class="mono">${this.version?'EXP / '+this.version:''}</span></div>${this.status==='ready'?this.instance?.element:html`<div class="status"><p>${this.status==='error'?t.error:t.loading}</p>${this.status==='error'?html`<p>${this.error}</p><phy-button @click=${()=>this.load()}>${t.retry}</phy-button>`:''}</div>`}`;}
}
customElements.define('phy-experiment-page',ExperimentPage);

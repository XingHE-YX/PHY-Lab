import {base} from '../infra/platform/registry';
export interface OfflineStatus {state:'dev'|'loading'|'ready'|'error'|'unavailable';complete:number;total:number;version:string;buildId:string;error:string}
export function askWorker<T>(worker:ServiceWorker,type:string,data:object={}):Promise<T>{
  return new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(new Error('Offline operation timed out'));},90000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();if(event.data?.error&&Object.keys(event.data).length===1)reject(new Error(event.data.error));else resolve(event.data);};worker.postMessage({type,...data},[channel.port2]);});
}
class OfflineService extends EventTarget {
  status:OfflineStatus={state:import.meta.env.PROD?'loading':'dev',complete:0,total:0,version:__APP_VERSION__,buildId:'',error:''};
  registration?:ServiceWorkerRegistration;
  waiting=false;
  private emit(){this.dispatchEvent(new Event('change'));}
  async start(){
    if(!import.meta.env.PROD)return;
    if(!('serviceWorker' in navigator)){this.status.state='unavailable';this.emit();return;}
    try{
      navigator.serviceWorker.addEventListener('message',event=>{if(['CACHE_READY','CACHE_PROGRESS','CACHE_ERROR'].includes(event.data?.type))void this.refresh();});
      this.registration=await navigator.serviceWorker.register(base+'sw.js',{scope:base,updateViaCache:'none'});
      this.registration.addEventListener('updatefound',()=>{const installing=this.registration?.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller){this.waiting=!!this.registration?.waiting;this.emit();}});});
      this.waiting=!!this.registration.waiting;
      navigator.serviceWorker.addEventListener('controllerchange',()=>void this.refresh());
      await navigator.serviceWorker.ready;await this.refresh();
    }catch(error){this.fail(error);}
  }
  fail(error:unknown){this.status={...this.status,state:'error',error:error instanceof Error?error.message:String(error)};this.emit();}
  async refresh(){const active=this.registration?.active;if(!active)return;try{this.status=await askWorker<OfflineStatus>(active,'STATUS');this.waiting=!!this.registration?.waiting;this.emit();}catch(error){this.fail(error);}}
  async sync(){const active=this.registration?.active;if(!active)return;this.status={...this.status,state:'loading',error:''};this.emit();try{this.status=await askWorker<OfflineStatus>(active,'SYNC');this.emit();}catch(error){this.fail(error);}}
  async ensureExperiment(url:string){if(import.meta.env.PROD&&this.registration?.active)await askWorker(this.registration.active,'CACHE_EXPERIMENT',{url});}
}
export const offline=new OfflineService();

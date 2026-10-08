import {offline,askWorker} from './offline';
class UpdateService extends EventTarget {
  checking=false;checked=false;error='';removed:number|null=null;
  private emit(){this.dispatchEvent(new Event('change'));}
  async check(){
    if(this.checking||!offline.registration)return;
    this.checking=true;this.error='';this.checked=false;this.emit();
    try{await offline.registration.update();await offline.sync();this.checked=true;}
    catch(error){this.error=error instanceof Error?error.message:String(error);}
    finally{this.checking=false;await offline.refresh();this.emit();}
  }
  async apply(){
    const registration=offline.registration;if(!registration?.waiting||!registration.active)return;
    this.checking=true;this.error='';this.emit();
    try{await askWorker(registration.active,'PREPARE_UPDATE');await askWorker(registration.waiting,'ACTIVATE');}
    catch(error){this.error=error instanceof Error?error.message:String(error);this.checking=false;this.emit();}
  }
  async clean(){
    const active=offline.registration?.active;if(!active||this.checking)return;
    this.checking=true;this.error='';this.emit();
    try{this.removed=(await askWorker<{removed:number}>(active,'CLEAN_HISTORY')).removed;}
    catch(error){this.error=error instanceof Error?error.message:String(error);}
    finally{this.checking=false;this.emit();}
  }
}
export const updates=new UpdateService();
let lastCheck=Date.now();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine&&Date.now()-lastCheck>60000){lastCheck=Date.now();void updates.check();}});

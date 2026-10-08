import {settings} from './settings';
const media=matchMedia('(prefers-color-scheme: dark)');
export function currentTheme():'light'|'dark'{return settings.value.theme==='system'?(media.matches?'dark':'light'):settings.value.theme;}
export function applyTheme(){
  const theme=currentTheme();document.documentElement.dataset.theme=theme;
  document.documentElement.lang=settings.value.locale;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#101113':'#fafafa');
}
settings.addEventListener('change',applyTheme);media.addEventListener('change',()=>{applyTheme();settings.dispatchEvent(new Event('theme-change'));});applyTheme();
let switching=false;
export async function toggleTheme(event:MouseEvent){
  if(switching)return;
  const next=currentTheme()==='dark'?'light':'dark';
  const change=()=>{settings.set({theme:next});};
  if(!document.startViewTransition||settings.value.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches){change();return;}
  switching=true;
  const rect=(event.currentTarget as HTMLElement).getBoundingClientRect();
  const x=event.clientX||rect.left+rect.width/2,y=event.clientY||rect.top+rect.height/2;
  const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  try {
    const transition=document.startViewTransition(async()=>{change();await Promise.resolve();});
    await transition.ready;
    const animation=document.documentElement.animate({clipPath:['circle(0px at '+x+'px '+y+'px)','circle('+radius+'px at '+x+'px '+y+'px)']},{duration:380,easing:'cubic-bezier(.2,.7,.3,1)',pseudoElement:'::view-transition-new(root)'});
    await animation.finished;
  }catch{applyTheme();}finally{switching=false;}
}

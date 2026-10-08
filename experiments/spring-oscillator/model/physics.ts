export const TAU = 2 * Math.PI;
export interface Parameters { A:number; m:number; k:number; phi:number }
export interface PhysicsState { x:number; v:number; a:number; omega:number; period:number; kinetic:number; potential:number; total:number }
export const defaults:Parameters={A:0.3,m:1,k:10,phi:0};
export function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value));}
export function parameters(value:unknown):Parameters {
  const source=(value&&typeof value==='object'?value:{}) as Partial<Parameters>;
  const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
  return {A:clamp(finite(source.A,defaults.A),0,0.8),m:clamp(finite(source.m,defaults.m),0.2,5),k:clamp(finite(source.k,defaults.k),1,50),phi:((finite(source.phi,0)%TAU)+TAU)%TAU};
}
export function stateAt(p:Parameters,t:number):PhysicsState {
  const omega=Math.sqrt(p.k/p.m),phase=omega*t+p.phi;
  const x=p.A*Math.cos(phase),v=-p.A*omega*Math.sin(phase),a=-omega*omega*x;
  return {x,v,a,omega,period:TAU/omega,kinetic:0.5*p.m*v*v,potential:0.5*p.k*x*x,total:0.5*p.k*p.A*p.A};
}
export function keyTime(p:Parameters,target:'right'|'equilibrium'|'left'|'equal',after=0){
  const omega=Math.sqrt(p.k/p.m),phase={right:0,equilibrium:Math.PI/2,left:Math.PI,equal:Math.PI/4}[target];
  const cycle=Math.ceil((omega*after+p.phi-phase-1e-10)/TAU);
  return Math.max(0,(phase+cycle*TAU-p.phi)/omega);
}
export function sample(p:Parameters,start:number,end:number,count=241){
  return Array.from({length:count},(_,i)=>{const t=start+(end-start)*i/(count-1);return {t,...stateAt(p,t)};});
}
export function format(value:number,digits=2){return (Math.abs(value)<Math.pow(10,-digits)/2?0:value).toFixed(digits);}

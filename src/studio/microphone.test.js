import {test,expect,vi} from 'vitest';
import {createMicrophone} from './microphone.js';
import {steps} from '../calibration';
import {translations} from '../studio-i18n.js';

function fixture(){
 const nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',children:[],hidden:false,disabled:false,classList:{toggle(){}}});return nodes.get(id);};
 let verified=false,sensitivity=50,profile=null;
 const state=()=>({page:'lab',guidePurpose:null,guideReturnSetup:false,verified,volume:55,sensitivity,sound:'woodblock',accentVolume:100,beatVolume:100,subVolume:100});
 const engine={timingCalibration:null,measureLatency:vi.fn(async()=>({offsetMs:77,jitterMs:1,trials:7,correlation:.9})),mic:true,meterRms:0,diagnosticLiveCount:0,setSensitivity:vi.fn(),setPadProfile:vi.fn(p=>{profile=p;}),capture:vi.fn(async(step,seconds,expected)=>{
  const frames=Array.from({length:1500},(_,i)=>[i*.002,0,0,1e-9,1,Array(6).fill(1e-9)]);
  const n=step==='leak'?8:expected;
  for(let i=0;i<n;i++){const bands=step==='leak'?[1e-9,1e-9,.003,1e-9,1e-9,1e-9]:[.005,.001,.0001,1e-9,1e-9,1e-9];frames[100+i*50][5]=bands;}
  if(profile)for(const f of frames){f[1]=f[5].reduce((s,v,i)=>s+v*profile.weights[i],0);f[2]=f[1];f[3]=profile.noise;}
  return {step,expected,liveCount:profile?expected:0,frames};
 })};
 const t=k=>translations.ru[k]??k;
 const mic=createMicrophone({$,t,tr:t,engine,getState:state,setSensitivity:v=>{sensitivity=v;},setVolume(){},setVerified:v=>{verified=v;},setRunVerified(){},config:()=>({}),persist(){},render(){},stop(){},openGuide(){}});
 mic.render();return {$,engine,mic,verified:()=>verified};
}
test('pad profile requires a fresh click-only capture and two held-out tests before verification',async()=>{
 vi.useFakeTimers();vi.stubGlobal('window',{addEventListener(){}});
 try{const {$,engine,mic,verified}=fixture();
 expect($('calCurrent').innerHTML).toContain('id="calLive">0');expect($('exportCal').disabled).toBe(true);
 for(let i=0;i<4;i++)await $('calStart').onclick();
 expect(engine.setPadProfile).toHaveBeenCalledOnce();expect(verified()).toBe(false);expect($('calCounter').textContent).toBe('3 / 6');expect($('calCurrent').innerHTML).toContain('id="calLive">0');
 await $('calStart').onclick();expect(engine.measureLatency).toHaveBeenCalledOnce();await $('calStart').onclick();expect(verified()).toBe(false);
 await $('calStart').onclick();expect(verified()).toBe(true);expect(engine.capture.mock.calls.map(x=>x[0])).toEqual(['noise','leak','normal','quiet','leak','fast','mixed']);expect($('calCurrent').innerHTML).toContain('6 / 6');
 mic.reset();expect(verified()).toBe(false);expect(engine.setPadProfile).toHaveBeenLastCalledWith(null);
 }finally{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();}
});
test('insufficient spectral capture cannot certify recognition',async()=>{
 vi.useFakeTimers();vi.stubGlobal('window',{addEventListener(){}});
 try{const {$,engine,verified}=fixture();engine.capture.mockImplementationOnce(async(step,seconds,expected)=>({step,expected,liveCount:0,frames:[]}));
 for(let i=0;i<4;i++)await $('calStart').onclick();expect(verified()).toBe(false);expect(engine.setPadProfile).not.toHaveBeenCalled();expect($('calMessage').textContent).toContain('Не удалось разделить');expect($('calStart').textContent).toBe('Начать заново');
 }finally{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();}
});

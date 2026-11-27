import {test,expect,vi} from 'vitest';
import {createMicrophone} from './microphone.js';
import {steps} from '../calibration';
import {translations} from '../studio-i18n.js';

function fixture(){
 const nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',children:[],hidden:false,disabled:false,classList:{toggle(){}}});return nodes.get(id);};
 let verified=false;const state=()=>({page:'lab',guidePurpose:null,guideReturnSetup:false,verified,volume:55,sensitivity:50,sound:'soft',accentVolume:100,beatVolume:100,subVolume:100});
 const engine={mic:true,meterRms:0,diagnosticLiveCount:0,capture:vi.fn(async(step,seconds,expected)=>({step,expected,liveCount:expected,frames:Array.from({length:100},(_,i)=>[i*.002,0,0,0,0])}))};
 const t=k=>translations.ru[k]??k;
 const mic=createMicrophone({$,t,tr:t,engine,getState:state,setSensitivity(){},setVolume(){},setVerified:v=>{verified=v;},setRunVerified(){},config:()=>({}),persist(){},render(){},stop(){},openGuide(){}});
 mic.render();
 return {$,engine,mic,verified:()=>verified};
}
test('six calibration screens show expected counts and short captures cannot appear passed',async()=>{
 vi.useFakeTimers();vi.stubGlobal('window',{addEventListener(){}});
 try{
  const {$,engine,verified}=fixture();
  expect($('calCurrent').innerHTML).toContain('Ожидаемое число событий');expect($('calCurrent').innerHTML).toContain('id="calLive">0');expect($('exportCal').disabled).toBe(true);
  engine.capture.mockImplementationOnce(async(step,seconds,expected)=>({step,expected,liveCount:0,frames:[]}));
  for(let i=0;i<steps.length;i++){
   expect($('calCounter').textContent).toBe(i+' / 6');
   expect($('calCurrent').innerHTML).toContain('id="calLive">'+steps[i].expected);
   await $('calStart').onclick();
  }
  expect(verified()).toBe(false);expect($('calCounter').textContent).toBe('6 / 6');expect($('calCurrent').innerHTML).toContain('5 / 6');expect($('calSteps').innerHTML).toContain('0/0 ×');expect($('exportCal').disabled).toBe(false);expect($('calStart').textContent).toBe('К неудачному этапу');expect($('calStart').disabled).toBe(false);await $('calStart').onclick();expect($('calCounter').textContent).toBe('5 / 6');expect($('calCurrent').innerHTML).toContain('id="calLive">0');
 }finally{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();}
});

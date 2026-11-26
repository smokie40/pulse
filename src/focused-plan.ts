import {type Drill,type Session} from './coach';
import type {Mode} from './training';
import {tempoProfile} from './progression';
import {skillProfile} from './skills';
export const skillIds=['timing','pulse','speed','flexibility','dynamics','endurance'] as const;
export type Skill=typeof skillIds[number];
type Item={mode:Mode;name:string;weight:number;factor:number;sub?:number;reason:string;clickSub?:boolean;rudiment?:string;audibleBars?:number;silentBars?:number;morphSequence?:number[];skillTest?:boolean;ladderRange?:number;minMinutes?:number};
const warm:Item={mode:'steady',name:'warmup',weight:2,factor:.75,reason:'warmupCue'};
const control:Item={mode:'steady',name:'control',weight:2,factor:.9,reason:'controlCue',clickSub:false};
export function focusedPlan(history:Session[],skill:Skill,length:number,rudiment:string,sub:number,fallback:number,adaptiveReady:boolean):Drill[]{
 const safe=history.filter(s=>s.recognitionVerified&&!s.manualTempoChanged);
 const profile=tempoProfile(safe,rudiment,sub);
 const base=profile.working??fallback;
 const checkFactor=profile.working===null?.9:1;
 const level=skillProfile(history,skill,rudiment,sub).level;
 const testControl:Item={...control,factor:checkFactor,skillTest:true,minMinutes:1};
 const tempo=(factor:number)=>Math.min(300,Math.max(30,Math.round(base*factor)));
 let items:Item[];
 switch(skill){
  case 'pulse':{
   const gap=[1,2,4][level-1],task:Item={mode:'ghost',name:'pulseWork',weight:5,factor:.85,reason:'pulseLevelCue',audibleBars:2,silentBars:gap};
   items=[warm,task,{...task,name:'control',weight:2,skillTest:true,minMinutes:2}];break;
  }
  case 'speed':items=[warm,{mode:'burst',name:'burstWork',weight:2,factor:.9,sub:4,reason:'burstCue'},{mode:adaptiveReady?'adaptive':'ladder',name:adaptiveReady?'adaptiveWork':'ladderWork',weight:3,factor:level===1?.85:.95,reason:adaptiveReady?'adaptiveCue':'ladderCue',ladderRange:[20,25,30][level-1]}, {...testControl,minMinutes:level===3?3:1}];break;
  case 'flexibility':{
   const seq=[[2,4],[2,3,4],[2,3,4,6]][level-1];
   const task:Item={mode:'morph',name:'flexWork',weight:5,factor:.7,reason:'flexLevelCue',morphSequence:seq,clickSub:true};
   items=[warm,task,{...task,name:'control',weight:2,clickSub:false,skillTest:true,minMinutes:2}];break;
  }
  case 'dynamics':{
   const task:Item={mode:'accent',name:'accentWork',weight:5,factor:.65,sub:level===1?2:4,rudiment:level===3?'RRLL':rudiment,reason:'accentCue'};
   items=[warm,task,{...task,name:'control',weight:2,skillTest:true,minMinutes:2}];break;
  }
  case 'endurance':{
   const task:Item={mode:'steady',name:'enduranceWork',weight:5,factor:.8,reason:'enduranceCue'};
   items=[warm,{...task,weight:level===3?2:4},{...task,name:'control',weight:level===3?6:3,minMinutes:[2,3,5][level-1],skillTest:true}];break;
  }
  default:{
   const sticking=level===2?'LR':level===3?'RRLL':rudiment;
   const factor=level===1?checkFactor:.8;
   items=[warm,{mode:'steady',name:'timingWork',weight:5,factor,reason:level===1?'timingCue':'timingTransferCue',clickSub:level===1,rudiment:sticking},{...testControl,factor,rudiment:sticking}];
  }
 }
 const minimum=items.map(x=>x.minMinutes??1);
 const floor=minimum.reduce((a,b)=>a+b,0);
 const minutes=Math.max(floor,Math.floor(length)),total=items.reduce((a,x)=>a+x.weight,0);
 const allocation=items.map((x,i)=>minimum[i]+Math.floor((minutes-floor)*x.weight/total));
 let remaining=minutes-allocation.reduce((a,b)=>a+b,0);
 const order=items.map((x,i)=>({i,r:((minutes-floor)*x.weight/total)%1})).sort((a,b)=>b.r-a.r);
 for(let j=0;j<remaining;j++)allocation[order[j].i]++;
 return items.map((x,i)=>({mode:x.mode,name:x.name,minutes:allocation[i],bpm:tempo(x.factor),sub:x.sub??sub,rudiment:x.rudiment??rudiment,reason:x.reason,clickSub:x.clickSub,audibleBars:x.audibleBars,silentBars:x.silentBars,morphSequence:x.morphSequence,...(x.skillTest?{skillTest:true,skillLevel:level,skillBaseRudiment:rudiment,skillBaseSub:sub,skillTarget:skill==='speed'?tempo(checkFactor):undefined}:{}),...(skill==='speed'&&x.name==='control'&&profile.pendingConfirmation?{confirmation:true}:{}),...(x.mode==='ladder'||x.mode==='adaptive'?{ladderStep:5,ladderMax:Math.min(300,tempo(x.factor)+(x.ladderRange??20))}:{})}));
}

// A short bounded adaptive check, not a maximum-speed or mastery test.
export function tempoProbe(rudiment:string,sub:number,fallback:number):Drill{return {mode:'adaptive',name:'probeTitle',minutes:2,bpm:Math.max(30,Math.min(100,Math.round(fallback*.8))),rudiment,sub,reason:'probeDescription',clickSub:false,ladderStep:5,ladderMax:Math.min(300,Math.max(30,Math.min(100,Math.round(fallback*.8)))+20)};}

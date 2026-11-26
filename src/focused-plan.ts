import {workingTempo,type Drill,type Session} from './coach';
import type {Mode} from './training';
export const skillIds=['timing','pulse','speed','flexibility','dynamics','endurance'] as const;
export type Skill=typeof skillIds[number];
type Item={mode:Mode;name:string;weight:number;factor:number;sub?:number;reason:string;clickSub?:boolean};
const warm:Item={mode:'steady',name:'warmup',weight:2,factor:.75,reason:'warmupCue'};
const control:Item={mode:'steady',name:'control',weight:2,factor:.9,reason:'controlCue',clickSub:false};
export function focusedPlan(history:Session[],skill:Skill,length:number,rudiment:string,sub:number,fallback:number,adaptiveReady:boolean):Drill[]{
 const safe=history.filter(s=>s.recognitionVerified&&!s.manualTempoChanged);
 const base=workingTempo(safe,rudiment,sub)??fallback;
 const tempo=(factor:number)=>Math.min(300,Math.max(30,Math.round(base*factor)));
 let items:Item[];
 switch(skill){
  case 'pulse':items=[warm,{mode:'ghost',name:'pulseWork',weight:5,factor:.85,reason:'pulseCue'},control];break;
  case 'speed':items=[warm,{mode:'burst',name:'burstWork',weight:2,factor:.9,sub:4,reason:'burstCue'},{mode:adaptiveReady?'adaptive':'ladder',name:adaptiveReady?'adaptiveWork':'ladderWork',weight:3,factor:.85,reason:adaptiveReady?'adaptiveCue':'ladderCue'},control];break;
  case 'flexibility':items=[warm,{mode:'morph',name:'flexWork',weight:5,factor:.75,reason:'flexCue'},control];break;
  case 'dynamics':items=[warm,{mode:'accent',name:'accentWork',weight:5,factor:.75,sub:4,reason:'accentCue'},control];break;
  case 'endurance':items=[warm,{mode:'steady',name:'enduranceWork',weight:5,factor:.8,reason:'enduranceCue'},control];break;
  default:items=[warm,{mode:'steady',name:'timingWork',weight:5,factor:.9,reason:'timingCue',clickSub:true},control];
 }
 const minutes=Math.max(items.length,Math.floor(length)),total=items.reduce((a,x)=>a+x.weight,0);
 const allocation=items.map(x=>1+Math.floor((minutes-items.length)*x.weight/total));
 let remaining=minutes-allocation.reduce((a,b)=>a+b,0);
 const order=items.map((x,i)=>({i,r:((minutes-items.length)*x.weight/total)%1})).sort((a,b)=>b.r-a.r);
 for(let j=0;j<remaining;j++)allocation[order[j].i]++;
 return items.map((x,i)=>({mode:x.mode,name:x.name,minutes:allocation[i],bpm:tempo(x.factor),sub:x.sub??sub,rudiment,reason:x.reason,clickSub:x.clickSub}));
}

// A short bounded adaptive check, not a maximum-speed or mastery test.
export function tempoProbe(rudiment:string,sub:number,fallback:number):Drill{return {mode:'adaptive',name:'probeTitle',minutes:2,bpm:Math.max(30,Math.min(100,Math.round(fallback*.8))),rudiment,sub,reason:'probeDescription',clickSub:false};}

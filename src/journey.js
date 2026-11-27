// Guided entry and checkpoint state. A checkpoint points to the next unfinished exercise.
import {rudiments} from './training';
const modes=['steady','ghost','burst','morph','ladder','adaptive','accent'];
const skills=['timing','pulse','speed','flexibility','dynamics','endurance'];
const patterns=rudiments.map(r=>r.id);
const subs=[1,2,3,4,5,6,8];
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const optional=(v,check)=>v===undefined||check(v);
const identifier=v=>typeof v==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(v);
const cap=x=>Math.max(x.bpm,x.ladderMax??Math.min(300,x.bpm+20));

export function restorePlan(value){
 if(!value||value.probe||!Array.isArray(value.items)||!integer(value.index,0,value.items.length-1)||!skills.includes(value.skill))return null;
 if(!value.items.every(x=>x&&modes.includes(x.mode)&&identifier(x.name)&&identifier(x.reason)&&patterns.includes(x.rudiment)&&subs.includes(x.sub)&&integer(x.minutes,1,30)&&integer(x.bpm,30,300)
  &&optional(x.clickSub,v=>typeof v==='boolean')
  &&optional(x.morphSequence,v=>Array.isArray(v)&&v.length>=2&&v.length<=4&&v.every(n=>[2,3,4,6].includes(n)))
  &&optional(x.silentBars,v=>[1,2,4].includes(v))&&optional(x.audibleBars,v=>v===2)
  &&optional(x.ladderStep,v=>integer(v,1,20))&&optional(x.ladderMax,v=>integer(v,x.bpm,300))
  &&optional(x.skillBaseRudiment,v=>patterns.includes(v))&&optional(x.skillBaseSub,v=>subs.includes(v))
  &&optional(x.skillLevel,v=>integer(v,1,3))&&optional(x.skillTarget,v=>integer(v,30,300))
  &&['confirmation','resolvedControl','skillTest'].every(k=>optional(x[k],v=>typeof v==='boolean'))))return null;
 return {...value,items:value.items.map(x=>({...x,...(x.morphSequence?{morphSequence:[...x.morphSequence]}:{})}))};
}
export function checkpointAfter(plan,proposed){
 if(!plan||plan.probe)return null;
 const next={...plan,items:plan.items.map(x=>({...x})),index:plan.index+1};
 if(proposed&&next.index<next.items.length){next.items[next.index]={...proposed.drill};next.items[next.index].resolvedControl=true;}
 return next.index<next.items.length?next:null;
}
export function pendingControl(items,index,current,skill){
 const x=items[index],prev=items[index-1];
 return skill==='speed'&&x?.name==='control'&&!x.confirmation&&!x.resolvedControl&&['adaptive','ladder'].includes(prev?.mode)&&current<index;
}

// Only an exercise matching its planned conditions can advance the checkpoint.
export function planMatches(drill,c){return !!drill&&!!c&&drill.mode===c.mode&&drill.bpm===c.bpm&&drill.minutes===c.minutes&&drill.sub===c.sub&&drill.rudiment===c.rudiment&&c.beats===4&&c.countIn===1&&(drill.clickSub??false)===c.clickSub&&(drill.mode!=='ghost'||((drill.audibleBars??2)===(c.audibleBars??2)&&(drill.silentBars??2)===(c.silentBars??2)))&&(drill.mode!=='morph'||JSON.stringify(drill.morphSequence??[2,3,4,6])===JSON.stringify(c.morphSequence??[2,3,4,6]))&&(!['ladder','adaptive'].includes(drill.mode)||((drill.ladderStep??5)===c.ladderStep&&cap(drill)===c.ladderMax));}

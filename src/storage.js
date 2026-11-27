// Backups contain local exercise history, not microphone recordings.
const modes=['steady','ghost','burst','morph','ladder','adaptive','accent'];
const skills=['timing','pulse','speed','flexibility','dynamics','endurance'];
const patterns=['RL','LR','RRLL','RLRRLRLL','RLRLRRLRLRLL','RLLRRL'];
const subs=[1,2,3,4,5,6,8];
const finite=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString().slice(0,10)===x;
const date=x=>typeof x==='string'&&x.length<=40&&/^\d{4}-\d{2}-\d{2}(T|$)/.test(x)&&day(x.slice(0,10))&&Number.isFinite(Date.parse(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function stats(x){
 if(!object(x)||!['expected','hits','missed','extra'].every(k=>Number.isInteger(x[k])&&finite(x[k],0,10000000))||x.hits+x.missed!==x.expected||!finite(x.accuracy,0,100)||!(x.deviation===null||finite(x.deviation,0,10000))||!(x.bias===null||finite(x.bias,-10000,10000)))throw Error('invalidStats');
 return Object.fromEntries(['expected','hits','missed','extra','accuracy','deviation','bias'].map(k=>[k,x[k]]));
}
export function cleanRecord(x){
 if(!object(x)||!date(x.date)||!modes.includes(x.mode)||!finite(x.bpm,30,300)||!finite(x.seconds,0,86400))throw Error('invalidRecord');
 const r={date:x.date,mode:x.mode,bpm:x.bpm,seconds:x.seconds,stats:x.stats==null?null:stats(x.stats)};
 for(const k of ['recognitionVerified','interrupted','manualTempoChanged','tempoProbe','diagnosticResult','completed','controlTest','clickSub','skillSelfCheck'])if(typeof x[k]==='boolean')r[k]=x[k];
 if(day(x.practiceDay))r.practiceDay=x.practiceDay;
 for(const k of ['rudiment','skillBaseRudiment'])if(patterns.includes(x[k]))r[k]=x[k];
 for(const k of ['sub','skillBaseSub'])if(subs.includes(x[k]))r[k]=x[k];
 if(Number.isInteger(x.beats)&&finite(x.beats,1,16))r.beats=x.beats;
 for(const k of ['last','skillTarget'])if(finite(x[k],30,300))r[k]=x[k];
 for(const k of ['planSkill','skillId'])if(skills.includes(x[k]))r[k]=x[k];
 if([1,2,3].includes(x.skillLevel))r.skillLevel=x.skillLevel;
 if(['pass','repeat','unknown','selfCheck'].includes(x.skillOutcome))r.skillOutcome=x.skillOutcome;
 if(['search','refine','verify'].includes(x.diagnosticStage))r.diagnosticStage=x.diagnosticStage;
 if(Array.isArray(x.tempoWindows)){
  if(x.tempoWindows.length>20000)throw Error('invalidWindows');
  r.tempoWindows=x.tempoWindows.map(w=>{if(!object(w)||!finite(w.bpm,30,300))throw Error('invalidWindow');return {bpm:w.bpm,stats:stats(w.stats)}});
 }
 if(Array.isArray(x.stages)){
  if(x.stages.length>20000)throw Error('invalidStages');
  r.stages=x.stages.map(w=>{if(!object(w)||!finite(w.bpm,30,300)||!finite(w.next,30,300)||!finite(w.accuracy,0,100)||!finite(w.expected,0,10000000)||!finite(w.extra,0,10000000)||!['up','hold','down','check'].includes(w.decision))throw Error('invalidStage');return Object.fromEntries(['bpm','next','accuracy','expected','extra','decision'].map(k=>[k,w[k]]))});
 }
 if(object(x.skillEvidence)){
  const e={};for(const k of ['overall','silent','transitions','early','late'])if(x.skillEvidence[k]!=null)e[k]=stats(x.skillEvidence[k]);
  if(Array.isArray(x.skillEvidence.bySub)){if(x.skillEvidence.bySub.length>8)throw Error('invalidEvidence');e.bySub=x.skillEvidence.bySub.map(stats);}
  if(e.overall)r.skillEvidence=e;
 }
 // A legacy record can be retained as practice without being treated as verified control evidence.
 if(r.skillOutcome&&(!r.skillId||!r.skillLevel||!r.skillBaseRudiment||!r.skillBaseSub||!r.skillEvidence||!r.completed||!r.recognitionVerified||r.manualTempoChanged))delete r.skillOutcome;
 return r;
}
export function loadHistory(raw){
 if(!Array.isArray(raw))return {history:[],invalid:raw!=null};
 let invalid=false;const history=[];
 for(const x of raw){try{history.push(cleanRecord(x))}catch{invalid=true}}
 return {history:history.sort((a,b)=>b.date.localeCompare(a.date)),invalid};
}
export function parseBackup(raw){
 const x=JSON.parse(raw);
 if(!object(x)||x.schema!==1||!Array.isArray(x.history)||x.history.length>100000)throw Error('invalidBackup');
 return x.history.map(cleanRecord);
}
const key=x=>JSON.stringify([x.date,x.mode,x.bpm,x.seconds,x.rudiment??null,x.sub??null]);
export function mergeHistory(existing,incoming){
 const map=new Map(existing.map(x=>[key(x),x]));
 let added=0,updated=0;
 for(const x of incoming){
  const k=key(x),old=map.get(k);
  if(!old){map.set(k,x);added++;}
  else if(old.skillOutcome==='selfCheck'&&typeof x.skillSelfCheck==='boolean'&&['pass','repeat'].includes(x.skillOutcome)){map.set(k,x);updated++;}
 }
 return {history:[...map.values()].sort((a,b)=>b.date.localeCompare(a.date)),added,updated};
}
export function writeStorage(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true}catch{return false}}

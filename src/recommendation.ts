import type {Session,Drill} from './coach';
import {focusedPlan,skillIds,type Skill} from './focused-plan';
import {skillProfile} from './skills';
export type Recommendation={skill:Skill;reason:'foundation'|'explore'|'repeat'|'confirm'|'review'|'rotate'|'light';light:boolean};
const day=(s:Session)=>s.practiceDay??s.date.slice(0,10);
const age=(today:string,date:string)=>Math.max(0,Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000));
const intense=(skill:Skill)=>skill==='speed'||skill==='endurance';
function controls(history:Session[],skill:Skill,rudiment:string,sub:number){
 return history.filter(s=>s.completed&&s.skillId===skill&&s.skillBaseRudiment===rudiment&&s.skillBaseSub===sub).sort((a,b)=>b.date.localeCompare(a.date));
}
export function recommend(history:Session[],rudiment:string,sub:number,today:string,preferred:Skill='timing'):Recommendation{
 // This is scheduling, not a measurement of physical fatigue or technique.
 const comparable=history.filter(s=>s.skillBaseRudiment===rudiment&&s.skillBaseSub===sub&&s.completed&&s.skillId);
 const load=history.filter(s=>day(s)===today&&(s.planSkill==='speed'||s.planSkill==='endurance'||s.skillId==='speed'||s.skillId==='endurance')).reduce((n,s)=>n+Math.max(0,s.seconds||0),0);
 const light=load>=900;
 if(!comparable.length&&!light)return {skill:preferred,reason:'foundation',light:false};
 const ranks=skillIds.filter(skill=>!light||!intense(skill)).map((skill,index)=>{
  const records=controls(history,skill,rudiment,sub),latest=records[0],profile=skillProfile(history,skill,rudiment,sub);
  const assessed=records.find(s=>s.recognitionVerified&&!s.manualTempoChanged&&(s.skillOutcome==='pass'||s.skillOutcome==='repeat'));
  const days=latest?age(today,day(latest)):99;
  const sameDay=latest&&day(latest)===today;
  let reason:Recommendation['reason']='rotate',score=35+Math.min(days,21);
  if(!latest){reason='explore';score=70;}
  else if(assessed&&assessed.skillOutcome==='repeat'&&day(assessed)!==today&&days>=1&&age(today,day(assessed))<=7){reason='repeat';score=94;}
  else if(profile.days===1&&!profile.mastered&&assessed?.skillOutcome==='pass'&&days>=1){reason='confirm';score=100;}
  else if(days>=(profile.mastered?7:3)){reason='review';score=75+Math.min(20,days);}
  // Avoid automatically repeating today's control, including unmeasured practice.
  if(sameDay)score-=150;
  // A small fairness bonus prevents a single weak skill from monopolizing practice.
  if(latest&&days>=7)score+=Math.min(15,days-6);
  return {skill,reason,score:score-index*.01};
 }).sort((a,b)=>b.score-a.score);
 return {skill:ranks[0].skill,reason:light?'light':ranks[0].reason,light};
}
export function personalizedPlan(history:Session[],skill:Skill,length:number,rudiment:string,sub:number,fallback:number,adaptiveReady:boolean):Drill[]{
 const items=focusedPlan(history,skill,length,rudiment,sub,fallback,adaptiveReady);
 const target=items.find(x=>x.skillTest);
 if(!target)return items;
 const latest=controls(history,skill,rudiment,sub).find(s=>s.recognitionVerified&&!s.manualTempoChanged&&s.skillLevel===target.skillLevel&&(s.skillOutcome==='pass'||s.skillOutcome==='repeat')&&s.mode===target.mode&&s.rudiment===target.rudiment&&s.sub===target.sub&&s.clickSub===(target.clickSub??false)&&s.beats===4);
 if(!latest)return items;
 const profile=skillProfile(history,skill,rudiment,sub);
 // Keep the comparison at the same BPM for a second successful day, or reduce load after a measured failure.
 const repeat=latest.skillOutcome==='repeat';
 if(!repeat&&(profile.days!==1||profile.mastered))return items;
 const bpm=repeat?Math.max(30,latest.bpm-5):latest.bpm;
 const ratio=bpm/target.bpm;
 return items.map(x=>{
  if(x.skillTest)return {...x,bpm,skillTarget:skill==='speed'?bpm:x.skillTarget,confirmation:skill==='speed'?true:x.confirmation,reason:x.reason};
  // Warm-up and preparatory work follow the adjusted control target; no escalation after a failed control.
  const next=Math.max(30,Math.min(300,Math.round(x.bpm*ratio)));
  const cap=x.ladderMax===undefined?undefined:repeat?Math.max(next,bpm):Math.max(next,Math.min(300,Math.round(x.ladderMax*ratio)));
  return {...x,bpm:next,...(cap===undefined?{}:{ladderMax:cap})};
 });
}

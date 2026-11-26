import type {Session} from './coach';
import {quality,tempoProfile} from './progression';
import {skillProfile} from './skills';
import {skillIds} from './focused-plan';
export const practiceDay=(s:Session)=>s.practiceDay??s.date.slice(0,10);
const dayNumber=(s:string)=>Date.parse(s+'T00:00:00Z')/86400000;
const validDay=(s:string)=>Number.isFinite(dayNumber(s));
export function dateRange(today:string,days:number){
 return Array.from({length:days},(_,i)=>new Date((dayNumber(today)-days+1+i)*86400000).toISOString().slice(0,10));
}
export function periodHistory(history:Session[],today:string,days:number){
 const from=dayNumber(today)-days+1,to=dayNumber(today);
 return history.filter(s=>validDay(practiceDay(s))&&dayNumber(practiceDay(s))>=from&&dayNumber(practiceDay(s))<=to);
}
export function practiceSummary(history:Session[],today:string,days:number){
 const range=dateRange(today,days),records=periodHistory(history,today,days);
 const totals=new Map<string,number>();for(const s of records){const k=practiceDay(s);totals.set(k,(totals.get(k)??0)+Math.max(0,Number(s.seconds)||0));}
 return {seconds:records.reduce((n,s)=>n+Math.max(0,Number(s.seconds)||0),0),exercises:records.length,days:range.filter(d=>(totals.get(d)??0)>0).length,activity:range.map(d=>({day:d,seconds:totals.get(d)??0}))};
}
// Fixed-tempo, same sticking, subdivision, meter and beat-only click; no adaptive
// peak speeds, unfinished sets, or unverified measurements in these comparisons.
export function comparableControls(history:Session[],rudiment:string,sub:number){
 return history.filter(s=>s.rudiment===rudiment&&s.sub===sub&&s.mode==='steady'&&s.beats===4&&s.clickSub===false&&s.completed&&s.recognitionVerified&&!s.manualTempoChanged&&s.seconds>=59.75&&(s.controlTest||s.diagnosticResult)&&quality(s.stats)!=='unknown'&&Number.isFinite(s.bpm)&&s.bpm>=30&&s.bpm<=300&&validDay(practiceDay(s))).sort((a,b)=>a.date.localeCompare(b.date));
}
export function tempoTimeline(history:Session[],rudiment:string,sub:number,today:string,days:number){
 const controls=comparableControls(history,rudiment,sub),range=dateRange(today,days),passed=new Map<number,Set<string>>();
 let current:number|null=null,confirmed:number|null=null,i=0;
 return range.map(day=>{
  let measured=false;
  while(i<controls.length&&practiceDay(controls[i])<=day){
   const s=controls[i++];const d=practiceDay(s);
   if(quality(s.stats)==='pass'){
    current=s.bpm;
    if(s.controlTest){const set=passed.get(s.bpm)??new Set<string>();set.add(d);passed.set(s.bpm,set);if(set.size>=2)confirmed=Math.max(confirmed??0,s.bpm);}
    if(d===day)measured=true;
   }
  }
  return {day,current,confirmed,measured};
 });
}
export function timingComparisons(history:Session[],rudiment:string,sub:number,today:string,days:number){
 const records=periodHistory(comparableControls(history,rudiment,sub),today,days);
 const groups=new Map<number,Map<string,Session>>();
 for(const s of records){const byDay=groups.get(s.bpm)??new Map<string,Session>();byDay.set(practiceDay(s),s);groups.set(s.bpm,byDay);}
 return [...groups].map(([bpm,byDay])=>{
  const points=[...byDay].sort(([a],[b])=>a.localeCompare(b)).map(([day,s])=>({day,accuracy:s.stats!.accuracy,rms:s.stats!.deviation!}));
  const first=points[0],last=points.at(-1)!;
  return {bpm,points,accuracyDelta:points.length>=2?last.accuracy-first.accuracy:null,rmsDelta:points.length>=2?Math.round((last.rms-first.rms)*10)/10:null};
 }).sort((a,b)=>b.points.length-a.points.length||b.points.at(-1)!.day.localeCompare(a.points.at(-1)!.day)||b.bpm-a.bpm);
}
export function progressOverview(history:Session[],rudiment:string,sub:number,today:string,days:number){
 const timeline=tempoTimeline(history,rudiment,sub,today,days);
 const first=timeline[0]?.confirmed,last=timeline.at(-1)?.confirmed;
 return {practice:practiceSummary(history,today,days),profile:tempoProfile(history,rudiment,sub),timeline,confirmedGain:first!=null&&last!=null?last-first:null,comparisons:timingComparisons(history,rudiment,sub,today,days),skills:skillIds.map(skill=>({skill,...skillProfile(history,skill,rudiment,sub),assessed:history.some(s=>s.skillId===skill&&s.skillBaseRudiment===rudiment&&s.skillBaseSub===sub&&s.completed&&s.recognitionVerified&&!s.manualTempoChanged&&(s.skillOutcome==='pass'||s.skillOutcome==='repeat'))}))};
}

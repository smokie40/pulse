import {summarize,type Note,type Stats,type Config} from './training';
import type {Session} from './coach';
import {quality} from './progression';
import type {Period} from './report';
export type SkillId='timing'|'pulse'|'speed'|'flexibility'|'dynamics'|'endurance';
export type SkillOutcome='pass'|'repeat'|'unknown'|'selfCheck';
export type SkillEvidence={overall:Stats;silent?:Stats;transitions?:Stats;bySub?:Stats[];early?:Stats;late?:Stats};
export const levelKeys:Record<SkillId,string[]>={
 timing:['timing1','timing2','timing3'],
 pulse:['pulse1','pulse2','pulse3'],
 speed:['speed1','speed2','speed3'],
 flexibility:['flex1','flex2','flex3'],
 dynamics:['dynamics1','dynamics2','dynamics3'],
 endurance:['endurance1','endurance2','endurance3']
};
export function skillProfile(history:Session[],skill:SkillId,rudiment:string,sub:number){
 const tests=history.filter(s=>s.skillId===skill&&s.skillBaseRudiment===rudiment&&s.skillBaseSub===sub&&s.skillLevel&&s.completed&&s.skillOutcome).sort((a,b)=>a.date.localeCompare(b.date));
 // A higher tested level is evidence that earlier levels were reached, even after history retention trims old records.
 let level=Math.max(1,...tests.map(s=>Math.min(3,s.skillLevel!))),days=new Set<string>(),mastered=false;
 for(const s of tests.filter(s=>s.skillLevel===level)){
  if(s.skillOutcome==='repeat')days.clear();
  if(s.skillOutcome==='pass')days.add(s.practiceDay??s.date.slice(0,10));
 }
 if(days.size>=2){if(level===3)mastered=true;else{level++;days.clear()}}
 return {level,days:Math.min(2,days.size),mastered,key:levelKeys[skill][level-1]};
}
export function skillEvidence(notes:Note[],extras:number[],end:number,config:Config,segments:Period[]):SkillEvidence{
 const ns=notes.filter(n=>n.time<end), aggregate=(selected:Note[])=>{let i=0,count=0;for(const t of extras){if(t>=end)continue;while(i<selected.length&&t>=selected[i].time+selected[i].interval*.53)i++;if(i<selected.length&&t>=selected[i].time-selected[i].interval*.47)count++;}return summarize(selected,count,Infinity);};
 const e:SkillEvidence={overall:summarize(ns,extras.filter(t=>t<end).length,Infinity)};
 if(config.mode==='ghost')e.silent=aggregate(ns.filter(n=>n.silent));
 if(config.mode==='morph'){
  const bars=new Map<number,Note>();for(const n of ns)if(n.step===0)bars.set(n.bar,n);
  const changes=new Set([...bars.values()].filter(n=>bars.has(n.bar-1)&&bars.get(n.bar-1)!.sub!==n.sub).map(n=>n.bar));
  e.transitions=aggregate(ns.filter(n=>changes.has(n.bar)&&n.step<n.sub));
  e.bySub=[...new Set(ns.map(n=>n.sub))].map(sub=>aggregate(ns.filter(n=>n.sub===sub)));
 }
 if(segments.length>=2){e.early=segments[0].stats;const last=segments.at(-1)!;const before=segments.at(-2)!;e.late=last.seconds-before.seconds>=25?last.stats:segments.length>=3?before.stats:undefined;}
 return e;
}
const classify=(st:Stats|undefined,min=12):SkillOutcome=>{
 const q=quality(st,min);return q==='pass'?'pass':q==='unknown'?'unknown':'repeat';
};
export function assessSkill(record:Session):SkillOutcome{
 if(!record.skillId||!record.skillLevel||!record.completed||!record.recognitionVerified||record.manualTempoChanged||!record.skillEvidence)return 'unknown';
 const e=record.skillEvidence;const parts=[classify(e.overall,40)];
 switch(record.skillId){
 case 'pulse':parts.push(classify(e.silent));break;
 case 'flexibility':parts.push(classify(e.transitions),...(e.bySub??[]).map(x=>classify(x)));if(!e.bySub||e.bySub.length<2)parts.push('unknown');break;
 case 'endurance':
  parts.push(classify(e.early),classify(e.late));if(e.early&&e.late&&e.early.accuracy-e.late.accuracy>8)parts.push('repeat');break;
 case 'speed':if(record.skillLevel>1&&record.bpm<(record.skillTarget??record.bpm))parts.push('repeat');break;
 }
 if(parts.includes('unknown'))return 'unknown';
 if(parts.includes('repeat'))return 'repeat';
 if(record.skillId==='dynamics')return record.skillSelfCheck===true?'pass':record.skillSelfCheck===false?'repeat':'selfCheck';
 return 'pass';
}

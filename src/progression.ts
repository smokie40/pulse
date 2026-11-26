import {summarize,type Note,type Stats} from './training';
import type {Session,Drill} from './coach';
export const quality=(s:Stats|null|undefined,minExpected=40):'pass'|'repeat'|'reduce'|'unknown'=>{
 if(!s||s.expected<minExpected||s.hits<s.expected*.5||s.deviation===null)return 'unknown';
 if(s.accuracy>=92&&s.deviation<=20)return 'pass';
 return s.accuracy<75?'reduce':'repeat';
};
export type TempoWindow={bpm:number;stats:Stats};
export function measuredWindows(notes:Note[],extraTimes:number[],end:number,beats:number):TempoWindow[]{
 const bars=new Map<number,Note[]>();
 for(const n of notes){if(n.time+n.interval>end+.001)continue;const b=bars.get(n.bar)??[];b.push(n);bars.set(n.bar,b);}
 const out:TempoWindow[]=[];let run:Note[][]=[];
 for(const b of bars.values()){
  const first=b[0];if(b.length!==beats*first.sub||b.some(n=>n.bpm!==first.bpm||n.sub!==first.sub)||first.step!==0||b.at(-1)!.step!==b.length-1){run=[];continue;}
  if(run.length&&(run[0][0].bpm!==first.bpm||run[0][0].sub!==first.sub||run.at(-1)![0].bar!==first.bar-1))run=[];
  run.push(b);
  if(run.length===3){const ns=run.flat(),from=ns[0].time,to=ns.at(-1)!.time+ns.at(-1)!.interval;out.push({bpm:first.bpm,stats:summarize(ns,extraTimes.filter(t=>t>=from&&t<to).length,Infinity)});run=[];}
 }
 return out;
}
// A candidate is a measured successful block, never the last scheduled BPM.
export function candidateTempo(windows:TempoWindow[]):number|null{
 const passed=windows.filter(w=>quality(w.stats,12)==='pass').map(w=>w.bpm);
 const ceiling=windows.at(-1)&&quality(windows.at(-1)!.stats,12)==='reduce'?windows.at(-1)!.bpm-5:300;
 const safe=passed.filter(b=>b<=ceiling);return safe.length?Math.max(...safe):null;
}
export function controlAfterSpeed(next:Drill,record:Session):{drill:Drill;reason:string}{
 if(!record.completed||!record.recognitionVerified||record.manualTempoChanged||record.rudiment!==next.rudiment||record.sub!==next.sub)return {drill:next,reason:'controlUnmeasured'};
 const candidate=candidateTempo(record.tempoWindows??[]);
 if(candidate===null)return {drill:next,reason:'controlUnmeasured'};
 return {drill:{...next,bpm:candidate},reason:'controlMeasured'};
}
export function tempoProfile(history:Session[],rudiment:string,sub:number){
 const eligible=history.filter(s=>s.recognitionVerified&&s.completed===true&&!s.manualTempoChanged&&(!s.diagnosticStage||s.diagnosticResult===true)&&s.rudiment===rudiment&&s.sub===sub).sort((a,b)=>b.date.localeCompare(a.date));
 const controls=eligible.filter(s=>s.controlTest&&s.mode==='steady'&&s.clickSub===false&&s.beats===4&&s.seconds>=60);
 const byTempo=new Map<number,Set<string>>();for(const s of controls){if(quality(s.stats)!=='pass')continue;const days=byTempo.get(s.bpm)??new Set<string>();days.add(s.practiceDay??s.date.slice(0,10));byTempo.set(s.bpm,days);}
 const confirmed=[...byTempo].filter(([,days])=>days.size>=2).map(([b])=>b);
 const provisional=eligible.flatMap(s=>s.mode==='steady'&&s.beats===4&&s.clickSub===false&&s.seconds>=60&&quality(s.stats)==='pass'?[s.bpm]:s.mode==='adaptive'||s.mode==='ladder'?(candidateTempo(s.tempoWindows??[])===null?[]:[candidateTempo(s.tempoWindows??[])!]):[]);
 const latest=controls[0],diagnosis=eligible.find(s=>s.diagnosticResult&&s.mode==='steady'&&s.beats===4&&s.clickSub===false&&s.seconds>=60&&quality(s.stats)==='pass');let working=confirmed.length?Math.max(...confirmed):provisional.length?Math.max(...provisional):null;
 // Recent control performance takes priority over an old personal best.
 if(latest&&quality(latest.stats)==='reduce'&&working!==null)working=Math.max(30,Math.min(working,latest.bpm-5));
 else if(latest&&quality(latest.stats)==='repeat'&&working!==null)working=Math.min(working,latest.bpm);
 else if(latest&&quality(latest.stats)==='pass')working=latest.bpm;
 if(diagnosis&&(!latest||diagnosis.date>latest.date))working=diagnosis.bpm;
 return {working,confirmed:confirmed.length?Math.max(...confirmed):null,confirmedWorking:working!==null&&confirmed.includes(working),pendingConfirmation:!!latest&&(!diagnosis||latest.date>=diagnosis.date)&&quality(latest.stats)==='pass'&&!confirmed.includes(latest.bpm),latest:latest?quality(latest.stats):'unknown'};
}

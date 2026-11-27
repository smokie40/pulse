import {summarize,type Note,type Stats} from './training';
import {lowerBound,ordered,countBetween,identity} from './event-range';
export type Period={seconds:number;stats:Stats};
export function periods(notes:Note[],extraTimes:number[],start:number,end:number,window=30):Period[]{
 const result:Period[]=[];
 if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(window)||window<=0)return result;
 const orderedNotes=ordered(notes,n=>n.time),extras=ordered(extraTimes,identity);
 let cursor=lowerBound(orderedNotes,start,n=>n.time);
 for(let from=start;from<end;from+=window){
  const to=Math.min(end,from+window),next=lowerBound(orderedNotes,to,n=>n.time),selected=orderedNotes.slice(cursor,next);cursor=next;
  if(selected.length)result.push({seconds:to-start,stats:summarize(selected,countBetween(extras,from,to),Infinity)});
 }
 return result;
}
export function feedback(s:Stats,segments:Period[]):string[]{
 if(s.expected<12||s.hits<s.expected*.5)return ['report insufficient'];
 const findings:string[]=[];
 if(s.bias!==null&&Math.abs(s.bias)>=10)findings.push(s.bias>0?'report late':'report early');
 if(s.missed/s.expected>.1)findings.push('report missed');
 if(s.extra/s.expected>.1)findings.push('report extra');
 if(s.accuracy>=92)findings.push('report good');
 else if(s.accuracy<75)findings.push('report slow');
 else findings.push('report repeat');
 const full=segments.filter(p=>p.stats.expected>=12);
 if(full.length>=3&&full[0].stats.accuracy-full[full.length-1].stats.accuracy>=15)findings.push('report decline');
 return findings;
}

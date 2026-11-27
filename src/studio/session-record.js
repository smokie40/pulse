import {localDay} from '../studio-state.js';
import {advanceDiagnostic} from '../diagnostic.js';
import {planMatches} from '../journey.js';
import {skillEvidence,assessSkill} from '../skills';

export function buildSessionRecord(session,{notes=[],extraTimes=[],stoppedAt=0,now=new Date()}={}){
const c=session.cfg;const completed=c.minutes>0&&session.elapsed>=c.minutes*60-.25;let diagnosticNext=null;
 const planned=session.planRef?.items[session.planIndex],manualTempoChanged=session.points.length>1&&c.mode!=='adaptive'&&c.mode!=='ladder';
 const practiceDay=localDay(now);
 const record={date:now.toISOString(),practiceDay,planSkill:session.planRef&&!session.planRef.probe?session.planRef.skill:undefined,mode:c.mode,bpm:c.bpm,seconds:session.elapsed,stats:session.stats,rudiment:c.rudiment,sub:c.sub,beats:c.beats,clickSub:c.clickSub,stages:session.stages,tempoWindows:session.tempoWindows,recognitionVerified:session.verified,tempoProbe:!!session.planRef?.probe,manualTempoChanged,completed,last:session.last,controlTest:planned?.name==='control'&&c.mode==='steady'&&planned.bpm===c.bpm&&planned.sub===c.sub&&planned.rudiment===c.rudiment&&c.beats===4&&!c.clickSub&&c.minutes===planned.minutes&&(session.planRef?.skill==='speed'||session.planRef?.skill==='timing')};
 if(session.planRef?.diagnostic){record.diagnosticStage=session.planRef.diagnostic.phase;const next=record.completed?advanceDiagnostic(session.planRef.diagnostic,record):null;diagnosticNext=next;record.diagnosticResult=next?.phase==='done'&&next.result!==null;}
 if(planned?.skillTest&&session.planRef&&!session.planRef.probe&&planMatches(planned,c)){Object.assign(record,{skillId:session.planRef.skill,skillLevel:planned.skillLevel,skillBaseRudiment:planned.skillBaseRudiment,skillBaseSub:planned.skillBaseSub,skillTarget:planned.skillTarget,skillEvidence:session.stats?skillEvidence(notes,extraTimes,stoppedAt,c,session.segments??[]):undefined});record.skillOutcome=assessSkill(record);}
return {record,completed,diagnosticNext};
}

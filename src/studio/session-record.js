import {localDay} from '../studio-state.js';
import {advanceDiagnostic} from '../diagnostic.js';
import {planMatches} from '../journey.js';
import {skillEvidence,assessSkill} from '../skills';

export function buildSessionRecord(session,{notes=[],extraTimes=[],stoppedAt=0,now=new Date()}={}){
const c=session.cfg,planned=session.planRef?.items[session.planIndex];const paused=!!session.paused,requiresContinuous=!!(session.planRef?.probe||planned?.skillTest||planned?.name==='control');const completed=c.minutes>0&&session.elapsed>=c.minutes*60-.25&&!((paused||session.volumeChanged)&&requiresContinuous);let diagnosticNext=null;
 const manualTempoChanged=(!!session.manualTempoChanged||session.points.length>1)&&c.mode!=='adaptive'&&c.mode!=='ladder';
 const practiceDay=localDay(now);
 const record={date:now.toISOString(),practiceDay,planSkill:session.planRef&&!session.planRef.probe?session.planRef.skill:undefined,mode:c.mode,bpm:c.bpm,seconds:session.elapsed,stats:session.stats,timingOffset:session.effectiveOffset,timingCalibrated:!!session.timingCalibration&&!!session.verified,rudiment:c.rudiment,sub:c.sub,beats:c.beats,clickSub:c.clickSub,stages:session.stages,tempoWindows:session.tempoWindows,recognitionVerified:!!session.verified&&!paused&&!session.volumeChanged,paused,volumeChanged:!!session.volumeChanged,tempoProbe:!!session.planRef?.probe,manualTempoChanged,completed,last:session.last,controlTest:planned?.name==='control'&&c.mode==='steady'&&!c.clickSub&&planMatches(planned,c)&&(session.planRef?.skill==='speed'||session.planRef?.skill==='timing')};
 if(session.planRef?.diagnostic){record.diagnosticStage=session.planRef.diagnostic.phase;const next=record.completed?advanceDiagnostic(session.planRef.diagnostic,record):null;diagnosticNext=next;record.diagnosticResult=next?.phase==='done'&&next.result!==null;}
 if(planned?.skillTest&&session.planRef&&!session.planRef.probe&&planMatches(planned,c)){Object.assign(record,{skillId:session.planRef.skill,skillLevel:planned.skillLevel,skillBaseRudiment:planned.skillBaseRudiment,skillBaseSub:planned.skillBaseSub,skillTarget:planned.skillTarget,skillEvidence:session.stats?skillEvidence(notes,extraTimes,stoppedAt,c,session.segments??[]):undefined});record.skillOutcome=assessSkill(record);}
return {record,completed,diagnosticNext};
}

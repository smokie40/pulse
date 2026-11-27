import {buildSessionRecord} from './session-record.js';
import {renderResultsView} from './results-view.js';
import {assessSkill} from '../skills';

export function createSessionResults({$,doc,t,tr,engine,runtime,plans,storage,getLang,exercises,patternNames,stickings,subdivisions,routeArt,suggestion,navigation,loadPlanStep}){
 const {showPage}=navigation;
function saveSession(){const {record,completed,diagnosticNext}=buildSessionRecord(runtime.session,{notes:engine.notes,extraTimes:engine.extraTimes,stoppedAt:engine.stoppedAt});runtime.session.completed=completed;if(runtime.session.planRef?.diagnostic)runtime.session.diagnosticNext=diagnosticNext;runtime.session.record=record;storage.appendRecord(record);plans.recordCompletion(runtime.session);}
function nextControl(){return plans.nextControl(runtime.session);}
function renderResult(){renderResultsView({$,t,tr,session:runtime.session,planRun:plans.active,checkpoint:plans.checkpoint,historyData:storage.history,lang:getLang(),exercises,patternNames,stickings,subdivisions,routeArt,nextControl,suggestion});}
function reviewAccents(pass){const rec=runtime.session?.record;if(rec?.skillOutcome!=='selfCheck')return;rec.skillSelfCheck=pass;rec.skillOutcome=assessSkill(rec);storage.saveHistory();renderResult();}
$('reviewYes').onclick=()=>reviewAccents(true);$('reviewNo').onclick=()=>reviewAccents(false);
const probeResult=doc.createElement('p');probeResult.id='probeResult';probeResult.className='subtle';probeResult.hidden=true;$('repeatPractice').before(probeResult);
$('returnPlan').onclick=()=>navigation.backFromPractice(true);
const nextPlan=doc.createElement('button');nextPlan.id='nextPlan';nextPlan.className='primary';nextPlan.hidden=true;$('repeatPractice').before(nextPlan);nextPlan.onclick=()=>{const result=plans.advance(runtime.session);if(!result)return;if(result.kind==='step')loadPlanStep(false);else if(result.kind==='diagnosticDone'){if(result.fromProgress)showPage('progress');else showPage('training',!plans.checkpoint);}else showPage('training');};
 return {saveSession,render:renderResult};
}

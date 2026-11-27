import {restorePlan,checkpointAfter,planMatches} from '../journey.js';
import {controlAfterSpeed} from '../progression';
import {newDiagnostic,diagnosticDrill} from '../diagnostic.js';

// The active route is transient; a checkpoint always names the next unfinished drill.
// Keep active route identity stable for the session's planRef guard.
export function createPlanJourney({initialCheckpoint,saveCheckpoint,restoreFreePractice}){
 let active=null,checkpoint=restorePlan(initialCheckpoint);
 function store(value){checkpoint=value;saveCheckpoint(value);}
 function leave(){if(active){active=null;restoreFreePractice();}}
 function discard(){leave();store(null);}
 function resume(){active=checkpoint;return active;}
 function begin(items,skill,manual){if(!active)active={items,index:0,skill,manual};return active;}
 function beginProbe(bpm,context,skill,fromProgress){
  const diagnostic=newDiagnostic(bpm,context.rudiment,context.sub);
  active={probe:true,skill,index:0,items:[diagnosticDrill(diagnostic)],diagnostic,fromProgress};
  return active;
 }
 function prepare(ready){
  let drill=active.items[active.index];
  if(!active.probe&&drill.mode==='adaptive'&&!ready){
   drill={...drill,mode:'ladder',name:'ladderWork',reason:'ladderCue'};
   active.items[active.index]=drill;store(active);
  }
  return drill;
 }
 function ownsCompleted(session){
  return !!(active&&session?.completed&&session.planRef===active&&session.planIndex===active.index);
 }
 function nextControl(session){
  if(!ownsCompleted(session)||active.skill!=='speed'||!session.record)return null;
  const item=active.items[active.index],next=active.items[active.index+1];
  if(!next||next.name!=='control'||!['adaptive','ladder'].includes(item.mode))return null;
  if(next.confirmation)return {drill:next,reason:'controlConfirm'};
  return controlAfterSpeed(next,session.record);
 }
 function recordCompletion(session){
  if(ownsCompleted(session)&&!active.probe&&planMatches(active.items[active.index],session.cfg))
   store(checkpointAfter(active,nextControl(session)));
 }
 function advance(session){
  if(!ownsCompleted(session))return null;
  if(active.diagnostic){
   const next=session.diagnosticNext;
   if(next&&next.phase!=='done'){
    active.diagnostic=next;active.items.push(diagnosticDrill(next));active.index++;
    return {kind:'step'};
   }
   const fromProgress=active.fromProgress;leave();
   return {kind:'diagnosticDone',fromProgress};
  }
  leave();resume();return {kind:active?'step':'complete'};
 }
 return {get active(){return active;},get checkpoint(){return checkpoint;},store,leave,discard,resume,begin,beginProbe,prepare,nextControl,recordCompletion,advance};
}

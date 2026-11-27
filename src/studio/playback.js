import {createLiveNotation} from '../studio-notation.js';
import {timingDistribution} from '../studio-charts.js';
import {fmt} from '../studio-state.js';
import {planMatches} from '../journey.js';
import {measuredWindows} from '../progression';
import {periods} from '../report';

export function createPlayback({$,t,engine,runtime,getContext,config,setBpm,setActualBpm,showPage,loadPlanStep,openGuide,setGuideReturnProgress,saveSession,render,subdivisions}){
let raf=0;
async function start(){
 const before=getContext();if(runtime.active||runtime.starting||before.micBusy||before.micConnecting||before.page!=='setup'||document.hidden)return;
 runtime.starting=true;for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn','soundBtn','settingsBtn'])$(id).disabled=true;setBpm($('bpm').value);$('start').disabled=true;$('practiceError').textContent='';
 try{
  const {planRun,verified}=getContext();if(planRun?.probe&&(!verified||!engine.mic)){const context={rudiment:planRun.diagnostic.rudiment,sub:planRun.diagnostic.sub};const fromProgress=planRun.fromProgress;openGuide('probe',context);setGuideReturnProgress(fromProgress);return;}
  if(planRun&&!planRun.probe&&config().mode==='adaptive'&&!(verified&&engine.mic)){loadPlanStep(false);}
  const cfg=config();
  if(planRun&&!planMatches(planRun.items[planRun.index],cfg))throw new Error(t('planMismatch'));
  if(cfg.mode==='adaptive'&&!(verified&&engine.mic)){openGuide('adaptive');return;}
  runtime.runVerified=verified&&engine.mic;
  await engine.start(cfg);
  if(document.hidden){engine.stop();return;}
  runtime.active=true;runtime.requestedBpm=null;const {bpm,beats,minutes,mode,rudiment}=cfg;const session=runtime.session={initial:bpm,last:bpm,elapsed:0,points:[{time:0,bpm}],cfg,stats:null,verified:runtime.runVerified,planRef:planRun,planIndex:planRun?.index};
  showPage('playing');$('liveSig').textContent=beats+'/4';$('soundBtn').disabled=true;$('settingsBtn').disabled=true;
  $('beatLights').innerHTML=Array.from({length:beats},(_,i)=>'<i>'+(i+1)+'</i>').join('');
  $('timerLabel').dataset.t=minutes?'remaining':'elapsed';$('timerLabel').textContent=t(minutes?'remaining':'elapsed');$('liveProgress').hidden=!minutes;
  const liveNotation=createLiveNotation($('liveStaff'));let lastVisual=-1,lastCompact=null;
  function frame(){
   if(!runtime.active)return;const snap=engine.snapshot(false),cur=snap.current;
   if(!snap.active){stop();return;}
   const counting=snap.counting,silent=!!cur?.silent;$('playing').classList.toggle('is-counting',counting);$('playing').classList.toggle('is-silent',silent);$('countInLabel').hidden=!counting;$('liveNoteValue').hidden=counting||silent;$('liveNoteValue').textContent=cur?t('notes')[subdivisions.indexOf(cur.sub)]:'';
   $('countdown').hidden=!counting;$('liveScore').hidden=counting||silent;$('silentStage').hidden=!silent;
   $('beatLights').style.visibility=silent?'hidden':'visible';document.querySelector('.time-left').style.visibility=silent?'hidden':'visible';$('progressBar').parentElement.style.visibility=silent?'hidden':'visible';
   const locked=!!session.planRef||counting||silent||mode==='adaptive'||mode==='ladder';
   for(const id of ['liveMinus','livePlus','liveTempoRange'])$(id).disabled=locked;
   $('liveTempoHint').textContent=t(mode==='adaptive'||mode==='ladder'?'autoTempo':session.planRef?'guidedTempo':'');$('playing').classList.toggle('tempo-locked',locked);$('liveStageTitle').textContent=session.planRef?(session.planRef.probe?t('probeTitle'):t('stageLabel')+' '+(session.planIndex+1)+' / '+session.planRef.items.length+' · '+t(session.planRef.items[session.planIndex].name)):t('practice');$('liveMicStatus').textContent=t(snap.measured?(runtime.runVerified?'analysisReady':'analysisUnchecked'):'analysisOff');
   const actual=cur?.bpm??session.initial;
   if(runtime.requestedBpm===actual)runtime.requestedBpm=null;
   setActualBpm(actual);$('liveBpm').textContent=actual;
   const target=runtime.requestedBpm??actual;$('liveTempoRange').value=target;$('liveTempoRange').style.setProperty('--fill',((target-30)/270*100)+'%');
   Array.from($('beatLights').children).forEach((el,i)=>el.classList.toggle('on',!silent&&(counting?snap.countBeat>0&&i===(snap.countBeat-1)%beats:!!cur&&i===Math.floor(cur.step/cur.sub))));
   if(counting)$('countdown').textContent=snap.countBeat>0?(snap.countBeat-1)%beats+1:'—';
   else if(cur&&(cur.global!==lastVisual||lastCompact!==(innerWidth<=800))){if(!silent){$('barLabel').textContent=t('bar')+' '+(cur.bar+1);liveNotation.update({beats,sticking:rudiment,mode,width:innerWidth},cur.sub,cur.step,cur.bar,cur.global-cur.step);}lastVisual=cur.global;lastCompact=innerWidth<=800;}
   if(cur&&actual!==session.last){session.last=actual;session.points.push({time:Math.max(0,cur.time-engine.startTime),bpm:actual});}
   $('remaining').textContent=minutes?fmt(minutes*60-snap.elapsed):fmt(snap.elapsed);$('progressBar').style.width=minutes?Math.min(100,100*snap.elapsed/(minutes*60))+'%':'0%';
   const st=snap.stats;$('liveAccuracy').hidden=silent||counting||!snap.measured;$('liveAccuracy').textContent=snap.measured&&st.expected>=12&&st.hits>=st.expected*.5?st.accuracy+'% · '+t(runtime.runVerified?'accuracy':'uncheckedAccuracy'):t('collecting');
   raf=requestAnimationFrame(frame);
  }frame();
 }catch(e){engine.stop();runtime.active=false;showPage('setup');$('practiceError').textContent=t('startError')+' '+String(e);}
 finally{runtime.starting=false;$('start').disabled=false;if(!runtime.active){const {micBusy,micConnecting}=getContext();for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn'])$(id).disabled=micBusy||micConnecting;render();}}
}
function stop(){if(!runtime.active)return;engine.stop();runtime.active=false;cancelAnimationFrame(raf);const session=runtime.session;const snap=engine.snapshot();$('soundBtn').disabled=false;$('settingsBtn').disabled=false;session.elapsed=snap.elapsed;session.last=snap.current?.bpm??session.last;if(session.last!==session.points.at(-1).bpm)session.points.push({time:session.elapsed,bpm:session.last});session.stats=snap.measured?snap.stats:null;session.timingDistribution=snap.measured?timingDistribution(engine.notes,engine.stoppedAt-.001):null;session.stages=snap.stages;session.interrupted=engine.interrupted;session.verified=!!(runtime.runVerified&&engine.mic&&!session.interrupted);session.segments=snap.measured?periods(engine.notes,engine.extraTimes,engine.startTime,engine.stoppedAt):[];session.tempoWindows=snap.measured&&(session.cfg.mode==='adaptive'||session.cfg.mode==='ladder')?measuredWindows(engine.notes,engine.extraTimes,engine.stoppedAt,session.cfg.beats):[];try{if(session.elapsed>=1)saveSession();}finally{engine.releaseSessionData();}runtime.requestedBpm=null;if(session.elapsed<1&&getContext().planRun){loadPlanStep(false);return;}showPage(session.elapsed>=1?'results':'setup');}
return {start,stop};
}

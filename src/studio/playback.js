import {createLiveNotation} from '../studio-notation.js';
import {timingDistribution} from '../studio-charts.js';
import {fmt,fmtElapsed} from '../studio-state.js';
import {planMatches} from '../journey.js';
import {measuredWindows} from '../progression';
import {periods} from '../report';
import {createScreenAids,liveFeedback} from './play-controls.js';

export function createPlayback({$,t,engine,runtime,getContext,config,setBpm,setActualBpm,showPage,loadPlanStep,openGuide,setGuideReturnProgress,saveSession,render,subdivisions,restoreConfig,setVolume}){
let raf=0,pauseBusy=false,pauseError=false,resumeTimer=0,resumeUntil=0,restarting=false;
 const setText=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 const aids=createScreenAids({doc:document,nav:navigator,onChange:renderAids});
 function renderAids(){const f=$('fullscreenPlay');f.disabled=!aids.fullscreenSupported;f.setAttribute('aria-pressed',String(aids.fullscreen));f.title=t(aids.fullscreen?'exitFullscreen':'fullscreenPlay');f.setAttribute('aria-label',f.title);setText('wakeStatus',t(aids.wakeActive?'wakeActive':aids.wakeSupported?'wakeInactive':'wakeUnsupported'));}
 function updatePause(){
  const paused=engine.paused,count=resumeUntil?Math.max(1,Math.ceil((resumeUntil-performance.now())/1000)):0;
  $('pause').disabled=pauseBusy;$('restartPlay').disabled=pauseBusy||restarting;$('pause').setAttribute('aria-pressed',String(paused));
  setText('pauseLabel',t(count?'cancelResume':paused?'resumePlay':'pausePlay'));setText('pauseIcon',count?'Ⅱ':paused?'▶':'Ⅱ');
  $('playing').classList.toggle('is-paused',paused);$('pauseStatus').hidden=!paused&&!pauseError&&!count;
  setText('pauseStatus',pauseError?t('pauseError'):count?t('resumeCountdown')+' · '+count:paused?t('pausedPlay'):'');
 }
 function cancelCountdown(){clearTimeout(resumeTimer);resumeTimer=0;resumeUntil=0;}
 async function changePause(){
  if(!runtime.active||pauseBusy)return;const session=runtime.session;pauseBusy=true;pauseError=false;
  const pending=engine.togglePause();updatePause();try{const ok=await pending;if(runtime.active&&runtime.session===session)pauseError=!ok;}finally{pauseBusy=false;if(runtime.active)updatePause();}
 }
 function togglePause(){
  if(!runtime.active||pauseBusy||restarting)return;
  if(resumeUntil){cancelCountdown();updatePause();return;}
  if(!engine.paused){void changePause();return;}
  // The count-in is deliberately visual: the same suspended audio clock and already
  // scheduled notes stay untouched, including the ghost-click silent phase.
  resumeUntil=performance.now()+3000;const session=runtime.session;updatePause();
  resumeTimer=setTimeout(()=>{cancelCountdown();if(runtime.active&&runtime.session===session&&!document.hidden)void changePause();},3000);
 }
 async function restart(){
  if(!runtime.active||pauseBusy||restarting)return;restarting=true;const cfg={...runtime.session.cfg};
  cancelCountdown();engine.stop();runtime.active=false;cancelAnimationFrame(raf);aids.stop({keepFullscreen:true});
  runtime.requestedBpm=null;runtime.session=null;restoreConfig(cfg);showPage('setup');
  try{await start();}finally{restarting=false;if(!runtime.active)aids.stop();else updatePause();}
 }
 function volumeChanged(value){if(!runtime.active||$('liveVolume').disabled)return;const volume=Math.max(0,Math.min(100,Math.round(Number(value))));if(!Number.isFinite(volume)||volume===runtime.session.cfg.volume)return;
  runtime.session.cfg.volume=volume;runtime.session.volumeChanged=true;engine.configureSound({...engine.cfg,volume});setVolume(volume);runtime.runVerified=false;setText('liveVolumeValue',volume+'%');
 }
 async function fullscreen(){if(runtime.active)await aids.toggleFullscreen();}
 $('liveVolume').addEventListener('input',e=>volumeChanged(e.target.value));
 $('restartPlay').onclick=restart;$('fullscreenPlay').onclick=fullscreen;
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
  showPage('playing');pauseError=false;cancelCountdown();$('liveVolume').value=cfg.volume;$('liveVolume').disabled=cfg.mode==='adaptive'||!!planRun?.probe;$('liveVolume').title=$('liveVolume').disabled?t('liveVolumeLocked'):t('volume');setText('liveVolumeValue',cfg.volume+'%');$('restartPlay').title=t('restartDiscard');aids.start();renderAids();updatePause();$('liveSig').textContent=beats+'/4';$('soundBtn').disabled=true;$('settingsBtn').disabled=true;
  $('beatLights').innerHTML=Array.from({length:beats},(_,i)=>'<i>'+(i+1)+'</i>').join('');
  $('timerLabel').dataset.t=minutes?'remaining':'elapsed';$('timerLabel').textContent=t(minutes?'remaining':'elapsed');$('liveProgress').hidden=!minutes;
  const liveNotation=createLiveNotation($('liveStaff'));let lastVisual=-1,lastCompact=null;
  function frame(){
   if(!runtime.active)return;const snap=engine.snapshot(),cur=snap.current;
   if(!snap.active){stop();return;}
   const counting=snap.counting,silent=!!cur?.silent;updatePause();$('playing').classList.toggle('is-counting',counting);$('playing').classList.toggle('is-silent',silent);$('countInLabel').hidden=!counting;$('liveNoteValue').hidden=counting||silent;$('liveNoteValue').textContent=cur?t('notes')[subdivisions.indexOf(cur.sub)]:'';
   $('countdown').hidden=!counting;$('liveScore').hidden=counting||silent;$('silentStage').hidden=!silent||snap.paused;
   $('beatLights').style.visibility=silent?'hidden':'visible';document.querySelector('.time-left').style.visibility=silent?'hidden':'visible';$('progressBar').parentElement.style.visibility=silent?'hidden':'visible';
   const locked=!!session.planRef||counting||silent||mode==='adaptive'||mode==='ladder';
   for(const id of ['liveMinus','livePlus','liveTempoRange'])$(id).disabled=locked||snap.paused;
   $('liveTempoHint').textContent=t(mode==='adaptive'||mode==='ladder'?'autoTempo':session.planRef?'guidedTempo':'');$('playing').classList.toggle('tempo-locked',locked);$('liveStageTitle').textContent=session.planRef?(session.planRef.probe?t('probeTitle'):t('stageLabel')+' '+(session.planIndex+1)+' / '+session.planRef.items.length+' · '+t(session.planRef.items[session.planIndex].name)):t('practice');$('liveMicStatus').textContent=t(snap.measured?(runtime.runVerified?'analysisReady':'analysisUnchecked'):'analysisOff');
   const actual=cur?.bpm??session.initial;
   // A queued note may match an older target before a different queued note sounds.
   // Keep the user's target for the entire run; use actual notes only for evidence.
   setActualBpm(actual);setText('liveBpm',String(runtime.requestedBpm??actual));
   const target=runtime.requestedBpm??actual;if(Number($('liveTempoRange').value)!==target)$('liveTempoRange').value=target;$('liveTempoRange').style.setProperty('--fill',((target-30)/270*100)+'%');
   Array.from($('beatLights').children).forEach((el,i)=>el.classList.toggle('on',!silent&&(counting?snap.countBeat>0&&i===(snap.countBeat-1)%beats:!!cur&&i===Math.floor(cur.step/cur.sub))));
   if(counting)$('countdown').textContent=snap.countBeat>0?(snap.countBeat-1)%beats+1:'—';
   else if(cur&&(cur.global!==lastVisual||lastCompact!==(innerWidth<=800))){if(!silent){$('barLabel').textContent=t('bar')+' '+(cur.bar+1);liveNotation.update({beats,sticking:rudiment,mode,width:innerWidth},cur.sub,cur.step,cur.bar,cur.global-cur.step);}lastVisual=cur.global;lastCompact=innerWidth<=800;}
   if(cur&&actual!==session.last){session.last=actual;session.points.push({time:Math.max(0,cur.time-engine.startTime),bpm:actual});}
   $('remaining').textContent=minutes?fmt(minutes*60-snap.elapsed):fmtElapsed(snap.elapsed);$('progressBar').style.width=minutes?Math.min(100,100*snap.elapsed/(minutes*60))+'%':'0%';
   const feedback=liveFeedback(snap,runtime.runVerified);$('liveAccuracy').hidden=silent||counting||snap.paused;$('liveHitCount').hidden=silent||counting||snap.paused||feedback.count===null;setText('liveAccuracy',feedback.accuracy===null?t(feedback.key):feedback.accuracy+'% · '+t(feedback.key));setText('liveHitCount',feedback.count===null?'':t('liveDetected')+' '+feedback.count);
   raf=requestAnimationFrame(frame);
  }frame();
 }catch(e){engine.stop();runtime.active=false;aids.stop();showPage('setup');$('practiceError').textContent=t('startError')+' '+String(e);}
 finally{runtime.starting=false;$('start').disabled=false;if(!runtime.active){const {micBusy,micConnecting}=getContext();for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn'])$(id).disabled=micBusy||micConnecting;render();}}
}
function stop(){if(!runtime.active)return;cancelCountdown();aids.stop();engine.stop();runtime.active=false;cancelAnimationFrame(raf);const session=runtime.session;const snap=engine.snapshot();$('soundBtn').disabled=false;$('settingsBtn').disabled=false;session.elapsed=snap.elapsed;session.last=snap.current?.bpm??session.last;if(session.last!==session.points.at(-1).bpm)session.points.push({time:session.elapsed,bpm:session.last});session.stats=snap.measured?snap.stats:null;session.timingDistribution=snap.measured?timingDistribution(engine.notes,engine.stoppedAt-.001):null;session.stages=snap.stages;session.paused=engine.hadPause;session.verified=runtime.runVerified&&engine.mic;session.segments=snap.measured?periods(engine.notes,engine.extraTimes,engine.startTime,engine.stoppedAt):[];session.tempoWindows=snap.measured&&(session.cfg.mode==='adaptive'||session.cfg.mode==='ladder')?measuredWindows(engine.notes,engine.extraTimes,engine.stoppedAt,session.cfg.beats):[];if(session.elapsed>=1)saveSession();runtime.requestedBpm=null;if(session.elapsed<1&&getContext().planRun){loadPlanStep(false);return;}showPage(session.elapsed>=1?'results':'setup');}
return {start,stop,togglePause,restart,fullscreen};
}

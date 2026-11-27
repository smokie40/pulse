import {createProgress} from './studio/progress.js';
import {renderTrainingView,drillCue as renderDrillCue} from './studio/training-view.js';
import {renderResultsView} from './studio/results-view.js';
import {createMicrophone} from './studio/microphone.js';
import {translations} from './studio-i18n.js';
import {notesIcon,renderNotation,renderMusicArt,renderRouteArt,createLiveNotation} from './studio-notation.js';
import {timingDistribution} from './studio-charts.js';
import {practiceFields,localDay,fmt} from './studio-state.js';
import {PulseEngine} from './audio';
import {restorePlan,checkpointAfter,planMatches} from './journey.js';
import {defaults,barSpec,rudiments} from './training';
import {normalizeSettings} from './settings';
import {tempoProfile,measuredWindows,controlAfterSpeed,quality} from './progression';
import {skillIds} from './focused-plan';
import {recommend,personalizedPlan} from './recommendation';
import {skillProfile,skillEvidence,assessSkill} from './skills';
import {loadHistory,writeStorage} from './storage.js';
import {newDiagnostic,diagnosticDrill,advanceDiagnostic} from './diagnostic.js';
import {periods} from './report';
import {translate} from './i18n';
const engine=new PulseEngine();
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const storageFailures=new Set();let historyRepair=false;
const save=(k,v)=>{let ok=false;try{ok=writeStorage(localStorage,k,v)}catch{}if(ok)storageFailures.delete(k);else storageFailures.add(k);renderStorageNotice();return ok;};
function renderStorageNotice(){const el=document.getElementById('storageNotice');if(!el)return;el.hidden=!storageFailures.size&&!historyRepair;el.textContent=storageFailures.size?t('storageFailed'):historyRepair?t('storageRepair'):'';}
const prior=normalizeSettings(read('pulse-settings',{}));
let sound=prior.sound,accentVolume=prior.accentVolume,beatVolume=prior.beatVolume,subVolume=prior.subVolume,offset=prior.offset,audibleBars=prior.audibleBars,silentBars=prior.silentBars,ladderStep=prior.ladderStep,ladderMax=prior.ladderMax;
let verified=false,runVerified=false,requestedBpm=null;
function config(){return {...defaults,bpm,beats,sub,minutes,countIn,mode,rudiment:stickings[pattern],volume,clickSub,sound,accentVolume,beatVolume,subVolume,offset,sensitivity,audibleBars,silentBars,ladderStep,ladderMax:Math.max(bpm,ladderMax),morphSequence:planRun?.items[planRun.index]?.morphSequence}}
function persist(){const c=config();save('pulse-settings',planRun?{...c,...freePractice}:c);save('pulse-language',lang);if(!planRun)freePractice=practiceFields(c)}
const tr=k=>translate(lang,k);

const $=id=>document.getElementById(id);
const exercises=[
 {id:'steady',ru:['Равномерные удары','Играй ровно, сохраняя одинаковые интервалы между ударами.'],en:['Even strokes','Keep the intervals between strokes even.']},
 {id:'ghost',ru:['Клик с паузами','Сохраняй темп, когда метроном замолкает.'],en:['Silent click bars','Keep the tempo when the click disappears.']},
 {id:'burst',ru:['Скоростные серии','Чередуй восьмые и шестнадцатые.'],en:['Speed bursts','Alternate eighth and sixteenth notes.']},
 {id:'morph',ru:['Смена длительностей','Меняй плотность ударов, сохраняя темп.'],en:['Rhythmic transitions','Change note values without changing the beat.']},
 {id:'ladder',ru:['Постепенное ускорение','Повышай темп небольшими шагами.'],en:['Tempo ladder','Increase the tempo in small steps.']},
 {id:'accent',ru:['Перемещение акцента','Перемещай акцент, сохраняя ровный ритм.'],en:['Moving accents','Shift the accent while keeping even timing.']},
 {id:'adaptive',ru:['Адаптивный темп','Темп меняется по результатам игры.'],en:['Adaptive tempo','Tempo responds to your timing.']}
];
let mode=exercises.some(e=>e.id===prior.mode)?prior.mode:'steady', page='training', session=null;
function exercise(){return exercises.find(e=>e.id===mode)}
function renderLibrary(){ $('exerciseLibrary').innerHTML=exercises.map(e=>'<button class="exercise-tile choice-tile" data-mode="'+e.id+'"><span class="exercise-copy choice-copy"><strong>'+e[lang][0]+'</strong><span class="choice-caption">'+t('shortMode_'+e.id)+'</span><span class="tile-arrow choice-arrow" aria-hidden="true">›</span></span>'+musicArt(e.id)+'</button>').join('');}
function showPage(p,detail=false){
 if(p==='training'){guidePurpose=null;leavePlan();trainingDetail=detail;if(detail&&checkpoint)planRun=checkpoint;}
 else if(['library','progress','skills'].includes(p))leavePlan();
 if(p!=='lab'&&p!=='training')guidePurpose=null;
 page=p;document.body.classList.toggle('performing',p==='playing');for(const id of ['training','skills','progress','lab','library','setup','playing','results'])$(id).hidden=id!==p;
 $('libraryBtn').setAttribute('aria-current',p==='library'?'page':'false');
 for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn'])$(id).disabled=p==='playing'||microphone.busy||starting||microphone.connecting;
 for(const [id,pg] of [['trainingBtn','training'],['progressBtn','progress'],['labBtn','lab']])$(id).setAttribute('aria-current',(p===pg||pg==='training'&&p==='skills')?'page':'false');
 window.scrollTo(0,0);render();
}
function barSub(bar){return barSpec(config(),bar).sub;}
$('libraryBtn').onclick=()=>{if(!active&&!starting&&!microphone.busy)showPage('library')};
$('exerciseLibrary').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b||b.disabled)return;leavePlan();mode=b.dataset.mode;showPage('setup')};
$('repeatPractice').onclick=()=>{if(!session)return;if(planRun&&session.planRef===planRun&&!session.completed){loadPlanStep(false);return;}leavePlan();applyPractice(practiceFields(session.cfg));showPage('setup');};$('otherExercise').onclick=()=>showPage('library');$('adjustPractice').onclick=()=>{leavePlan();if(session)applyPractice(practiceFields(session.cfg));showPage('setup')};
let starting=false;
let lang=read('pulse-language','ru')==='en'?'en':'ru',sub=prior.sub,pattern=0,minutes=prior.minutes,beats=prior.beats,countIn=prior.countIn,volume=prior.volume,clickSub=prior.clickSub,bpm=prior.bpm,active=false,raf=0;
const subdivisions=[1,2,3,4,5,6,8];
const stickings=rudiments.map(r=>r.id);
pattern=Math.max(0,stickings.indexOf(prior.rudiment));
let freePractice=practiceFields({...prior,mode});
function applyPractice(c){bpm=c.bpm;beats=c.beats;sub=c.sub;minutes=c.minutes;countIn=c.countIn;mode=c.mode;pattern=Math.max(0,stickings.indexOf(c.rudiment));clickSub=c.clickSub;audibleBars=c.audibleBars;silentBars=c.silentBars;ladderStep=c.ladderStep;ladderMax=c.ladderMax;}
function leavePlan(){if(planRun){planRun=null;applyPractice(freePractice);}}
const t=k=>k===''?'':translations[lang][k]??tr(k);
const patternNames=()=>rudiments.map(r=>tr(r.name));

function countText(){return countIn===0?t('noCount'):countIn===1?t('oneBar'):t('twoBars')}

function renderBase(){
  renderStorageNotice();
  if(!active)persist();
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
  ['ru','en'].forEach(l=>{$(l).classList.toggle('on',l===lang);$(l).setAttribute('aria-pressed',l===lang)});
  $('choices').innerHTML=subdivisions.map((n,i)=>`<button class="sub-choice ${n===sub?'active':''}" data-sub="${n}" aria-pressed="${n===sub}">${notesIcon(n)}<span>${t('notes')[i]}</span></button>`).join('');
  $('patternText').textContent=patternNames()[pattern];
  $('patternDots').innerHTML=stickings.map((_,i)=>`<i class="${i===pattern?'on':''}"></i>`).join('');
  $('durationText').textContent=minutes===0?t('unlimited'):!Number.isInteger(minutes)?Math.round(minutes*60)+' '+t('secondsShort'):minutes+' '+t('min');
  $('strokeCount').textContent=sub+(lang==='ru'?' уд./доля':' / beat');
  $('choices').setAttribute('aria-label',lang==='ru'?'Длительность нот':'Note values');
  for(const [id,key] of Object.entries({prevPattern:'prevPattern',nextPattern:'nextPattern',minus:'less',plus:'more',liveMinus:'less',livePlus:'more',bpm:'tempo',tempoRange:'range',liveTempoRange:'range',close:'close'}))$(id).setAttribute('aria-label',t(key));
  $('timerLabel').textContent=t(minutes?'remaining':'elapsed');
  $('timeSignature').textContent=beats+'/4';$('timeSignature').setAttribute('aria-label',t('beats')+' · '+beats+'/4');
  $('staff').innerHTML=notation(barSub(0));
  document.querySelectorAll('[data-t=title]').forEach(el=>el.textContent=exercise()[lang][0]);document.querySelector('[data-t=intro]').textContent=exercise()[lang][1];
  $('choices').hidden=mode==='burst'||mode==='morph';$('modePreview').hidden=mode==='steady';
  if(mode!=='steady')$('modePreview').innerHTML=(mode==='ladder'?routeArt(config()):musicArt(mode,config()))+'<p>'+(mode==='ghost'?(lang==='ru'?audibleBars+' такт(а) со звуком · '+silentBars+' без звука':audibleBars+' audible · '+silentBars+' silent bars'):mode==='ladder'?'+'+ladderStep+' BPM / 4 '+(lang==='ru'?'такта':'bars')+' → '+Math.max(bpm,ladderMax)+' BPM':t({ghost:'modeGhost',burst:'modeBurst',morph:'modeMorph',ladder:'modeLadder',accent:'modeAccent',adaptive:'modeAdaptive'}[mode]))+'</p>';
  $('strokeCount').textContent=barSub(0)+(lang==='ru'?' уд./доля':' / beat');$('setupClick').textContent=t(clickSub?'clickEveryStroke':'clickOnBeat');$('setupCount').textContent=t('countShort')+' · '+countText();$('setupClick').setAttribute('aria-pressed',String(clickSub));$('setupClick').disabled=!!planRun||starting;$('setupCount').disabled=!!planRun||starting;
  if(page==='library')renderLibrary();if(page==='results')renderResult();if(page==='training')renderTraining();if(page==='progress')renderProgress();if(page==='lab')renderLab();
  document.querySelector('.legend').textContent=t('legend');
  setBpm(bpm,false);
  $('soundBtn').title=$('soundBtn').ariaLabel=t('sound');$('labBtn').title=$('labBtn').ariaLabel=t('micToolLabel');
  $('settingsBtn').title=$('settingsBtn').ariaLabel=t('settings');
}

function setBpm(x,force=true){
  const value=Math.max(30,Math.min(300,Math.round(Number(x)||80)));
  if(active&&force){if(!session?.planRef&&engine.setLiveTempo(value)){requestedBpm=value;$('liveTempoRange').value=value;}return;}
  bpm=value;
  $('bpm').value=bpm; $('tempoRange').value=bpm; $('liveBpm').textContent=bpm; $('liveTempoRange').value=bpm;
  for(const id of ['tempoRange','liveTempoRange'])$(id).style.setProperty('--fill',((bpm-30)/270*100)+'%');if(force&&!active)persist();
}

$('choices').addEventListener('click',e=>{const b=e.target.closest('[data-sub]');if(b&&!b.disabled){const keyboard=e.detail===0;sub=+b.dataset.sub;render();if(keyboard)$('choices').querySelector('[data-sub="'+sub+'"]')?.focus();}});
function changePattern(delta){pattern=(pattern+delta+stickings.length)%stickings.length;render()}
$('prevPattern').onclick=()=>changePattern(-1);$('nextPattern').onclick=()=>changePattern(1);
$('patternBtn').onclick=()=>{dialog(t('patternShort'),patternNames().map((p,i)=>`<button class="option ${pattern===i?'selected':''}" data-pattern="${i}"><span>${p}</span><strong>${stickings[i].split('').join(' ')}</strong></button>`).join(''));$('dialogContent').querySelectorAll('[data-pattern]').forEach(b=>b.onclick=()=>{pattern=+b.dataset.pattern;render();closeDialog()})};
$('durationBtn').onclick=()=>{dialog(t('durationShort'),[1,3,5,10,15,20,30,0].map(n=>`<button class="option ${minutes===n?'selected':''}" data-min="${n}">${n?n+' '+t('min'):t('unlimited')}</button>`).join(''));$('dialogContent').querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{minutes=+b.dataset.min;render();closeDialog()})};
$('bpm').addEventListener('change',e=>setBpm(e.target.value));
$('tempoRange').addEventListener('input',e=>setBpm(e.target.value));
$('liveTempoRange').addEventListener('input',e=>setBpm(e.target.value));
$('minus').onclick=()=>setBpm(bpm-1); $('plus').onclick=()=>setBpm(bpm+1); $('liveMinus').onclick=()=>setBpm((requestedBpm??bpm)-1); $('livePlus').onclick=()=>setBpm((requestedBpm??bpm)+1);
$('bpm').addEventListener('keydown',e=>{if(e.key==='Enter') e.target.blur()});
['ru','en'].forEach(l=>$(l).onclick=()=>{lang=l;render()});

let lastFocus=null;
function dialog(title,html){lastFocus=document.activeElement; $('dialogTitle').textContent=title; $('dialogContent').innerHTML=html; $('overlay').hidden=false; $('close').focus()}
function closeDialog(){if(!$('overlay').hidden){$('overlay').hidden=true; lastFocus && lastFocus.focus()}}
$('close').onclick=closeDialog;
$('overlay').onclick=e=>{if(e.target===$('overlay')) closeDialog()};
$('soundBtn').onclick=()=>{dialog(t('sound'),`<label for="vol">${t('volume')} <span id="volNum">${volume}%</span></label><input id="vol" type="range" min="0" max="100" value="${volume}"><label><span>${t('density')}</span><input id="density" type="checkbox" ${clickSub?'checked':''}></label><p>${t('prototype')}</p>`); $('vol').oninput=e=>{$('volNum').textContent=(volume=+e.target.value)+'%'}; $('density').onchange=e=>clickSub=e.target.checked};
$('settingsBtn').onclick=()=>{dialog(t('settings'),`<label>${t('beats')}</label><div>${[2,3,4,5,6,7].map(n=>`<button class="option ${beats===n?'selected':''}" data-beats="${n}">${n}/4</button>`).join('')}</div><label>${t('countIn')}</label><div>${[0,1,2].map(n=>`<button class="option ${countIn===n?'selected':''}" data-count="${n}">${n}</button>`).join('')}</div>`); $('dialogContent').querySelectorAll('[data-beats]').forEach(b=>b.onclick=()=>{beats=+b.dataset.beats; render(); closeDialog()}); $('dialogContent').querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{countIn=+b.dataset.count; render(); closeDialog()})};


async function start(){
 if(active||starting||microphone.busy||microphone.connecting||page!=='setup'||document.hidden)return;
 starting=true;for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn','soundBtn','settingsBtn'])$(id).disabled=true;setBpm($('bpm').value);$('start').disabled=true;$('practiceError').textContent='';
 try{
  if(planRun?.probe&&(!verified||!engine.mic)){const context={rudiment:planRun.diagnostic.rudiment,sub:planRun.diagnostic.sub};const fromProgress=planRun.fromProgress;openGuide('probe',context);guideReturnProgress=fromProgress;return;}
  if(planRun&&!planRun.probe&&mode==='adaptive'&&!(verified&&engine.mic)){loadPlanStep(false);}
  if(planRun&&!planMatches(planRun.items[planRun.index],config()))throw new Error(t('planMismatch'));
  if(mode==='adaptive'&&!(verified&&engine.mic)){openGuide('adaptive');return;}
  runVerified=verified&&engine.mic;
  const cfg=config();const planned=planRun?.items[planRun.index];if(planned?.ladderMax!==undefined){cfg.ladderStep=planned.ladderStep;cfg.ladderMax=Math.max(cfg.bpm,planned.ladderMax);}await engine.start(cfg);
  if(document.hidden){engine.stop();return;}
  active=true;requestedBpm=null;session={initial:bpm,last:bpm,elapsed:0,points:[{time:0,bpm}],cfg,stats:null,verified:runVerified,planRef:planRun,planIndex:planRun?.index};
  showPage('playing');$('liveSig').textContent=beats+'/4';$('soundBtn').disabled=true;$('settingsBtn').disabled=true;
  $('beatLights').innerHTML=Array.from({length:beats},(_,i)=>'<i>'+(i+1)+'</i>').join('');
  $('timerLabel').dataset.t=minutes?'remaining':'elapsed';$('timerLabel').textContent=t(minutes?'remaining':'elapsed');$('liveProgress').hidden=!minutes;
  const liveNotation=createLiveNotation($('liveStaff'));let lastVisual=-1,lastCompact=null;
  function frame(){
   if(!active)return;const snap=engine.snapshot(),cur=snap.current;
   if(!snap.active){stop();return;}
   const counting=snap.counting,silent=!!cur?.silent;$('playing').classList.toggle('is-counting',counting);$('playing').classList.toggle('is-silent',silent);$('countInLabel').hidden=!counting;$('liveNoteValue').hidden=counting||silent;$('liveNoteValue').textContent=cur?t('notes')[subdivisions.indexOf(cur.sub)]:'';
   $('countdown').hidden=!counting;$('liveScore').hidden=counting||silent;$('silentStage').hidden=!silent;
   $('beatLights').style.visibility=silent?'hidden':'visible';document.querySelector('.time-left').style.visibility=silent?'hidden':'visible';$('progressBar').parentElement.style.visibility=silent?'hidden':'visible';
   const locked=!!session.planRef||counting||silent||mode==='adaptive'||mode==='ladder';
   for(const id of ['liveMinus','livePlus','liveTempoRange'])$(id).disabled=locked;
   $('liveTempoHint').textContent=t(mode==='adaptive'||mode==='ladder'?'autoTempo':session.planRef?'guidedTempo':'');$('playing').classList.toggle('tempo-locked',locked);$('liveStageTitle').textContent=session.planRef?(session.planRef.probe?t('probeTitle'):t('stageLabel')+' '+(session.planIndex+1)+' / '+session.planRef.items.length+' · '+t(session.planRef.items[session.planIndex].name)):t('practice');$('liveMicStatus').textContent=t(snap.measured?(runVerified?'analysisReady':'analysisUnchecked'):'analysisOff');
   const actual=cur?.bpm??session.initial;
   if(requestedBpm===actual)requestedBpm=null;
   bpm=actual;$('liveBpm').textContent=actual;
   const target=requestedBpm??actual;$('liveTempoRange').value=target;$('liveTempoRange').style.setProperty('--fill',((target-30)/270*100)+'%');
   Array.from($('beatLights').children).forEach((el,i)=>el.classList.toggle('on',!silent&&(counting?snap.countBeat>0&&i===(snap.countBeat-1)%beats:!!cur&&i===Math.floor(cur.step/cur.sub))));
   if(counting)$('countdown').textContent=snap.countBeat>0?(snap.countBeat-1)%beats+1:'—';
   else if(cur&&(cur.global!==lastVisual||lastCompact!==(innerWidth<=800))){if(!silent){$('barLabel').textContent=t('bar')+' '+(cur.bar+1);liveNotation.update({beats,sticking:stickings[pattern],mode,width:innerWidth},cur.sub,cur.step,cur.bar,cur.global-cur.step);}lastVisual=cur.global;lastCompact=innerWidth<=800;}
   if(cur&&actual!==session.last){session.last=actual;session.points.push({time:Math.max(0,cur.time-engine.startTime),bpm:actual});}
   $('remaining').textContent=minutes?fmt(minutes*60-snap.elapsed):fmt(snap.elapsed);$('progressBar').style.width=minutes?Math.min(100,100*snap.elapsed/(minutes*60))+'%':'0%';
   const st=snap.stats;$('liveAccuracy').hidden=silent||counting||!snap.measured;$('liveAccuracy').textContent=snap.measured&&st.expected>=12&&st.hits>=st.expected*.5?st.accuracy+'% · '+t(runVerified?'accuracy':'uncheckedAccuracy'):t('collecting');
   raf=requestAnimationFrame(frame);
  }frame();
 }catch(e){engine.stop();active=false;showPage('setup');$('practiceError').textContent=t('startError')+' '+String(e);}
 finally{starting=false;$('start').disabled=false;if(!active){for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn'])$(id).disabled=microphone.busy||microphone.connecting;render();}}
}
function stop(){if(!active)return;engine.stop();active=false;cancelAnimationFrame(raf);const snap=engine.snapshot();$('soundBtn').disabled=false;$('settingsBtn').disabled=false;session.elapsed=snap.elapsed;session.last=snap.current?.bpm??session.last;if(session.last!==session.points.at(-1).bpm)session.points.push({time:session.elapsed,bpm:session.last});session.stats=snap.measured?snap.stats:null;session.timingDistribution=snap.measured?timingDistribution(engine.notes,engine.stoppedAt-.001):null;session.stages=snap.stages;session.verified=runVerified&&engine.mic;session.segments=snap.measured?periods(engine.notes,engine.extraTimes,engine.startTime,engine.stoppedAt):[];session.tempoWindows=snap.measured&&(session.cfg.mode==='adaptive'||session.cfg.mode==='ladder')?measuredWindows(engine.notes,engine.extraTimes,engine.stoppedAt,session.cfg.beats):[];if(session.elapsed>=1)saveSession();requestedBpm=null;if(session.elapsed<1&&planRun){loadPlanStep(false);return;}showPage(session.elapsed>=1?'results':'setup');}
$('start').onclick=start; $('stop').onclick=stop;
$('setupClick').onclick=()=>{if(planRun||starting)return;clickSub=!clickSub;render();};$('setupCount').onclick=()=>{if(planRun||starting)return;dialog(t('countIn'),[0,1,2].map(n=>'<button class="option '+(countIn===n?'selected':'')+'" data-count-in="'+n+'">'+t(n===0?'noCount':n===1?'oneBar':'twoBars')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-count-in]').forEach(b=>b.onclick=()=>{countIn=Number(b.dataset.countIn);closeDialog();render();});};
document.addEventListener('keydown',e=>{if(e.key==='Tab'&&!$('overlay').hidden){const nodes=[...$('overlay').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(first&&e.shiftKey&&(document.activeElement===first||!$('overlay').contains(document.activeElement))){e.preventDefault();last.focus();return;}if(last&&!e.shiftKey&&(document.activeElement===last||!$('overlay').contains(document.activeElement))){e.preventDefault();first.focus();return;}}if(e.key==='Escape'){closeDialog(); return} if(e.code==='Space' && !e.repeat && $('overlay').hidden && !['INPUT','BUTTON','SELECT','TEXTAREA','A'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){e.preventDefault(); active?stop():page==='setup'&&start()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('resize',()=>{if(!active) render()});
const loadedHistory=loadHistory(read('pulse-history',[]));historyRepair=loadedHistory.invalid;
let planLength=15,planRun=null,historyData=loadedHistory.history;
let trainingDetail=false,guideReturnDetail=false,guideReturnSetup=false,guideReturnProgress=false,guideProbeContext=null;
const savedFocus=read('pulse-training-focus',{});
let focusSkill=skillIds.includes(savedFocus.skill)?savedFocus.skill:'timing';
let manualFocus=savedFocus.manualFocus===true;
function suggestion(){return recommend(historyData,focusRudiment,focusSub,localDay(),focusSkill);}
function currentFocus(){return manualFocus?focusSkill:suggestion().skill;}
let focusBpm=Number.isFinite(savedFocus.bpm)?Math.max(30,Math.min(300,savedFocus.bpm)):bpm;
let focusSub=subdivisions.includes(savedFocus.sub)?savedFocus.sub:4,focusRudiment=stickings.includes(savedFocus.rudiment)?savedFocus.rudiment:'RL';
if([10,15,20,30].includes(savedFocus.length))planLength=savedFocus.length;
let onboardingSkipped=!!savedFocus.onboardingSkipped||historyData.length>0;
let guidePurpose=null;
let checkpoint=restorePlan(read('pulse-pending-plan',null));
function storeCheckpoint(value){checkpoint=value;save('pulse-pending-plan',value);}
function discardPlan(){leavePlan();storeCheckpoint(null);}
function openGuide(purpose,context=null){guideReturnProgress=page==='progress';guideProbeContext=context;guideReturnSetup=page==='setup'&&purpose!=='probe';guideReturnDetail=page==='training'&&trainingDetail||!!planRun;leavePlan();guidePurpose=purpose;showPage('lab');}
function returnFromGuide(){const setup=guideReturnSetup,progress=guideReturnProgress;guidePurpose=null;guideReturnSetup=false;guideReturnProgress=false;guideProbeContext=null;if(progress){showPage('progress');return;}if(setup){if(checkpoint&&guideReturnDetail){planRun=checkpoint;loadPlanStep(false);}else showPage('setup');}else showPage('training',guideReturnDetail);}
function finishWelcome(){onboardingSkipped=true;saveFocus();}
function startProbe(context=null){const ctx=context??(guidePurpose==='probe'?guideProbeContext:null)??{rudiment:focusRudiment,sub:focusSub};const fromProgress=page==='progress'||(page==='lab'&&guideReturnProgress);if(!verified||!engine.mic){openGuide('probe',ctx);return;}dialog(t('probeTitle'),'<p>'+patternNames()[stickings.indexOf(ctx.rudiment)]+' · '+t('notes')[subdivisions.indexOf(ctx.sub)]+'</p><p>'+t('diagStartHint')+'</p><label for="diagSeed">'+t('diagSeed')+' · BPM</label><input id="diagSeed" type="number" min="30" max="300" value="'+Math.max(30,Math.min(300,Math.round(tempoProfile(historyData,ctx.rudiment,ctx.sub).working??freePractice.bpm??80)))+'"><p>'+t('probeInstructions')+'</p><button id="diagBegin" class="primary">'+t('entryStart')+'</button>');$('diagBegin').onclick=()=>{const val=Number($('diagSeed').value);if(!Number.isFinite(val)||val<30||val>300){$('diagSeed').focus();return;}closeDialog();guidePurpose=null;finishWelcome();const diagnostic=newDiagnostic(val,ctx.rudiment,ctx.sub);planRun={probe:true,skill:currentFocus(),index:0,items:[diagnosticDrill(diagnostic)],diagnostic,fromProgress};loadPlanStep(false);};}
function saveFocus(){save('pulse-training-focus',{skill:focusSkill,length:planLength,bpm:focusBpm,sub:focusSub,rudiment:focusRudiment,onboardingSkipped,manualFocus});}
// Illustrations show musical structure, never measured user data.
// Illustrative notation, not a simulated measurement. White dots = strokes, orange ticks = click.
// Illustrative musical notation only; measured charts use actual session data.
function skillArt(k){return musicArt(k);}
function musicArt(kind,opts={}){return renderMusicArt(t,kind,opts);}
function routeArt(x,pending=false){return renderRouteArt(t,x,pending);}
function notation(n,now=-1,bar=0,offset=bar*beats*n){return renderNotation({beats,sticking:stickings[pattern],mode,width:innerWidth},n,now,bar,offset);}
function planItems(skill=currentFocus()){return personalizedPlan(historyData,skill,planLength,focusRudiment,focusSub,focusBpm,!!(verified&&engine.mic));}
function profile(){return tempoProfile(historyData,focusRudiment,focusSub)}
function checkedTempo(){return profile().working}
function drillCue(x){return renderDrillCue(t,x);}
function renderTraining(){renderTrainingView({$,t,historyData,focusRudiment,focusSub,planRun,manualFocus,focusSkill,trainingDetail,engine,verified,focusBpm,checkpoint,planLength,micConnecting:microphone.connecting,calBusy:microphone.busy,stickings,subdivisions,patternNames,routeArt,skillArt,suggestion,planItems,checkedTempo,profile});}
function selectGoal(skill,manual=true){
 const proceed=()=>{if(checkpoint&&checkpoint.skill!==skill)discardPlan();focusSkill=skill;manualFocus=manual;finishWelcome();showPage('training',true);};
 if(checkpoint&&checkpoint.skill!==skill){dialog(t('replaceTitle'),'<p>'+t('replaceDescription')+'</p><button id="replaceConfirm" class="primary">'+t('replaceConfirm')+'</button><button id="replaceCancel" class="text-action">'+t('keepPlan')+'</button>');$('replaceConfirm').onclick=()=>{closeDialog();proceed()};$('replaceCancel').onclick=closeDialog;}
 else proceed();
}
function loadPlanStep(auto=false){let x=planRun.items[planRun.index];if(!planRun.probe&&x.mode==='adaptive'&&!(verified&&engine.mic)){x={...x,mode:'ladder',name:'ladderWork',reason:'ladderCue'};planRun.items[planRun.index]=x;storeCheckpoint(planRun);}mode=x.mode;minutes=x.minutes;sub=x.sub;beats=4;pattern=Math.max(0,stickings.indexOf(x.rudiment));countIn=1;clickSub=x.clickSub??false;audibleBars=x.audibleBars??2;silentBars=x.silentBars??2;ladderStep=x.ladderStep??5;ladderMax=x.ladderMax??Math.min(300,x.bpm+20);setBpm(x.bpm);showPage('setup');if(auto)void start();}
$('planPattern').onchange=()=>{if(planRun)return;focusRudiment=$('planPattern').value;saveFocus();renderTraining()};$('planSub').onchange=()=>{if(planRun)return;focusSub=Number($('planSub').value);saveFocus();renderTraining()};
$('beginPlan').onclick=()=>{if(!planRun){const skill=currentFocus();onboardingSkipped=true;planRun={items:planItems(skill),index:0,skill,manual:manualFocus};manualFocus=false;saveFocus();storeCheckpoint(planRun);}loadPlanStep(false)};
$('autoFocus').onclick=()=>{manualFocus=false;saveFocus();renderTraining()};
$('cancelPlan').onclick=()=>{dialog(t('cancelPlan'),'<p>'+t('cancelDescription')+'</p><button class="primary" id="confirmDiscard">'+t('cancelPlan')+'</button><button class="text-action" id="keepCurrent">'+t('keepPlan')+'</button>');$('confirmDiscard').onclick=()=>{closeDialog();discardPlan();showPage('training')};$('keepCurrent').onclick=closeDialog;};
$('chooseDirection').onclick=$('focusTitleBtn').onclick=$('planBack').onclick=()=>showPage('training');$('planMic').onclick=()=>openGuide('plan');
$('starterTempo').onclick=()=>{if(planRun)return;dialog(t('starterTempo'),'<p>'+t('starterTempoHint')+'</p><input id="starterInput" type="number" min="30" max="300" value="'+focusBpm+'" aria-label="BPM"><button id="starterApply" class="primary">'+t('applyTempo')+'</button>');$('starterApply').onclick=()=>{const n=Number($('starterInput').value);if(!Number.isFinite(n)||n<30||n>300)return;focusBpm=Math.round(n);saveFocus();closeDialog();renderTraining()};};
$('planLength').onclick=()=>{dialog(t('durationShort'),[10,15,20,30].map(n=>'<button class="option" data-plan="'+n+'">'+n+' '+t('min')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{planLength=+b.dataset.plan;saveFocus();renderTraining();closeDialog()})};
$('skillPath').onclick=e=>{const b=e.target.closest('[data-skill]');if(b)selectGoal(b.dataset.skill)};
$('welcomeStart').onclick=()=>{if(checkpoint){leavePlan();planRun=checkpoint;loadPlanStep(false);}else selectGoal(suggestion().skill,false)};
$('homeViewPlan').onclick=()=>showPage('training',true);
$('homeCancel').onclick=()=>$('cancelPlan').onclick();
$('homeMic').onclick=()=>openGuide('plan');
$('homeProbe').onclick=()=>{if(verified&&engine.mic)startProbe();else openGuide('probe');};
$('probeAction').onclick=()=>{if(!planRun)openGuide('probe')};
$('guideContinue').onclick=()=>{if(!verified||!engine.mic||microphone.busy)return;if(guidePurpose==='probe')startProbe();else returnFromGuide()};
$('guideSkip').onclick=()=>{if(microphone.busy||microphone.connecting)return;finishWelcome();returnFromGuide()};
$('trainingBtn').onclick=()=>showPage('training');$('progressBtn').onclick=()=>showPage('progress');$('labBtn').onclick=()=>{guidePurpose=null;showPage('lab')};$('progressPractice').onclick=()=>showPage('library');
function saveSession(){
 const c=session.cfg;session.completed=c.minutes>0&&session.elapsed>=c.minutes*60-.25;
 const planned=session.planRef?.items[session.planIndex],manualTempoChanged=session.points.length>1&&c.mode!=='adaptive'&&c.mode!=='ladder';
 const now=new Date(),practiceDay=localDay(now);
 const record={date:now.toISOString(),practiceDay,planSkill:session.planRef&&!session.planRef.probe?session.planRef.skill:undefined,mode:c.mode,bpm:c.bpm,seconds:session.elapsed,stats:session.stats,rudiment:c.rudiment,sub:c.sub,beats:c.beats,clickSub:c.clickSub,stages:session.stages,tempoWindows:session.tempoWindows,recognitionVerified:session.verified,tempoProbe:!!session.planRef?.probe,manualTempoChanged,completed:session.completed,last:session.last,controlTest:planned?.name==='control'&&c.mode==='steady'&&planned.bpm===c.bpm&&planned.sub===c.sub&&planned.rudiment===c.rudiment&&c.beats===4&&!c.clickSub&&c.minutes===planned.minutes&&(session.planRef?.skill==='speed'||session.planRef?.skill==='timing')};
 if(session.planRef?.diagnostic){record.diagnosticStage=session.planRef.diagnostic.phase;const next=record.completed?advanceDiagnostic(session.planRef.diagnostic,record):null;session.diagnosticNext=next;record.diagnosticResult=next?.phase==='done'&&next.result!==null;}
 if(planned?.skillTest&&session.planRef&&!session.planRef.probe&&planMatches(planned,c)){Object.assign(record,{skillId:session.planRef.skill,skillLevel:planned.skillLevel,skillBaseRudiment:planned.skillBaseRudiment,skillBaseSub:planned.skillBaseSub,skillTarget:planned.skillTarget,skillEvidence:session.stats?skillEvidence(engine.notes,engine.extraTimes,engine.stoppedAt,c,session.segments??[]):undefined});record.skillOutcome=assessSkill(record);}
 session.record=record;historyData.unshift(record);save('pulse-history',historyData);if(session.completed&&planRun&&!planRun.probe&&session.planRef===planRun&&session.planIndex===planRun.index&&planMatches(planned,c))storeCheckpoint(checkpointAfter(planRun,nextControl()));
}
function nextControl(){
 if(!planRun||planRun.skill!=='speed'||session.planRef!==planRun||session.planIndex!==planRun.index||!session.completed||!session.record)return null;
 const item=planRun.items[planRun.index],next=planRun.items[planRun.index+1];
 if(!next||next.name!=='control'||!['adaptive','ladder'].includes(item.mode))return null;
 if(next.confirmation)return {drill:next,reason:'controlConfirm'};
 return controlAfterSpeed(next,session.record);
}
const progressView=createProgress({$,t,getState:()=>({historyData,lang,active,starting,calBusy:microphone.busy}),initialRudiment:focusRudiment,initialSub:focusSub,stickings,subdivisions,patternNames,exercises,save,replaceHistory:value=>{historyData=value;historyRepair=false;},renderStorageNotice,startProbe});
function renderProgress(){progressView.render();}
function renderResult(){renderResultsView({$,t,tr,session,planRun,checkpoint,historyData,lang,exercises,patternNames,stickings,subdivisions,routeArt,nextControl,suggestion});}
function reviewAccents(pass){const rec=session?.record;if(rec?.skillOutcome!=='selfCheck')return;rec.skillSelfCheck=pass;rec.skillOutcome=assessSkill(rec);save('pulse-history',historyData);renderResult();}
$('reviewYes').onclick=()=>reviewAccents(true);$('reviewNo').onclick=()=>reviewAccents(false);
const probeResult=document.createElement('p');probeResult.id='probeResult';probeResult.className='subtle';probeResult.hidden=true;$('repeatPractice').before(probeResult);
$('returnPlan').onclick=()=>{if(planRun?.probe){const fromProgress=planRun.fromProgress;leavePlan();showPage(fromProgress?'progress':'training');}else showPage('training',true)};
const nextPlan=document.createElement('button');nextPlan.id='nextPlan';nextPlan.className='primary';nextPlan.hidden=true;$('repeatPractice').before(nextPlan);nextPlan.onclick=()=>{if(!planRun||!session?.completed||session.planRef!==planRun||session.planIndex!==planRun.index)return;if(planRun.diagnostic){const next=session.diagnosticNext;if(next&&next.phase!=='done'){planRun.diagnostic=next;planRun.items.push(diagnosticDrill(next));planRun.index++;loadPlanStep(false);}else{const fromProgress=planRun.fromProgress;leavePlan();if(fromProgress)showPage('progress');else showPage('training',!checkpoint);}return;}leavePlan();planRun=checkpoint;if(!planRun){showPage('training')}else loadPlanStep(false)};
// Shared engine: detector, capture, scoring and click synthesis are unchanged.
let sensitivity=prior.sensitivity;
const microphone=createMicrophone({$,t,tr,engine,getState:()=>({page,active,guidePurpose,guideReturnSetup,verified,volume,accentVolume,beatVolume,subVolume,sensitivity,sound,planRun,mode}),setSensitivity:v=>{sensitivity=v;},setVolume:v=>{volume=v;},setVerified:v=>{verified=v;},setRunVerified:v=>{runVerified=v;},config,persist,render,stop,openGuide});
function renderLab(){microphone.render();}
function resetCal(){microphone.reset();}
function render(){renderBase();const guided=page==='setup'&&!!planRun;const item=guided?planRun.items[planRun.index]:null;$('setup').classList.toggle('guided-setup',guided);$('stagePrep').hidden=!guided;$('stagePrep').textContent=guided?(planRun.probe?t('probeTitle')+' · '+(planRun.index+1):t('stageLabel')+' '+(planRun.index+1)+' / '+planRun.items.length)+' · '+t(item.name):'';$('stageCue').hidden=!guided;$('stageCue').textContent=guided?drillCue(item):'';document.querySelector('#setup [data-t=intro]').hidden=guided;$('setupModeSettings').hidden=guided||!['ghost','ladder','adaptive'].includes(mode);$('setupModeSettings').disabled=starting;$('start').querySelector('span').textContent=t(!guided&&mode==='adaptive'&&!(verified&&engine.mic)?'checkMicToStart':guided?'startSet':'startPractice');$('stageBack').hidden=false;$('stageBack').textContent='‹ '+t(guided?'stageBack':'backExercises');$('setupMic').setAttribute('title',t('configureMic'));for(const id of ['bpm','minus','plus','tempoRange','prevPattern','nextPattern','patternBtn','durationBtn','timeSignature'])$(id).disabled=guided||starting;$('choices').querySelectorAll('button').forEach(b=>b.disabled=guided||starting);$('settingsBtn').disabled=active||starting||guided||microphone.busy;$('soundBtn').disabled=active||starting||microphone.busy;$('setupMic').textContent=t(engine.mic?(verified?'analysisReady':'analysisUnchecked'):'analysisOff')+' · '+t('configureMic');$('setupMic').disabled=microphone.connecting||microphone.busy||starting;$('setupMic').classList.toggle('positive',!!(engine.mic&&verified));$('stageBack').disabled=starting||microphone.connecting;}
$('setupModeSettings').onclick=()=>{if(planRun||starting)return;dialog(t('modeSettings'),'');appendModeSettings();};
$('timeSignature').onclick=()=>{if(planRun||starting||page!=='setup')return;dialog(t('beats'),[2,3,4,5,6,7].map(n=>'<button class="option '+(beats===n?'selected':'')+'" data-meter="'+n+'">'+n+'/4</button>').join(''));$('dialogContent').querySelectorAll('[data-meter]').forEach(b=>b.onclick=()=>{beats=+b.dataset.meter;render();closeDialog()});};
$('stageBack').onclick=()=>{if(planRun?.probe){const fromProgress=planRun.fromProgress;leavePlan();showPage(fromProgress?'progress':'training');}else showPage(planRun?'training':'library',!!planRun);};
$('soundName').onclick=()=>audioDialog();
async function audition(){try{await engine.preview(config());}catch{const el=$('soundPreviewError');if(el)el.textContent=t('previewError');else{microphone.previewError();}}}
function audioDialog(){if(active||microphone.busy)return;dialog(t('sound'),'<p class="sound-help">'+t('tapToHear')+'</p>'+['soft','studio','digital','low'].map(s=>'<button class="option '+(sound===s?'selected':'')+'" data-sound="'+s+'">'+tr('sound '+s)+' <span aria-hidden="true">'+(sound===s?'✓':'▶')+'</span></button>').join('')+'<label>'+t('volume')+' <span id="volNum">'+volume+'%</span></label><input id="vol" type="range" min="0" max="100" value="'+volume+'"><label><span>'+t('density')+'</span><input id="density" type="checkbox" '+(clickSub?'checked':'')+'></label>'+[['accentVolume',accentVolume],['beatVolume',beatVolume],['subVolume',subVolume],['offset',offset]].map(([k,v])=>'<label>'+tr(k==='offset'?'Компенсация задержки':k)+' <span id="'+k+'Val">'+v+'</span></label><input type="range" data-level="'+k+'" min="'+(k==='offset'?-200:0)+'" max="'+(k==='offset'?200:100)+'" value="'+v+'">').join('')+'<button class="option" id="soundTest">'+tr('Preview sound')+' ▶</button><p id="soundPreviewError" role="alert"></p>');$('dialogContent').querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{const selected=b.dataset.sound;if(sound!==selected){sound=selected;engine.configureSound(config());persist();resetCal();} $('dialogContent').querySelectorAll('[data-sound]').forEach(row=>{const on=row.dataset.sound===sound;row.classList.toggle('selected',on);row.setAttribute('aria-pressed',String(on));row.querySelector('span').textContent=on?'✓':'▶';});$('soundPreviewError').textContent='';void audition()});$('vol').oninput=e=>{$('volNum').textContent=(volume=+e.target.value)+'%';engine.configureSound(config());persist();resetCal()};$('density').disabled=!!planRun;$('density').onchange=e=>{if(!planRun){clickSub=e.target.checked;persist()}};$('dialogContent').querySelectorAll('[data-level]').forEach(el=>el.oninput=e=>{const k=el.dataset.level,v=+e.target.value;if(k==='accentVolume')accentVolume=v;if(k==='beatVolume')beatVolume=v;if(k==='subVolume')subVolume=v;if(k==='offset')offset=v;$(k+'Val').textContent=v;engine.configureSound(config());persist();resetCal()});$('soundTest').onclick=()=>void audition();}
$('soundBtn').onclick=audioDialog;
const oldSettings=$('settingsBtn').onclick;
function appendModeSettings(){const el=document.createElement('div');el.innerHTML=(mode==='ghost'?[['audibleBars',audibleBars,1,8],['silentBars',silentBars,1,8]]:mode==='ladder'||mode==='adaptive'?[['ladderStep',ladderStep,1,20],['ladderMax',Math.max(bpm,ladderMax),bpm,300]]:[]).map(([k,v,min,max])=>'<label>'+t(k)+'</label><input type="number" data-mode-value="'+k+'" min="'+min+'" max="'+max+'" value="'+v+'">').join('');$('dialogContent').append(el);el.querySelectorAll('input').forEach(input=>input.onchange=()=>{const k=input.dataset.modeValue,v=Math.max(+input.min,Math.min(+input.max,Math.round(+input.value||+input.min)));if(k==='audibleBars')audibleBars=v;if(k==='silentBars')silentBars=v;if(k==='ladderStep')ladderStep=v;if(k==='ladderMax')ladderMax=v;input.value=v;persist();render()})}
$('settingsBtn').onclick=()=>{oldSettings();appendModeSettings();};
showPage('training');

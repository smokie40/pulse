import {createNavigation,createScreenPresenter} from './studio/navigation.js';
import {createPlayback} from './studio/playback.js';
import {buildSessionRecord} from './studio/session-record.js';
import {createDialog} from './studio/dialog.js';
import {bindSettingsDialogs} from './studio/settings-dialogs.js';
import {createProgress} from './studio/progress.js';
import {renderTrainingView,drillCue as renderDrillCue} from './studio/training-view.js';
import {renderResultsView} from './studio/results-view.js';
import {createMicrophone} from './studio/microphone.js';
import {translations} from './studio-i18n.js';
import {notesIcon,renderNotation,renderMusicArt,renderRouteArt} from './studio-notation.js';
import {localDay} from './studio-state.js';
import {PulseEngine} from './audio';
import {createPlanJourney} from './studio/plan-journey.js';
import {barSpec,rudiments} from './training';
import {createPracticeState,subdivisions,stickings} from './studio/practice-state.js';
import {tempoProfile} from './progression';
import {skillIds} from './focused-plan';
import {recommend,personalizedPlan} from './recommendation';
import {assessSkill} from './skills';
import {createStudioStorage} from './studio/persistence.js';
import {translate} from './i18n';
const engine=new PulseEngine();
const storage=createStudioStorage({getStorage:()=>localStorage,onStatus:()=>renderStorageNotice()});
function renderStorageNotice(){const el=document.getElementById('storageNotice');if(!el)return;const status=storage.status();el.hidden=!status;el.textContent=status?t(status):'';}
const practice=createPracticeState(storage.readSettings());
let verified=false;
const runtime={active:false,starting:false,runVerified:false,requestedBpm:null,session:null};
function config(){return practice.config(plans.active?.items[plans.active.index]?.morphSequence)}
function persist(){storage.saveSettings(practice.persistedConfig(!!plans.active,plans.active?.items[plans.active.index]?.morphSequence));storage.saveLanguage(lang);if(!plans.active)practice.rememberFree()}
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
function exercise(){return exercises.find(e=>e.id===practice.values.mode)}
function renderLibrary(){ $('exerciseLibrary').innerHTML=exercises.map(e=>'<button class="exercise-tile choice-tile" data-mode="'+e.id+'"><span class="exercise-copy choice-copy"><strong>'+e[lang][0]+'</strong><span class="choice-caption">'+t('shortMode_'+e.id)+'</span><span class="tile-arrow choice-arrow" aria-hidden="true">›</span></span>'+musicArt(e.id)+'</button>').join('');}
function barSub(bar){return barSpec(config(),bar).sub;}
$('libraryBtn').onclick=()=>{if(!runtime.active&&!runtime.starting&&!microphone.busy)showPage('library')};
$('exerciseLibrary').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b||b.disabled)return;leavePlan();practice.patch({mode:b.dataset.mode});showPage('setup')};
$('repeatPractice').onclick=()=>{if(!runtime.session)return;if(plans.active&&runtime.session.planRef===plans.active&&!runtime.session.completed){loadPlanStep(false);return;}leavePlan();practice.apply(runtime.session.cfg);showPage('setup');};$('otherExercise').onclick=()=>showPage('library');$('adjustPractice').onclick=()=>{leavePlan();if(runtime.session)practice.apply(runtime.session.cfg);showPage('setup')};
let lang=storage.readLanguage()==='en'?'en':'ru';
function leavePlan(){plans.leave();}
const t=k=>k===''?'':translations[lang][k]??tr(k);
const patternNames=()=>rudiments.map(r=>tr(r.name));

function countText(){const {countIn}=practice.values;return countIn===0?t('noCount'):countIn===1?t('oneBar'):t('twoBars')}

function renderBase(){
  const {bpm,beats,sub,minutes,countIn,mode,pattern,clickSub,audibleBars,silentBars,ladderStep,ladderMax}=practice.values;
  renderStorageNotice();
  if(!runtime.active)persist();
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
  $('strokeCount').textContent=barSub(0)+(lang==='ru'?' уд./доля':' / beat');$('setupClick').textContent=t(clickSub?'clickEveryStroke':'clickOnBeat');$('setupCount').textContent=t('countShort')+' · '+countText();$('setupClick').setAttribute('aria-pressed',String(clickSub));$('setupClick').disabled=!!plans.active||runtime.starting;$('setupCount').disabled=!!plans.active||runtime.starting;
  if(navigation.page==='library')renderLibrary();if(navigation.page==='results')renderResult();if(navigation.page==='training')renderTraining();if(navigation.page==='progress')renderProgress();if(navigation.page==='lab')renderLab();
  document.querySelector('.legend').textContent=t('legend');
  setBpm(bpm,false);
  $('soundBtn').title=$('soundBtn').ariaLabel=t('sound');$('labBtn').title=$('labBtn').ariaLabel=t('micToolLabel');
  $('settingsBtn').title=$('settingsBtn').ariaLabel=t('settings');
}

function setBpm(x,force=true){
  const value=Math.max(30,Math.min(300,Math.round(Number(x)||80)));
  if(runtime.active&&force){if(!runtime.session?.planRef&&engine.setLiveTempo(value)){runtime.requestedBpm=value;$('liveTempoRange').value=value;}return;}
  practice.patch({bpm:value});const bpm=value;
  $('bpm').value=bpm; $('tempoRange').value=bpm; $('liveBpm').textContent=bpm; $('liveTempoRange').value=bpm;
  for(const id of ['tempoRange','liveTempoRange'])$(id).style.setProperty('--fill',((bpm-30)/270*100)+'%');if(force&&!runtime.active)persist();
}

$('choices').addEventListener('click',e=>{const b=e.target.closest('[data-sub]');if(b&&!b.disabled){const keyboard=e.detail===0;const sub=+b.dataset.sub;practice.patch({sub});render();if(keyboard)$('choices').querySelector('[data-sub="'+sub+'"]')?.focus();}});
function changePattern(delta){practice.patch({pattern:(practice.values.pattern+delta+stickings.length)%stickings.length});render()}
$('prevPattern').onclick=()=>changePattern(-1);$('nextPattern').onclick=()=>changePattern(1);
$('patternBtn').onclick=()=>{const {pattern}=practice.values;dialog(t('patternShort'),patternNames().map((p,i)=>`<button class="option ${pattern===i?'selected':''}" data-pattern="${i}"><span>${p}</span><strong>${stickings[i].split('').join(' ')}</strong></button>`).join(''));$('dialogContent').querySelectorAll('[data-pattern]').forEach(b=>b.onclick=()=>{practice.patch({pattern:+b.dataset.pattern});render();closeDialog()})};
$('durationBtn').onclick=()=>{const {minutes}=practice.values;dialog(t('durationShort'),[1,3,5,10,15,20,30,0].map(n=>`<button class="option ${minutes===n?'selected':''}" data-min="${n}">${n?n+' '+t('min'):t('unlimited')}</button>`).join(''));$('dialogContent').querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{practice.patch({minutes:+b.dataset.min});render();closeDialog()})};
$('bpm').addEventListener('change',e=>setBpm(e.target.value));
$('tempoRange').addEventListener('input',e=>setBpm(e.target.value));
$('liveTempoRange').addEventListener('input',e=>setBpm(e.target.value));
$('minus').onclick=()=>setBpm(practice.values.bpm-1); $('plus').onclick=()=>setBpm(practice.values.bpm+1); $('liveMinus').onclick=()=>setBpm((runtime.requestedBpm??practice.values.bpm)-1); $('livePlus').onclick=()=>setBpm((runtime.requestedBpm??practice.values.bpm)+1);
$('bpm').addEventListener('keydown',e=>{if(e.key==='Enter') e.target.blur()});
['ru','en'].forEach(l=>$(l).onclick=()=>{lang=l;render()});

const modal=createDialog($);const dialog=modal.open,closeDialog=modal.close;
$('start').onclick=start; $('stop').onclick=stop;
$('setupClick').onclick=()=>{if(plans.active||runtime.starting)return;practice.patch({clickSub:!practice.values.clickSub});render();};$('setupCount').onclick=()=>{if(plans.active||runtime.starting)return;const {countIn}=practice.values;dialog(t('countIn'),[0,1,2].map(n=>'<button class="option '+(countIn===n?'selected':'')+'" data-count-in="'+n+'">'+t(n===0?'noCount':n===1?'oneBar':'twoBars')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-count-in]').forEach(b=>b.onclick=()=>{practice.patch({countIn:Number(b.dataset.countIn)});closeDialog();render();});};
document.addEventListener('keydown',e=>{if(e.code==='Space' && !e.repeat && $('overlay').hidden && !['INPUT','BUTTON','SELECT','TEXTAREA','A'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){e.preventDefault(); runtime.active?stop():navigation.page==='setup'&&start()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('resize',()=>{if(!runtime.active) render()});
let planLength=15;
const savedFocus=storage.readFocus();
let focusSkill=skillIds.includes(savedFocus.skill)?savedFocus.skill:'timing';
let manualFocus=savedFocus.manualFocus===true;
function suggestion(){return recommend(storage.history,focusRudiment,focusSub,localDay(),focusSkill);}
function currentFocus(){return manualFocus?focusSkill:suggestion().skill;}
let focusBpm=Number.isFinite(savedFocus.bpm)?Math.max(30,Math.min(300,savedFocus.bpm)):practice.values.bpm;
let focusSub=subdivisions.includes(savedFocus.sub)?savedFocus.sub:4,focusRudiment=stickings.includes(savedFocus.rudiment)?savedFocus.rudiment:'RL';
if([10,15,20,30].includes(savedFocus.length))planLength=savedFocus.length;
let onboardingSkipped=!!savedFocus.onboardingSkipped||storage.history.length>0;
const plans=createPlanJourney({initialCheckpoint:storage.readCheckpoint(),saveCheckpoint:storage.saveCheckpoint,restoreFreePractice:practice.restoreFree});
function discardPlan(){plans.discard();}
const navigation=createNavigation({plans,present:createScreenPresenter({$,doc:document,scrollTo:(x,y)=>window.scrollTo(x,y),getBusy:()=>microphone.busy||runtime.starting||microphone.connecting,render}),loadPlanStep});
const {showPage,openGuide,returnFromGuide}=navigation;
function finishWelcome(){onboardingSkipped=true;saveFocus();}
function startProbe(context=null){const ctx=context??(navigation.guidePurpose==='probe'?navigation.guideProbeContext:null)??{rudiment:focusRudiment,sub:focusSub};const fromProgress=navigation.page==='progress'||(navigation.page==='lab'&&navigation.guideReturnProgress);if(!verified||!engine.mic){openGuide('probe',ctx);return;}dialog(t('probeTitle'),'<p>'+patternNames()[stickings.indexOf(ctx.rudiment)]+' · '+t('notes')[subdivisions.indexOf(ctx.sub)]+'</p><p>'+t('diagStartHint')+'</p><label for="diagSeed">'+t('diagSeed')+' · BPM</label><input id="diagSeed" type="number" min="30" max="300" value="'+Math.max(30,Math.min(300,Math.round(tempoProfile(storage.history,ctx.rudiment,ctx.sub).working??practice.free.bpm??80)))+'"><p>'+t('probeInstructions')+'</p><button id="diagBegin" class="primary">'+t('entryStart')+'</button>');$('diagBegin').onclick=()=>{const val=Number($('diagSeed').value);if(!Number.isFinite(val)||val<30||val>300){$('diagSeed').focus();return;}closeDialog();navigation.clearGuide();finishWelcome();plans.beginProbe(val,ctx,currentFocus(),fromProgress);loadPlanStep(false);};}
function saveFocus(){storage.saveFocus({skill:focusSkill,length:planLength,bpm:focusBpm,sub:focusSub,rudiment:focusRudiment,onboardingSkipped,manualFocus});}
// Illustrations show musical structure, never measured user data.
// Illustrative notation, not a simulated measurement. White dots = strokes, orange ticks = click.
// Illustrative musical notation only; measured charts use actual session data.
function skillArt(k){return musicArt(k);}
function musicArt(kind,opts={}){return renderMusicArt(t,kind,opts);}
function routeArt(x,pending=false){return renderRouteArt(t,x,pending);}
function notation(n,now=-1,bar=0,offset=bar*practice.values.beats*n){const {beats,pattern,mode}=practice.values;return renderNotation({beats,sticking:stickings[pattern],mode,width:innerWidth},n,now,bar,offset);}
function planItems(skill=currentFocus()){return personalizedPlan(storage.history,skill,planLength,focusRudiment,focusSub,focusBpm,!!(verified&&engine.mic));}
function profile(){return tempoProfile(storage.history,focusRudiment,focusSub)}
function checkedTempo(){return profile().working}
function drillCue(x){return renderDrillCue(t,x);}
function renderTraining(){renderTrainingView({$,t,historyData:storage.history,focusRudiment,focusSub,planRun:plans.active,manualFocus,focusSkill,trainingDetail:navigation.trainingDetail,engine,verified,focusBpm,checkpoint:plans.checkpoint,planLength,micConnecting:microphone.connecting,calBusy:microphone.busy,stickings,subdivisions,patternNames,routeArt,skillArt,suggestion,planItems,checkedTempo,profile});}
function selectGoal(skill,manual=true){
 const proceed=()=>{if(plans.checkpoint&&plans.checkpoint.skill!==skill)discardPlan();focusSkill=skill;manualFocus=manual;finishWelcome();showPage('training',true);};
 if(plans.checkpoint&&plans.checkpoint.skill!==skill){dialog(t('replaceTitle'),'<p>'+t('replaceDescription')+'</p><button id="replaceConfirm" class="primary">'+t('replaceConfirm')+'</button><button id="replaceCancel" class="text-action">'+t('keepPlan')+'</button>');$('replaceConfirm').onclick=()=>{closeDialog();proceed()};$('replaceCancel').onclick=closeDialog;}
 else proceed();
}
function loadPlanStep(auto=false){const x=plans.prepare(!!(verified&&engine.mic));practice.prepareDrill(x);setBpm(x.bpm);showPage('setup');if(auto)void start();}
$('planPattern').onchange=()=>{if(plans.active)return;focusRudiment=$('planPattern').value;saveFocus();renderTraining()};$('planSub').onchange=()=>{if(plans.active)return;focusSub=Number($('planSub').value);saveFocus();renderTraining()};
$('beginPlan').onclick=()=>{if(!plans.active){const skill=currentFocus();onboardingSkipped=true;plans.begin(planItems(skill),skill,manualFocus);manualFocus=false;saveFocus();plans.store(plans.active);}loadPlanStep(false)};
$('autoFocus').onclick=()=>{manualFocus=false;saveFocus();renderTraining()};
$('cancelPlan').onclick=()=>{dialog(t('cancelPlan'),'<p>'+t('cancelDescription')+'</p><button class="primary" id="confirmDiscard">'+t('cancelPlan')+'</button><button class="text-action" id="keepCurrent">'+t('keepPlan')+'</button>');$('confirmDiscard').onclick=()=>{closeDialog();discardPlan();showPage('training')};$('keepCurrent').onclick=closeDialog;};
$('chooseDirection').onclick=$('focusTitleBtn').onclick=$('planBack').onclick=()=>showPage('training');$('planMic').onclick=()=>openGuide('plan');
$('starterTempo').onclick=()=>{if(plans.active)return;dialog(t('starterTempo'),'<p>'+t('starterTempoHint')+'</p><input id="starterInput" type="number" min="30" max="300" value="'+focusBpm+'" aria-label="BPM"><button id="starterApply" class="primary">'+t('applyTempo')+'</button>');$('starterApply').onclick=()=>{const n=Number($('starterInput').value);if(!Number.isFinite(n)||n<30||n>300)return;focusBpm=Math.round(n);saveFocus();closeDialog();renderTraining()};};
$('planLength').onclick=()=>{dialog(t('durationShort'),[10,15,20,30].map(n=>'<button class="option" data-plan="'+n+'">'+n+' '+t('min')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{planLength=+b.dataset.plan;saveFocus();renderTraining();closeDialog()})};
$('skillPath').onclick=e=>{const b=e.target.closest('[data-skill]');if(b)selectGoal(b.dataset.skill)};
$('welcomeStart').onclick=()=>{if(plans.checkpoint){leavePlan();plans.resume();loadPlanStep(false);}else selectGoal(suggestion().skill,false)};
$('homeViewPlan').onclick=()=>showPage('training',true);
$('homeCancel').onclick=()=>$('cancelPlan').onclick();
$('homeMic').onclick=()=>openGuide('plan');
$('homeProbe').onclick=()=>{if(verified&&engine.mic)startProbe();else openGuide('probe');};
$('probeAction').onclick=()=>{if(!plans.active)openGuide('probe')};
$('guideContinue').onclick=()=>{if(!verified||!engine.mic||microphone.busy)return;if(navigation.guidePurpose==='probe')startProbe();else returnFromGuide()};
$('guideSkip').onclick=()=>{if(microphone.busy||microphone.connecting)return;finishWelcome();returnFromGuide()};
$('trainingBtn').onclick=()=>showPage('training');$('progressBtn').onclick=()=>showPage('progress');$('labBtn').onclick=navigation.showLab;$('progressPractice').onclick=()=>showPage('library');
function saveSession(){const {record,completed,diagnosticNext}=buildSessionRecord(runtime.session,{notes:engine.notes,extraTimes:engine.extraTimes,stoppedAt:engine.stoppedAt});runtime.session.completed=completed;if(runtime.session.planRef?.diagnostic)runtime.session.diagnosticNext=diagnosticNext;runtime.session.record=record;storage.appendRecord(record);plans.recordCompletion(runtime.session);}
function nextControl(){return plans.nextControl(runtime.session);}
const progressView=createProgress({$,t,getState:()=>({historyData:storage.history,lang,active:runtime.active,starting:runtime.starting,calBusy:microphone.busy}),initialRudiment:focusRudiment,initialSub:focusSub,stickings,subdivisions,patternNames,exercises,importBackup:storage.importBackup,exportBackup:storage.exportBackup,renderStorageNotice,startProbe});
function renderProgress(){progressView.render();}
function renderResult(){renderResultsView({$,t,tr,session:runtime.session,planRun:plans.active,checkpoint:plans.checkpoint,historyData:storage.history,lang,exercises,patternNames,stickings,subdivisions,routeArt,nextControl,suggestion});}
function reviewAccents(pass){const rec=runtime.session?.record;if(rec?.skillOutcome!=='selfCheck')return;rec.skillSelfCheck=pass;rec.skillOutcome=assessSkill(rec);storage.saveHistory();renderResult();}
$('reviewYes').onclick=()=>reviewAccents(true);$('reviewNo').onclick=()=>reviewAccents(false);
const probeResult=document.createElement('p');probeResult.id='probeResult';probeResult.className='subtle';probeResult.hidden=true;$('repeatPractice').before(probeResult);
$('returnPlan').onclick=()=>navigation.backFromPractice(true);
const nextPlan=document.createElement('button');nextPlan.id='nextPlan';nextPlan.className='primary';nextPlan.hidden=true;$('repeatPractice').before(nextPlan);nextPlan.onclick=()=>{const result=plans.advance(runtime.session);if(!result)return;if(result.kind==='step')loadPlanStep(false);else if(result.kind==='diagnosticDone'){if(result.fromProgress)showPage('progress');else showPage('training',!plans.checkpoint);}else showPage('training');};
// Shared engine: detector, capture, scoring and click synthesis are unchanged.
const microphone=createMicrophone({$,t,tr,engine,getState:()=>({page:navigation.page,active:runtime.active,guidePurpose:navigation.guidePurpose,guideReturnSetup:navigation.guideReturnSetup,verified,...practice.values,planRun:plans.active}),setSensitivity:v=>practice.patch({sensitivity:v}),setVolume:v=>practice.patch({volume:v}),setVerified:v=>{verified=v;},setRunVerified:v=>{runtime.runVerified=v;},config,persist,render,stop,openGuide});
function renderLab(){microphone.render();}
function resetCal(){microphone.reset();}
function render(){renderBase();const {mode}=practice.values;const guided=navigation.page==='setup'&&!!plans.active;const item=guided?plans.active.items[plans.active.index]:null;$('setup').classList.toggle('guided-setup',guided);$('stagePrep').hidden=!guided;$('stagePrep').textContent=guided?(plans.active.probe?t('probeTitle')+' · '+(plans.active.index+1):t('stageLabel')+' '+(plans.active.index+1)+' / '+plans.active.items.length)+' · '+t(item.name):'';$('stageCue').hidden=!guided;$('stageCue').textContent=guided?drillCue(item):'';document.querySelector('#setup [data-t=intro]').hidden=guided;$('setupModeSettings').hidden=guided||!['ghost','ladder','adaptive'].includes(mode);$('setupModeSettings').disabled=runtime.starting;$('start').querySelector('span').textContent=t(!guided&&mode==='adaptive'&&!(verified&&engine.mic)?'checkMicToStart':guided?'startSet':'startPractice');$('stageBack').hidden=false;$('stageBack').textContent='‹ '+t(guided?'stageBack':'backExercises');$('setupMic').setAttribute('title',t('configureMic'));for(const id of ['bpm','minus','plus','tempoRange','prevPattern','nextPattern','patternBtn','durationBtn','timeSignature'])$(id).disabled=guided||runtime.starting;$('choices').querySelectorAll('button').forEach(b=>b.disabled=guided||runtime.starting);$('settingsBtn').disabled=runtime.active||runtime.starting||guided||microphone.busy;$('soundBtn').disabled=runtime.active||runtime.starting||microphone.busy;$('setupMic').textContent=t(engine.mic?(verified?'analysisReady':'analysisUnchecked'):'analysisOff')+' · '+t('configureMic');$('setupMic').disabled=microphone.connecting||microphone.busy||runtime.starting;$('setupMic').classList.toggle('positive',!!(engine.mic&&verified));$('stageBack').disabled=runtime.starting||microphone.connecting;}
$('timeSignature').onclick=()=>{if(plans.active||runtime.starting||navigation.page!=='setup')return;const {beats}=practice.values;dialog(t('beats'),[2,3,4,5,6,7].map(n=>'<button class="option '+(beats===n?'selected':'')+'" data-meter="'+n+'">'+n+'/4</button>').join(''));$('dialogContent').querySelectorAll('[data-meter]').forEach(b=>b.onclick=()=>{practice.patch({beats:+b.dataset.meter});render();closeDialog()});};
$('stageBack').onclick=()=>navigation.backFromPractice();
const playback=createPlayback({$,t,engine,runtime,getContext:()=>({page:navigation.page,planRun:plans.active,verified,micBusy:microphone.busy,micConnecting:microphone.connecting}),config,setBpm,setActualBpm:value=>practice.patch({bpm:value}),showPage,loadPlanStep,openGuide,setGuideReturnProgress:navigation.setGuideReturnProgress,saveSession,render,subdivisions});
function start(){return playback.start();}
function stop(){playback.stop();}
bindSettingsDialogs({$,t,tr,dialog,closeDialog,config,patchPractice:practice.patch,getContext:()=>({active:runtime.active,starting:runtime.starting,planRun:plans.active,micBusy:microphone.busy}),engine,persist,render,resetCal,previewError:()=>microphone.previewError()});
showPage('training');

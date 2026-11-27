import {createNavigation,createScreenPresenter} from './studio/navigation.js';
import {createPlayback} from './studio/playback.js';
import {createDialog} from './studio/dialog.js';
import {bindSettingsDialogs} from './studio/settings-dialogs.js';
import {createProgress} from './studio/progress.js';
import {createMicrophone} from './studio/microphone.js';
import {createPlanJourney} from './studio/plan-journey.js';
import {createPracticeState,subdivisions,stickings} from './studio/practice-state.js';
import {createStudioStorage} from './studio/persistence.js';
import {createTrainingFocus} from './studio/training-focus.js';
import {createTrainingController} from './studio/training-controller.js';
import {createSetupController} from './studio/setup-controller.js';
import {createSessionResults} from './studio/session-results.js';
import {exercises,renderLibrary} from './studio/exercise-catalog.js';
import {translations} from './studio-i18n.js';
import {renderMusicArt,renderRouteArt} from './studio-notation.js';
import {PulseEngine} from './audio';
import {rudiments} from './training';
import {translate} from './i18n';

const $=id=>document.getElementById(id);
const engine=new PulseEngine();
const storage=createStudioStorage({getStorage:()=>localStorage,onStatus:()=>renderStorageNotice()});
let lang=storage.readLanguage()==='en'?'en':'ru',verified=false;
const tr=k=>translate(lang,k),t=k=>k===''?'':translations[lang][k]??tr(k),getLang=()=>lang;
function renderStorageNotice(){const el=$('storageNotice');if(!el)return;const status=storage.status();el.hidden=!status;el.textContent=status?t(status):'';}

const practice=createPracticeState(storage.readSettings());
const plans=createPlanJourney({initialCheckpoint:storage.readCheckpoint(),saveCheckpoint:storage.saveCheckpoint,restoreFreePractice:practice.restoreFree});
const runtime={active:false,starting:false,runVerified:false,requestedBpm:null,session:null};
const config=()=>practice.config(plans.active?.items[plans.active.index]?.morphSequence);
function persist(){storage.saveSettings(practice.persistedConfig(!!plans.active,plans.active?.items[plans.active.index]?.morphSequence));storage.saveLanguage(lang);if(!plans.active)practice.rememberFree();}
const focus=createTrainingFocus({initial:storage.readFocus(),initialBpm:practice.values.bpm,getHistory:()=>storage.history,save:storage.saveFocus});
const {open:dialog,close:closeDialog}=createDialog($);
const patternNames=()=>rudiments.map(r=>tr(r.name));
const musicArt=(kind,opts={})=>renderMusicArt(t,kind,opts),routeArt=(x,pending=false)=>renderRouteArt(t,x,pending);
const navigation=createNavigation({plans,present:createScreenPresenter({$,doc:document,scrollTo:(x,y)=>window.scrollTo(x,y),getBusy:()=>microphone.busy||runtime.starting||microphone.connecting,render}),loadPlanStep});
const {showPage,openGuide}=navigation;
const micContext=()=>({verified,engine,micBusy:microphone.busy,calBusy:microphone.busy,micConnecting:microphone.connecting});
const setup=createSetupController({$,doc:document,t,getLang,getWidth:()=>innerWidth,practice,plans,navigation,runtime,engine,getContext:micContext,config,persist,render,patternNames,musicArt,routeArt,dialog,closeDialog});
const setBpm=setup.setBpm;
function loadPlanStep(auto=false){const x=plans.prepare(!!(verified&&engine.mic));practice.prepareDrill(x);setBpm(x.bpm);showPage('setup');if(auto)void start();}
const training=createTrainingController({$,t,focus,plans,navigation,dialog,closeDialog,getHistory:()=>storage.history,getFreeBpm:()=>practice.free.bpm,getContext:micContext,patternNames,routeArt,skillArt:musicArt,loadPlanStep});
const progress=createProgress({$,t,getState:()=>({historyData:storage.history,lang,active:runtime.active,starting:runtime.starting,calBusy:microphone.busy}),initialRudiment:focus.values.rudiment,initialSub:focus.values.sub,stickings,subdivisions,patternNames,exercises,importBackup:storage.importBackup,exportBackup:storage.exportBackup,renderStorageNotice,startProbe:training.startProbe});
const results=createSessionResults({$,doc:document,t,tr,engine,runtime,plans,storage,getLang,exercises,patternNames,stickings,subdivisions,routeArt,suggestion:training.suggestion,navigation,loadPlanStep});
const microphone=createMicrophone({$,t,tr,engine,getState:()=>({page:navigation.page,active:runtime.active,guidePurpose:navigation.guidePurpose,guideReturnSetup:navigation.guideReturnSetup,verified,...practice.values,planRun:plans.active}),setSensitivity:v=>practice.patch({sensitivity:v}),setVolume:v=>practice.patch({volume:v}),setVerified:v=>{verified=v;},setRunVerified:v=>{runtime.runVerified=v;},config,persist,render,stop,openGuide});
const playback=createPlayback({$,t,engine,runtime,getContext:()=>({page:navigation.page,planRun:plans.active,verified,micBusy:microphone.busy,micConnecting:microphone.connecting}),config,setBpm,setActualBpm:value=>practice.patch({bpm:value}),showPage,loadPlanStep,openGuide,setGuideReturnProgress:navigation.setGuideReturnProgress,saveSession:results.saveSession,render,subdivisions});
function start(){return playback.start();}
function stop(){playback.stop();}
bindSettingsDialogs({$,t,tr,dialog,closeDialog,config,patchPractice:practice.patch,getContext:()=>({active:runtime.active,starting:runtime.starting,planRun:plans.active,micBusy:microphone.busy}),engine,persist,render,resetCal:microphone.reset,previewError:microphone.previewError});

const views={library:()=>renderLibrary({$,t,lang,musicArt}),results:results.render,training:training.render,progress:progress.render,lab:microphone.render};
function render(){
 renderStorageNotice();
 if(!runtime.active)persist();
 document.documentElement.lang=lang;
 document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
 ['ru','en'].forEach(l=>{$(l).classList.toggle('on',l===lang);$(l).setAttribute('aria-pressed',l===lang);});
 setup.renderFields();
 views[navigation.page]?.();
 document.querySelector('.legend').textContent=t('legend');
 setBpm(practice.values.bpm,false);
 $('soundBtn').title=$('soundBtn').ariaLabel=t('sound');$('labBtn').title=$('labBtn').ariaLabel=t('micToolLabel');
 $('settingsBtn').title=$('settingsBtn').ariaLabel=t('settings');
 setup.renderGuided();
}

$('libraryBtn').onclick=()=>{if(!runtime.active&&!runtime.starting&&!microphone.busy)showPage('library')};
$('exerciseLibrary').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b||b.disabled)return;plans.leave();practice.patch({mode:b.dataset.mode});showPage('setup')};
$('repeatPractice').onclick=()=>{if(!runtime.session)return;if(plans.active&&runtime.session.planRef===plans.active&&!runtime.session.completed){loadPlanStep(false);return;}plans.leave();practice.apply(runtime.session.cfg);showPage('setup');};$('otherExercise').onclick=()=>showPage('library');$('adjustPractice').onclick=()=>{plans.leave();if(runtime.session)practice.apply(runtime.session.cfg);showPage('setup')};
$('trainingBtn').onclick=()=>showPage('training');$('progressBtn').onclick=()=>showPage('progress');$('labBtn').onclick=navigation.showLab;$('progressPractice').onclick=()=>showPage('library');
$('stageBack').onclick=()=>navigation.backFromPractice();
$('start').onclick=start;$('stop').onclick=stop;
['ru','en'].forEach(l=>$(l).onclick=()=>{lang=l;render();});
document.addEventListener('keydown',e=>{if(e.code==='Space' && !e.repeat && $('overlay').hidden && !['INPUT','BUTTON','SELECT','TEXTAREA','A'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){e.preventDefault(); runtime.active?stop():navigation.page==='setup'&&start()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){engine.cancelPending();stop();}});
window.addEventListener('resize',()=>{if(!runtime.active) render()});
window.addEventListener('storage',e=>{if(e.key==='pulse-history'&&storage.refreshHistory()&&!runtime.active&&!runtime.starting&&!microphone.busy){if(navigation.page==='training'||navigation.page==='progress')views[navigation.page]?.();}});
showPage('training');

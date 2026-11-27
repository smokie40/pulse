import {renderTrainingView} from './training-view.js';
import {planLengths} from './training-focus.js';
import {tempoProfile} from '../progression';
import {stickings,subdivisions} from './practice-state.js';

export function createTrainingController({$,t,focus,plans,navigation,dialog,closeDialog,getHistory,getFreeBpm,getContext,patternNames,routeArt,skillArt,loadPlanStep}){
 const {showPage,openGuide,returnFromGuide}=navigation;
 const isReady=()=>{const {engine,verified}=getContext();return !!(verified&&engine.mic);};
 const suggestion=focus.suggestion,profile=focus.profile,checkedTempo=()=>profile().working;
 const planItems=skill=>focus.items(isReady(),skill);
function startProbe(context=null){const ctx=context??(navigation.guidePurpose==='probe'?navigation.guideProbeContext:null)??{rudiment:focus.values.rudiment,sub:focus.values.sub};const fromProgress=navigation.page==='progress'||(navigation.page==='lab'&&navigation.guideReturnProgress);if(!isReady()){openGuide('probe',ctx);return;}dialog(t('probeTitle'),'<p>'+patternNames()[stickings.indexOf(ctx.rudiment)]+' · '+t('notes')[subdivisions.indexOf(ctx.sub)]+'</p><p>'+t('diagStartHint')+'</p><label for="diagSeed">'+t('diagSeed')+' · BPM</label><input id="diagSeed" type="number" min="30" max="300" value="'+Math.max(30,Math.min(300,Math.round(tempoProfile(getHistory(),ctx.rudiment,ctx.sub).working??getFreeBpm()??80)))+'"><p>'+t('probeInstructions')+'</p><button id="diagBegin" class="primary">'+t('entryStart')+'</button>');$('diagBegin').onclick=()=>{const val=Number($('diagSeed').value);if(!Number.isFinite(val)||val<30||val>300){$('diagSeed').focus();return;}closeDialog();navigation.clearGuide();focus.finishWelcome();plans.beginProbe(val,ctx,focus.currentSkill(),fromProgress);loadPlanStep(false);};}
function renderTraining(){const {rudiment:focusRudiment,sub:focusSub,manualFocus,skill:focusSkill,bpm:focusBpm,length:planLength}=focus.values;const {engine,verified,micConnecting,calBusy}=getContext();renderTrainingView({$,t,historyData:getHistory(),focusRudiment,focusSub,planRun:plans.active,manualFocus,focusSkill,trainingDetail:navigation.trainingDetail,engine,verified,focusBpm,checkpoint:plans.checkpoint,planLength,micConnecting,calBusy,stickings,subdivisions,patternNames,routeArt,skillArt,suggestion,planItems,checkedTempo,profile});}
function selectGoal(skill,manual=true){
 const proceed=()=>{if(plans.checkpoint&&plans.checkpoint.skill!==skill)plans.discard();focus.patch({skill,manualFocus:manual,onboardingSkipped:true});showPage('training',true);};
 if(plans.checkpoint&&plans.checkpoint.skill!==skill){dialog(t('replaceTitle'),'<p>'+t('replaceDescription')+'</p><button id="replaceConfirm" class="primary">'+t('replaceConfirm')+'</button><button id="replaceCancel" class="text-action">'+t('keepPlan')+'</button>');$('replaceConfirm').onclick=()=>{closeDialog();proceed()};$('replaceCancel').onclick=closeDialog;}
 else proceed();
}
$('planPattern').onchange=()=>{if(plans.active)return;focus.patch({rudiment:$('planPattern').value});renderTraining()};$('planSub').onchange=()=>{if(plans.active)return;focus.patch({sub:Number($('planSub').value)});renderTraining()};
$('beginPlan').onclick=()=>{if(!plans.active){const skill=focus.currentSkill();plans.begin(planItems(skill),skill,focus.values.manualFocus);focus.patch({onboardingSkipped:true,manualFocus:false});plans.store(plans.active);}loadPlanStep(false)};
$('autoFocus').onclick=()=>{focus.patch({manualFocus:false});renderTraining()};
$('cancelPlan').onclick=()=>{dialog(t('cancelPlan'),'<p>'+t('cancelDescription')+'</p><button class="primary" id="confirmDiscard">'+t('cancelPlan')+'</button><button class="text-action" id="keepCurrent">'+t('keepPlan')+'</button>');$('confirmDiscard').onclick=()=>{closeDialog();plans.discard();showPage('training')};$('keepCurrent').onclick=closeDialog;};
$('chooseDirection').onclick=$('focusTitleBtn').onclick=$('planBack').onclick=()=>showPage('training');$('planMic').onclick=()=>openGuide('plan');
$('starterTempo').onclick=()=>{if(plans.active)return;dialog(t('starterTempo'),'<p>'+t('starterTempoHint')+'</p><input id="starterInput" type="number" min="30" max="300" value="'+focus.values.bpm+'" aria-label="BPM"><button id="starterApply" class="primary">'+t('applyTempo')+'</button>');$('starterApply').onclick=()=>{const n=Number($('starterInput').value);if(!Number.isFinite(n)||n<30||n>300)return;focus.patch({bpm:Math.round(n)});closeDialog();renderTraining()};};
$('planLength').onclick=()=>{dialog(t('durationShort'),planLengths.map(n=>'<button class="option" data-plan="'+n+'">'+n+' '+t('min')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{focus.patch({length:+b.dataset.plan});renderTraining();closeDialog()})};
$('skillPath').onclick=e=>{const b=e.target.closest('[data-skill]');if(b)selectGoal(b.dataset.skill)};
$('welcomeStart').onclick=()=>{if(plans.checkpoint){plans.leave();plans.resume();loadPlanStep(false);}else selectGoal(suggestion().skill,false)};
$('homeViewPlan').onclick=()=>showPage('training',true);
$('homeCancel').onclick=()=>$('cancelPlan').onclick();
$('homeMic').onclick=()=>openGuide('plan');
$('homeProbe').onclick=()=>{if(isReady())startProbe();else openGuide('probe');};
$('probeAction').onclick=()=>{if(!plans.active)openGuide('probe')};
$('guideContinue').onclick=()=>{if(!isReady()||getContext().calBusy)return;if(navigation.guidePurpose==='probe')startProbe();else returnFromGuide()};
$('guideSkip').onclick=()=>{if(getContext().calBusy||getContext().micConnecting)return;focus.finishWelcome();returnFromGuide()};
 return {render:renderTraining,startProbe,suggestion};
}

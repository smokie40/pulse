import {barSpec} from '../training';
import {notesIcon,renderNotation} from '../studio-notation.js';
import {subdivisions,stickings} from './practice-state.js';
import {drillCue as renderDrillCue} from './training-view.js';
import {exercises} from './exercise-catalog.js';

export function createSetupController({$,doc,t,getLang,getWidth,practice,plans,navigation,runtime,engine,getContext,config,persist,render,patternNames,musicArt,routeArt,dialog,closeDialog}){
 function exercise(){return exercises.find(e=>e.id===practice.values.mode);}
 function barSub(bar){return barSpec(config(),bar).sub;}
 function notation(n,now=-1,bar=0,offset=bar*practice.values.beats*n){const {beats,pattern,mode}=practice.values;return renderNotation({beats,sticking:stickings[pattern],mode,width:getWidth()},n,now,bar,offset);}
 function countText(){const {countIn}=practice.values;return countIn===0?t('noCount'):countIn===1?t('oneBar'):t('twoBars');}
 const drillCue=x=>renderDrillCue(t,x);
 function renderFields(){
  const {bpm,beats,sub,minutes,mode,pattern,clickSub,audibleBars,silentBars,ladderStep,ladderMax}=practice.values;
  const lang=getLang();
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
  doc.querySelectorAll('[data-t=title]').forEach(el=>el.textContent=exercise()[lang][0]);doc.querySelector('[data-t=intro]').textContent=exercise()[lang][1];
  $('choices').hidden=mode==='burst'||mode==='morph';$('modePreview').hidden=mode==='steady';
  if(mode!=='steady')$('modePreview').innerHTML=(mode==='ladder'?routeArt(config()):musicArt(mode,config()))+'<p>'+(mode==='ghost'?(lang==='ru'?audibleBars+' такт(а) со звуком · '+silentBars+' без звука':audibleBars+' audible · '+silentBars+' silent bars'):mode==='ladder'?'+'+ladderStep+' BPM / 4 '+(lang==='ru'?'такта':'bars')+' → '+Math.max(bpm,ladderMax)+' BPM':t({ghost:'modeGhost',burst:'modeBurst',morph:'modeMorph',ladder:'modeLadder',accent:'modeAccent',adaptive:'modeAdaptive'}[mode]))+'</p>';
  $('strokeCount').textContent=barSub(0)+(lang==='ru'?' уд./доля':' / beat');$('setupClick').textContent=t(clickSub?'clickEveryStroke':'clickOnBeat');$('setupCount').textContent=t('countShort')+' · '+countText();$('setupClick').setAttribute('aria-pressed',String(clickSub));$('setupClick').disabled=!!plans.active||runtime.starting;$('setupCount').disabled=!!plans.active||runtime.starting;

 }
function renderGuided(){const {verified,micBusy,micConnecting}=getContext();const {mode}=practice.values;const guided=navigation.page==='setup'&&!!plans.active;const item=guided?plans.active.items[plans.active.index]:null;$('setup').classList.toggle('guided-setup',guided);$('stagePrep').hidden=!guided;$('stagePrep').textContent=guided?(plans.active.probe?t('probeTitle')+' · '+(plans.active.index+1):t('stageLabel')+' '+(plans.active.index+1)+' / '+plans.active.items.length)+' · '+t(item.name):'';$('stageCue').hidden=!guided;$('stageCue').textContent=guided?drillCue(item):'';doc.querySelector('#setup [data-t=intro]').hidden=guided;$('setupModeSettings').hidden=guided||!['ghost','ladder','adaptive'].includes(mode);$('setupModeSettings').disabled=runtime.starting;$('start').querySelector('span').textContent=t(!guided&&mode==='adaptive'&&!(verified&&engine.mic)?'checkMicToStart':guided?'startSet':'startPractice');$('stageBack').hidden=false;$('stageBack').textContent=guided?'← '+t('stageBack'):t('backExercises');$('setupMic').setAttribute('title',t('configureMic'));for(const id of ['bpm','minus','plus','tempoRange','prevPattern','nextPattern','patternBtn','durationBtn','timeSignature'])$(id).disabled=guided||runtime.starting;$('choices').querySelectorAll('button').forEach(b=>b.disabled=guided||runtime.starting);$('settingsBtn').disabled=runtime.active||runtime.starting||guided||micBusy;$('soundBtn').disabled=runtime.active||runtime.starting||micBusy;$('setupMic').textContent=t(engine.mic?(verified?'analysisReady':'analysisUnchecked'):'analysisOff')+' · '+t('configureMic');$('setupMic').disabled=micConnecting||micBusy||runtime.starting;$('setupMic').classList.toggle('positive',!!(engine.mic&&verified));$('stageBack').disabled=runtime.starting||micConnecting;}
function setBpm(x,force=true){
  const value=Math.max(30,Math.min(300,Math.round(Number(x)||80)));
  if(runtime.active&&force){if(!runtime.session?.planRef&&!$('liveTempoRange').disabled&&engine.setLiveTempo(value)){runtime.requestedBpm=value;runtime.session.manualTempoChanged=true;$('liveTempoRange').value=value;$('liveTempoRange').style.setProperty('--fill',((value-30)/270*100)+'%');}return;}
  practice.patch({bpm:value});const bpm=value;
  $('bpm').value=bpm; $('tempoRange').value=bpm; if(!runtime.active){$('liveBpm').textContent=bpm; $('liveTempoRange').value=bpm;}
  for(const id of runtime.active?['tempoRange']:['tempoRange','liveTempoRange'])$(id).style.setProperty('--fill',((bpm-30)/270*100)+'%');if(force&&!runtime.active)persist();
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
$('setupClick').onclick=()=>{if(plans.active||runtime.starting)return;practice.patch({clickSub:!practice.values.clickSub});render();};$('setupCount').onclick=()=>{if(plans.active||runtime.starting)return;const {countIn}=practice.values;dialog(t('countIn'),[0,1,2].map(n=>'<button class="option '+(countIn===n?'selected':'')+'" data-count-in="'+n+'">'+t(n===0?'noCount':n===1?'oneBar':'twoBars')+'</button>').join(''));$('dialogContent').querySelectorAll('[data-count-in]').forEach(b=>b.onclick=()=>{practice.patch({countIn:Number(b.dataset.countIn)});closeDialog();render();});};
$('timeSignature').onclick=()=>{if(plans.active||runtime.starting||navigation.page!=='setup')return;const {beats}=practice.values;dialog(t('beats'),[2,3,4,5,6,7].map(n=>'<button class="option '+(beats===n?'selected':'')+'" data-meter="'+n+'">'+n+'/4</button>').join(''));$('dialogContent').querySelectorAll('[data-meter]').forEach(b=>b.onclick=()=>{practice.patch({beats:+b.dataset.meter});render();closeDialog()});};
 return {renderFields,renderGuided,setBpm};
}

import {steps,dbfs,detect} from '../calibration';
import {learnPadProfile,countProfile,spectralFrames,restoreTraining} from '../pad-profile';

export function createMicrophone({$,t,tr,engine,getState,setSensitivity,setVolume,setVerified,setRunVerified,config,persist,render,stop,openGuide}){
let micConnecting=false,calBusy=false,stage=0,calResults=Array(6).fill(null),profile=null,trainingCaptures=[],learnFailed=false,calError='',calCountdown='',calLive=0,latencyBusy=false,latencyAttempted=false;
const targets=steps.map(s=>s.expected);
const eventCount=c=>c?.profileCount??c?.liveCount;
const stagePass=(c,i)=>!!profile&&!!c&&spectralFrames(c)&&eventCount(c)===targets[i]&&(c.profileCount!==undefined||detect(c.frames,profile.sensitivity)===targets[i]);
function resetCal(){setVerified(false);engine.setPadProfile(null);profile=null;trainingCaptures=[];learnFailed=false;calResults=Array(6).fill(null);stage=0;calError='';if(getState().page==='lab')renderLab();else if(!getState().active)render();}
function attachMicEnd(){engine.stream?.getAudioTracks()[0]?.addEventListener('ended',()=>{if(getState().active){setRunVerified(false);stop()}engine.disableMic();resetCal();render();},{once:true})}
async function connectMic(){if(micConnecting||calBusy||getState().active)return;micConnecting=true;calError='';render();try{if(engine.mic){engine.disableMic();resetCal()}else{await engine.enableMic(getState().sensitivity);engine.configureSound(config());attachMicEnd();resetCal()}}catch{calError='micError'}finally{micConnecting=false;render()}}
function renderLatency(){const v=engine.timingCalibration;const offset=config().offset??0;$('latencyStatus').textContent=latencyBusy?t('latencyMeasuring'):v?t('latencyMeasured')+' '+v.offsetMs+' ms · '+t('latencySpread')+' '+v.jitterMs+' ms · '+v.trials+'/7':(latencyAttempted?t('latencyFailed'):t('latency'))+' '+t('manualOffset')+' '+offset+' ms';$('measureLatency').disabled=calBusy||micConnecting||!engine.mic||!getState().volume;$('measureLatency').textContent=t(v?'latencyRepeat':'latencyStart');}
async function performLatency(){latencyBusy=true;latencyAttempted=true;renderLatency();$('calStart').textContent=t('latencyMeasuring');try{await engine.measureLatency(config());}catch{}finally{latencyBusy=false;renderLatency();}}
async function manualLatency(){if(calBusy||micConnecting||!engine.mic||getState().active)return;calBusy=true;renderLab();try{await performLatency();}finally{calBusy=false;renderLab();}}
function updateMeter(){if(getState().page!=='lab')return;renderLatency();const db=dbfs(engine.meterRms);$('meterDb').textContent=engine.mic?Math.round(db)+' dBFS':'— dBFS';Array.from($('signalMeter').children).forEach((el,i)=>el.classList.toggle('on',engine.mic&&i/32<(db+100)/100))}
function renderLab(){const {page,guidePurpose,guideReturnSetup,verified,volume,sensitivity,sound}=getState();if(page!=='lab')return;$('lab').classList.toggle('guided',!!guidePurpose);$('guideHead').hidden=!guidePurpose;$('guideContinue').hidden=!guidePurpose||!verified||!engine.mic;$('guideContinue').disabled=calBusy||micConnecting;$('guideContinue').textContent=t(guidePurpose==='probe'?'goProbe':guideReturnSetup?'backSetup':'goPlan');$('guideHint').textContent=guidePurpose==='probe'&&verified?t('probeInstructions'):'';$('guideSkip').hidden=!guidePurpose;$('guideSkip').disabled=calBusy||micConnecting;$('guideStep').textContent=t(!engine.mic?'guide1':verified?'guide3':'guide2');$('guideTitle').textContent=t(!engine.mic?'guideMicTitle':verified?(guidePurpose==='probe'?'probeTitle':'guideReadyTitle'):'guideCalTitle');$('guideDesc').textContent=t(!engine.mic?'guideMicDesc':verified?(guidePurpose==='probe'?'probeDescription':'guideReadyDesc'):'guideCalDesc');$('guideMessage').textContent=guidePurpose&&!engine.mic&&calError?t(calError):'';$('micStatus').textContent=t(engine.mic?(verified?'verified':'micOn'):'micOff');$('micToggle').textContent=t(engine.mic?'disconnect':'connect');$('micToggle').disabled=micConnecting||calBusy;$('labVol').value=volume;$('labVolNum').textContent=volume+'%';$('labVol').disabled=calBusy;$('previewClick').disabled=calBusy;$('sensitivity').value=sensitivity;$('sensNum').textContent=sensitivity;$('sensitivity').disabled=calBusy||!!profile;$('signalMeter').innerHTML='<i></i>'.repeat(32);$('soundName').textContent=tr('sound '+sound);updateMeter();
 const count=calResults.filter(Boolean).length,all=count===6,pass=all&&verified;
 $('calPhase').textContent=t(profile?'padValidatePhase':'padLearnPhase');
 $('calCounter').textContent=count+' / 6';$('calSteps').innerHTML='<div class="cal-track">'+t('stageNames').map((n,i)=>'<button data-stage="'+i+'" '+(calBusy||(!calResults[i]&&i!==stage)?'disabled':'')+' class="'+(i===stage?'current ':'')+(calResults[i]&&profile?(stagePass(calResults[i],i)?'done':'failed'):'')+'">'+String(i+1).padStart(2,'0')+'<br>'+n+(calResults[i]?'<span class="cal-stage-result">'+(profile?(eventCount(calResults[i])+'/'+targets[i]+' '+(stagePass(calResults[i],i)?'✓':'×')):t('padRecorded'))+'</span>':'')+'</button>').join('')+'</div>';
 $('calCurrent').innerHTML=all&&!calBusy?'<strong>'+calResults.filter((x,i)=>stagePass(x,i)).length+' / 6</strong><p>'+t(pass?'calPass':'calFail')+'</p>':'<span class="tag">'+t('stageNames')[stage]+'</span><strong id="calLive">'+(calBusy&&profile?calLive:targets[stage])+'</strong><span class="cal-count-label">'+t(calBusy&&profile?'calDetected':'calExpected')+'</span><p>'+t('stageInstructions')[stage]+'</p>';
 $('calStart').textContent=calBusy?calCountdown:learnFailed?t('resetCal'):all&&!pass?t('calRetryFailed'):t('stageStart');$('calStart').hidden=pass&&!calBusy;$('calStart').disabled=calBusy||!engine.mic||pass;$('lab').classList.toggle('guide-no-mic',!!guidePurpose&&!engine.mic);$('lab').classList.toggle('guide-verified',!!guidePurpose&&verified&&!!engine.mic);$('calReset').disabled=calBusy||!count;$('exportCal').disabled=calBusy||!count;$('importCal').disabled=calBusy||micConnecting||!engine.mic;
 $('calMessage').textContent=calError?t(calError):!engine.mic?t('needMic'):profile&&!all&&stage===1?t('padValidationHint'):'';
 for(const id of ['trainingBtn','progressBtn','libraryBtn','labBtn','soundBtn','settingsBtn','ru','en'])$(id).disabled=calBusy||micConnecting;
}
function installProfile(learned){
 profile=learned;setVerified(false);learnFailed=false;calError='';setSensitivity(learned.sensitivity);engine.setSensitivity(learned.sensitivity);engine.setPadProfile(learned);persist();
 calResults=Array(6).fill(null);
 for(let j=0;j<4;j++)calResults[j]={...trainingCaptures[j],profileCount:countProfile(trainingCaptures[j],learned)};
 calResults[1]=null;stage=1;
}
async function restoreCalFile(file){
 if(!file||calBusy||micConnecting||!engine.mic||getState().active)return;
 calBusy=true;renderLab();
 try{
  if(file.size>12_000_000)throw Error('large file');
  const captures=restoreTraining(await file.text(),config());
  const learned=learnPadProfile(captures,getState().sensitivity);
  if(!learned)throw Error('unlearnable');
  trainingCaptures=captures;installProfile(learned);
 }catch{calError='padImportError'}finally{calBusy=false;renderLab();}
}
async function runStage(){if(!engine.mic||calBusy)return;const {volume,accentVolume,beatVolume,subVolume,sensitivity}=getState();if(learnFailed){resetCal();return}if(calResults.every(Boolean)){if(getState().verified)return;const failed=calResults.findIndex((x,i)=>!stagePass(x,i));if(failed>=0){stage=failed;calResults[stage]=null;setVerified(false);renderLab();return}}if((stage===1||stage===5)&&(!volume||!accentVolume||!beatVolume||!subVolume)){calError='zeroVolume';renderLab();return}const i=stage;calBusy=true;calError='';calLive=0;calCountdown=t('getReady');renderLab();const started=performance.now(),id=setInterval(()=>{const e=(performance.now()-started)/1000;calCountdown=e<1.5?t('getReady'):t('nowPlay')+' · '+Math.max(0,Math.ceil(steps[i].seconds+1.5-e))+' s';$('calStart').textContent=calCountdown;if(e>=1.5){calLive=engine.diagnosticLiveCount;const el=$('calLive');if(el&&profile)el.textContent=calLive;}},80);
 try{calResults[i]=await engine.capture(steps[i].id,steps[i].seconds,steps[i].expected,config());
  if(!profile&&calResults.slice(0,4).every(Boolean)){
   trainingCaptures=calResults.slice(0,4);const learned=learnPadProfile(trainingCaptures,sensitivity);
   if(!learned){learnFailed=true;calError='padLearnFailed';setVerified(false);return;}
   installProfile(learned);
  }else{if(i===1&&stagePass(calResults[i],i)&&!engine.timingCalibration){clearInterval(id);await performLatency();}const missing=calResults.findIndex(x=>!x);if(missing>=0)stage=missing;else setVerified(calResults.every(stagePass));}
 }catch{calError='calError'}finally{clearInterval(id);calBusy=false;renderLab()}}
$('micToggle').onclick=connectMic;$('setupMic').onclick=()=>{const {planRun,mode}=getState();openGuide(planRun?.probe?'probe':mode==='adaptive'&&!planRun?'adaptive':'plan');};$('calStart').onclick=runStage;$('measureLatency').onclick=manualLatency;$('calReset').onclick=resetCal;
$('calSteps').onclick=e=>{const b=e.target.closest('[data-stage]');if(!b||calBusy||b.disabled)return;if(learnFailed){resetCal();return;}stage=+b.dataset.stage;calResults[stage]=null;setVerified(false);renderLab()};
$('sensitivity').oninput=e=>{const value=+e.target.value;setSensitivity(value);engine.setSensitivity(value);persist();resetCal()};
$('labVol').oninput=e=>{setVolume(+e.target.value);engine.configureSound(config());persist();resetCal()};
$('previewClick').onclick=async()=>{try{await engine.preview(config())}catch{calError='previewError';renderLab()}};
$('importCal').onclick=()=>{$('calFile').click()};$('calFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';await restoreCalFile(file);};
$('exportCal').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:'pad-profile-1',settings:config(),timingCalibration:engine.timingCalibration,profile,trainingCaptures,captures:calResults.filter(Boolean)})],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pulse-diagnostic.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
setInterval(updateMeter,100);
window.addEventListener('pagehide',()=>{if(getState().active)stop();engine.stop();engine.disableMic();setVerified(false);setRunVerified(false);});
window.addEventListener('pageshow',e=>{if(e.persisted)resetCal();});
return {get connecting(){return micConnecting;},get busy(){return calBusy;},render:renderLab,reset:resetCal,previewError(){calError='previewError';renderLab();}};
}

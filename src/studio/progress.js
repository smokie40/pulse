import {progressOverview,periodHistory} from '../analytics';
import {renderTempoChart,renderActivityChart,renderComparisonChart} from '../studio-charts.js';
import {localDay,fmt} from '../studio-state.js';

export function createProgress({$,t,getState,initialRudiment,initialSub,stickings,subdivisions,patternNames,exercises,importBackup,exportBackup,renderStorageNotice,startProbe}){
let progressDays=30,progressRudiment=initialRudiment,progressSub=initialSub,comparisonBpm=null;
const locale=()=>getState().lang==='ru'?'ru-RU':'en-GB';
const shortDay=d=>new Date(d+'T12:00:00').toLocaleDateString(locale(),{day:'numeric',month:'short'});
const delta=(n,suffix='')=>n==null?'—':(n>0?'+':'')+Number(n.toFixed(1))+suffix;
function tempoChart(data){return renderTempoChart(t,shortDay,data);}
function activityChart(data){return renderActivityChart(t,shortDay,data);}
function comparisonChart(points){return renderComparisonChart(t,shortDay,points);}
function renderProgress(){
 const {historyData,lang,active,starting,calBusy}=getState();
 const data=progressOverview(historyData,progressRudiment,progressSub,localDay(),progressDays),p=data.practice;
 $('totalTime').textContent=(p.seconds/60).toFixed(1);$('totalSessions').textContent=p.exercises;$('activeDays').textContent=p.days;
 $('progressRange').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.days===progressDays)));
 $('activityGraph').innerHTML=activityChart(p.activity);
 $('progressPattern').innerHTML=stickings.map((r,i)=>'<option value="'+r+'" '+(r===progressRudiment?'selected':'')+'>'+patternNames()[i]+'</option>').join('');
 $('progressSub').innerHTML=subdivisions.map((n,i)=>'<option value="'+n+'" '+(n===progressSub?'selected':'')+'>'+t('notes')[i]+'</option>').join('');
 $('workingMetric').textContent=data.profile.working??'—';$('confirmedMetric').textContent=data.profile.confirmed??'—';$('confirmedGain').textContent=data.confirmedGain==null?'':delta(data.confirmedGain,' BPM')+' · '+t('analyticsInPeriod');
 const hasTempo=data.profile.working!==null||data.profile.confirmed!==null,hasTimeline=data.timeline.some(x=>x.current!==null||x.confirmed!==null);$('progressTempoSection').hidden=!hasTempo&&!hasTimeline;$('progressWorking').hidden=data.profile.working===null;$('progressConfirmed').hidden=data.profile.confirmed===null;$('tempoGraph').hidden=!hasTimeline;$('tempoGraph').innerHTML=hasTimeline?tempoChart(data.timeline):'';$('tempoLegend').hidden=!hasTimeline;$('tempoLegend').children[0].hidden=!data.timeline.some(x=>x.current!==null);$('tempoLegend').children[1].hidden=!data.timeline.some(x=>x.confirmed!==null);
 const comps=data.comparisons;const choice=comps.find(c=>c.bpm===comparisonBpm)??comps[0];comparisonBpm=choice?.bpm??null;
 $('compareBpm').innerHTML=comps.map(c=>'<option value="'+c.bpm+'" '+(c===choice?'selected':'')+'>'+c.bpm+' BPM · '+c.points.length+' '+t('practiceDays')+'</option>').join('');$('compareBpm').hidden=!choice;$('progressComparisonSection').hidden=!choice;
 $('timingComparison').innerHTML=choice?'<div class="analytics-metrics"><div><span>'+t('accuracy')+'</span><strong>'+choice.points.at(-1).accuracy+'%</strong><small>'+delta(choice.accuracyDelta,' '+t('percentagePoints'))+'</small></div><div><span>'+t('timingDeviation')+'</span><strong>'+choice.points.at(-1).rms+' <small>ms</small></strong><small>'+delta(choice.rmsDelta,' ms')+'</small></div></div>'+(choice.points.length>=2?comparisonChart(choice.points):'<p class="analytics-empty">'+t('analyticsNeedTwoDays')+'</p>'):'<p class="analytics-empty">'+t('analyticsNoCompare')+'</p>';
 const assessed=data.skills.filter(x=>x.assessed);$('progressSkillSection').hidden=!assessed.length;$('progressEmpty').hidden=hasTempo||hasTimeline||!!choice||assessed.length>0;$('progressSkills').innerHTML=assessed.map(x=>'<div class="skill-progress-row"><div><strong>'+t('skill_'+x.skill)+'</strong><small>'+t(x.assessed?x.key:'analyticsUnassessed')+'</small></div><div class="skill-milestones">'+[1,2,3].map(n=>'<i class="'+(x.assessed&&(n<x.level||x.mastered)?'passed':x.assessed&&n===x.level?'current':'')+'"></i>').join('')+'<small>'+(x.assessed?(x.mastered?t('levelMastered'):t('level')+' '+x.level+' / 3'):'—')+'</small></div></div>').join('');
 const rows=periodHistory(historyData,localDay(),progressDays);$('activitySection').hidden=!p.exercises;
 $('historyRows').innerHTML=rows.length?rows.slice(0,20).map(x=>{const e=exercises.find(y=>y.id===x.mode),measured=x.stats&&x.stats.hits>=12&&x.stats.hits>=x.stats.expected*.5;return '<div class="history-row"><div><strong>'+(e?.[lang][0]||'PULSE')+'</strong><p>'+new Date(x.date).toLocaleDateString(locale())+(measured?' · '+Number(x.stats.accuracy)+'%'+(x.recognitionVerified?'':' · '+t('unchecked')):'')+'</p></div><span>'+fmt(x.seconds||0)+'</span><span>'+Number(x.bpm)+' → '+Number(x.last??x.bpm)+' BPM</span></div>'}).join(''):'<p class="history-empty">'+t('emptyHistory')+'</p>';
 $('exportHistory').disabled=!historyData.length;$('importHistory').disabled=!!active||starting||calBusy;renderStorageNotice();
}
$('progressDiagnostic').onclick=()=>startProbe({rudiment:progressRudiment,sub:progressSub});
$('progressRange').onclick=e=>{const b=e.target.closest('[data-days]');if(b){progressDays=+b.dataset.days;renderProgress()}};
$('progressPattern').onchange=e=>{progressRudiment=e.target.value;comparisonBpm=null;renderProgress()};
$('progressSub').onchange=e=>{progressSub=+e.target.value;comparisonBpm=null;renderProgress()};
$('compareBpm').onchange=e=>{comparisonBpm=+e.target.value;renderProgress()};
$('importHistory').onclick=()=>{$('historyImportFile').value='';$('historyImportFile').click()};
$('historyImportFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const status=$('importStatus');status.textContent='';try{if(file.size>50*1024*1024)throw Error('large');const merged=importBackup(await file.text());if(!merged){status.textContent=t('importNoSpace');return;}renderStorageNotice();renderProgress();status.textContent=t('importSuccess')+' · '+merged.added+' '+t('analyticsExercises')+' · '+t('importUpdated')+' '+merged.updated;}catch{status.textContent=t('importInvalid')}};
$('exportHistory').onclick=()=>{const blob=new Blob([exportBackup()],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pulse-history-'+localDay()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
return {render:renderProgress};
}

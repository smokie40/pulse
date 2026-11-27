import {skillProfile} from '../skills';
import {skillIds} from '../focused-plan';
import {pendingControl} from '../journey.js';

export function drillCue(t,x){if(x.reason==='diagSearchCue'||x.reason==='diagVerifyCue')return Math.round(x.minutes*60)+' '+t('secondsShort')+' · '+t(x.reason);if(x.mode==='ghost')return (x.audibleBars??2)+' '+t('barsWithClick')+' · '+(x.silentBars??2)+' '+t('barsSilent');if(x.mode==='morph')return t('flexLevelCue')+' · '+t('twoBarsEach');if(x.skillTest&&x.mode==='accent')return t('accentReviewCue');return t(x.reason);}
export function routeTempo(x){return x.bpm+(x.ladderMax!==undefined?' <span class="tempo-arrow">'+(x.mode==='adaptive'?'↔':'→')+'</span> '+x.ladderMax:'')+' <small>BPM</small>';}

export function renderTrainingView({$,t,historyData,focusRudiment,focusSub,planRun,manualFocus,focusSkill,trainingDetail,engine,verified,focusBpm,checkpoint,planLength,micConnecting,calBusy,stickings,subdivisions,patternNames,routeArt,skillArt,suggestion,planItems,checkedTempo,profile}){
function levelLabel(k,level){const p=skillProfile(historyData,k,focusRudiment,focusSub),n=level??p.level;return '<span class="skill-level">'+t('level')+' '+n+' / 3'+(p.mastered?' · '+t('levelMastered'):'')+'</span>';}
function renderTraining(){
 const rec=suggestion(),skill=planRun?.skill??(manualFocus?focusSkill:rec.skill),items=planRun?.items||planItems(skill),total=items.reduce((a,x)=>a+x.minutes,0),work=checkedTempo(),ready=!!(verified&&engine.mic);
 $('recommendationReason').hidden=!!planRun;$('recommendationReason').textContent=t(manualFocus?'recManual':'rec_'+rec.reason);$('autoFocus').hidden=!!planRun||!manualFocus;
 $('welcomeTempo').hidden=trainingDetail;$('dailyPlan').hidden=!trainingDetail;if(!trainingDetail){renderHome();return;}
 $('focusTitle').textContent=planRun?.probe?t('probeTitle'):t('skill_'+skill);$('focusTitleBtn').disabled=!!planRun;$('focusDesc').textContent=planRun?.probe?t('probeDescription'):t('goal_'+skill);const skillProgress=skillProfile(historyData,skill,focusRudiment,focusSub),level=items.find(x=>x.skillTest)?.skillLevel??skillProgress.level;$('levelInfo').hidden=!!planRun?.probe;$('levelInfo').innerHTML=levelLabel(skill,level)+' <span>· '+t(skillProgress.level===level?skillProgress.key:('level'+level))+'</span>';
 $('planLengthText').textContent=total+' '+t('min');$('planLength').disabled=!!planRun;
 $('planPattern').innerHTML=stickings.map((r,i)=>'<option value="'+r+'" '+(r===focusRudiment?'selected':'')+'>'+patternNames()[i]+'</option>').join('');$('planSub').innerHTML=subdivisions.map((n,i)=>'<option value="'+n+'" '+(n===focusSub?'selected':'')+'>'+t('notes')[i]+'</option>').join('');$('planPattern').disabled=$('planSub').disabled=!!planRun;
 $('beginPlan').textContent=t(planRun?'continuePlan':'beginPlan');$('cancelPlan').hidden=!planRun;$('chooseDirection').hidden=!!planRun; $('planMic').textContent=t(engine.mic?(verified?'micReadyShort':'micUncheckedShort'):'micOffShort');$('planMic').classList.toggle('positive',ready);$('planNotice').textContent=t(ready?'planMeasured':'planUnmeasured');$('planNotice').classList.toggle('positive',ready);
 $('dailySteps').innerHTML=items.map((x,i)=>{const state=planRun&&i<planRun.index?'done':planRun&&i===planRun.index?'current':'';const pending=ready&&pendingControl(items,i,planRun?.index??-1,skill);const rhythm=x.mode==='burst'?t('burstValues'):x.mode==='morph'?(x.morphSequence??[2,3,4,6]).map(n=>t('notes')[subdivisions.indexOf(n)]).join(' → '):t('notes')[subdivisions.indexOf(x.sub)];return '<article class="route-card '+state+'" style="--weight:'+x.minutes+'"><div class="route-top"><span>'+String(i+1).padStart(2,'0')+'</span><span>'+x.minutes+' '+t('min')+'</span></div>'+routeArt(x,pending)+'<h2>'+t(x.name)+'</h2><div class="route-bpm '+(pending?'pending-tempo':'')+'">'+(pending?t('afterSpeed'):routeTempo(x))+'</div><div class="route-pattern">'+rhythm+' · '+x.rudiment.split('').join(' ')+'</div><p>'+(pending?t('fallbackTempo')+' '+x.bpm+' BPM':drillCue(t,x))+'</p></article>';}).join('');
 $('planBasis').textContent=planRun?.probe?'':work===null?t('starterBasis'):t(profile().confirmedWorking?'confirmedBasis':'estimatedBasis')+' · '+work+' BPM';
 $('probeAction').hidden=!!planRun;$('starterTempo').hidden=!!planRun||work!==null;$('starterTempo').textContent=t('starterTempo')+' · '+focusBpm+' BPM ↗';$('chooseDirection').hidden=true;$('planBack').textContent=t('backGoals');$('routeLegend').hidden=!items.some(x=>['steady','ghost','morph','burst'].includes(x.mode));
 $('probeAction').textContent=t(work===null?'probeAction':'probeAgain');
}
function homeSkillStatus(k){
 const p=skillProfile(historyData,k,focusRudiment,focusSub);
 const assessed=historyData.some(x=>x.skillId===k&&x.skillBaseRudiment===focusRudiment&&x.skillBaseSub===focusSub&&x.completed&&x.recognitionVerified&&!x.manualTempoChanged&&['pass','repeat'].includes(x.skillOutcome));
 const bars=[1,2,3].map(n=>'<i class="'+(assessed&&(n<p.level||p.mastered)?'passed':assessed&&n===p.level?'current':'')+'"></i>').join('');
 if(!assessed)return '';const label=p.mastered?t('levelMastered'):t('level')+' '+p.level+' / 3';
 return '<span class="home-skill-status"><span class="home-milestones" aria-hidden="true">'+bars+'</span><small>'+label+'</small></span>';
}
function renderHome(){
 const rec=suggestion(),skill=checkpoint?.skill??rec.skill,first=!historyData.some(x=>x.completed&&!x.tempoProbe),p=skillProfile(historyData,skill,focusRudiment,focusSub);
 const remaining=checkpoint?checkpoint.items.slice(checkpoint.index).reduce((n,x)=>n+x.minutes,0):planLength;
 document.querySelector('.training-home [data-t=homeIntro]').hidden=!first||!!checkpoint;
 $('homeKicker').textContent=t(checkpoint?'homePending':first?'homeStart':'homeRecommended');
 $('homeTitle').textContent=checkpoint?t('skill_'+skill):first?t('firstTraining'):t('skill_'+skill);
 $('homeDesc').textContent=checkpoint?t('resumeStage')+' '+(checkpoint.index+1)+' / '+checkpoint.items.length+' · '+t(checkpoint.items[checkpoint.index].name):first?'':t('rec_'+rec.reason);
 $('homeMeta').textContent=checkpoint?t('remainingHome')+' '+remaining+' '+t('min'):remaining+' '+t('min')+(first?' · '+t('skill_'+skill):'');
 $('homeArt').innerHTML=checkpoint?'<div class="home-resume-track" aria-hidden="true">'+checkpoint.items.map((_,i)=>'<i class="'+(i<checkpoint.index?'passed':i===checkpoint.index?'current':'')+'"></i>').join('')+'</div>':'';
 $('homeArt').hidden=!checkpoint;
 $('welcomeStart').textContent=t(checkpoint?'continuePlan':'viewPlan');
 $('homeArt').hidden=true;$('homeViewPlan').hidden=!checkpoint;$('homeCancel').hidden=!checkpoint;const ready=!!(engine.mic&&verified);$('homeMicStatus').textContent=t(ready?'analysisReady':engine.mic?'analysisUnchecked':'analysisOff');$('homeMicStatus').classList.toggle('positive',ready);$('homeMic').textContent=t(ready?'checkMic':'configureMic');$('homeMic').disabled=micConnecting||calBusy;const work=checkedTempo();$('homeProbe').textContent=t(work===null?'homeCheckTempo':'homeRecheckTempo');$('homeTempoValue').hidden=work===null;$('homeTempoValue').textContent=work===null?'':work+' BPM';$('homeTempoContext').hidden=work===null;$('homeTempoContext').textContent=patternNames()[stickings.indexOf(focusRudiment)]+' · '+t('notes')[subdivisions.indexOf(focusSub)]+(work===null?'':' · '+t(profile().confirmedWorking?'tempoConfirmedShort':'tempoEstimatedShort'));
 $('skillPath').innerHTML=skillIds.map(k=>'<button class="home-skill choice-tile" data-skill="'+k+'"><span class="home-skill-copy choice-copy"><strong>'+t('skill_'+k)+'</strong><span class="choice-caption">'+t('shortGoal_'+k)+'</span><span class="home-arrow choice-arrow" aria-hidden="true">›</span></span>'+skillArt(k)+homeSkillStatus(k)+'</button>').join('');
}

renderTraining();
}

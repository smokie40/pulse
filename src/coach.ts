import {type Mode,type Stats,type Note,summarize} from './training';
export type Stage={bpm:number;accuracy:number;expected:number;extra:number;decision:'up'|'hold'|'down'|'check';next:number};
export type Session={date:string;mode:Mode;bpm:number;seconds:number;stats:Stats|null;rudiment?:string;sub?:number;stages?:Stage[];recognitionVerified?:boolean;manualTempoChanged?:boolean;tempoProbe?:boolean;diagnosticStage?:string;diagnosticResult?:boolean;completed?:boolean;tempoWindows?:import('./progression').TempoWindow[];controlTest?:boolean;clickSub?:boolean;beats?:number;practiceDay?:string;skillId?:import('./skills').SkillId;skillLevel?:number;skillBaseRudiment?:string;skillBaseSub?:number;skillTarget?:number;skillOutcome?:import('./skills').SkillOutcome;skillEvidence?:import('./skills').SkillEvidence;skillSelfCheck?:boolean};
export function assess(bpm:number,notes:Note[],extra:number,step:number,max:number):Stage{
 const s=summarize(notes,extra,Infinity);
 const valid=s.expected>=12&&s.hits>=s.expected*.5;
 const decision=!valid?'check':s.accuracy>=92&&s.deviation!==null&&s.deviation<=20?'up':s.accuracy<75?'down':'hold';
 const next=decision==='up'?Math.max(bpm,Math.min(max,bpm+step)):decision==='down'?Math.max(30,bpm-step):bpm;
 return {bpm,accuracy:s.accuracy,expected:s.expected,extra,decision,next};
}
export function workingTempo(sessions:Session[],rudiment:string,sub:number):number|null{
 const candidates=sessions.filter(s=>(!s.tempoProbe||s.completed)&&(!s.diagnosticStage||s.diagnosticResult===true)&&!s.manualTempoChanged&&s.rudiment===rudiment&&s.sub===sub&&s.stats&&s.seconds>=20);
 const confirmed=candidates.flatMap(s=>s.mode==='adaptive'?(s.stages??[]).filter(t=>t.decision==='up'&&t.expected>=12).map(t=>t.bpm):s.mode==='steady'&&s.stats!.accuracy>=92&&s.stats!.expected>=40&&(s.stats!.deviation??Infinity)<=20?[s.bpm]:[]);
 return confirmed.length?Math.max(...confirmed):null;
}
export type Drill={mode:Mode;name:string;minutes:number;bpm:number;sub:number;rudiment:string;reason:string;clickSub?:boolean;ladderStep?:number;ladderMax?:number;confirmation?:boolean;audibleBars?:number;silentBars?:number;morphSequence?:number[];skillTest?:boolean;skillLevel?:number;skillBaseRudiment?:string;skillBaseSub?:number;skillTarget?:number};
export function plan(sessions:Session[],minutes:number,rudiment:string,sub:number,fallback:number):Drill[]{
 const base=workingTempo(sessions,rudiment,sub)??fallback;
 const recent=sessions.filter(s=>!s.manualTempoChanged&&s.stats&&s.seconds>=30&&s.rudiment===rudiment&&s.sub===sub).slice(0,12);
 const rank=(mode:Mode)=>{const x=recent.filter(s=>s.mode===mode);return x.length?x.reduce((a,s)=>a+s.stats!.accuracy,0)/x.length:70;};
 const focus=(['ghost','morph','steady'] as Mode[]).sort((a,b)=>rank(a)-rank(b))[0];
 const reason=recent.some(s=>s.mode===focus)?'Приоритет по последним измеренным занятиям.':'Проверка навыка: измерений пока недостаточно.';
 const warm=Math.max(2,Math.floor(minutes*.15)),diagnostic=Math.max(2,Math.floor(minutes*.25)),target=Math.max(2,Math.floor(minutes*.3)),burst=Math.max(1,Math.floor(minutes*.15)),end=minutes-warm-diagnostic-target-burst;
 const tempo=(factor:number)=>Math.max(30,Math.min(300,Math.round(base*factor)));
 return [{mode:'steady',name:'Разминка',minutes:warm,bpm:tempo(.75),sub,rudiment,reason:'Свободные, равномерные удары.'},{mode:'adaptive',name:'Диагностика темпа',minutes:diagnostic,bpm:tempo(.9),sub,rudiment,reason:'Автоматическое изменение BPM по качеству ударов.'},{mode:focus,name:focus==='ghost'?'Внутренний пульс':focus==='morph'?'Ритмическая гибкость':'Точность',minutes:target,bpm:tempo(.85),sub,rudiment,reason},{mode:'burst',name:'Скоростные серии',minutes:burst,bpm:tempo(.95),sub:4,rudiment,reason:'Короткие ускорения с восстановлением.'},...(end>0?[{mode:'steady' as Mode,name:'Контрольный подход',minutes:end,bpm:tempo(1),sub,rudiment,reason:'Повторяемый тест на рабочем темпе.'}]:[])];
}

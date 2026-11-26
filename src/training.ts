import type {ClickSound} from './click-wave';
export type Mode = 'steady'|'ghost'|'burst'|'morph'|'ladder'|'accent'|'adaptive';
export type VisualMode='grid'|'notation'|'pulse'|'timer';
export type Config = {bpm:number;beats:number;sub:number;minutes:number;countIn:number;visual:VisualMode;showNext:boolean;mode:Mode;rudiment:string;volume:number;sound:ClickSound;accentVolume:number;beatVolume:number;subVolume:number;clickSub:boolean;audibleBars:number;silentBars:number;ladderStep:number;ladderMax:number;offset:number;sensitivity:number};
export const defaults:Config={bpm:120,beats:4,sub:4,minutes:5,countIn:1,visual:'grid',showNext:true,mode:'steady',rudiment:'RL',volume:55,sound:'soft',accentVolume:100,beatVolume:100,subVolume:100,clickSub:false,audibleBars:2,silentBars:2,ladderStep:5,ladderMax:180,offset:0,sensitivity:50};
export const modes:{id:Mode;name:string;desc:string}[]=[
{id:'steady',name:'Precision',desc:'Ровные удары под стабильный пульс.'},
{id:'ghost',name:'Ghost click',desc:'Чередуй звучащие и беззвучные такты. Не сбивайся в тишине.'},
{id:'burst',name:'Speed burst',desc:'Два такта восьмыми, два такта шестнадцатыми.'},
{id:'morph',name:'Rhythm morph',desc:'Каждые два такта: восьмые, триоли, шестнадцатые, секстоли.'},
{id:'ladder',name:'Tempo ladder',desc:'Темп растёт через каждые четыре такта до заданного потолка.'},
{id:'adaptive',name:'Adaptive speed',desc:'Каждые четыре такта оценивает качество и меняет темп. Нужен микрофон.'},
{id:'accent',name:'Accent lab',desc:'Смещай акцент на следующую ноту каждой доли через такт.'}];
export const rudiments=[{id:'RL',name:'Single stroke roll'},{id:'LR',name:'Single stroke · left lead'},{id:'RRLL',name:'Double stroke roll'},{id:'RLRRLRLL',name:'Single paradiddle'},{id:'RLRLRRLRLRLL',name:'Double paradiddle'},{id:'RLLRRL',name:'Six stroke roll · sticking'}];
export function barSpec(c:Config,bar:number){
 const sub=c.mode==='burst'?(Math.floor(bar/2)%2?4:2):c.mode==='morph'?[2,3,4,6][Math.floor(bar/2)%4]:c.sub;
 const bpm=c.mode==='ladder'?Math.min(Math.max(c.bpm,c.ladderMax),c.bpm+Math.floor(bar/4)*c.ladderStep):c.bpm;
 const silent=c.mode==='ghost'&&bar%(c.audibleBars+c.silentBars)>=c.audibleBars;
 return {sub,bpm,silent,accent:c.mode==='accent'?bar%sub:0};
}
export type Note={time:number;interval:number;bar:number;step:number;global:number;sub:number;bpm:number;silent:boolean;accent:boolean;matched?:number};
export function summarize(notes:Note[],extra:number,until:number){
 const eligible=notes.filter(n=>n.time<=until);
 const hits=eligible.filter(n=>n.matched!==undefined);
 const errors=hits.map(n=>n.matched!);
 const sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
 return {expected:eligible.length,hits:hits.length,missed:eligible.length-hits.length,extra,
 accuracy:eligible.length?Math.round(100*hits.filter(n=>Math.abs(n.matched!)<=Math.min(30,n.interval*350)).length/(eligible.length+extra)):0,
 deviation:errors.length?Math.round(Math.sqrt(sum(errors.map(v=>v*v))/errors.length)*10)/10:null,
 bias:errors.length?Math.round(sum(errors)/errors.length*10)/10:null};
}
export type Stats=ReturnType<typeof summarize>;
export function matchHit(notes:Note[],time:number){
 let best:Note|undefined;let d=Infinity;
 for(let i=notes.length-1;i>=0;i--){const n=notes[i];if(n.time<time-0.21)break;const delta=Math.abs(n.time-time);
 if(n.matched===undefined&&delta<=Math.min(.16,n.interval*.47)&&delta<d){best=n;d=delta;}}
 if(best)best.matched=(time-best.time)*1000;
 return best;
}

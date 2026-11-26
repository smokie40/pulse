import type {Config,Note,Stats} from './training';
import {barSpec,modes,rudiments} from './training';
import type {PulseEngine} from './audio';
import {feedback,type Period} from './report';
type T=(k:string)=>string;
type Snap=ReturnType<PulseEngine['snapshot']>;
const subs:Record<number,string>={1:'Четверти',2:'Восьмые',3:'Триоли',4:'16-е',5:'Квинтоли',6:'Секстоли',8:'32-е'};
export const clock=(n:number)=>String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')+':'+String(Math.floor(Math.max(0,n)%60)).padStart(2,'0');
function Grid({cfg,bar,sub,start,current,silent,notes,t,preview=false}:{cfg:Config;bar:number;sub:number;start:number;current:number;silent:boolean;notes:Note[];t:T;preview?:boolean}){
 return <div className={'playing-grid '+(preview?'preview-grid':'')} style={{gridTemplateColumns:'repeat('+cfg.beats+', minmax(0,1fr))'}}>
 {Array.from({length:cfg.beats},(_,beat)=><div className="playing-beat" key={beat}><div className="beat-heading">{beat+1}</div><div className="playing-notes" style={{gridTemplateColumns:'repeat('+sub+',minmax(0,1fr))'}}>{Array.from({length:sub},(_,j)=>{const i=beat*sub+j,n=notes.find(n=>n.bar===bar&&n.step===i),accent=cfg.mode==='accent'&&j===bar%sub;const marked=n?.matched!==undefined;return <div className={'playing-note '+(!silent&&current===i?'now ':'')+(accent?'accented ':'')+(!silent&&current>i?'passed ':'')} key={j}><span className="note-accent">{accent?'›':' '}</span><strong>{cfg.rudiment[(start+i)%cfg.rudiment.length]}</strong><span className="note-count">{j===0?beat+1:sub===4?['','e','&','a'][j]:sub===2?'&':'·'}</span><span className={'hit-dot '+(!silent&&marked?(Math.abs(n!.matched!)<=Math.min(30,n!.interval*350)?'hit-good':'hit-off'):'')}/></div>;})}</div></div>)}
 </div>;
}
export function Performance({cfg,snap,t,stop}:{cfg:Config;snap:Snap;t:T;stop:()=>void}){
 const bar=snap.current?.bar??0,global=snap.current?snap.current.global-snap.current.step:0;
 const spec=barSpec({...cfg,bpm:cfg.mode==='adaptive'?(snap.current?.bpm??cfg.bpm):cfg.bpm},bar);
 const next=barSpec({...cfg,bpm:cfg.mode==='adaptive'?(snap.upcoming?.bpm??spec.bpm):cfg.bpm},bar+1);
 const adaptiveUnknown=cfg.mode==='adaptive'&&(bar+1)%4===0&&!snap.upcoming;
 const nextStart=global+cfg.beats*spec.sub;
 const showStats=snap.measured&&snap.stats.expected>0&&!spec.silent&&!snap.counting;
 return <section className="performance">
 <div className="performance-head"><div><div className="section-label">{t('Performance')}</div><h2>{t(modes.find(m=>m.id===cfg.mode)!.name)}</h2><p>{t(rudiments.find(r=>r.id===cfg.rudiment)!.name)} · {cfg.beats}/4</p></div><button className="stop-practice" onClick={stop}>■ {t('Stop practice')}</button></div>
 <div className="performance-metrics"><div><span>{t('Темп')}</span><strong>{spec.bpm}<small>BPM</small></strong></div><div><span>{t('ACCURACY')}</span><strong className="live-accuracy">{showStats?snap.stats.accuracy+'%':'—'}</strong></div><div><span>{t('Remaining')}</span><strong>{spec.silent?'—':clock(Math.ceil(cfg.minutes*60-snap.elapsed))}</strong></div></div>
 {snap.counting?<div className="count-in"><div className="section-label">{t('Count-in')}</div><strong>{snap.countBeat>0?(snap.countBeat-1)%cfg.beats+1:'—'}</strong><div className="count-lights">{Array.from({length:cfg.beats},(_,i)=><i key={i} className={i===(snap.countBeat-1)%cfg.beats?'active':''}/>)}</div><p>{t('Get ready')}</p></div>:<><div className="play-label"><b>{spec.silent?t('Keep the pulse'):t('BAR')+' '+(bar+1)}</b><span>{t(subs[spec.sub])}</span></div><Grid cfg={cfg} bar={bar} sub={spec.sub} start={global} current={snap.current?.step??-1} silent={spec.silent} notes={snap.recent} t={t}/></>}
 <div className="play-label next-label"><b>{t(snap.counting?'First bar':'Next bar')}</b><span>{snap.counting?t(subs[spec.sub]):t(subs[next.sub])+' · '+(adaptiveUnknown?t('Tempo pending'):next.bpm+' BPM')}</span></div>
 <Grid cfg={cfg} bar={snap.counting?0:bar+1} sub={snap.counting?spec.sub:next.sub} start={snap.counting?0:nextStart} current={-1} silent={true} notes={[]} t={t} preview/>
 <div className="performance-footer"><span>{t('R/L legend')}</span><span>{spec.silent?t('SILENCE'):clock(snap.elapsed)+' / '+clock(cfg.minutes*60)}</span></div>{!spec.silent&&<div className="progress"><i style={{width:Math.min(100,snap.elapsed/(cfg.minutes*60)*100)+'%'}}/></div>}
 </section>;
}
export function Results({cfg,snap,segments,t,back,retry,next}:{cfg:Config;snap:Snap;segments:Period[];t:T;back:()=>void;retry:()=>void;next?:()=>void}){
 const s=snap.stats,measured=snap.measured&&s.expected>0;
 const ms=(v:number|null)=>v===null?'—':v+' '+t('ms');
 return <section className="result-page"><div className="section-label">{t('Session results')}</div><h1>{t('Practice complete')}</h1><p>{t(modes.find(m=>m.id===cfg.mode)!.name)} · {t(rudiments.find(r=>r.id===cfg.rudiment)!.name)} · {cfg.bpm} BPM · {clock(snap.elapsed)}</p>
 {measured?<><div className="result-stats">{[{label:t('ACCURACY'),value:s.accuracy+'%'},{label:t('RMS ошибка'),value:ms(s.deviation)},{label:t('Смещение'),value:ms(s.bias)},{label:t('Удары'),value:s.hits},{label:t('Пропуски'),value:s.missed},{label:t('Лишние'),value:s.extra}].map(m=><div className="panel" key={m.label}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div><div className="result-body"><section className="panel"><h2>{t('Accuracy over time')}</h2><p>{t('Period description')}</p><div className="period-chart">{segments.map((p,i)=><div className="period" key={i} title={clock(p.seconds)+' · '+p.stats.accuracy+'%'}><span>{p.stats.accuracy}%</span><div className="period-track"><i style={{height:p.stats.accuracy+'%'}}/></div><small>{clock(p.seconds)}</small></div>)}</div></section><section className="panel"><h2>{t('What to work on')}</h2>{feedback(s,segments).map(k=><p key={k}>{t(k)}</p>)}<p className="hint">{t('Measurement caveat')}</p></section></div></>:<section className="panel"><h2>{t('Без микрофона')}</h2><p>{t('No measurement')}</p></section>}
 <div className="result-actions"><button onClick={back}>{t('Back to setup')}</button><button onClick={retry}>{t('Repeat practice')}</button>{next&&<button className="play" onClick={next}>{t('Следующий этап →')}</button>}</div></section>;
}

import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PulseEngine} from './audio';
import {barSpec,defaults,modes,rudiments,type Config,type Mode,type Stats} from './training';
import './style.css';
type Session={date:string;mode:Mode;bpm:number;seconds:number;stats:Stats|null};
const read=<T,>(key:string,fallback:T):T=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const save=(key:string,v:unknown)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
const fmt=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0');
const subs:Record<number,string>={1:'Четверти',2:'Восьмые',3:'Триоли',4:'16-е',5:'Квинтоли',6:'Секстоли',8:'32-е'};
const engine=new PulseEngine();
function App(){
 const [cfg,setCfg]=useState<Config>(()=>({...defaults,...read('pulse-settings',{})}));
 const [history,setHistory]=useState<Session[]>(()=>read('pulse-history',[]));
 const [snap,setSnap]=useState(()=>engine.snapshot());
 const [mic,setMic]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [tab,setTab]=useState<'studio'|'history'>('studio');
 const lastRun=useRef(false),taps=useRef<number[]>([]);
 const update=<K extends keyof Config,>(k:K,v:Config[K])=>setCfg(c=>({...c,[k]:v}));
 useEffect(()=>save('pulse-settings',cfg),[cfg]);
 useEffect(()=>save('pulse-history',history),[history]);
 useEffect(()=>{const id=window.setInterval(()=>{const s=engine.snapshot();setSnap(s);
 if(lastRun.current&&!s.active){lastRun.current=false;const c=engine.cfg;if(c&&s.elapsed>=1)setHistory(h=>[{date:new Date().toISOString(),mode:c.mode,bpm:c.bpm,seconds:s.elapsed,stats:s.measured?s.stats:null},...h].slice(0,200));}
 },65);return()=>window.clearInterval(id);},[]);
 async function toggle(){if(engine.active){engine.stop();return;}if(busy)return;setBusy(true);setError('');try{await engine.start(cfg);lastRun.current=true;setSnap(engine.snapshot());}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function toggleMic(){if(engine.active||busy)return;setBusy(true);setError('');try{if(engine.mic)engine.disableMic();else await engine.enableMic(cfg.sensitivity);setMic(engine.mic);}catch(e){setError('Не удалось включить микрофон: '+String(e));}finally{setBusy(false);}}
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)&&!(e.target instanceof HTMLSelectElement)){e.preventDefault();void toggle();}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);});
 useEffect(()=>{const fn=()=>{if(document.hidden&&engine.active){engine.stop();setError('Тренировка остановлена: вкладка скрыта.');}};document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},[]);
 const locked=snap.active||busy;
 const tap=()=>{const t=performance.now();let a=taps.current;if(a.length&&t-a[a.length-1]>2000)a=[];a=[...a,t].slice(-5);taps.current=a;if(a.length>1)update('bpm',Math.max(30,Math.min(300,Math.round(60000*(a.length-1)/(t-a[0])))));};
 const bar=snap.active?snap.current?.bar??0:0;
 const spec=barSpec(cfg,bar),mode=modes.find(m=>m.id===cfg.mode)!;
 const current=snap.active?snap.current?.step??-1:-1;
 const measure=snap.measured&&(snap.active||snap.elapsed>0);
 const stats=snap.stats;
 const noteCount=cfg.beats*spec.sub;
 const progress=Math.min(100,snap.elapsed/(cfg.minutes*60)*100);
 return <div className="shell">
 <header><a className="brand" href="./">PULSE<span>.</span><small> PRACTICE STUDIO</small></a><nav><button className={tab==='studio'?'nav active':'nav'} onClick={()=>setTab('studio')}>Студия</button><button className={tab==='history'?'nav active':'nav'} onClick={()=>setTab('history')}>История</button></nav><span className="version">V.01</span></header>
 {tab==='studio'?<><div className="intro"><div><div className="eyebrow">DRUM TRAINING / 01</div><h1>Find your <em>pulse.</em></h1><p>Тренировочная студия для пэда и двух палочек.</p></div><div className="status"><i className={mic?'live':''}/>{mic?'MIC CONNECTED':'MIC OFF'}</div></div>
 <main><aside className="panel modes"><div className="section-label">01 / TRAINING MODES</div>{modes.map(m=><button key={m.id} disabled={locked} onClick={()=>update('mode',m.id)} className={'mode '+(cfg.mode===m.id?'selected':'')}><span className="mode-index">{String(modes.indexOf(m)+1).padStart(2,'0')}</span><span><b>{m.name}</b><small>{m.desc}</small></span></button>)}</aside>
 <div className="center">
 <section className="panel transport"><div className="panel-head"><span className="section-label">02 / METRONOME</span><span className="tag">{snap.active?'LIVE':'READY'}</span></div>
 <div className="tempo"><button disabled={locked} onClick={()=>update('bpm',Math.max(30,cfg.bpm-1))} aria-label="Уменьшить темп">−</button><div className="bpm"><input aria-label="Темп BPM" type="number" min="30" max="300" value={snap.active?spec.bpm:cfg.bpm} disabled={locked} onChange={e=>update('bpm',Math.max(30,Math.min(300,Number(e.target.value)||30)))}/><span>BPM</span></div><button disabled={locked} onClick={()=>update('bpm',Math.min(300,cfg.bpm+1))} aria-label="Увеличить темп">+</button></div>
 <input aria-label="Темп" className="range" type="range" min="30" max="300" value={cfg.bpm} disabled={locked} onChange={e=>update('bpm',+e.target.value)}/>
 <div className="quick"><button disabled={locked} onClick={tap}>TAP TEMPO</button>{[80,100,120,140,160,180].map(b=><button disabled={locked} className={cfg.bpm===b?'chosen':''} key={b} onClick={()=>update('bpm',b)}>{b}</button>)}</div>
 <div className="fields"><label>Размер<select disabled={locked} value={cfg.beats} onChange={e=>update('beats',+e.target.value)}>{[2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}/4</option>)}</select></label><label>Подразделение<select disabled={locked||cfg.mode==='morph'||cfg.mode==='burst'} value={cfg.sub} onChange={e=>update('sub',+e.target.value)}>{Object.entries(subs).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Длительность<select disabled={locked} value={cfg.minutes} onChange={e=>update('minutes',+e.target.value)}>{[1,2,3,5,10,15,20,30].map(n=><option key={n} value={n}>{n} мин</option>)}</select></label></div>
 <div className="controls"><button className="play" disabled={busy} onClick={()=>void toggle()}>{snap.active?'■  Остановить':'▶  Начать тренировку'}</button><button className={mic?'mic on':'mic'} disabled={locked} onClick={()=>void toggleMic()}>{mic?'● MIC ON':'○ MIC OFF'}</button></div><div className="hint">Пробел — старт / стоп · Для анализа используй проводные наушники.</div>
 </section>
 <section className="panel exercise"><div className="panel-head"><span className="section-label">03 / RHYTHM GRID</span><span className={'tag '+(spec.silent?'silent':'')}>{spec.silent?'SILENCE':'BAR '+String(bar+1).padStart(2,'0')}</span></div>
 <div className="exercise-head"><div><h2>{mode.name}</h2><p>{mode.desc}</p></div><label>Аппликатура<select disabled={locked} value={cfg.rudiment} onChange={e=>update('rudiment',e.target.value)}>{rudiments.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>
 <div className="rhythm" style={{gridTemplateColumns:'repeat('+noteCount+', minmax(13px,1fr))'}}>{Array.from({length:noteCount},(_,i)=>{const g=snap.active&&snap.current?snap.current.global-snap.current.step+i:i;return <div key={i} className={'note '+(i%spec.sub===0?'beat ':'')+(i===current?'current ':'')+(cfg.mode==='accent'&&i%spec.sub===spec.accent?'accent':'')}><span className="beatnum">{i%spec.sub===0?Math.floor(i/spec.sub)+1:'·'}</span><i/><b>{cfg.rudiment[g%cfg.rudiment.length]}</b></div>})}</div>
 <div className="elapsed"><b>{fmt(snap.elapsed)}</b><span>{subs[spec.sub]} · {spec.bpm} BPM</span><b>{fmt(cfg.minutes*60)}</b></div><div className="progress"><i style={{width:progress+'%'}}/></div>
 </section></div>
 <aside className="right"><section className="panel analysis"><div className="section-label">04 / HIT ANALYSIS</div><h2>Точность игры</h2><p>{measure?'Экспериментальный анализ микрофона.':'Включи микрофон перед началом тренировки.'}</p>
 <div className="big-stat">{measure?stats.accuracy+'%':'—'}<small>ACCURACY</small></div>
 <div className="statgrid">{[{label:'RMS ошибка',v:measure&&stats.deviation!==null?stats.deviation+' ms':'—'},{label:'Смещение',v:measure&&stats.bias!==null?(stats.bias>0?'+':'')+stats.bias+' ms':'—'},{label:'Удары',v:measure?stats.hits:'—'},{label:'Пропуски',v:measure?stats.missed:'—'},{label:'Лишние',v:measure?stats.extra:'—'}].map(s=><div key={s.label}><b>{s.v}</b><small>{s.label}</small></div>)}</div>
 <div className="scatter"><div className="axis"/>{measure&&snap.recent.filter(n=>n.matched!==undefined).map(n=><i key={n.global} style={{left:Math.max(2,Math.min(98,50+n.matched!*.75))+'%',top:(8+n.global%7*12)+'%',background:Math.abs(n.matched!)<=Math.min(30,n.interval*350)?'#8bd5aa':'#ff8051'}}/>)}</div><div className="axis-label"><span>Раньше</span><span>0</span><span>Позже</span></div>
 </section><section className="panel settings"><div className="section-label">05 / SETTINGS</div><label>Громкость клика <b>{cfg.volume}%</b><input type="range" min="0" max="100" disabled={locked} value={cfg.volume} onChange={e=>update('volume',+e.target.value)}/></label><label className="check"><input type="checkbox" disabled={locked} checked={cfg.clickSub} onChange={e=>update('clickSub',e.target.checked)}/> Озвучивать подразделения</label>
 {cfg.mode==='ghost'&&<div className="fields two"><label>Звук, тактов<input type="number" min="1" max="16" disabled={locked} value={cfg.audibleBars} onChange={e=>update('audibleBars',Math.max(1,Math.min(16,+e.target.value)))}/></label><label>Тишина, тактов<input type="number" min="1" max="16" disabled={locked} value={cfg.silentBars} onChange={e=>update('silentBars',Math.max(1,Math.min(16,+e.target.value)))}/></label></div>}
 {cfg.mode==='ladder'&&<div className="fields two"><label>Шаг BPM<input type="number" min="1" max="20" disabled={locked} value={cfg.ladderStep} onChange={e=>update('ladderStep',Math.max(1,Math.min(20,+e.target.value)))}/></label><label>Потолок BPM<input type="number" min="30" max="300" disabled={locked} value={cfg.ladderMax} onChange={e=>update('ladderMax',Math.max(30,Math.min(300,+e.target.value)))}/></label></div>}
 <label>Чувствительность микрофона <b>{cfg.sensitivity}</b><input type="range" min="0" max="100" disabled={locked} value={cfg.sensitivity} onChange={e=>update('sensitivity',+e.target.value)}/></label><label>Компенсация задержки <b>{cfg.offset} ms</b><input type="range" min="-100" max="200" step="1" disabled={locked} value={cfg.offset} onChange={e=>update('offset',+e.target.value)}/></label><p className="hint">Если стабильные удары систематически запаздывают, проверь задержку аудиотракта. Ручная настройка не заменяет калибровку.</p></section></aside>
 </main></>:<section className="panel history"><div className="section-label">TRAINING HISTORY</div><h1>Твоя практика</h1><p>Сохранено локально в этом браузере.</p><div className="history-summary"><div><b>{history.length}</b><small>Занятий</small></div><div><b>{Math.round(history.reduce((n,s)=>n+s.seconds,0)/60)}</b><small>Минут</small></div></div>{history.length?history.map((s,i)=><div className="history-row" key={s.date+i}><span>{new Date(s.date).toLocaleString('ru-RU')}</span><b>{modes.find(m=>m.id===s.mode)?.name}</b><span>{s.bpm} BPM</span><span>{fmt(s.seconds)}</span><span>{s.stats?s.stats.accuracy+'%':'Без микрофона'}</span></div>):<p>Здесь появятся завершённые и остановленные тренировки.</p>}<button onClick={()=>{if(confirm('Удалить локальную историю?'))setHistory([]);}} disabled={!history.length}>Очистить историю</button></section>}
 {error&&<div role="alert" className="error">{error}</div>}<footer><span>PULSE / PRIVATE PRACTICE STUDIO</span><span>LOCAL AUDIO · NO UPLOADS</span></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);

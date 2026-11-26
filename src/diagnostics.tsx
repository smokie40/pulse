import {useState,useEffect,useRef} from 'react';
import type {Config} from './training';
import type {PulseEngine} from './audio';
import {steps,chooseSensitivity,evaluate,dbfs,backgroundDb,type Capture} from './calibration';
type T=(key:string)=>string;
export function Diagnostics({engine,cfg,t,onApply,onBusy,onClose,revision}:{engine:PulseEngine;cfg:Config;t:T;onApply:(n:number)=>void;onBusy:(v:boolean)=>void;onClose:()=>void;revision:string}){
 const [captures,setCaptures]=useState<Capture[]>([]),[running,setRunning]=useState(false),[remaining,setRemaining]=useState(0),[error,setError]=useState(false),[candidate,setCandidate]=useState<number|null>(null),[applied,setApplied]=useState(false);
 const [meter,setMeter]=useState({rms:0,peak:0});
 const start=useRef(0);
 useEffect(()=>{const id=window.setInterval(()=>{setMeter({rms:engine.meterRms,peak:engine.meterPeak});if(start.current)setRemaining(Math.max(0,Math.ceil((start.current-performance.now())/1000)));},80);return()=>clearInterval(id);},[engine]);
 useEffect(()=>{setCaptures([]);setCandidate(null);setApplied(false);},[revision]);
 const index=captures.length,step=steps[index],report=evaluate(captures,candidate??cfg.sensitivity),bg=backgroundDb(captures.find(c=>c.step==='noise'));
 async function run(){if(!step||running)return;setError(false);setRunning(true);onBusy(true);setRemaining(step.seconds);start.current=performance.now()+step.seconds*1000;
 try{const c=await engine.capture(step.id,step.seconds,step.expected,cfg);const next=[...captures,c];setCaptures(next);if(next.length===steps.length)setCandidate(chooseSensitivity(next,cfg.sensitivity));}catch{setError(true);}finally{start.current=0;setRunning(false);onBusy(false);}
 }
 return <section className="diag-page"><div className="diag-head"><div><div className="section-label">{t('DIAGNOSTICS')}</div><h1>{t('Calibrate microphone')}</h1><p>{t('Diagnostic intro')}</p></div><button disabled={running} onClick={onClose}>{t('Back to setup')}</button></div>
 <div className="diag-layout"><section className="panel"><h2>{t('Input level')}</h2><div className="level-readout"><strong>{Math.round(dbfs(meter.rms))} <small>dBFS</small></strong><span>{meter.peak>=.95?t('Signal clipping'):t('Live signal')}</span></div><div className="level-meter">{Array.from({length:30},(_,i)=><i key={i} className={i/30<(dbfs(meter.rms)+100)/100?'lit':''}/>)}</div><p>{t('Background level')}: {bg===null?'—':Math.round(bg)+' dBFS'}</p><p className="hint">{t('Latency not measured')}</p></section><section className="panel diag-steps"><h2>{t('Diagnostic stages')}</h2>{steps.map((s,i)=><div className={'diag-row '+(i===index?'active':'')} key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><b>{t('diag '+s.id)}</b>{i===index&&<p>{t('diag instruction '+s.id)}</p>}</div><strong>{report.rows[i]?.detected??'—'}{s.expected>0?' / '+s.expected:''}</strong></div>)}
 {step?<button className="play" disabled={running} onClick={()=>void run()}>{running?t('Testing stage')+' · '+remaining+' s':t('Start stage')}</button>:<div className="diag-outcome"><h2>{t(report.passed?'Calibration candidate':'Calibration no fit')}</h2><p>{t(report.passed?'Calibration candidate detail':'Calibration no fit detail')}</p>{candidate!==null&&<button className="play" disabled={applied} onClick={()=>{onApply(candidate);setApplied(true);}}>{t(applied?'Sensitivity applied':'Apply sensitivity')} · {candidate}</button>}<button onClick={()=>{setCaptures([]);setCandidate(null);setApplied(false);}}>{t('Repeat diagnostics')}</button></div>}
 {error&&<p role="alert">{t('Diagnostic interrupted')}</p>}
 </section></div></section>;
}

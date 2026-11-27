import type {Capture,Frame,Step} from './calibration';
import {frequencies,makeClick,type ClickKind,type ClickSound} from './click-wave';
import {assess,type Stage} from './coach';
import {barSpec,matchHit,type Config,type Note} from './training';
import {LiveStats} from './live-stats';
export class PulseEngine{
 private liveStats=new LiveStats();
 private micRevision=0;
 private pausedAt:number|null=null;
 private pauseTask:Promise<boolean>|null=null;
 hadPause=false;
 get paused(){return this.pausedAt!==null;}
 ctx:AudioContext|null=null; gain:GainNode|null=null; stream:MediaStream|null=null; detector:AudioWorkletNode|null=null; source:MediaStreamAudioSourceNode|null=null; sink:GainNode|null=null;
 notes:Note[]=[]; extra=0; extraTimes:number[]=[]; stages:Stage[]=[]; adaptiveBpm=120; active=false; mic=false; measured=false; startTime=0; endTime=0; stoppedAt=0; cfg:Config|null=null;
 private timer:number|undefined; private next=0; private countStart=0; private countNext=0; private countIndex=0; private bar=0; private step=0; private global=0; private voices=new Set<AudioBufferSourceNode>(); private clickBuffers=new Map<ClickKind,AudioBuffer>(); micEvents=0; private testing=false; private testEvents=0; private previewRevision=0; private sound:ClickSound='woodblock'; private levels=[100,100,100]; meterRms=0; meterPeak=0; private captureFrames:Frame[]|null=null; private diagnostic=false; private captureHits=0; diagnosticLiveCount=0; private captureDone:(()=>void)|null=null;
 async init(){if(!this.ctx||this.ctx.state==='closed'){this.ctx=new AudioContext({latencyHint:'interactive'});this.clickBuffers.clear();this.gain=this.ctx.createGain();this.gain.connect(this.ctx.destination);}await this.ctx.resume();}
 async enableMic(sensitivity:number){
  if(this.mic)return;const revision=++this.micRevision;await this.init();if(revision!==this.micRevision)throw new Error('Microphone request cancelled');
  if(!navigator.mediaDevices?.getUserMedia||!this.ctx!.audioWorklet)throw new Error('Микрофон требует HTTPS и поддержки AudioWorklet.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  try{if(revision!==this.micRevision)throw new Error('Microphone request cancelled');await this.ctx!.audioWorklet.addModule(new URL('hit-detector.js?v=7',document.baseURI).href);
  if(revision!==this.micRevision)throw new Error('Microphone request cancelled');
  this.source=this.ctx!.createMediaStreamSource(stream);this.detector=new AudioWorkletNode(this.ctx!,'pulse-detector');this.sink=this.ctx!.createGain();this.sink.gain.value=0;
  this.detector.port.postMessage({sensitivity,frequencies:[...frequencies(this.sound)]});this.source.connect(this.detector);this.detector.connect(this.sink);this.sink.connect(this.ctx!.destination);
  this.detector.port.onmessage=(e:MessageEvent<{kind:string;time:number;peak:number;rms:number;frames:Frame[];captured?:boolean}>)=>{if(e.data.kind==='capture-end'){this.captureDone?.();return;}if(e.data.kind==='meter'){this.meterRms=e.data.rms;this.meterPeak=e.data.peak;return;}if(e.data.kind==='frames'){this.captureFrames?.push(...e.data.frames);return;}if(e.data.kind!=='hit')return;this.micEvents++;if(e.data.captured&&this.captureFrames!==null){this.captureHits++;this.diagnosticLiveCount=this.captureHits;}if(this.testing){this.testEvents++;return;}if(!this.active||this.paused||!this.cfg)return;const t=e.data.time-this.cfg.offset/1000;if(t<this.startTime||t>=this.endTime)return;const matched=matchHit(this.notes,t);if(matched)this.liveStats.matched(matched);else{this.extra++;this.extraTimes.push(t);}};
  this.stream=stream;this.mic=true;}catch(e){stream.getTracks().forEach(t=>t.stop());if(revision===this.micRevision)this.disableMic();throw e;}
 }
 disableMic(){this.micRevision++;this.stream?.getTracks().forEach(t=>t.stop());this.source?.disconnect();this.detector?.disconnect();this.sink?.disconnect();if(this.detector)this.detector.port.onmessage=null;this.stream=null;this.source=null;this.detector=null;this.sink=null;this.mic=false;this.testing=false;this.micEvents=0;this.meterRms=0;this.meterPeak=0;}
 setSensitivity(v:number){this.detector?.port.postMessage({sensitivity:v});}
 configureSound(c:Config){
  if(this.sound!==c.sound){this.sound=c.sound;this.clickBuffers.clear();this.detector?.port.postMessage({frequencies:[...frequencies(this.sound)]});}
  this.levels=[c.accentVolume,c.beatVolume,c.subVolume];if(this.gain)this.gain.gain.value=c.volume/100*.45;
 }
 async preview(c:Config){if(this.active||this.testing||this.diagnostic)return;const revision=++this.previewRevision;await this.init();if(revision!==this.previewRevision||this.active||this.testing||this.diagnostic)return;this.stop();this.configureSound(c);const start=this.ctx!.currentTime+.04;for(let i=0;i<3;i++)this.click(start+i*.24,i===0,i!==2);}
 async capture(step:Step,seconds:number,expected:number,c:Config):Promise<Capture>{
  if(!this.mic||this.active||this.testing||this.diagnostic)throw new Error('Diagnostic unavailable');
  await this.init();this.stop();this.configureSound(c);this.setSensitivity(c.sensitivity);
  this.diagnostic=true;
  try{
   await new Promise<void>(resolve=>window.setTimeout(resolve,1500));
   if(!this.mic||!this.stream?.getAudioTracks().some(t=>t.readyState==='live')||document.hidden)throw new Error('Diagnostic interrupted');
   this.captureFrames=[];this.captureHits=0;this.diagnosticLiveCount=0;this.detector!.port.postMessage({capture:true});
   const start=this.ctx!.currentTime+.5;
   if(step==='leak'||step==='mixed'){const count=step==='leak'?8:10;for(let i=0;i<count;i++)this.click(start+i*(step==='leak'?.5:.67),i%4===0,step==='mixed'||i%2===0);}
   await new Promise<void>(resolve=>window.setTimeout(resolve,seconds*1000));
   await new Promise<void>((resolve,reject)=>{
    const timeout=window.setTimeout(()=>{this.captureDone=null;reject(new Error('Diagnostic capture timed out'));},1000);
    this.captureDone=()=>{clearTimeout(timeout);this.captureDone=null;resolve();};
    this.detector!.port.postMessage({capture:false});
   });
   if(!this.mic||document.hidden)throw new Error('Diagnostic interrupted');
   return {step,expected,frames:[...this.captureFrames!],liveCount:this.captureHits};
  }finally{this.detector?.port.postMessage({capture:false});this.captureFrames=null;this.captureDone=null;this.diagnostic=false;}
 }
 private click(t:number,accent:boolean,beat:boolean){
  const ctx=this.ctx!,kind:ClickKind=accent?'accent':beat?'beat':'sub';
  let buffer=this.clickBuffers.get(kind);
  if(!buffer){const wave=makeClick(ctx.sampleRate,kind,this.sound);buffer=ctx.createBuffer(1,wave.length,ctx.sampleRate);buffer.getChannelData(0).set(wave);this.clickBuffers.set(kind,buffer);}
  const source=ctx.createBufferSource();source.buffer=buffer;const level=ctx.createGain();level.gain.value=this.levels[accent?0:beat?1:2]/100;source.connect(level);level.connect(this.gain!);this.voices.add(source);
  source.onended=()=>{this.voices.delete(source);source.disconnect();level.disconnect();};source.start(t);
 }
 async testLeakage(volume:number,sensitivity:number):Promise<number>{
  if(!this.mic||this.active||this.testing)throw new Error('Microphone test unavailable');
  await this.init();this.setSensitivity(sensitivity);this.gain!.gain.value=volume/100*.45;
  this.testEvents=0;this.testing=true;
  try{
   const start=this.ctx!.currentTime+.25;
   for(let i=0;i<8;i++)this.click(start+i*.45,i%4===0,i%2===0);
   await new Promise<void>(resolve=>window.setTimeout(resolve,4000));
   if(!this.mic)throw new Error('Microphone disconnected');
   return this.testEvents;
  }finally{this.testing=false;}
 }
 async start(c:Config){if(this.pauseTask)await this.pauseTask;await this.init();if(c.mode==='adaptive'&&!this.mic)throw new Error('Adaptive speed требует включённого микрофона.');this.stop();this.hadPause=false;this.configureSound(c);this.cfg={...c};this.notes=[];this.liveStats.reset();this.extra=0;this.extraTimes=[];this.stages=[];this.adaptiveBpm=c.bpm;this.measured=this.mic;this.bar=0;this.step=0;this.global=0;this.gain!.gain.value=c.volume/100*.45;this.setSensitivity(c.sensitivity);
  this.countStart=this.ctx!.currentTime+.15;this.countNext=this.countStart;this.countIndex=0;this.startTime=this.countStart+c.countIn*c.beats*60/c.bpm;this.next=this.startTime;this.endTime=c.minutes>0?this.startTime+c.minutes*60:Infinity;this.stoppedAt=this.startTime;this.active=true;this.schedule();this.timer=window.setInterval(()=>this.schedule(),25);}
 // Apply manual tempo to future notes only; already scheduled clicks are never moved.
 setLiveTempo(value:number):boolean{if(!this.active||this.paused||!this.ctx||!this.cfg||this.ctx.currentTime<this.startTime||this.cfg.mode==='adaptive'||this.cfg.mode==='ladder'||!Number.isFinite(value))return false;this.cfg.bpm=Math.max(30,Math.min(300,Math.round(value)));return true;}
 private schedule(){if(!this.active||this.paused||!this.ctx||!this.cfg)return;const c=this.cfg;
  while(this.countIndex<c.countIn*c.beats&&this.countNext<this.ctx.currentTime+.15){if(this.countNext>=this.ctx.currentTime)this.click(this.countNext,this.countIndex%c.beats===0,true);this.countIndex++;this.countNext=this.countStart+this.countIndex*60/c.bpm;}
  while(this.next<this.ctx.currentTime+.15&&this.next<this.endTime){if(c.mode==='adaptive'&&this.step===0&&this.bar>0&&this.bar%4===0){
 const sample=this.notes.filter(n=>n.bar>=this.bar-4&&n.bar<this.bar-1);
 const first=sample[0]?.time??0,last=sample[sample.length-1];
 const extra=this.extraTimes.filter(t=>last&&t>=first-last.interval*.47&&t<=last.time+last.interval*.47).length;
 const stage=assess(this.adaptiveBpm,sample,extra,c.ladderStep,c.ladderMax);this.stages.push(stage);this.adaptiveBpm=stage.next;
 }const b=barSpec(c.mode==='adaptive'?{...c,bpm:this.adaptiveBpm}:c,this.bar),beat=this.step%b.sub===0,accent=this.step%b.sub===b.accent,interval=60/b.bpm/b.sub;
  const n:Note={time:this.next,interval,bar:this.bar,step:this.step,global:this.global++,sub:b.sub,bpm:b.bpm,silent:b.silent,accent};
  this.notes.push(n);if(!b.silent&&(beat||c.clickSub||c.mode==='accent')&&this.next>=this.ctx.currentTime)this.click(this.next,c.mode==='accent'?accent:this.step===0,beat);
  this.next+=interval;this.step++;if(this.step>=c.beats*b.sub){this.step=0;this.bar++;}}
  if(this.ctx.currentTime>=this.endTime+.18)this.stop();
 }
 // AudioContext time freezes while suspended: no timestamp shifting or synthetic missed notes.
 async togglePause():Promise<boolean>{
  if(!this.active||!this.ctx||this.pauseTask)return false;
  const ctx=this.ctx,wasPaused=this.paused;
  if(!wasPaused){this.pausedAt=ctx.currentTime;}
  const task=(async()=>{
   try{
    if(wasPaused){await ctx.resume();if(!this.active||this.ctx!==ctx)return false;this.pausedAt=null;this.schedule();}
    else{await ctx.suspend();if(!this.active||this.ctx!==ctx)return false;this.pausedAt=ctx.currentTime;if(this.pausedAt>=this.startTime)this.hadPause=true;}
    return true;
   }catch{if(!wasPaused&&this.active)this.pausedAt=null;return false;}
  })();
  this.pauseTask=task;try{return await task;}finally{if(this.pauseTask===task)this.pauseTask=null;}
 }
 stop(){this.previewRevision++;const wasPaused=this.paused,ctx=this.ctx,pending=this.pauseTask;if(this.active){this.stoppedAt=Math.min(this.pausedAt??ctx!.currentTime,this.endTime);if(wasPaused&&this.stoppedAt>=this.startTime)this.hadPause=true;}this.active=false;this.pausedAt=null;window.clearInterval(this.timer);for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();if(wasPaused&&ctx&&this.mic){const resume=()=>{if(!this.active&&this.ctx===ctx&&ctx.state==='suspended')void ctx.resume().catch(()=>{});};if(pending)void pending.then(resume);else resume();}}
 snapshot(){const now=this.active?(this.pausedAt??this.ctx!.currentTime):this.stoppedAt;let index=this.notes.length-1;while(index>=0&&this.notes[index].time>now)index--;const current=this.notes[index];
 const counting=this.active&&now<this.startTime;const countBeat=counting&&this.cfg?Math.max(0,Math.floor((now-this.countStart)*this.cfg.bpm/60))+1:0;
 let nextIndex=index+1;while(current&&nextIndex<this.notes.length&&this.notes[nextIndex].bar===current.bar)nextIndex++;
 const upcoming=current&&this.notes[nextIndex]?.bar===current.bar+1?this.notes[nextIndex]:undefined;
 let recentStart=index+1;while(recentStart>0&&index+1-recentStart<80&&this.notes[recentStart-1].time>=now-4)recentStart--;
 const recent=this.notes.slice(recentStart,index+1);
 return {active:this.active,paused:this.paused,counting,countBeat,upcoming,elapsed:Math.max(0,Math.min(this.endTime,now)-this.startTime),current,stats:this.liveStats.read(this.notes,this.extra,this.active?now-.17:now-.001),recent,measured:this.measured,micEvents:this.micEvents,meterRms:this.meterRms,meterPeak:this.meterPeak,stages:[...this.stages]};}
}

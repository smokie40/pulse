import {barSpec,matchHit,summarize,type Config,type Note} from './training';
export class PulseEngine{
 ctx:AudioContext|null=null; gain:GainNode|null=null; stream:MediaStream|null=null; detector:AudioWorkletNode|null=null; source:MediaStreamAudioSourceNode|null=null; sink:GainNode|null=null;
 notes:Note[]=[]; extra=0; active=false; mic=false; measured=false; startTime=0; endTime=0; stoppedAt=0; cfg:Config|null=null;
 private timer:number|undefined; private next=0; private bar=0; private step=0; private global=0; private voices=new Set<OscillatorNode>();
 async init(){if(!this.ctx||this.ctx.state==='closed'){this.ctx=new AudioContext({latencyHint:'interactive'});this.gain=this.ctx.createGain();this.gain.connect(this.ctx.destination);}await this.ctx.resume();}
 async enableMic(sensitivity:number){
  await this.init();if(this.mic)return;
  if(!navigator.mediaDevices?.getUserMedia||!this.ctx!.audioWorklet)throw new Error('Микрофон требует HTTPS и поддержки AudioWorklet.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  try{await this.ctx!.audioWorklet.addModule(new URL('hit-detector.js',document.baseURI).href);
  this.source=this.ctx!.createMediaStreamSource(stream);this.detector=new AudioWorkletNode(this.ctx!,'pulse-detector');this.sink=this.ctx!.createGain();this.sink.gain.value=0;
  this.detector.port.postMessage({sensitivity});this.source.connect(this.detector);this.detector.connect(this.sink);this.sink.connect(this.ctx!.destination);
  this.detector.port.onmessage=(e:MessageEvent<{time:number;peak:number}>)=>{if(!this.active||!this.cfg)return;const t=e.data.time-this.cfg.offset/1000;if(t<this.startTime-.05||t>this.endTime+.05)return;if(!matchHit(this.notes,t))this.extra++;};
  this.stream=stream;this.mic=true;}catch(e){stream.getTracks().forEach(t=>t.stop());this.disableMic();throw e;}
 }
 disableMic(){this.stream?.getTracks().forEach(t=>t.stop());this.source?.disconnect();this.detector?.disconnect();this.sink?.disconnect();if(this.detector)this.detector.port.onmessage=null;this.stream=null;this.source=null;this.detector=null;this.sink=null;this.mic=false;}
 setSensitivity(v:number){this.detector?.port.postMessage({sensitivity:v});}
 private click(t:number,accent:boolean,beat:boolean){
  const ctx=this.ctx!,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=accent?1450:beat?1050:720;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(accent?.7:beat?.42:.20,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.032);o.connect(g);g.connect(this.gain!);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+.035);
 }
 async start(c:Config){await this.init();this.stop();this.cfg={...c};this.notes=[];this.extra=0;this.measured=this.mic;this.bar=0;this.step=0;this.global=0;this.gain!.gain.value=c.volume/100*.45;this.setSensitivity(c.sensitivity);
  this.startTime=this.ctx!.currentTime+.15;this.next=this.startTime;this.endTime=this.startTime+c.minutes*60;this.stoppedAt=this.startTime;this.active=true;this.schedule();this.timer=window.setInterval(()=>this.schedule(),25);}
 private schedule(){if(!this.active||!this.ctx||!this.cfg)return;const c=this.cfg;
  while(this.next<this.ctx.currentTime+.15&&this.next<this.endTime){const b=barSpec(c,this.bar),beat=this.step%b.sub===0,accent=this.step%b.sub===b.accent,interval=60/b.bpm/b.sub;
  const n:Note={time:this.next,interval,bar:this.bar,step:this.step,global:this.global++,sub:b.sub,bpm:b.bpm,silent:b.silent,accent};
  this.notes.push(n);if(!b.silent&&(beat||c.clickSub||c.mode==='accent')&&this.next>=this.ctx.currentTime)this.click(this.next,c.mode==='accent'?accent:this.step===0,beat);
  this.next+=interval;this.step++;if(this.step>=c.beats*b.sub){this.step=0;this.bar++;}}
  if(this.ctx.currentTime>=this.endTime+.18)this.stop();
 }
 stop(){if(this.active)this.stoppedAt=Math.min(this.ctx!.currentTime,this.endTime);this.active=false;window.clearInterval(this.timer);for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();}
 snapshot(){const now=this.active?this.ctx!.currentTime:this.stoppedAt;let current:Note|undefined;for(let i=this.notes.length-1;i>=0;i--){if(this.notes[i].time<=now){current=this.notes[i];break;}}
 return {active:this.active,elapsed:Math.max(0,Math.min(this.endTime,now)-this.startTime),current,stats:summarize(this.notes,this.extra,now-.17),recent:this.notes.filter(n=>n.time<=now&&n.time>=now-4).slice(-80),measured:this.measured};}
}

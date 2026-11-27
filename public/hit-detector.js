// Narrowband reference rejection, then broadband onset detection.
// No time gate: a real pad hit can coincide with a metronome click.
class Notch {
 constructor(f,q=2){const w=2*Math.PI*f/sampleRate,a=Math.sin(w)/(2*q),d=1+a;this.b0=1/d;this.b1=-2*Math.cos(w)/d;this.b2=this.b0;this.a1=this.b1;this.a2=(1-a)/d;this.z1=0;this.z2=0;}
 tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
// Broad band-pass bank; capture energy only, never PCM audio.
const PAD_BANDS=[250,500,1000,2000,4000,8000];
class Band {
 constructor(f,q=1.15){const w=2*Math.PI*f/sampleRate,a=Math.sin(w)/(2*q),d=1+a;this.b0=a/d;this.b2=-a/d;this.a1=-2*Math.cos(w)/d;this.a2=(1-a)/d;this.z1=0;this.z2=0;}
 tick(x){const y=this.b0*x+this.z1;this.z1=-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
function newOnset(){return {last:-Infinity,time:0,envelope:0,attackPeak:0};}
function onsetStep(state,time,e,noise,ratio,sensitivity){const gap=time-state.last;
 const dt=Math.max(0,time-state.time);
 const floor=.028*Math.pow(.045,sensitivity/100);
 const threshold=Math.max(floor*floor,noise*9);
 const previous=state.envelope;
 const attack=e>threshold&&ratio>.18;
 // A new stroke must rise above the decaying envelope of the previous sound.
 const tail=gap<.075?state.attackPeak*.48*Math.exp(-gap/.055):0;
 const fresh=attack&&gap>=.022&&e>Math.max(tail,previous*2.2);
 state.envelope=Math.max(e,previous*Math.exp(-dt/.010));
 state.time=time;
 if(fresh){state.last=time;state.attackPeak=e;return true;}
 if(gap<.014&&e>state.attackPeak)state.attackPeak=e;
 return false;}
class PulseDetector extends AudioWorkletProcessor {
 constructor(){
  super();this.noise=2e-7;this.onset=newOnset();this.sensitivity=50;this.energy=0;this.raw=0;this.peak=0;this.n=0;
  this.capture=false;this.frames=[];this.meterCount=0;this.meterPeak=0;this.meterEnergy=0;this.meterN=0;this.size=Math.max(24,Math.round(sampleRate*.002));this.setFrequencies([920,1840]);this.profile=null;this.bands=PAD_BANDS.map(f=>new Band(Math.min(f,sampleRate*.4)));this.bandSum=new Float64Array(PAD_BANDS.length);
  this.port.onmessage=e=>{if(typeof e.data.sensitivity==='number')this.sensitivity=Math.max(0,Math.min(100,e.data.sensitivity));if(Array.isArray(e.data.frequencies))this.setFrequencies(e.data.frequencies);if(Object.prototype.hasOwnProperty.call(e.data,'padProfile')){const p=e.data.padProfile;this.profile=p&&Array.isArray(p.weights)&&p.weights.length===PAD_BANDS.length&&p.weights.every(v=>Number.isFinite(v)&&v>=-1&&v<=1)&&p.weights.some(v=>v>0)&&Number.isFinite(p.noise)&&p.noise>=0?p:null;this.bands=PAD_BANDS.map(f=>new Band(Math.min(f,sampleRate*.4)));this.onset=newOnset();this.energy=this.raw=this.peak=this.n=0;this.bandSum.fill(0);}if(e.data.capture===true){this.capture=true;this.frames=[];this.onset=newOnset();this.energy=this.raw=this.peak=this.n=0;this.bandSum.fill(0);}if(e.data.capture===false){this.capture=false;this.flush();this.port.postMessage({kind:'capture-end'});}};
 }
 setFrequencies(fs){this.filters=fs.filter(f=>f>0&&f<sampleRate*.45).flatMap(f=>[new Notch(f),new Notch(f)]);}
 flush(){if(this.frames.length){this.port.postMessage({kind:'frames',frames:this.frames});this.frames=[];}}
 process(inputs){
  const x=inputs[0]?.[0];if(!x)return true;
  for(let i=0;i<x.length;i++){
   let y=x[i];if(!this.profile)for(const filter of this.filters)y=filter.tick(y);
   if(this.capture||this.profile)for(let j=0;j<this.bands.length;j++){const b=this.bands[j].tick(x[i]);this.bandSum[j]+=b*b;}
   this.energy+=y*y;this.raw+=x[i]*x[i];this.rawPeak=Math.max(this.rawPeak??0,Math.abs(x[i]));this.peak=Math.max(this.peak,Math.abs(y));this.n++;
   if(this.n<this.size)continue;
   const bands=this.capture||this.profile?Array.from(this.bandSum,b=>b/this.n):null;
   let e=this.energy/this.n;const r=this.raw/this.n,frame=currentFrame+i;
   if(this.profile){e=0;for(let j=0;j<this.bands.length;j++)e+=bands[j]*this.profile.weights[j];e=Math.max(0,e);}
   const ratio=this.profile?1:e/Math.max(r,1e-12),noise=this.profile?this.profile.noise:this.noise;
   const floor=.028*Math.pow(.045,this.sensitivity/100),threshold=Math.max(floor*floor,noise*9);
   if(this.capture){this.frames.push([frame/sampleRate,e,r,noise,ratio,bands]);if(this.frames.length>=50)this.flush();}
   this.meterPeak=Math.max(this.meterPeak,this.rawPeak??0);this.rawPeak=0;this.meterEnergy+=r;this.meterN++;
   if(++this.meterCount>=25){this.port.postMessage({kind:'meter',rms:Math.sqrt(this.meterEnergy/this.meterN),peak:this.meterPeak});this.meterCount=this.meterEnergy=this.meterN=this.meterPeak=0;}
   if(onsetStep(this.onset,frame/sampleRate,e,noise,ratio,this.sensitivity)){
    this.port.postMessage({kind:'hit',captured:this.capture,time:(frame-(this.size-1)/2)/sampleRate,peak:this.peak});
   }
   if(!this.profile&&e<threshold)this.noise=.99*this.noise+.01*e;
   this.bandSum.fill(0);
   this.energy=this.raw=this.peak=this.n=0;
  }
  return true;
 }
}registerProcessor('pulse-detector',PulseDetector);

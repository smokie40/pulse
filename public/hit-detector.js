// Narrowband reference rejection, then broadband onset detection.
// No time gate: a real pad hit can coincide with a metronome click.
class Notch {
 constructor(f,q=2){const w=2*Math.PI*f/sampleRate,a=Math.sin(w)/(2*q),d=1+a;this.b0=1/d;this.b1=-2*Math.cos(w)/d;this.b2=this.b0;this.a1=this.b1;this.a2=(1-a)/d;this.z1=0;this.z2=0;}
 tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
class PulseDetector extends AudioWorkletProcessor {
 constructor(){
  super();this.noise=2e-7;this.last=-Infinity;this.sensitivity=50;this.energy=0;this.raw=0;this.peak=0;this.n=0;this.armed=true;this.low=0;
  this.size=Math.max(24,Math.round(sampleRate*.002));this.setFrequencies([920,1840]);
  this.port.onmessage=e=>{if(typeof e.data.sensitivity==='number')this.sensitivity=Math.max(0,Math.min(100,e.data.sensitivity));if(Array.isArray(e.data.frequencies))this.setFrequencies(e.data.frequencies);};
 }
 setFrequencies(fs){this.filters=fs.filter(f=>f>0&&f<sampleRate*.45).flatMap(f=>[new Notch(f),new Notch(f)]);}
 process(inputs){
  const x=inputs[0]?.[0];if(!x)return true;
  for(let i=0;i<x.length;i++){
   let y=x[i];for(const filter of this.filters)y=filter.tick(y);
   this.energy+=y*y;this.raw+=x[i]*x[i];this.peak=Math.max(this.peak,Math.abs(y));this.n++;
   if(this.n<this.size)continue;
   const e=this.energy/this.n,r=this.raw/this.n,ratio=e/Math.max(r,1e-12),frame=currentFrame+i;
   const floor=.028*Math.pow(.045,this.sensitivity/100),threshold=Math.max(floor*floor,this.noise*9);
   const onset=e>threshold&&ratio>.18;
   if(onset&&this.armed&&frame-this.last>=sampleRate*.018){
    this.last=frame;this.armed=false;this.low=0;
    this.port.postMessage({time:(frame-(this.size-1)/2)/sampleRate,peak:this.peak});
   }
   if(!onset||e<threshold*.45){if(++this.low>=2)this.armed=true;}else this.low=0;
   if(e<threshold)this.noise=.99*this.noise+.01*e;
   this.energy=this.raw=this.peak=this.n=0;
  }
  return true;
 }
}registerProcessor('pulse-detector',PulseDetector);

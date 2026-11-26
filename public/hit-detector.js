class PulseDetector extends AudioWorkletProcessor {
 constructor(){super();this.noise=.002;this.env=0;this.last=-10000;this.sensitivity=50;this.port.onmessage=e=>{this.sensitivity=e.data.sensitivity??50;};}
 process(inputs){const x=inputs[0]?.[0];if(!x)return true;for(let i=0;i<x.length;i++){
 const a=Math.abs(x[i]);this.env=Math.max(a,this.env*.985);const frame=currentFrame+i;
 const floor=.065*Math.pow(.05,this.sensitivity/100);const threshold=Math.max(floor,this.noise*5);
 if(a>threshold&&a>this.env*.90&&frame-this.last>sampleRate*.025){this.last=frame;this.port.postMessage({time:frame/sampleRate,peak:a});}
 if(a<threshold)this.noise=.9995*this.noise+.0005*a;
 }return true;}
}registerProcessor('pulse-detector',PulseDetector);
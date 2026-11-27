// Temporary bounded PCM capture, only for loopback. No persistent audio data.
class PulseLoopback extends AudioWorkletProcessor{
 constructor(options){super();const p=options.processorOptions??{};this.start=p.startFrame;this.end=p.endFrame;this.done=false;
  if(!Number.isSafeInteger(this.start)||!Number.isSafeInteger(this.end)||this.end<=this.start||this.end-this.start>sampleRate*9){this.done=true;this.port.postMessage({kind:'error'});return;}
  this.buffer=new Float32Array(this.end-this.start);this.next=this.start;
 }
 process(inputs){
  if(this.done)return false;const x=inputs[0]?.[0];if(!x){if(currentFrame>=this.start){this.done=true;this.port.postMessage({kind:'error'});return false;}return true;}
  const from=Math.max(this.start,currentFrame),to=Math.min(this.end,currentFrame+x.length);
  if(to>from){if(from!==this.next){this.done=true;this.port.postMessage({kind:'error'});return false;}this.buffer.set(x.subarray(from-currentFrame,to-currentFrame),from-this.start);this.next=to;}
  if(currentFrame+x.length>=this.end){this.done=true;if(this.next!==this.end)this.port.postMessage({kind:'error'});else this.port.postMessage({kind:'loopback',startFrame:this.start,samples:this.buffer},[this.buffer.buffer]);return false;}
  return true;
 }
}
registerProcessor('pulse-loopback',PulseLoopback);

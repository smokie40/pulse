import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test,expect} from 'vitest';
import {CLICK_FREQUENCIES,makeClick} from './click-wave';
const source=readFileSync(new URL('../public/hit-detector.js',import.meta.url),'utf8');
function simulate({clicks=true,hits=false,rate=48000,echo=.2}={}){
 const events=[],context={sampleRate:rate,currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:e=>events.push(e),onmessage:null};}},registerProcessor:(_,P)=>{context.detector=new P();}};
 runInNewContext(source,context);
 context.detector.port.onmessage({data:{frequencies:[...CLICK_FREQUENCIES],sensitivity:50}});
 const audio=new Float32Array(rate*2),times=[.2,.65,1.1,1.55];let seed=42;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let i=0;i<audio.length;i++)audio[i]=random()*.0005;
 for(const [j,t] of times.entries()){
  const from=Math.round(t*rate),wave=makeClick(rate,['accent','beat','sub','beat'][j]);
  if(clicks)for(let k=0;k<wave.length;k++){audio[from+k]+=wave[k]*.22;if(from+k+Math.round(.011*rate)<audio.length)audio[from+k+Math.round(.011*rate)]+=wave[k]*.22*echo;}
  if(hits)for(let k=0;k<rate*.014;k++)audio[from+k]+=random()*.20*Math.exp(-k/(rate*.004));
 }
 for(let i=0;i<audio.length;i+=128){context.currentFrame=i;context.detector.process([[audio.subarray(i,i+128)]]);}
 return events;
}
test('click signature is rejected at common audio rates',()=>{for(const rate of [44100,48000])expect(simulate({rate})).toHaveLength(0);});
test('pad-like impulses remain detectable with no click',()=>expect(simulate({clicks:false,hits:true})).toHaveLength(4));
test('coincident pad-like impulses remain detectable during clicks',()=>expect(simulate({hits:true})).toHaveLength(4));

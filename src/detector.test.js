import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test,expect} from 'vitest';
import {frequencies,makeClick} from './click-wave';
const source=readFileSync(new URL('../public/hit-detector.js',import.meta.url),'utf8');
function simulate({clicks=true,hits=false,rate=48000,echo=.2,sound='soft',ring=false,times=[.2,.65,1.1,1.55]}={}){
 const events=[],context={sampleRate:rate,currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:e=>e.kind==='hit'&&events.push(e),onmessage:null};}},registerProcessor:(_,P)=>{context.detector=new P();}};
 runInNewContext(source,context);
 context.detector.port.onmessage({data:{frequencies:[...frequencies(sound)],sensitivity:50}});
 const audio=new Float32Array(rate*2);let seed=42;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let i=0;i<audio.length;i++)audio[i]=random()*.0005;
 for(const [j,t] of times.entries()){
  const from=Math.round(t*rate),wave=makeClick(rate,['accent','beat','sub','beat'][j],sound);
  if(clicks)for(let k=0;k<wave.length;k++){audio[from+k]+=wave[k]*.22;if(from+k+Math.round(.011*rate)<audio.length)audio[from+k+Math.round(.011*rate)]+=wave[k]*.22*echo;}
  if(hits)for(let k=0;k<rate*.014;k++){const v=random()*.20*Math.exp(-k/(rate*.004));audio[from+k]+=v;if(ring){audio[from+k+Math.round(.03*rate)]+=v*.47;audio[from+k+Math.round(.052*rate)]+=v*.25;}}
 }
 for(let i=0;i<audio.length;i+=128){context.currentFrame=i;context.detector.process([[audio.subarray(i,i+128)]]);}
 return events;
}
test('click signature is rejected at common audio rates',()=>{for(const rate of [44100,48000])expect(simulate({rate})).toHaveLength(0);});
test('pad-like impulses remain detectable with no click',()=>expect(simulate({clicks:false,hits:true})).toHaveLength(4));
test('coincident pad-like impulses remain detectable during clicks',()=>expect(simulate({hits:true})).toHaveLength(4));

test('each sound rejects clean clicks',()=>{for(const sound of ['soft','studio','digital','low'])expect(simulate({sound})).toHaveLength(0);});

test('decaying pad reflections do not become extra strokes',()=>expect(simulate({clicks:false,hits:true,ring:true})).toHaveLength(4));
test('distinct rapid strokes at 40 ms remain detectable',()=>expect(simulate({clicks:false,hits:true,times:Array.from({length:20},(_,i)=>.2+i*.04)})).toHaveLength(20));

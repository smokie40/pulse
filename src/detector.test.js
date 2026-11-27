import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test,expect} from 'vitest';
import {frequencies,makeClick,sampleSounds} from './click-wave';
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

test('all four timbres reject clicks but preserve simultaneous strokes at both common sample rates',()=>{for(const sound of ['soft','studio','digital','low'])for(const rate of [44100,48000]){expect(simulate({sound,rate})).toHaveLength(0);expect(simulate({sound,rate,hits:true})).toHaveLength(4);}});
test('all four sounds have distinct fundamental frequencies and finite normalized waveforms',()=>{const sounds=['soft','studio','digital','low'];expect(new Set(sounds.map(s=>frequencies(s)[0])).size).toBe(4);for(const sound of sounds){const w=makeClick(48000,'beat',sound);expect(w.every(Number.isFinite)).toBe(true);expect(Math.max(...w.map(Math.abs))).toBeCloseTo(.73,4);}});

test('recorded woodblock, claves and electronic tick reject modelled leakage while preserving coincident pad transients',()=>{for(const sound of ['woodblock','claves','electronic'])for(const rate of [44100,48000]){expect(simulate({sound,rate})).toHaveLength(0);expect(simulate({sound,rate,hits:true})).toHaveLength(4);}});
test('all six recordings produce bounded distinct waveforms at both device rates',()=>{for(const rate of [44100,48000]){const waves=sampleSounds.map(sound=>makeClick(rate,'accent',sound));expect(new Set(waves.map(w=>Array.from(w.slice(0,100)).join(','))).size).toBe(6);for(const [i,w] of waves.entries()){expect(w.every(Number.isFinite)).toBe(true);expect(w.length/rate).toBeLessThanOrEqual(.071);expect(Math.max(...w.map(Math.abs))).toBeLessThanOrEqual(.91);const b=makeClick(rate,'beat',sampleSounds[i]),s=makeClick(rate,'sub',sampleSounds[i]);expect(Math.max(...b.map(Math.abs))).toBeLessThan(Math.max(...w.map(Math.abs)));expect(Math.max(...s.map(Math.abs))).toBeLessThan(Math.max(...b.map(Math.abs)));}}});

import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {learnPadProfile,countProfile,spectralFrames,type PadProfile} from './pad-profile';
import {detect,type Capture,type Frame,type Step} from './calibration';
const source=readFileSync(new URL('../public/hit-detector.js',import.meta.url),'utf8');
const expected={noise:0,leak:0,normal:10,quiet:10,fast:20,mixed:10};
function capture(step:Step,profile:PadProfile|null=null,rate=48000):Capture{
 const frames:Frame[]=[],events:number[]=[];
 const context:any={sampleRate:rate,currentFrame:0,AudioWorkletProcessor:class{port={postMessage:(e:any)=>{if(e.kind==='hit')events.push(e.time);if(e.kind==='frames')frames.push(...e.frames);},onmessage:null};},registerProcessor:(_:string,P:any)=>{context.detector=new P();}};
 runInNewContext(source,context);context.detector.port.onmessage({data:{frequencies:[1450,2900],sensitivity:profile?.sensitivity??50,padProfile:profile,capture:true}});
 const audio=new Float32Array(rate*6);let seed=42;for(let i=0;i<audio.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;audio[i]=(seed/4294967296*2-1)*.0004;}
 const clicks=step==='leak'||step==='mixed',hits=expected[step]>0;
 for(let j=0;j<(clicks?(step==='leak'?8:10):expected[step]);j++){
  const pos=Math.round((.25+j*(step==='fast'?.067:.48))*rate);
  for(let k=0;k<rate*.022;k++){const t=k/rate,env=Math.exp(-t/.004)*Math.min(1,t/.0005);
   if(clicks)audio[pos+k]+=.1*Math.sin(2*Math.PI*1450*t)*env;
   if(hits)audio[pos+k]+=(step==='quiet'?.05:.12)*(Math.sin(2*Math.PI*1450*t)+1.1*Math.sin(2*Math.PI*480*t))*env;
  }
 }
 for(let i=0;i<audio.length;i+=128){context.currentFrame=i;context.detector.process([[audio.subarray(i,i+128)]]);}
 context.detector.port.onmessage({data:{capture:false}});return {step,expected:expected[step],frames,liveCount:events.length};
}
test('profile learns overlapping spectral sources and validates on independent click, fast and mixed signals at two rates',()=>{
 for(const rate of [44100,48000]){
  const training=(['noise','leak','normal','quiet'] as Step[]).map(s=>capture(s,null,rate));expect(training.every(spectralFrames)).toBe(true);
  const profile=learnPadProfile(training)!;expect(profile).not.toBeNull();
  for(const c of training)expect(countProfile(c,profile)).toBe(c.expected);
  for(const step of ['leak','fast','mixed'] as Step[]){const c=capture(step,profile,rate);expect(c.liveCount).toBe(c.expected);expect(detect(c.frames,profile.sensitivity)).toBe(c.expected);expect(countProfile(c,profile)).toBe(c.expected);}
 }
},20000);
test('missing features or identical click and pad data cannot yield a valid profile',()=>{
 const t=(['noise','leak','normal','quiet'] as Step[]).map(s=>capture(s));
 expect(learnPadProfile(t.slice(0,3))).toBeNull();
 expect(learnPadProfile([t[0],{...t[2],step:'leak',expected:0},t[2],t[3]])).toBeNull();
 expect(learnPadProfile(t.map(c=>({...c,frames:c.frames.map(f=>f.slice(0,5) as Frame)})))).toBeNull();
});

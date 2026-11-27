import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {learnPadProfile,countProfile,spectralFrames,restoreTraining} from './pad-profile';
import {detect} from './calibration';
const source=readFileSync(new URL('../public/hit-detector.js',import.meta.url),'utf8');
const expected={noise:0,leak:0,normal:10,quiet:10,fast:20,mixed:10};
function capture(step,profile=null,rate=48000){
 const frames=[],events=[];
 const context={sampleRate:rate,currentFrame:0,AudioWorkletProcessor:class{port={postMessage:(e)=>{if(e.kind==='hit')events.push(e.time);if(e.kind==='frames')frames.push(...e.frames);},onmessage:null};},registerProcessor:(_,P)=>{context.detector=new P();}};
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
  const training=(['noise','leak','normal','quiet']).map(s=>capture(s,null,rate));expect(training.every(spectralFrames)).toBe(true);
  const profile=learnPadProfile(training);expect(profile).not.toBeNull();
  for(const c of training)expect(countProfile(c,profile)).toBe(c.expected);
  for(const step of ['leak','fast','mixed']){const c=capture(step,profile,rate);expect(c.liveCount).toBe(c.expected);expect(detect(c.frames,profile.sensitivity)).toBe(c.expected);expect(countProfile(c,profile)).toBe(c.expected);}
 }
},20000);
test('missing features or identical click and pad data cannot yield a valid profile',()=>{
 const t=(['noise','leak','normal','quiet']).map(s=>capture(s));
 expect(learnPadProfile(t.slice(0,3))).toBeNull();
 expect(learnPadProfile([t[0],{...t[2],step:'leak',expected:0},t[2],t[3]])).toBeNull();
 expect(learnPadProfile(t.map(c=>({...c,frames:c.frames.map(f=>f.slice(0,5))})))).toBeNull();
});

// Independent synthetic fixture: the click dominates all six bands in absolute energy.
test('signed spectral contrast separates quieter pad hits from much louder clicks',()=>{
 const captureBands=(step,expected,shape,amplitude,n)=>({step,expected,frames:Array.from({length:1600},(_,i)=>{
  const pulse=i>=100&&Math.floor((i-100)/70)<n&&(i-100)%70<5?amplitude*Math.exp(-((i-100)%70)/2):0;
  return [i*.002,0,0,1e-10,1,shape.map(v=>v*pulse+1e-10)];
 })});
 const click=[.02,.08,.43,.39,.07,.01],pad=[.23,.22,.27,.18,.08,.02],quiet=[.33,.24,.19,.14,.08,.02];
 const training=[captureBands('noise',0,click,0,0),captureBands('leak',0,click,.3,16),captureBands('normal',10,pad,.0018,10),captureBands('quiet',10,quiet,.0006,10)];
 const p=learnPadProfile(training);expect(p).not.toBeNull();expect(p.weights.some(w=>w<0)).toBe(true);
 for(const c of training)expect(countProfile(c,p)).toBe(c.expected);
 expect(countProfile(captureBands('leak',0,click,.45,16),p)).toBe(0);
});

test('import reuses only complete training captures matching current click settings',()=>{
 const settings={sound:'woodblock',volume:100,accentVolume:100,beatVolume:100,subVolume:100,bpm:120,sub:4,clickSub:true};
 const trainingCaptures=['noise','leak','normal','quiet'].map((step,i)=>({step,expected:i<2?0:10,frames:Array.from({length:[1500,2500,5000,5000][i]},(_,j)=>[j*.002,0,0,0,1,[0,0,0,0,0,0]]),profileCount:100}));
 const doc={version:'pad-profile-1',settings,trainingCaptures,verified:true,profile:{weights:[1,0,0,0,0,0]}};
 const restored=restoreTraining(JSON.stringify(doc),settings);expect(restored.map(c=>c.step)).toEqual(['noise','leak','normal','quiet']);expect(restored[0].profileCount).toBeUndefined();
 expect(()=>restoreTraining(JSON.stringify(doc),{...settings,volume:50})).toThrow();
 expect(()=>restoreTraining(JSON.stringify({...doc,trainingCaptures:trainingCaptures.slice(0,3)}),settings)).toThrow();
});

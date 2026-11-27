import {detect,type Capture,type Frame} from './calibration';

// Broad overlapping bands preserve pad harmonics instead of subtracting the click's frequencies.
export const PAD_BANDS=[250,500,1000,2000,4000,8000] as const;
export type PadProfile={weights:number[];noise:number;sensitivity:number};
export const trainingSteps=['noise','leak','normal','quiet'] as const;
export function spectralFrames(c:Capture){return c.frames.length>=100&&c.frames.every(f=>{const bands=f[5];return bands?.length===PAD_BANDS.length&&bands.every(v=>Number.isFinite(v)&&v>=0);});}
export function bandEnergy(bands:readonly number[],weights:readonly number[]){let e=0;for(let i=0;i<weights.length;i++)e+=bands[i]*weights[i];return e;}
export function profileFrames(frames:readonly Frame[],profile:Pick<PadProfile,'weights'|'noise'>):Frame[]{
 return frames.map(f=>[f[0],bandEnergy(f[5]!,profile.weights),f[2],profile.noise,1,f[5]]);
}
export function countProfile(c:Capture,p:PadProfile){return spectralFrames(c)?detect(profileFrames(c.frames,p),p.sensitivity):null;}
const percentile=(values:number[],p:number)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(p*a.length))]??0;};
// Average strong frames, without letting one unusually hard stroke dominate the model.
function topBand(c:Capture,i:number){const values=c.frames.map(f=>f[5]![i]).sort((a,b)=>b-a);const n=Math.max(8,Math.min(values.length,Math.max(1,c.expected||8)*4));return values.slice(0,n).reduce((a,b)=>a+b,0)/n;}
const normalize=(w:number[])=>{const max=Math.max(...w);return max>0?w.map(v=>v/max):w;};
export function learnPadProfile(captures:readonly Capture[],preferred=50):PadProfile|null{
 const training=trainingSteps.map(step=>captures.find(c=>c.step===step));
 if(training.some(c=>!c||!spectralFrames(c)))return null;
 const [noise,leak,normal,quiet]=training as Capture[];
 // Each candidate favors energy present in quiet and normal pad hits, absent in room noise and click leakage.
 const contrast=PAD_BANDS.map((_,i)=>Math.min(topBand(normal,i),topBand(quiet,i))/Math.max(1e-12,topBand(leak,i),topBand(noise,i)));
 const order=contrast.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);
 const candidates:number[][]=[normalize(contrast.map(v=>Math.min(100,v))),normalize(contrast.map(v=>Math.sqrt(Math.min(100,v)))),PAD_BANDS.map(()=>1)];
 for(let k=1;k<=3;k++)candidates.push(PAD_BANDS.map((_,i)=>order.slice(0,k).some(x=>x.i===i)?1:0));
 for(let i=0;i<PAD_BANDS.length;i++)candidates.push(PAD_BANDS.map((_,j)=>i===j?1:0));
 let best:PadProfile|null=null,bestWidth=-1,bestRank=-Infinity;
 for(const weights of candidates){
  const noiseFloor=Math.max(1e-12,percentile(noise.frames.map(f=>bandEnergy(f[5]!,weights)),.95));
  const data=[noise,leak,normal,quiet].map(c=>({expected:c.expected,frames:profileFrames(c.frames,{weights,noise:noiseFloor})}));
  const passing:number[]=[];
  // Search coarse sensitivity, then use a contiguous passing range rather than a fragile threshold.
  for(let sensitivity=0;sensitivity<=100;sensitivity+=5)if(data.every(c=>detect(c.frames,sensitivity)===c.expected))passing.push(sensitivity);
  if(!passing.length)continue;
  const groups:number[][]=[];for(const v of passing){const last=groups.at(-1);if(last&&v===last.at(-1)!+5)last.push(v);else groups.push([v]);}
  for(const group of groups){const sensitivity=group[Math.floor(group.length/2)],width=group.length,rank=weights.reduce((s,w,i)=>s+w*Math.log1p(contrast[i]),0)/Math.max(1e-9,weights.reduce((a,b)=>a+b,0))-.002*Math.abs(sensitivity-preferred);
   if(width>bestWidth||width===bestWidth&&rank>bestRank){bestWidth=width;bestRank=rank;best={weights,noise:noiseFloor,sensitivity};}
  }
 }
 return best;
}

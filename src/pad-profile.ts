import {detect,type Capture,type Frame} from './calibration';

// Broad overlapping bands preserve pad harmonics instead of subtracting the click's frequencies.
export const PAD_BANDS=[250,500,1000,2000,4000,8000] as const;
export type PadProfile={weights:number[];noise:number;sensitivity:number};
export const trainingSteps=['noise','leak','normal','quiet'] as const;
export function spectralFrames(c:Capture){return c.frames.length>=100&&c.frames.every(f=>{const bands=f[5];return bands?.length===PAD_BANDS.length&&bands.every(v=>Number.isFinite(v)&&v>=0);});}
export function bandEnergy(bands:readonly number[],weights:readonly number[]){let e=0;for(let i=0;i<weights.length;i++)e+=bands[i]*weights[i];return Math.max(0,e);}
export function profileFrames(frames:readonly Frame[],profile:Pick<PadProfile,'weights'|'noise'>):Frame[]{
 return frames.map(f=>[f[0],bandEnergy(f[5]!,profile.weights),f[2],profile.noise,1,f[5]]);
}
export function countProfile(c:Capture,p:PadProfile){return spectralFrames(c)?detect(profileFrames(c.frames,p),p.sensitivity):null;}
const percentile=(values:number[],p:number)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(p*a.length))]??0;};
// Average strong frames, without letting one unusually hard stroke dominate the model.
function topBand(c:Capture,i:number){const values=c.frames.map(f=>f[5]![i]).sort((a,b)=>b-a);const n=Math.max(8,Math.min(values.length,Math.max(1,c.expected||8)*4));return values.slice(0,n).reduce((a,b)=>a+b,0)/n;}
const normalize=(w:number[])=>{const max=Math.max(...w.map(Math.abs));return max>0?w.map(v=>v/max):w;};
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
 // A louder click may dominate every band. A signed contrast subtracts a learned
 // fraction of a reference band from a pad-rich band, instead of rejecting both.
 // Only consider this fallback when ordinary positive-band profiles cannot work.
 const search=(candidates:number[][],signed=false):PadProfile|null=>{
 let best:PadProfile|null=null,bestWidth=-1,bestRank=-Infinity;
 for(const weights of candidates){
  const noiseFloor=Math.max(1e-12,percentile(noise.frames.map(f=>bandEnergy(f[5]!,weights)),.95));
  const data=[noise,leak,normal,quiet].map(c=>({expected:c.expected,frames:profileFrames(c.frames,{weights,noise:noiseFloor})}));
  const passing:number[]=[];
  // Search coarse sensitivity, then use a contiguous passing range rather than a fragile threshold.
  for(let sensitivity=0;sensitivity<=100;sensitivity+=5)if(data.every(c=>detect(c.frames,sensitivity)===c.expected))passing.push(sensitivity);
  if(!passing.length)continue;
  const groups:number[][]=[];for(const v of passing){const last=groups.at(-1);if(last&&v===last.at(-1)!+5)last.push(v);else groups.push([v]);}
  for(const group of groups){const sensitivity=group[Math.floor(group.length/2)],width=group.length,rank=weights.reduce((s,w,i)=>s+Math.max(0,w)*Math.log1p(contrast[i]),0)/Math.max(1e-9,weights.reduce((a,b)=>a+Math.max(0,b),0))-.002*Math.abs(sensitivity-preferred);
   // Prefer separation with reserve above the loudest negative frame, not a fragile exact fit.
   const peak=(c:{frames:Frame[]})=>c.frames.reduce((m,f)=>Math.max(m,f[1]),0);
   const separation=Math.log1p(Math.min(peak(data[2]),peak(data[3]))/Math.max(noiseFloor,peak(data[0]),peak(data[1]),1e-12));
   const score=signed?separation-.002*Math.abs(sensitivity-preferred):rank;
   if(width>bestWidth||width===bestWidth&&score>bestRank){bestWidth=width;bestRank=score;best={weights,noise:noiseFloor,sensitivity};}
  }
 }
 return best;
 };
 const positive=search(candidates);if(positive)return positive;
 const frames=leak.frames.map(f=>f[5]!);
 const total=(b:readonly number[])=>b.reduce((s,v)=>s+v,0);
 const peak=frames.reduce((m,b)=>Math.max(m,total(b)),0);
 const strong=frames.filter(b=>total(b)>peak*.005);
 if(strong.length<8||peak<=1e-12)return null;
 const signed:number[][]=[];
 for(let i=0;i<PAD_BANDS.length;i++)for(let j=0;j<PAD_BANDS.length;j++){
  if(i===j)continue;
  const ratios=strong.map(b=>b[i]/Math.max(b[j],1e-12));
  for(const q of [.95,.99]){
   const coefficient=percentile(ratios,q)*1.05;
   if(!Number.isFinite(coefficient)||coefficient<=0||coefficient>100)continue;
   signed.push(normalize(PAD_BANDS.map((_,k)=>k===i?1:k===j?-coefficient:0)));
  }
 }
 return search(signed,true);
}

// Reuse training features only, never a previously asserted verification or profile.
export function restoreTraining(raw:string,current:Record<string,unknown>):Capture[]{
 if(raw.length>12_000_000)throw Error('large diagnostic');
 const d=JSON.parse(raw);
 if(d?.version!=='pad-profile-1'||!Array.isArray(d.trainingCaptures)||!d.settings)throw Error('invalid diagnostic');
 for(const key of ['sound','volume','accentVolume','beatVolume','subVolume','bpm','sub','clickSub']){
  if(d.settings[key]===undefined||d.settings[key]!==current[key])throw Error('different audio settings');
 }
 return trainingSteps.map((step,i)=>{
  const c=d.trainingCaptures.find((x:Capture)=>x?.step===step),expected=i<2?0:10;
  if(!c||c.expected!==expected||!Array.isArray(c.frames)||c.frames.length>10000)throw Error('invalid capture');
  let prev=-Infinity;
  for(const f of c.frames){
   if(!Array.isArray(f)||f.length!==6||!f.slice(0,5).every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0)||f[0]<=prev||!Array.isArray(f[5])||f[5].length!==6||!f[5].every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10))throw Error('invalid features');
   prev=f[0];
  }
  if(!spectralFrames(c))throw Error('incomplete capture');
  const duration=c.frames.at(-1)[0]-c.frames[0][0];
  if(duration<[2.5,4.3,9,9][i]||duration>[4,6,11,11][i])throw Error('incomplete duration');
  return {step,expected,frames:c.frames};
 });
}

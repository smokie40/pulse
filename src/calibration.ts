export type Frame=[number,number,number,number,number,number[]?]; // time, filtered energy, raw energy, noise estimate, ratio
export type Step='noise'|'leak'|'normal'|'quiet'|'fast'|'mixed';
export type Capture={step:Step;frames:Frame[];expected:number;liveCount?:number;profileCount?:number};
export const steps:{id:Step;seconds:number;expected:number}[]=[
 {id:'noise',seconds:3,expected:0},{id:'leak',seconds:5,expected:0},{id:'normal',seconds:10,expected:10},{id:'quiet',seconds:10,expected:10},{id:'fast',seconds:7,expected:20},{id:'mixed',seconds:8,expected:10}
];
type OnsetState={last:number;time:number;envelope:number;attackPeak:number};
export function newOnset():OnsetState{return {last:-Infinity,time:0,envelope:0,attackPeak:0};}
export function onsetStep(state:OnsetState,time:number,e:number,noise:number,ratio:number,sensitivity:number):boolean{const gap=time-state.last;
 const dt=Math.max(0,time-state.time);
 const floor=.028*Math.pow(.045,sensitivity/100);
 const threshold=Math.max(floor*floor,noise*9);
 const previous=state.envelope;
 const attack=e>threshold&&ratio>.18;
 // A new stroke must rise above the decaying envelope of the previous sound.
 const tail=gap<.075?state.attackPeak*.48*Math.exp(-gap/.055):0;
 const fresh=attack&&gap>=.022&&e>Math.max(tail,previous*2.2);
 state.envelope=Math.max(e,previous*Math.exp(-dt/.010));
 state.time=time;
 if(fresh){state.last=time;state.attackPeak=e;return true;}
 if(gap<.014&&e>state.attackPeak)state.attackPeak=e;
 return false;}
export function detect(frames:Frame[],sensitivity:number){
 const state=newOnset();let count=0;
 for(const [time,e,_raw,noise,ratio] of frames)if(onsetStep(state,time,e,noise,ratio,sensitivity))count++;
 return count;
}
export function evaluate(captures:Capture[],sensitivity:number){
 const rows=captures.map(c=>({step:c.step,expected:c.expected,detected:detect(c.frames,sensitivity),valid:c.frames.length>=100}));
 const complete=steps.every(s=>rows.some(r=>r.step===s.id&&r.valid));
 const passed=complete&&rows.every(r=>r.expected===r.detected);
 return {rows,complete,passed};
}
export function chooseSensitivity(captures:Capture[],current:number){
 const candidates=Array.from({length:101},(_,i)=>i).filter(i=>evaluate(captures,i).passed);
 if(!candidates.length)return null;
 // Choose midpoint of widest contiguous passing range, avoiding fragile boundary thresholds.
 let groups:number[][]=[];for(const v of candidates){const g=groups[groups.length-1];if(g&&v===g[g.length-1]+1)g.push(v);else groups.push([v]);}
 groups.sort((a,b)=>b.length-a.length||Math.abs(a[Math.floor(a.length/2)]-current)-Math.abs(b[Math.floor(b.length/2)]-current));
 return groups[0][Math.floor(groups[0].length/2)];
}
export function dbfs(rms:number){return Math.max(-100,20*Math.log10(Math.max(1e-5,rms)));}
export function backgroundDb(c:Capture|undefined){if(!c?.frames.length)return null;return dbfs(Math.sqrt(c.frames.reduce((s,f)=>s+f[2],0)/c.frames.length));}

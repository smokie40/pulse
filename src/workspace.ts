import type {Config,Mode} from './training';
import type {Session} from './coach';
export const calibrationKey=(c:Config)=>JSON.stringify([c.sound,c.volume,c.accentVolume,c.beatVolume,c.subVolume,c.sensitivity]);
export const skills:{mode:Mode;title:string;description:string;rudiment:string;sub:number}[]=[
 {mode:'steady',title:'skill even',description:'skill even detail',rudiment:'RL',sub:4},
 {mode:'steady',title:'skill doubles',description:'skill doubles detail',rudiment:'RRLL',sub:4},
 {mode:'ghost',title:'skill pulse',description:'skill pulse detail',rudiment:'RL',sub:4},
 {mode:'morph',title:'skill flexibility',description:'skill flexibility detail',rudiment:'RL',sub:4},
 {mode:'adaptive',title:'skill speed',description:'skill speed detail',rudiment:'RL',sub:4},
 {mode:'accent',title:'skill accents',description:'skill accents detail',rudiment:'RLRRLRLL',sub:4}
];
export function summarizeProgress(history:Session[]){
 const byMode:Partial<Record<Mode,{count:number;latest:number}>>={};
 for(const s of [...history].sort((a,b)=>b.date.localeCompare(a.date))){
  if(!s.recognitionVerified||!s.stats||s.stats.hits<12||s.stats.hits<s.stats.expected*.5||s.seconds<20)continue;
  const v=byMode[s.mode];if(v)v.count++;else byMode[s.mode]={count:1,latest:s.stats.accuracy};
 }
 return {byMode};
}

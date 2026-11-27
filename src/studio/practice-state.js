import {defaults,rudiments} from '../training';
import {normalizeSettings} from '../settings';
import {practiceFields} from '../studio-state.js';

export const subdivisions=Object.freeze([1,2,3,4,5,6,8]);
export const stickings=Object.freeze(rudiments.map(r=>r.id));
const patternIndex=rudiment=>Math.max(0,stickings.indexOf(rudiment));

// One owner of the editable configuration and the saved free-practice parameters.
// Do not normalize temporary drills: diagnostic stages can be shorter than a minute.
export function createPracticeState(raw){
 const initial=normalizeSettings(raw);
 const fields=['bpm','beats','sub','minutes','countIn','mode','volume','clickSub','sound','accentVolume','beatVolume','subVolume','offset','sensitivity','audibleBars','silentBars','ladderStep','ladderMax'];
 const current={...Object.fromEntries(fields.map(k=>[k,initial[k]])),pattern:patternIndex(initial.rudiment)};
 let free=practiceFields(initial);
 function patch(values){for(const key of Object.keys(current))if(Object.hasOwn(values,key))current[key]=values[key];}
 function config(morphSequence){return {...defaults,...Object.fromEntries(fields.map(k=>[k,current[k]])),rudiment:stickings[current.pattern],ladderMax:Math.max(current.bpm,current.ladderMax),morphSequence};}
 function apply(values){const c=practiceFields(values);const {rudiment,...rest}=c;patch({...rest,pattern:patternIndex(rudiment)});}
 function prepareDrill(drill){apply({bpm:drill.bpm,mode:drill.mode,minutes:drill.minutes,sub:drill.sub,beats:4,rudiment:drill.rudiment,countIn:1,clickSub:drill.clickSub??false,audibleBars:drill.audibleBars??2,silentBars:drill.silentBars??2,ladderStep:drill.ladderStep??5,ladderMax:drill.ladderMax??Math.min(300,drill.bpm+20)});}
 function persistedConfig(guided,morphSequence){const c=config(morphSequence);return guided?{...c,...free}:c;}
 function rememberFree(){free=practiceFields(config());}
 function restoreFree(){apply(free);}
 return {get values(){return {...current};},get free(){return {...free};},patch,config,apply,prepareDrill,persistedConfig,rememberFree,restoreFree};
}

import {skillIds} from '../focused-plan';
import {recommend,personalizedPlan} from '../recommendation';
import {tempoProfile} from '../progression';
import {localDay} from '../studio-state.js';
import {subdivisions,stickings} from './practice-state.js';

export const planLengths=[10,15,20,30];
export function createTrainingFocus({initial,initialBpm,getHistory,save,day=localDay}){
 const raw=initial&&typeof initial==='object'?initial:{};
 const state={skill:skillIds.includes(raw.skill)?raw.skill:'timing',manualFocus:raw.manualFocus===true,bpm:Number.isFinite(raw.bpm)?Math.max(30,Math.min(300,raw.bpm)):initialBpm,sub:subdivisions.includes(raw.sub)?raw.sub:4,rudiment:stickings.includes(raw.rudiment)?raw.rudiment:'RL',length:planLengths.includes(raw.length)?raw.length:15,onboardingSkipped:!!raw.onboardingSkipped||getHistory().length>0};
 function suggestion(){return recommend(getHistory(),state.rudiment,state.sub,day(),state.skill);}
 function currentSkill(){return state.manualFocus?state.skill:suggestion().skill;}
 function profile(){return tempoProfile(getHistory(),state.rudiment,state.sub);}
 function items(ready,skill=currentSkill()){return personalizedPlan(getHistory(),skill,state.length,state.rudiment,state.sub,state.bpm,ready);}
 function patch(values){for(const key of Object.keys(state))if(Object.hasOwn(values,key))state[key]=values[key];save({...state});}
 return {get values(){return {...state};},suggestion,currentSkill,profile,items,patch,finishWelcome:()=>patch({onboardingSkipped:true})};
}

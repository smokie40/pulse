import {test,expect} from 'vitest';
import {createTrainingFocus} from './training-focus.js';

function fixture(initial={}){
 const writes=[];const focus=createTrainingFocus({initial,initialBpm:120,getHistory:()=>[],save:v=>writes.push(v),day:()=>'2026-11-27'});
 return {focus,writes};
}
test('training focus loads validated preferences independently from free-practice settings',()=>{
 const {focus}=fixture({skill:'invalid',sub:9,rudiment:'invalid',bpm:999,length:99});
 expect(focus.values).toMatchObject({skill:'timing',sub:4,rudiment:'RL',bpm:300,length:15,manualFocus:false});
 const snapshot=focus.values;snapshot.bpm=60;expect(focus.values.bpm).toBe(300);
 expect(fixture(null).focus.values.bpm).toBe(120);
});
test('manual direction and onboarding state persist using existing keys',()=>{
 const {focus,writes}=fixture();focus.patch({skill:'speed',manualFocus:true,length:20,bpm:100,sub:3,rudiment:'LR',unknown:true});
 expect(focus.currentSkill()).toBe('speed');expect(writes.at(-1)).toEqual({skill:'speed',manualFocus:true,bpm:100,sub:3,rudiment:'LR',length:20,onboardingSkipped:false});
 focus.finishWelcome();expect(writes.at(-1).onboardingSkipped).toBe(true);
 focus.patch({manualFocus:false});expect(focus.suggestion().skill).toBe('speed');
});
test('the plan uses current focus and microphone availability, not temporary setup values',()=>{
 const {focus}=fixture({skill:'speed',manualFocus:true,bpm:100,sub:3,rudiment:'LR',length:20});
 const fixed=focus.items(false),adaptive=focus.items(true);
 expect(fixed.reduce((n,x)=>n+x.minutes,0)).toBe(20);expect(fixed.some(x=>x.mode==='ladder')).toBe(true);
 expect(adaptive.some(x=>x.mode==='adaptive')).toBe(true);expect(fixed.at(-1).rudiment).toBe('LR');expect(fixed.at(-1).sub).toBe(3);expect(focus.profile().working).toBeNull();
});

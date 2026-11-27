import {test,expect} from 'vitest';
import {createPracticeState} from './practice-state.js';

test('normalized state is private and unknown patch keys are ignored',()=>{
 const p=createPracticeState({bpm:500,rudiment:'LR',visual:'timer'});expect(p.config().bpm).toBe(300);expect(p.config().rudiment).toBe('LR');
 const snapshot=p.values;snapshot.bpm=70;p.patch({verified:true,bpm:90});expect(p.config().bpm).toBe(90);expect(p.values).not.toHaveProperty('verified');expect(p.config().visual).toBe('grid');
});
test('guided practice restores free settings without rolling back audio preferences',()=>{
 const p=createPracticeState({bpm:100,mode:'ghost',silentBars:4,minutes:10,rudiment:'RRLL',countIn:2,clickSub:true});p.rememberFree();
 p.prepareDrill({mode:'morph',minutes:3,sub:6,bpm:150,rudiment:'RL'});p.patch({volume:20,sensitivity:70});
 expect(p.config([2,6])).toMatchObject({bpm:150,beats:4,sub:6,countIn:1,clickSub:false,morphSequence:[2,6],volume:20});
 expect(p.persistedConfig(true)).toMatchObject({bpm:100,mode:'ghost',silentBars:4,minutes:10,rudiment:'RRLL',volume:20,sensitivity:70});
 p.restoreFree();expect(p.config()).toMatchObject({bpm:100,mode:'ghost',silentBars:4,minutes:10,rudiment:'RRLL',countIn:2,clickSub:true,volume:20,sensitivity:70});
});
test('diagnostic durations and the tempo-ladder bound survive state transitions',()=>{
 const p=createPracticeState({bpm:90,ladderMax:110});p.prepareDrill({mode:'ladder',bpm:160,minutes:.25,sub:4,rudiment:'RL',ladderMax:150});
 expect(p.config()).toMatchObject({minutes:.25,bpm:160,ladderMax:160});
 p.restoreFree();p.patch({bpm:120});p.rememberFree();expect(p.free.bpm).toBe(120);expect(p.free.ladderMax).toBe(120);
});

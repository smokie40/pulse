import {test,expect} from 'vitest';import {restorePlan,checkpointAfter,pendingControl,planMatches} from './journey.js';
const items=[{mode:'steady',name:'warmup',minutes:2,bpm:60,sub:4,rudiment:'RL',reason:'warmupCue'},{mode:'ladder',name:'ladderWork',minutes:3,bpm:68,sub:4,rudiment:'RL',reason:'ladderCue'},{mode:'steady',name:'control',minutes:2,bpm:72,sub:4,rudiment:'RL',reason:'controlCue'}];
const p={skill:'speed',index:1,items};
test('resume next unfinished stage with resolved control',()=>{const next=checkpointAfter(p,{drill:{...items[2],bpm:83}});expect(next.index).toBe(2);expect(restorePlan(next).items[2]).toMatchObject({bpm:83,resolvedControl:true});expect(p.items[2].bpm).toBe(72);expect(checkpointAfter(next)).toBeNull()});
test('reject invalid or diagnostic checkpoints',()=>{expect(restorePlan({...p,index:3})).toBeNull();expect(restorePlan({...p,probe:true})).toBeNull();expect(restorePlan({...p,items:[{...items[0],bpm:NaN}]})).toBeNull()});
test('future speed control is not presented as a known target',()=>{expect(pendingControl(items,2,-1,'speed')).toBe(true);expect(pendingControl(items,2,2,'speed')).toBe(false);expect(pendingControl([items[0],items[1],{...items[2],confirmation:true}],2,-1,'speed')).toBe(false)});

test('guided completion requires matching planned conditions',()=>{const d=items[0],c={...d,beats:4,countIn:1,clickSub:false};expect(planMatches(d,c)).toBe(true);for(const patch of [{mode:'ghost'},{minutes:1},{bpm:90},{sub:2},{rudiment:'LR'},{beats:3},{countIn:0},{clickSub:true}])expect(planMatches(d,{...c,...patch})).toBe(false)});

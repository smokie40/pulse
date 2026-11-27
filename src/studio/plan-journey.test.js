import {test,expect} from 'vitest';
import {createPlanJourney} from './plan-journey.js';
const drill={mode:'steady',name:'steadyWork',reason:'steadyCue',bpm:80,minutes:1,sub:4,rudiment:'RL'};
function fixture(initialCheckpoint=null){
 const writes=[];let restored=0;
 const plans=createPlanJourney({initialCheckpoint,saveCheckpoint:v=>writes.push(v),restoreFreePractice:()=>restored++});
 return {plans,writes,restored:()=>restored};
}
const completed=(active,index=active.index)=>({completed:true,planRef:active,planIndex:index,cfg:{...active.items[index],beats:4,countIn:1,clickSub:false}});
test('checkpoint advances only after a matching completed session and preserves route identity',()=>{
 const {plans,writes,restored}=fixture();const active=plans.begin([drill,{...drill,bpm:90}],'timing',false);plans.store(active);
 plans.recordCompletion({...completed(active),completed:false});plans.recordCompletion({...completed(active),planRef:{...active}});plans.recordCompletion({...completed(active),cfg:{...completed(active).cfg,bpm:81}});
 expect(writes).toHaveLength(1);plans.recordCompletion(completed(active));
 expect(plans.active).toBe(active);expect(plans.checkpoint.index).toBe(1);expect(active.index).toBe(0);
 expect(plans.advance(completed(active))).toEqual({kind:'step'});expect(restored()).toBe(1);expect(plans.active.index).toBe(1);
 const last=plans.active;plans.recordCompletion(completed(last));expect(plans.checkpoint).toBeNull();expect(plans.advance(completed(last))).toEqual({kind:'complete'});expect(plans.active).toBeNull();
});
test('leaving preserves checkpoint; resuming restores it; discarding clears it',()=>{
 const {plans,writes,restored}=fixture({items:[drill],index:0,skill:'timing'});expect(plans.active).toBeNull();const active=plans.resume();plans.leave();
 expect(plans.checkpoint).toBe(active);expect(restored()).toBe(1);expect(plans.resume()).toBe(active);plans.discard();expect(plans.checkpoint).toBeNull();expect(writes).toEqual([null]);
});
test('adaptive fallback is persisted; diagnostic probe does not overwrite saved training',()=>{
 const {plans,writes}=fixture();const active=plans.begin([{...drill,mode:'adaptive'}],'speed',false);plans.store(active);expect(plans.prepare(false).mode).toBe('ladder');expect(writes).toHaveLength(2);
 plans.leave();const checkpoint=plans.checkpoint;const probe=plans.beginProbe(80,{rudiment:'RL',sub:4},'speed',true);plans.recordCompletion(completed(probe));expect(plans.checkpoint).toBe(checkpoint);
 expect(plans.advance({...completed(probe),diagnosticNext:{phase:'done'}})).toEqual({kind:'diagnosticDone',fromProgress:true});expect(plans.checkpoint).toBe(checkpoint);expect(writes).toHaveLength(2);
});

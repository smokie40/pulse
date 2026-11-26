import {test,expect} from 'vitest';
import {focusedPlan,skillIds,tempoProbe} from './focused-plan';
test('each skill fits the requested duration with positive stages',()=>{for(const skill of skillIds)for(const length of [10,15,20,30]){const p=focusedPlan([],skill,length,'RL',4,80,false);expect(p.reduce((a,x)=>a+x.minutes,0)).toBe(length);expect(p.every(x=>x.minutes>0&&x.bpm>=30&&x.bpm<=300)).toBe(true);}});
test('skills select meaningful modes rather than duplicate training labels',()=>{const modes=skillIds.map(k=>focusedPlan([],k,15,'RL',4,80,false).map(x=>x.mode));expect(modes[1]).toContain('ghost');expect(modes[2]).toContain('burst');expect(modes[2]).toContain('ladder');expect(modes[3]).toContain('morph');expect(modes[4]).toContain('accent');});
test('speed selects adaptive only when audio is ready',()=>{expect(focusedPlan([],'speed',15,'RL',4,80,true).map(x=>x.mode)).toContain('adaptive');expect(focusedPlan([],'speed',15,'RL',4,80,false).map(x=>x.mode)).not.toContain('adaptive');});

test('timing practice and control use equal tempo with reduced click support',()=>{const p=focusedPlan([],'timing',15,'RL',4,80,false);expect(p[1].bpm).toBe(p[2].bpm);expect(p[1].clickSub).toBe(true);expect(p[2].clickSub).toBe(false);});
test('initial tempo probe is bounded and lasts two minutes',()=>{expect(tempoProbe('RL',4,300)).toMatchObject({mode:'adaptive',minutes:2,bpm:100,sub:4});expect(tempoProbe('RL',4,30).bpm).toBe(30);});

import {test,expect} from 'vitest';import {steps,detect,evaluate,chooseSensitivity,type Capture,type Frame} from './calibration';
function capture(step:typeof steps[number],energy=.001):Capture{
 const frames:Frame[]=Array.from({length:5000},(_,i)=>[i*.002,1e-8,1e-8,1e-8,1]);
 for(let i=0;i<step.expected;i++)frames[100+i*100]=[.2+i*.2,energy,energy,1e-8,1];
 return {step:step.id,expected:step.expected,frames};
}
test('replay detects independent impulses',()=>expect(detect(capture(steps[2]).frames,50)).toBe(10));
test('complete exact counts required for passing',()=>{const captures=steps.map(s=>capture(s));expect(evaluate(captures,50).passed).toBe(true);expect(chooseSensitivity(captures,50)).not.toBeNull();expect(evaluate(captures.slice(0,5),50).passed).toBe(false);});
test('impossible signal separation does not return a setting',()=>{const captures=steps.map(s=>capture(s));captures[1].frames=captures[2].frames;expect(chooseSensitivity(captures,50)).toBeNull();});

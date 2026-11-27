import {expect,test} from 'vitest';
import {barSpec,defaults,matchHit,summarize,type Note} from './training';
test('ghost cycle',()=>expect([0,1,2,3,4].map(b=>barSpec({...defaults,mode:'ghost'},b).silent)).toEqual([false,false,true,true,false]));
test('ladder ceiling',()=>expect(barSpec({...defaults,mode:'ladder',ladderMax:130},20).bpm).toBe(130));
test('rhythm changes',()=>expect([0,2,4,6].map(b=>barSpec({...defaults,mode:'morph'},b).sub)).toEqual([2,3,4,6]));
test('hit assignment and missing notes',()=>{const n:Note[]=[0,1].map(i=>({time:i+1,interval:.125,bar:0,step:i,global:i,sub:4,bpm:120,silent:false,accent:false}));expect(matchHit(n,1.01)).toBe(n[0]);expect(matchHit(n,1.01)).toBeUndefined();expect(summarize(n,1,3)).toMatchObject({expected:2,hits:1,missed:1,extra:1,accuracy:33});});

test('50 BPM sixteenths distinguish matched hits from hits within the strict timing window',()=>{
 const notes:Note[]=Array.from({length:40},(_,i)=>({time:1+i*.3,interval:.3,bar:Math.floor(i/16),step:i%16,global:i,sub:4,bpm:50,silent:false,accent:false}));
 for(const n of notes)expect(matchHit(notes,n.time+.077)).toBe(n);
 expect(summarize(notes,0,Infinity)).toMatchObject({hits:40,missed:0,accuracy:0,bias:77,deviation:77});
 for(const n of notes)delete n.matched;
 for(const n of notes)expect(matchHit(notes,n.time+.077-.077)).toBe(n);
 expect(summarize(notes,0,Infinity)).toMatchObject({hits:40,missed:0,accuracy:100,bias:0,deviation:0});
});

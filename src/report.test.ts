import {expect,test} from 'vitest';import {periods,feedback} from './report';import {summarize,type Note} from './training';
const notes:Note[]=Array.from({length:60},(_,i)=>({time:i,interval:1,bar:i,step:0,global:i,sub:1,bpm:60,silent:false,accent:true,matched:i<30?0:undefined}));
test('periods use actual notes and extra hits',()=>{const p=periods(notes,[31],0,60);expect(p.map(x=>x.stats.expected)).toEqual([30,30]);expect(p.map(x=>x.stats.accuracy)).toEqual([100,0]);expect(p[1].stats.extra).toBe(1);});
test('no data means no technique diagnosis',()=>expect(feedback(summarize([],0,100),[])).toEqual(['report insufficient']));

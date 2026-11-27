import {expect,test} from 'vitest';import {periods,feedback} from './report';import {summarize,type Note} from './training';
const notes:Note[]=Array.from({length:60},(_,i)=>({time:i,interval:1,bar:i,step:0,global:i,sub:1,bpm:60,silent:false,accent:true,matched:i<30?0:undefined}));
test('periods use actual notes and extra hits',()=>{const p=periods(notes,[31],0,60);expect(p.map(x=>x.stats.expected)).toEqual([30,30]);expect(p.map(x=>x.stats.accuracy)).toEqual([100,0]);expect(p[1].stats.extra).toBe(1);});
test('no data means no technique diagnosis',()=>expect(feedback(summarize([],0,100),[])).toEqual(['report insufficient']));

test('one hour at 300 BPM and thirty-second notes preserves every window and boundary',()=>{
 const n=144000,interval=.025;const large:Note[]=Array.from({length:n},(_,i)=>({time:i*interval,interval,global:i,bar:Math.floor(i/32),step:i%32,sub:8,bpm:300,silent:false,accent:i%32===0,matched:i%13===0?undefined:(i%31)-15}));
 const extras=Array.from({length:1200},(_,i)=>i*3);
 const reference=Array.from({length:120},(_,i)=>({seconds:(i+1)*30,stats:summarize(large.filter(n=>n.time>=i*30&&n.time<(i+1)*30),extras.filter(t=>t>=i*30&&t<(i+1)*30).length,Infinity)}));
 let reads=0;const tracked=new Proxy(large,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver)}});
 expect(periods(tracked,extras,0,3600)).toEqual(reference);expect(reads).toBeLessThan(n*5);
 expect(periods(large,extras,0,60,0)).toEqual([]);
});

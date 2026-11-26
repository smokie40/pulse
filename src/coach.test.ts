import {expect,test} from 'vitest';
import {assess,plan,workingTempo} from './coach';
import type {Note} from './training';
const notes=(error:number|undefined):Note[]=>Array.from({length:48},(_,i)=>({time:i*.125,interval:.125,bar:Math.floor(i/16),step:i%16,global:i,sub:4,bpm:120,silent:false,accent:false,matched:error}));
test('good timing increases tempo',()=>expect(assess(120,notes(4),0,5,180).next).toBe(125));
test('ceiling enforced',()=>expect(assess(120,notes(4),0,5,122).next).toBe(122));
test('poor timing lowers tempo',()=>expect(assess(120,notes(40),0,5,180).next).toBe(115));
test('no microphone hits do not change tempo',()=>expect(assess(120,notes(undefined),0,5,180)).toMatchObject({decision:'check',next:120}));
test('no measured history means no confirmed tempo',()=>expect(workingTempo([],'RL',4)).toBeNull());
test('plan exactly fits requested time',()=>{for(const t of [10,15,20,30,45])expect(plan([],t,'RL',4,120).reduce((a,d)=>a+d.minutes,0)).toBe(t);});

test('unfinished tempo check cannot establish working tempo',()=>{const s={date:'2026-11-27',mode:'adaptive' as const,bpm:80,seconds:60,rudiment:'RL',sub:4,tempoProbe:true,completed:false,stats:{expected:100,hits:100,missed:0,extra:0,accuracy:100,deviation:5,bias:0},stages:[{bpm:80,accuracy:100,expected:48,extra:0,decision:'up' as const,next:85}]};expect(workingTempo([s],'RL',4)).toBeNull();expect(workingTempo([{...s,completed:true}],'RL',4)).toBe(80);});

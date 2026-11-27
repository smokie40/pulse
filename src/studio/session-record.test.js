import {test,expect} from 'vitest';
import {buildSessionRecord} from './session-record.js';
import {defaults} from '../training';
const cfg={...defaults,minutes:1,bpm:120};
const base={cfg,initial:120,last:120,elapsed:60,points:[{time:0,bpm:120}],stats:null,verified:false};
test('record builder leaves session intact and does not certify unchecked practice',()=>{const input=structuredClone(base);const before=structuredClone(input);const out=buildSessionRecord(input,{now:new Date(2026,10,27,12)});expect(input).toEqual(before);expect(out.record).toMatchObject({bpm:120,seconds:60,completed:true,recognitionVerified:false,practiceDay:'2026-11-27',manualTempoChanged:false,controlTest:false});expect(out.diagnosticNext).toBeNull()});
test('manual tempo change and interruption remain recorded',()=>{const out=buildSessionRecord({...base,elapsed:20,last:125,points:[{time:0,bpm:120},{time:5,bpm:125}]});expect(out.record).toMatchObject({completed:false,manualTempoChanged:true,last:125})});
test('a matching guided control retains its evidence identity',()=>{const planRef={skill:'timing',items:[{...cfg,name:'control'}]};const out=buildSessionRecord({...base,planRef,planIndex:0,verified:true});expect(out.record).toMatchObject({controlTest:true,recognitionVerified:true,planSkill:'timing'})});

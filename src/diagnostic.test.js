import {test,expect} from 'vitest';import {newDiagnostic,diagnosticDrill,advanceDiagnostic} from './diagnostic.js';
const record=(s,pass=true,patch={})=>({...diagnosticDrill(s),beats:4,completed:true,recognitionVerified:true,stats:{expected:100,hits:100,accuracy:pass?98:80,deviation:pass?8:25},...patch});
function simulate(start,limit){let s=newDiagnostic(start);for(let i=0;i<25&&s.phase!=='done';i++)s=advanceDiagnostic(s,record(s,s.bpm<=limit));return s;}
test('find and verify advanced tempo above old 120 BPM ceiling',()=>{expect(simulate(80,145).result).toBe(145);expect(simulate(140,145).result).toBe(145)});
test('search downward when starting tempo is too high',()=>expect(simulate(180,75).result).toBe(75));
test('never claim a result when no tested tempo succeeds',()=>expect(simulate(60,20).result).toBeNull());
test('search success alone is not a final result',()=>{let s=newDiagnostic(300);s=advanceDiagnostic(s,record(s));expect(s.phase).toBe('verify');expect(s.result).toBeNull();expect(advanceDiagnostic(s,record(s)).result).toBe(300)});
test('missing hits retry once and then stop without lowering or raising tempo',()=>{let s=newDiagnostic(100);const missing={stats:{expected:100,hits:10,accuracy:10,deviation:8}};s=advanceDiagnostic(s,record(s,true,missing));expect(s.bpm).toBe(100);expect(s.reason).toBe('retrySignal');s=advanceDiagnostic(s,record(s,true,missing));expect(s.phase).toBe('done');expect(s.result).toBeNull()});
test('failed control retries slower and never confirms a failed tempo',()=>{let s=newDiagnostic(300);s=advanceDiagnostic(s,record(s));s=advanceDiagnostic(s,record(s,false));expect(s.bpm).toBe(295);expect(s.result).toBeNull();expect(advanceDiagnostic(s,record(s,false)).result).toBeNull()});
test('mismatched conditions cannot establish tempo',()=>{let s=newDiagnostic(100);expect(advanceDiagnostic(s,record(s,true,{sub:2})).result).toBeNull()});

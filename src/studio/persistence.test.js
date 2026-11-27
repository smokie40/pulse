import {test,expect} from 'vitest';
import {createStudioStorage} from './persistence.js';

const record={date:'2026-11-27T10:00:00.000Z',mode:'steady',bpm:100,seconds:60,stats:null,rudiment:'RL',sub:4};
function fixture(seed={}){
 const data=new Map(Object.entries(seed).map(([k,v])=>[k,JSON.stringify(v)]));let blocked=false;
 const notices=[],storage=createStudioStorage({getStorage:()=>({getItem:k=>data.get(k),setItem(k,v){if(blocked)throw Error('quota');data.set(k,v);}}),onStatus:s=>notices.push(s)});
 return {storage,data,notices,block:v=>{blocked=v;}};
}
test('reads and writes existing storage keys without changing the schema',()=>{
 const {storage,data}=fixture({'pulse-language':'en','pulse-settings':{bpm:95},'pulse-training-focus':{skill:'speed'},'pulse-pending-plan':{index:1},'pulse-history':[record]});
 expect(storage.readLanguage()).toBe('en');expect(storage.readSettings()).toEqual({bpm:95});expect(storage.readFocus()).toEqual({skill:'speed'});expect(storage.readCheckpoint()).toEqual({index:1});expect(storage.history).toEqual([record]);
 storage.saveSettings({bpm:110});storage.saveLanguage('ru');storage.saveFocus({skill:'timing'});storage.saveCheckpoint(null);
 expect(JSON.parse(data.get('pulse-settings'))).toEqual({bpm:110});expect(data.get('pulse-language')).toBe('"ru"');expect(JSON.parse(data.get('pulse-training-focus'))).toEqual({skill:'timing'});expect(data.get('pulse-pending-plan')).toBe('null');
});
test('quota failures preserve current session and remain visible until the failed key is saved',()=>{
 const {storage,block,notices}=fixture();block(true);expect(storage.appendRecord(record)).toBe(false);expect(storage.history[0]).toBe(record);expect(storage.status()).toBe('storageFailed');storage.saveSettings({});
 block(false);storage.saveSettings({bpm:100});expect(storage.status()).toBe('storageFailed');expect(storage.saveHistory()).toBe(true);expect(storage.status()).toBe('');expect(notices.at(-1)).toBe('');
});
test('backup import is atomic, deduplicated and clears the repair warning on success',()=>{
 const {storage,block,data}=fixture({'pulse-history':[record,null]});expect(storage.status()).toBe('storageRepair');
 const backup=JSON.stringify({schema:1,history:[record,{...record,bpm:110}]});const original=storage.history;block(true);expect(storage.importBackup(backup)).toBeNull();expect(storage.history).toBe(original);expect(JSON.parse(data.get('pulse-history'))).toEqual([record,null]);
 block(false);expect(storage.importBackup(backup)).toEqual({added:1,updated:0});expect(storage.history).toHaveLength(2);expect(storage.status()).toBe('');expect(storage.importBackup(backup)).toEqual({added:0,updated:0});
 expect(JSON.parse(storage.exportBackup(new Date(record.date)))).toEqual({schema:1,exportedAt:record.date,history:storage.history});expect(()=>storage.importBackup('invalid')).toThrow();
});
test('restricted browser storage does not prevent startup',()=>{
 const storage=createStudioStorage({getStorage(){throw Error('denied');}});expect(storage.readSettings()).toEqual({});expect(storage.history).toEqual([]);expect(storage.saveLanguage('en')).toBe(false);expect(storage.status()).toBe('storageFailed');
});

test('invalid history JSON is surfaced rather than silently treated as first use',()=>{
 const storage=createStudioStorage({getStorage:()=>({getItem:key=>key==='pulse-history'?'{broken':null,setItem(){}})});
 expect(storage.history).toEqual([]);expect(storage.status()).toBe('storageRepair');
 expect(storage.importBackup(JSON.stringify({schema:1,history:[record]}))).toEqual({added:1,updated:0});
 expect(storage.status()).toBe('');
});

test('two stale tabs merge history before saving rather than overwriting sessions',()=>{
 const {storage:first,data}=fixture();
 const second=createStudioStorage({getStorage:()=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)})});
 first.appendRecord(record);second.appendRecord({...record,date:'2026-11-27T11:00:00.000Z',bpm:115});
 expect(JSON.parse(data.get('pulse-history'))).toHaveLength(2);
 expect(first.refreshHistory()).toBe(true);expect(first.history.map(x=>x.bpm)).toEqual([115,100]);
 expect(first.refreshHistory()).toBe(false);
});
test('unchanged preferences do not trigger another synchronous write',()=>{
 let writes=0;const data=new Map();
 const storage=createStudioStorage({getStorage:()=>({getItem:k=>data.get(k),setItem:(k,v)=>{writes++;data.set(k,v);}})});
 storage.saveSettings({bpm:120});storage.saveSettings({bpm:120});storage.saveSettings({bpm:125});expect(writes).toBe(2);
});

test('storage-event reconciliation repairs a lost concurrent write without repeating unchanged writes',()=>{
 const {storage,data}=fixture();storage.appendRecord(record);
 const remote={...record,date:'2026-11-27T11:00:00.000Z',bpm:115};data.set('pulse-history',JSON.stringify([remote]));
 expect(storage.refreshHistory(true)).toBe(true);expect(JSON.parse(data.get('pulse-history'))).toHaveLength(2);
 expect(storage.refreshHistory(true)).toBe(false);
});

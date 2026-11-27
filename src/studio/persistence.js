import {loadHistory,writeStorage,parseBackup,mergeHistory} from '../storage.js';

const keys={settings:'pulse-settings',language:'pulse-language',focus:'pulse-training-focus',checkpoint:'pulse-pending-plan',history:'pulse-history'};

// Persistence boundary for the studio. Storage access itself may throw in restricted browsers.
export function createStudioStorage({getStorage,onStatus=()=>{}}){
 const failures=new Set();
 function read(key,fallback){try{return JSON.parse(getStorage().getItem(key)||'null')??fallback;}catch{return fallback;}}
 let unreadableHistory=false;
 let rawHistory=[];
 try{const raw=getStorage().getItem(keys.history);if(raw!=null)rawHistory=JSON.parse(raw);}catch{unreadableHistory=true;}
 const loaded=loadHistory(rawHistory);
 let history=loaded.history,historyRepair=loaded.invalid||unreadableHistory;
 function status(){return failures.size?'storageFailed':historyRepair?'storageRepair':'';}
 function write(key,value){
  let ok=false;try{const target=getStorage();ok=target.getItem(key)===JSON.stringify(value)||writeStorage(target,key,value);}catch{}
  if(ok)failures.delete(key);else failures.add(key);
  onStatus(status());return ok;
 }
 // Merge the latest persisted history before writes so a stale tab does not erase another tab's sessions.
 function latestHistory(){try{const raw=getStorage().getItem(keys.history);if(raw==null)return [];const loaded=loadHistory(JSON.parse(raw));if(loaded.invalid)historyRepair=true;return loaded.history;}catch{historyRepair=true;return [];}}
 function combined(){return mergeHistory(history,latestHistory()).history;}
 function refreshHistory(reconcile=false){const disk=latestHistory(),merged=mergeHistory(history,disk),next=merged.history;const changed=JSON.stringify(next)!==JSON.stringify(history);if(changed)history=next;if(reconcile){const missing=mergeHistory(disk,history);if(missing.added||missing.updated)write(keys.history,missing.history);}onStatus(status());return changed;}
 function saveHistory(){const next=combined();if(!write(keys.history,next))return false;history=next;return true;}
 // A new session remains available in memory even when persistent storage is full.
 function appendRecord(record){history.unshift(record);return saveHistory();}
 // Import is transactional: do not replace in-memory history if persistence fails.
 function importBackup(raw){
  const merged=mergeHistory(combined(),parseBackup(raw));
  if(!write(keys.history,merged.history))return null;
  history=merged.history;historyRepair=false;onStatus(status());
  return {added:merged.added,updated:merged.updated};
 }
 function exportBackup(now=new Date()){return JSON.stringify({schema:1,exportedAt:now.toISOString(),history},null,2);}
 return {
  readSettings:()=>read(keys.settings,{}),readLanguage:()=>read(keys.language,'ru'),
  readFocus:()=>read(keys.focus,{}),readCheckpoint:()=>read(keys.checkpoint,null),
  saveSettings:value=>write(keys.settings,value),saveLanguage:value=>write(keys.language,value),
  saveFocus:value=>write(keys.focus,value),saveCheckpoint:value=>write(keys.checkpoint,value),
  get history(){return history;},status,refreshHistory,appendRecord,saveHistory,importBackup,exportBackup
 };
}

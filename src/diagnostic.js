// Bounded working-tempo assessment. Independent constant-tempo blocks.
const MIN=30,MAX=300,SEARCH_LIMIT=10;
const clamp=b=>Math.max(MIN,Math.min(MAX,Math.round(b)));
export function newDiagnostic(start,rudiment='RL',sub=4){
 return {phase:'search',bpm:clamp(Number.isFinite(start)?start:80),rudiment,sub,low:null,high:null,searches:0,retries:0,checks:0,observations:[],result:null,reason:null};
}
export function diagnosticDrill(s){
 return {mode:'steady',name:s.phase==='verify'?'diagVerify':s.phase==='refine'?'diagRefine':'diagSearch',reason:s.phase==='verify'?'diagVerifyCue':'diagSearchCue',minutes:s.phase==='verify'?1:1/3,bpm:s.bpm,rudiment:s.rudiment,sub:s.sub,clickSub:false};
}
export function diagnosticQuality(record){
 const st=record?.stats;
 if(!record?.completed||!record.recognitionVerified||record.manualTempoChanged||!st||st.expected<12||st.hits<st.expected*.5||!Number.isFinite(st.deviation))return 'unknown';
 return st.accuracy>=92&&st.deviation<=20?'pass':'fail';
}
export function advanceDiagnostic(state,record){
 if(state.phase==='done')return state;
 if(record?.bpm!==state.bpm||record?.sub!==state.sub||record?.rudiment!==state.rudiment||record?.mode!=='steady'||record?.beats!==4||record?.clickSub!==false)return {...state,phase:'done',reason:'unknown',result:null};
 const outcome=diagnosticQuality(record);
 const s={...state,observations:[...state.observations,{bpm:state.bpm,phase:state.phase,outcome}]};
 const finish=(reason,result=null)=>({...s,phase:'done',reason,result});
 const verify=bpm=>({...s,phase:'verify',bpm:clamp(bpm),retries:0});
 if(outcome==='unknown'){
  if(!s.retries)return {...s,retries:1,reason:'retrySignal'};
  return finish('unknown');
 }
 s.retries=0;s.reason=null;
 if(s.phase==='verify'){
  s.checks++;
  if(outcome==='pass')return finish('verified',s.bpm);
  if(s.checks>=2||s.bpm===MIN)return finish('notStable');
  const lower=s.observations.filter(o=>o.phase!=='verify'&&o.outcome==='pass'&&o.bpm<s.bpm).map(o=>o.bpm);
  return verify(lower.length?Math.max(...lower):s.bpm-5);
 }
 s.searches++;
 if(outcome==='pass')s.low=s.low===null?s.bpm:Math.max(s.low,s.bpm);
 else s.high=s.high===null?s.bpm:Math.min(s.high,s.bpm);
 if(s.low!==null&&(s.low===MAX||s.searches>=SEARCH_LIMIT||(s.high!==null&&s.high-s.low<=5)))return verify(s.low);
 if(s.searches>=SEARCH_LIMIT)return finish('notStable');
 if(s.low!==null&&s.high!==null){
  const mid=clamp(Math.floor((s.low+s.high)/10)*5);
  if(mid<=s.low||mid>=s.high)return verify(s.low);
  return {...s,phase:'refine',bpm:mid};
 }
 if(s.low!==null)return {...s,phase:'search',bpm:clamp(s.bpm+20)};
 if(s.bpm===MIN)return finish('notStable');
 return {...s,phase:'search',bpm:clamp(s.bpm-20)};
}

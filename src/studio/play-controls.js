// Own only the device-level aids. They are optional, never prerequisites for practice.
export function createScreenAids({doc,nav,onChange=()=>{}}){
 let active=false,revision=0,lock=null,pending=null,entered=false,fullTask=null;
 async function requestWake(){
  if(!active||doc.hidden||lock||pending||!nav.wakeLock?.request)return;
  const epoch=revision;
  const task=(async()=>{try{
   const next=await nav.wakeLock.request('screen');
   if(!active||revision!==epoch||doc.hidden){await next.release();return;}
   lock=next;next.addEventListener('release',()=>{if(lock===next){lock=null;onChange();}},{once:true});
  }catch{}finally{onChange();}})();
  pending=task;try{await task;}finally{if(pending===task)pending=null;if(active&&revision!==epoch&&!doc.hidden)void requestWake();}
 }
 function start(){active=true;revision++;void requestWake();}
 function stop({keepFullscreen=false}={}){active=false;revision++;const old=lock;lock=null;if(old)void old.release().catch(()=>{});if(!keepFullscreen&&entered&&doc.fullscreenElement){entered=false;void doc.exitFullscreen().catch(()=>{});}onChange();}
 async function toggleFullscreen(){
  if(!active||fullTask)return false;
  const task=(async()=>{try{
   if(doc.fullscreenElement){await doc.exitFullscreen();entered=false;}
   else if(doc.fullscreenEnabled&&doc.documentElement.requestFullscreen){await doc.documentElement.requestFullscreen();entered=true;if(!active){entered=false;await doc.exitFullscreen();}}
   else return false;
   return true;
  }catch{return false;}finally{onChange();}})();
  fullTask=task;try{return await task;}finally{if(fullTask===task)fullTask=null;onChange();}
 }
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)void requestWake();});
 doc.addEventListener('fullscreenchange',()=>{if(!doc.fullscreenElement)entered=false;onChange();});
 return {start,stop,toggleFullscreen,get wakeActive(){return !!lock&&!lock.released},get wakeSupported(){return !!nav.wakeLock?.request},get fullscreen(){return !!doc.fullscreenElement},get fullscreenSupported(){return !!doc.fullscreenEnabled&&!!doc.documentElement.requestFullscreen}};
}
export function liveFeedback(snap,verified){
 if(!snap.measured)return {key:'analysisOff',count:null,accuracy:null};
 const s=snap.stats,count=s.hits+s.extra;
 if(s.expected<12)return {key:'liveCollecting',count,accuracy:null};
 if(count===0)return {key:'liveNoHits',count,accuracy:null};
 if(s.hits<s.expected*.5)return {key:'livePoorMatch',count,accuracy:null};
 return {key:verified?'accuracy':'uncheckedAccuracy',count,accuracy:s.accuracy};
}

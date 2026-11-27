import {test,expect,vi} from 'vitest';
import {createScreenAids,liveFeedback} from './play-controls.js';
function fixture(){
 const events={};const doc={hidden:false,fullscreenEnabled:true,fullscreenElement:null,documentElement:{},addEventListener:(k,v)=>events[k]=v};
 doc.documentElement.requestFullscreen=vi.fn(async()=>{doc.fullscreenElement=doc.documentElement;events.fullscreenchange?.();});
 doc.exitFullscreen=vi.fn(async()=>{doc.fullscreenElement=null;events.fullscreenchange?.();});
 const lock={released:false,addEventListener:vi.fn(),release:vi.fn(async()=>{lock.released=true;})};
 const nav={wakeLock:{request:vi.fn(async()=>lock)}};
 return {doc,nav,lock,events};
}
test('screen aid requests wake lock during practice and exits only fullscreen it entered',async()=>{
 const {doc,nav,lock}=fixture(),aids=createScreenAids({doc,nav});aids.start();await Promise.resolve();await Promise.resolve();expect(aids.wakeActive).toBe(true);expect(await aids.toggleFullscreen()).toBe(true);expect(aids.fullscreen).toBe(true);aids.stop();expect(lock.release).toHaveBeenCalledOnce();expect(doc.exitFullscreen).toHaveBeenCalledOnce();
});
test('a wake lock granted after practice stops is released immediately',async()=>{
 const {doc,nav,lock}=fixture();let grant;nav.wakeLock.request.mockImplementationOnce(()=>new Promise(r=>{grant=r;}));const aids=createScreenAids({doc,nav});aids.start();aids.stop();grant(lock);await Promise.resolve();await Promise.resolve();expect(lock.release).toHaveBeenCalledOnce();expect(aids.wakeActive).toBe(false);
});
test('unsupported device aids are optional',async()=>{const {doc}=fixture();doc.fullscreenEnabled=false;const aids=createScreenAids({doc,nav:{}});aids.start();expect(aids.wakeSupported).toBe(false);expect(await aids.toggleFullscreen()).toBe(false);aids.stop();});
test('feedback differentiates absence of detection, insufficient matches, and measured accuracy',()=>{
 const snap=(expected,hits,extra,measured=true)=>({measured,stats:{expected,hits,extra,accuracy:92}});
 expect(liveFeedback(snap(0,0,0,false),false).key).toBe('analysisOff');
 expect(liveFeedback(snap(8,3,0),false).key).toBe('liveCollecting');
 expect(liveFeedback(snap(30,0,0),true).key).toBe('liveNoHits');
 expect(liveFeedback(snap(30,3,5),true)).toEqual({key:'livePoorMatch',count:8,accuracy:null});
 expect(liveFeedback(snap(30,28,0),false).key).toBe('uncheckedAccuracy');expect(liveFeedback(snap(30,28,0),true).accuracy).toBe(92);
});

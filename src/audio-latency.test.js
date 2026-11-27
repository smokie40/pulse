import {test,expect,vi,afterEach} from 'vitest';
import {PulseEngine} from './audio';
import {defaults} from './training';
function fixture({silent=false,auto=true}={}){
 const engine=new PulseEngine(),rate=16000,disconnect=vi.fn(),track={readyState:'live'},scheduled=[];
 const ctx={state:'running',sampleRate:rate,currentTime:10,resume:async()=>{},audioWorklet:{addModule:vi.fn(async()=>{})},destination:{},
 createBuffer:(_,n)=>{const data=new Float32Array(n);return {getChannelData:()=>data};},
 createGain:()=>({gain:{value:0},connect(){},disconnect}),
 createBufferSource:()=>({connect(){},disconnect,stop(){},start(t){scheduled.push({time:t,buffer:this.buffer});if(auto&&scheduled.length%7===0)queueMicrotask(deliver);}})};
 let node;
 class Worklet{constructor(_,name,options){this.options=options.processorOptions;this.port={onmessage:null};node=this;}connect(){}disconnect(){disconnect();}}
 function deliver(){const {startFrame,endFrame}=node.options,samples=new Float32Array(endFrame-startFrame);
  for(const v of scheduled.slice(-7)){const pos=Math.round(v.time*rate)-startFrame+Math.round(rate*.077);const p=v.buffer.getChannelData(0);if(!silent)for(let i=0;i<p.length;i++)samples[pos+i]=p[i]*.5;}
  node.port.onmessage?.({data:{kind:'loopback',startFrame,samples}});
 }
 vi.stubGlobal('AudioWorkletNode',Worklet);vi.stubGlobal('document',{hidden:false,baseURI:'https://example.test/pulse/',addEventListener(){},removeEventListener(){}});vi.stubGlobal('window',{setTimeout,clearTimeout,clearInterval(){}});
 engine.ctx=ctx;engine.mic=true;engine.source={connect(){},disconnect};engine.sink={};engine.stream={getAudioTracks:()=>[track]};
 return {engine,ctx,scheduled,disconnect};
}
afterEach(()=>vi.unstubAllGlobals());
test('automatic offset is derived from scheduled probes, applied by engine, and invalidated independently of the pad',async()=>{
 const {engine,ctx,scheduled,disconnect}=fixture();
 expect(await engine.measureLatency({...defaults,volume:100})).toMatchObject({offsetMs:77,trials:7});expect(scheduled).toHaveLength(7);expect(engine.effectiveOffset(12)).toBe(77);expect(disconnect).toHaveBeenCalled();
 await engine.measureLatency({...defaults,volume:100});expect(ctx.audioWorklet.addModule).toHaveBeenCalledOnce();
 engine.invalidateLatency();expect(engine.timingCalibration).toBeNull();expect(engine.effectiveOffset(12)).toBe(12);
},15000);
test('silence never yields an automatic offset',async()=>{const {engine}=fixture({silent:true});expect(await engine.measureLatency(defaults)).toBeNull();expect(engine.effectiveOffset(19)).toBe(19);});
test('device invalidation aborts in-progress loopback and cleans capture nodes',async()=>{
 const {engine,scheduled,disconnect}=fixture({auto:false});const pending=engine.measureLatency(defaults);
 for(let i=0;i<10&&!scheduled.length;i++)await Promise.resolve();
 expect(scheduled).toHaveLength(7);engine.invalidateLatency();expect(await pending).toBeNull();expect(engine.timingCalibration).toBeNull();expect(disconnect).toHaveBeenCalled();
});

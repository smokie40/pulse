import {test,expect,vi,afterEach} from 'vitest';
import {PulseEngine} from './audio';
import {defaults} from './training';

function fixture(){
 const clock={currentTime:0,state:'running',resume:vi.fn(async()=>{}),sampleRate:48000};
 const engine=new PulseEngine();
 engine.ctx=clock as unknown as AudioContext;
 engine.gain={gain:{value:0}} as unknown as GainNode;
 const click=vi.spyOn(engine as any,'click').mockImplementation(()=>{});
 vi.stubGlobal('window',{setInterval:vi.fn(()=>1),clearInterval:vi.fn(),setTimeout,clearTimeout});
 vi.stubGlobal('document',{hidden:false});
 return {engine,clock,click,schedule:()=>(engine as any).schedule()};
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
test('scheduler refuses to backfill missed audible clicks after a stall',async()=>{
 const {engine,clock,click,schedule}=fixture();await engine.start({...defaults,countIn:0,minutes:1,bpm:120});
 clock.currentTime=.12;schedule();expect(engine.notes.length).toBeGreaterThan(0);const before=engine.notes.length,voices=click.mock.calls.length;
 clock.currentTime=10;schedule();expect(engine.active).toBe(false);expect(engine.interrupted).toBe(true);expect(engine.notes.length).toBe(before);expect(click.mock.calls.length).toBe(voices);expect(engine.snapshot().elapsed).toBeLessThan(1);
 engine.releaseSessionData();expect(engine.notes).toHaveLength(0);
});
test('pending start cannot resume after cancellation while AudioContext is starting',async()=>{
 const {engine,clock}=fixture();let resume!:()=>void;clock.resume.mockImplementationOnce(()=>new Promise<void>(r=>{resume=r;}));
 const pending=engine.start({...defaults,countIn:0});engine.cancelPending();resume();
 await expect(pending).rejects.toThrow('interrupted');expect(engine.active).toBe(false);
 await engine.start({...defaults,countIn:0});expect(engine.active).toBe(true);expect(engine.interrupted).toBe(false);engine.stop();
});
test('capture is cancelled immediately during the preparation delay and can be retried',async()=>{
 vi.useFakeTimers();const {engine}=fixture();engine.mic=true;
 const postMessage=vi.fn();engine.detector={port:{postMessage}} as unknown as AudioWorkletNode;
 engine.stream={getAudioTracks:()=>[{readyState:'live'}]} as unknown as MediaStream;
 const capture=engine.capture('noise',3,0,defaults);const rejection=expect(capture).rejects.toThrow('interrupted');
 await Promise.resolve();await Promise.resolve();engine.cancelPending();await rejection;expect(vi.getTimerCount()).toBe(0);
 const retry=engine.capture('noise',3,0,defaults);const rejected=expect(retry).rejects.toThrow('interrupted');engine.cancelPending();await rejected;
});
test('cancel active playback invalidates evidence, and fresh playback resets interruption',async()=>{
 const {engine,clock}=fixture();await engine.start({...defaults,countIn:0});clock.currentTime=1;engine.cancelPending();expect(engine.interrupted).toBe(true);expect(engine.active).toBe(false);
 await engine.start({...defaults,countIn:0});expect(engine.interrupted).toBe(false);engine.stop();
});

test('unmeasured hour-long scheduler retains only a bounded display buffer',async()=>{
 const {engine,clock,schedule}=fixture();await engine.start({...defaults,countIn:0,minutes:0,bpm:300,sub:8});
 for(let i=1;i<=3600*40;i++){clock.currentTime=i*.025;schedule();if(!engine.active)throw Error('unexpected interruption');}
 expect(engine.notes.length).toBeLessThanOrEqual(2048);expect(engine.snapshot().elapsed).toBeGreaterThan(3599);expect(engine.snapshot().current?.global).toBeGreaterThan(143000);engine.stop();
});

test('an unavailable AudioContext times out instead of locking the start button indefinitely',async()=>{
 vi.useFakeTimers();const {engine,clock}=fixture();clock.resume.mockImplementationOnce(()=>new Promise<void>(()=>{}));
 const pending=engine.start({...defaults,countIn:0});const rejected=expect(pending).rejects.toThrow('resume timed out');await vi.advanceTimersByTimeAsync(4000);await rejected;expect(engine.active).toBe(false);
 await engine.start({...defaults,countIn:0});expect(engine.active).toBe(true);engine.stop();
});

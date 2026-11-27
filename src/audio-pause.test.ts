import {test,expect,vi,afterEach} from 'vitest';
import {PulseEngine} from './audio';
import {defaults} from './training';

function fixture(){
 const ctx={currentTime:0,state:'running',resume:vi.fn(async()=>{ctx.state='running';}),suspend:vi.fn(async()=>{ctx.state='suspended';})};
 const engine=new PulseEngine();engine.ctx=ctx as unknown as AudioContext;engine.gain={gain:{value:0}} as unknown as GainNode;
 vi.spyOn(engine as any,'click').mockImplementation(()=>{});vi.stubGlobal('window',{setInterval:()=>1,clearInterval(){}});
 return {engine,ctx,schedule:()=> (engine as any).schedule()};
}
afterEach(()=>vi.unstubAllGlobals());
test('pause freezes audio time and note scheduling; resume continues the same session',async()=>{
 const {engine,ctx,schedule}=fixture();await engine.start({...defaults,countIn:0,minutes:1});ctx.currentTime=.65;schedule();const before=engine.snapshot(),n=engine.notes.length;
 expect(await engine.togglePause()).toBe(true);expect(ctx.state).toBe('suspended');expect(engine.paused).toBe(true);expect(engine.active).toBe(true);schedule();
 expect(engine.notes.length).toBe(n);expect(engine.snapshot().elapsed).toBe(before.elapsed);expect(engine.setLiveTempo(140)).toBe(false);
 expect(await engine.togglePause()).toBe(true);expect(engine.paused).toBe(false);expect(engine.hadPause).toBe(true);ctx.currentTime=.85;schedule();expect(engine.snapshot().elapsed).toBeGreaterThan(before.elapsed);expect(engine.notes.length).toBeGreaterThan(n);engine.stop();
});
test('stopping while paused uses frozen playing time; next session starts fresh',async()=>{
 const {engine,ctx,schedule}=fixture();await engine.start({...defaults,countIn:0});ctx.currentTime=2;schedule();await engine.togglePause();const elapsed=engine.snapshot().elapsed;engine.stop();expect(engine.active).toBe(false);expect(engine.paused).toBe(false);expect(engine.snapshot().elapsed).toBe(elapsed);await engine.start({...defaults,countIn:0});expect(engine.hadPause).toBe(false);expect(ctx.state).toBe('running');engine.stop();
});
test('failed suspension leaves playback running',async()=>{const {engine,ctx}=fixture();await engine.start({...defaults,countIn:0});ctx.suspend.mockRejectedValueOnce(new Error('failure'));expect(await engine.togglePause()).toBe(false);expect(engine.paused).toBe(false);expect(engine.active).toBe(true);engine.stop();});

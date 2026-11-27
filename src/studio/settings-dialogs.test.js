import {test,expect,vi} from 'vitest';
import {bindSettingsDialogs} from './settings-dialogs.js';
test('latency compensation is independent of spectral profile calibration',()=>{
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:0,dataset:{}});return nodes.get(id);};
 const offset={dataset:{level:'offset'},value:75},accent={dataset:{level:'accentVolume'},value:60};
 $('dialogContent').querySelectorAll=selector=>selector==='[data-level]'?[offset,accent]:[];
 const cfg={sound:'woodblock',volume:100,clickSub:true,accentVolume:100,beatVolume:100,subVolume:100,offset:0};
 const resetCal=vi.fn(),persist=vi.fn(),engine={configureSound:vi.fn(),invalidateLatency:vi.fn()};
 bindSettingsDialogs({$,t:k=>k,tr:k=>k,dialog:vi.fn(),closeDialog:vi.fn(),config:()=>cfg,patchPractice:v=>Object.assign(cfg,v),getContext:()=>({active:false,micBusy:false}),engine,persist,render:vi.fn(),resetCal,previewError:vi.fn()});
 $('soundBtn').onclick();offset.oninput({target:offset});expect(cfg.offset).toBe(75);expect($('offsetVal').textContent).toBe('75 ms');expect(resetCal).not.toHaveBeenCalled();expect(engine.configureSound).not.toHaveBeenCalled();expect(persist).toHaveBeenCalledOnce();
 accent.oninput({target:accent});expect(cfg.accentVolume).toBe(60);expect(resetCal).toHaveBeenCalledOnce();expect(engine.configureSound).toHaveBeenCalledOnce();
});

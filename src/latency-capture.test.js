import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../public/latency-capture.js',import.meta.url),'utf8');
function fixture(start,end){const messages=[],ctx={sampleRate:48000,currentFrame:0,Float32Array,AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)};}},registerProcessor:(_,P)=>{ctx.Processor=P;}};runInNewContext(code,ctx);const p=new ctx.Processor({processorOptions:{startFrame:start,endFrame:end}});return {messages,run:(frame,values)=>{ctx.currentFrame=frame;return p.process([[Float32Array.from(values)]]);}};}
test('capture copies only the exact sample interval across arbitrary block boundaries',()=>{const f=fixture(3,11);expect(f.run(0,[0,1,2,3,4])).toBe(true);expect(f.run(5,[5,6,7,8,9])).toBe(true);expect(f.run(10,[10,11,12])).toBe(false);expect(f.messages).toHaveLength(1);expect(f.messages[0].startFrame).toBe(3);expect(Array.from(f.messages[0].samples)).toEqual([3,4,5,6,7,8,9,10]);});
test('discontinuous input cannot produce a falsely valid measurement',()=>{const f=fixture(3,11);f.run(0,[0,1,2,3,4]);expect(f.run(6,[6,7,8,9,10,11])).toBe(false);expect(f.messages[0].kind).toBe('error');});

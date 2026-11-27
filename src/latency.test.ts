import {test,expect} from 'vitest';
import {estimateLatency,makeLatencyProbe,TRIALS,SPACING,MAX_DELAY_MS} from './latency';
function fixture(rate:number,delays:number[],options:{noise?:number;echo?:number;gain?:number}={}){
 const probe=makeLatencyProbe(rate),starts=Array.from({length:TRIALS},(_,i)=>Math.round(rate*(.1+i*SPACING)));
 const record=new Float32Array(starts.at(-1)!+Math.ceil(rate*(MAX_DELAY_MS/1000+.2))+probe.length);let seed=42;
 for(let i=0;i<record.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;record[i]=(seed/4294967296*2-1)*(options.noise??.001);}
 for(let t=0;t<TRIALS;t++){if(delays[t]<0)continue;const pos=starts[t]+Math.round(delays[t]*rate/1000);
  for(let i=0;i<probe.length;i++){record[pos+i]+=probe[i]*(options.gain??.4);if(options.echo)record[pos+i+Math.round(rate*.017)]+=probe[i]*options.echo;}
 }
 return {record,probe,starts,rate};
}
function measure(f:ReturnType<typeof fixture>){return estimateLatency(f.record,f.probe,f.starts,f.rate);}
test('known delay is recovered at 44.1 and 48 kHz with noise, inverted polarity and weak echoes',()=>{
 for(const rate of [44100,48000]){const f=fixture(rate,[77,77.2,76.9,77,77.1,77,77.3],{noise:.003,echo:.12,gain:-.5}),r=measure(f);expect(r).not.toBeNull();expect(Math.abs(r!.offsetMs-77)).toBeLessThan(.5);expect(r!.trials).toBe(7);expect(r!.jitterMs).toBeLessThan(1);}
},20000);
test('outliers and missing probes are not used to bias a stable estimate',()=>{const r=measure(fixture(48000,[130,130.2,130,130.1,130.1,240,-1]));expect(r).not.toBeNull();expect(r!.trials).toBe(5);expect(r!.offsetMs).toBeCloseTo(130.1,0);},20000);
test('silence, noise alone, unstable delay and ambiguous equal echoes are rejected',()=>{
 for(const f of [fixture(16000,Array(7).fill(-1),{noise:0}),fixture(16000,Array(7).fill(-1),{noise:.03}),fixture(16000,[25,45,65,85,105,125,145]),fixture(16000,Array(7).fill(75),{echo:.4,gain:.4})])expect(measure(f)).toBeNull();
},20000);

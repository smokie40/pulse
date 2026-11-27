import {samples,SAMPLE_RATE} from './click-samples';
type SampleSound=keyof typeof samples;
type LegacySound='soft'|'studio'|'digital'|'low';
export const sampleSounds:SampleSound[]=['woodblock','studioStick','rimshot','claves','softBlock','electronic'];
export const CLICK_FREQUENCIES=[920,1840] as const;
export type ClickKind='accent'|'beat'|'sub';
export type ClickSound=SampleSound|LegacySound|'reference';
export const sounds:ClickSound[]=[...sampleSounds,'reference'];
const pitch:Record<LegacySound,readonly [number,number]>={soft:CLICK_FREQUENCIES,studio:[1450,2900],digital:[2250,4500],low:[620,1240]};
const isSample=(sound:ClickSound):sound is SampleSound=>Object.hasOwn(samples,sound);
const legacy=(sound:ClickSound):LegacySound=>sound==='reference'||isSample(sound)?'soft':sound;
export const frequencies=(sound:ClickSound):readonly number[]=>isSample(sound)?samples[sound].frequencies:pitch[legacy(sound)];
const decoded=new Map<SampleSound,Float32Array>();
function recordedWave(sampleRate:number,kind:ClickKind,sound:SampleSound){
 let source=decoded.get(sound);
 if(!source){const raw=atob(samples[sound].pcm);source=new Float32Array(raw.length/2);for(let i=0;i<source.length;i++){const value=raw.charCodeAt(2*i)|(raw.charCodeAt(2*i+1)<<8);source[i]=((value<<16)>>16)/32768;}decoded.set(sound,source);}
 const gain=kind==='accent'?1:kind==='beat'?.77:.45,output=new Float32Array(Math.ceil(source.length*sampleRate/SAMPLE_RATE));
 for(let i=0;i<output.length;i++){const p=i*SAMPLE_RATE/sampleRate,k=Math.floor(p),f=p-k;output[i]=((source[k]??0)*(1-f)+(source[k+1]??0)*f)*gain;}
 return output;
}
export function makeClick(sampleRate:number,kind:ClickKind,sound:ClickSound='soft'):Float32Array{
 if(isSample(sound))return recordedWave(sampleRate,kind,sound);
 const tone=legacy(sound);const [fund,upper]=pitch[tone];
 const p={soft:[.045,.004,.012,1],studio:[.038,.003,.009,1.5],digital:[.030,.0025,.006,1.8],low:[.055,.006,.015,.55]}[tone];
 const [duration,attack,decay,brightness]=p, data=new Float32Array(Math.ceil(sampleRate*duration));
 const harmonic=(kind==='accent'?.48:kind==='beat'?.26:.10)*brightness;
 const volume=kind==='accent'?.95:kind==='beat'?.73:.43;
 let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate,envelope=(1-Math.exp(-t/attack))*Math.exp(-t/decay)*Math.max(0,Math.min(1,(duration-t)/.008));
  data[i]=envelope*(Math.sin(2*Math.PI*fund*t)+harmonic*Math.sin(2*Math.PI*upper*t));peak=Math.max(peak,Math.abs(data[i]));
 }
 if(peak>0)for(let i=0;i<data.length;i++)data[i]*=volume/peak;
 return data;
}

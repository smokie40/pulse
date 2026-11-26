export const CLICK_FREQUENCIES=[920,1840] as const;
export type ClickKind='accent'|'beat'|'sub';
export type ClickSound='soft'|'studio'|'digital'|'low';
export const sounds:ClickSound[]=['soft','studio','digital','low'];
const pitch:Record<ClickSound,readonly [number,number]>={soft:CLICK_FREQUENCIES,studio:[1450,2900],digital:[2250,4500],low:[620,1240]};
export const frequencies=(sound:ClickSound):readonly number[]=>pitch[sound]??pitch.soft;
export function makeClick(sampleRate:number,kind:ClickKind,sound:ClickSound='soft'):Float32Array{
 const [fund,upper]=frequencies(sound);
 const p={soft:[.045,.004,.012,1],studio:[.038,.003,.009,1.5],digital:[.030,.0025,.006,1.8],low:[.055,.006,.015,.55]}[sound];
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

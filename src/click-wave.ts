// Keep the click spectral signature narrow and known to the microphone detector.
export const CLICK_FREQUENCIES=[920,1840] as const;
export type ClickKind='accent'|'beat'|'sub';
export function makeClick(sampleRate:number,kind:ClickKind):Float32Array{
 const duration=.045, data=new Float32Array(Math.ceil(sampleRate*duration));
 const harmonic=kind==='accent'?.48:kind==='beat'?.26:.10;
 const volume=kind==='accent'?.95:kind==='beat'?.73:.43;
 let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate, envelope=(1-Math.exp(-t/.004))*Math.exp(-t/.012)*Math.min(1,(duration-t)/.008);
  const wave=envelope*(Math.sin(2*Math.PI*CLICK_FREQUENCIES[0]*t)+harmonic*Math.sin(2*Math.PI*CLICK_FREQUENCIES[1]*t));
  data[i]=wave;peak=Math.max(peak,Math.abs(wave));
 }
 if(peak>0)for(let i=0;i<data.length;i++)data[i]*=volume/peak;
 return data;
}

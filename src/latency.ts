// Acoustic round-trip delay on the AudioContext sample clock.
export const TRIALS=7,MAX_DELAY_MS=500,SPACING=.85,LEAD=.35,PROBE_SECONDS=.046;
export type LatencyEstimate={offsetMs:number;jitterMs:number;trials:number;correlation:number};
export function makeLatencyProbe(rate:number):Float32Array{
 const n=Math.round(rate*PROBE_SECONDS),out=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/rate,phase=2*Math.PI*(350*t+(4200-350)*t*t/(2*PROBE_SECONDS)),fade=Math.min(1,i/(rate*.003),(n-1-i)/(rate*.004));out[i]=.22*Math.sin(phase)*Math.max(0,fade);}
 return out;
}
type Peak={lag:number;score:number};
function correlate(record:Float32Array,probe:Float32Array,start:number,rate:number):Peak|null{
 const max=Math.round(rate*MAX_DELAY_MS/1000),n=probe.length,dec=Math.max(1,Math.floor(rate/12000));
 if(start<0||start+max+n>record.length||n<64)return null;
 const scoreAt=(lag:number,stride:number)=>{
  let a=0,b=0,aa=0,bb=0,ab=0,count=0,clipped=0;
  for(let i=0;i<n;i+=stride){const x=probe[i],y=record[start+lag+i];a+=x;b+=y;aa+=x*x;bb+=y*y;ab+=x*y;count++;if(Math.abs(y)>.99)clipped++;}
  const v=bb-b*b/count,u=aa-a*a/count;
  if(v/count<1e-8||u<=0||clipped>count*.02)return 0;
  return Math.abs(ab-a*b/count)/Math.sqrt(u*v);
 };
 const peaks:Peak[]=[];
 for(let lag=0;lag<=max;lag+=dec)peaks.push({lag,score:scoreAt(lag,dec)});
 peaks.sort((a,b)=>b.score-a.score);
 const refined:Peak[]=[];
 for(const p of peaks){if(refined.some(q=>Math.abs(q.lag-p.lag)<rate*.008))continue;
  let best:Peak={lag:p.lag,score:0};
  for(let lag=Math.max(0,p.lag-dec);lag<=Math.min(max,p.lag+dec);lag++){const score=scoreAt(lag,1);if(score>best.score)best={lag,score};}
  refined.push(best);if(refined.length===4)break;
 }
 refined.sort((a,b)=>b.score-a.score);const p=refined[0],second=refined[1]?.score??0;
 if(!p||p.score<.38||second>p.score*.86)return null;
 return p;
}
const median=(a:number[])=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
export function estimateLatency(record:Float32Array,probe:Float32Array,starts:readonly number[],rate:number):LatencyEstimate|null{
 if(!Number.isFinite(rate)||rate<16000||rate>192000||starts.length!==TRIALS||!starts.every(Number.isSafeInteger))return null;
 if(!record.every(Number.isFinite)||!probe.every(Number.isFinite))return null;
 const found=starts.map(s=>correlate(record,probe,s,rate)).filter((p):p is Peak=>p!==null);
 if(found.length<5)return null;
 const ms=found.map(p=>p.lag/rate*1000),center=median(ms),inliers=found.filter(p=>Math.abs(p.lag/rate*1000-center)<=4);
 if(inliers.length<5)return null;
 const delays=inliers.map(p=>p.lag/rate*1000),offset=median(delays),jitter=Math.max(...delays)-Math.min(...delays);
 if(jitter>6||offset<0||offset>MAX_DELAY_MS)return null;
 return {offsetMs:Math.round(offset*10)/10,jitterMs:Math.round(jitter*10)/10,trials:inliers.length,correlation:Math.round(median(inliers.map(p=>p.score))*100)/100};
}

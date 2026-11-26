import type {Config} from './training';
export function noteStyle(sub:number){return {beams:sub===1?0:sub<=3?1:sub<=6?2:3,tuplet:sub===3||sub===5||sub===6?sub:null};}
export function Notation({cfg,sub,bar=0,start=0,current=-1,preview=false,t}:{cfg:Config;sub:number;bar?:number;start?:number;current?:number;preview?:boolean;t:(s:string)=>string}){
 const step=26,group=Math.max(50,sub*step+14),width=44+cfg.beats*group+8,{beams,tuplet}=noteStyle(sub);
 return <div className={'notation-wrap '+(preview?'notation-preview':'')}><svg viewBox={'0 0 '+width+' 112'} role="img" aria-label={t('Percussion notation')+' · '+cfg.beats+'/4'} style={{minWidth:Math.min(width,1100)+'px'}}>
 <line x1="12" x2={width-8} y1="61" y2="61" stroke="currentColor" opacity=".45"/>
 <text x="20" y="48" textAnchor="middle" fontSize="14" fill="currentColor">{cfg.beats}</text><text x="20" y="75" textAnchor="middle" fontSize="14" fill="currentColor">4</text>
 {Array.from({length:cfg.beats},(_,b)=>{const x=44+b*group;return <g key={b}>
 {tuplet&&<><path d={'M'+(x+5)+' 20 V16 H'+(x+(sub-1)*step+18)+' V20'} fill="none" stroke="currentColor" strokeWidth="1"/><rect x={x+(sub-1)*step/2+7} y="8" width="13" height="14" fill="#1a1c20"/><text x={x+(sub-1)*step/2+13} y="19" textAnchor="middle" fontSize="12" fill="currentColor">{tuplet}</text></>}
 {Array.from({length:sub},(_,j)=>{const n=b*sub+j,nx=x+j*step+12,active=n===current,accent=cfg.mode==='accent'&&j===bar%sub;return <g key={j}>
 {active&&<rect x={nx-12} y="23" width="24" height="81" rx="4" fill="#ff7840" opacity=".19"/>}
 <ellipse cx={nx} cy="61" rx="6.5" ry="4.5" transform={'rotate(-20 '+nx+' 61)'} fill={active?'#ff7840':'currentColor'}/>
 <line x1={nx+5} x2={nx+5} y1="59" y2="32" stroke={active?'#ff7840':'currentColor'} strokeWidth="1.6"/>
 {accent&&<text x={nx} y="29" fill="#ff7840" fontSize="16" textAnchor="middle">›</text>}
 <text x={nx} y="84" fill={active?'#ff7840':'currentColor'} fontSize="16" fontWeight="600" textAnchor="middle">{cfg.rudiment[(start+n)%cfg.rudiment.length]}</text>
 <text x={nx} y="102" fill="currentColor" opacity=".6" fontSize="11" textAnchor="middle">{j===0?b+1:sub===4?['','e','&','a'][j]:sub===2?'&':'·'}</text></g>;})}
 {Array.from({length:beams},(_,i)=><line key={i} x1={x+17} x2={x+17+(sub-1)*step} y1={32+i*6} y2={32+i*6} stroke="currentColor" strokeWidth="3.5"/>)}
 </g>;})}
 <line x1={width-8} x2={width-8} y1="47" y2="75" stroke="currentColor" strokeWidth="1.5"/>
 </svg></div>;
}

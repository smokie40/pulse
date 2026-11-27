import {defaults,rudiments,modes,type Config} from './training';
import {sounds} from './click-wave';
const subs=[1,2,3,4,5,6,8];
export function normalizeSettings(raw:unknown):Config{
 const x=raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Partial<Config>:{};
 const integer=(v:unknown,lo:number,hi:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,Math.round(v))):fallback;
 const oneOf=<T>(v:unknown,allowed:readonly T[],fallback:T):T=>allowed.includes(v as T)?v as T:fallback;
 const bpm=integer(x.bpm,30,300,defaults.bpm);
 return {...defaults,bpm,beats:integer(x.beats,2,7,defaults.beats),sub:oneOf(x.sub,subs,defaults.sub),minutes:integer(x.minutes,0,30,defaults.minutes),countIn:integer(x.countIn,0,2,defaults.countIn),
 mode:oneOf(x.mode,modes.map(m=>m.id),defaults.mode),rudiment:oneOf(x.rudiment,rudiments.map(r=>r.id),defaults.rudiment),sound:oneOf(x.sound,sounds,defaults.sound),
 volume:integer(x.volume,0,100,defaults.volume),accentVolume:integer(x.accentVolume,0,100,defaults.accentVolume),beatVolume:integer(x.beatVolume,0,100,defaults.beatVolume),subVolume:integer(x.subVolume,0,100,defaults.subVolume),
 sensitivity:integer(x.sensitivity,0,100,defaults.sensitivity),offset:integer(x.offset,-200,200,defaults.offset),clickSub:typeof x.clickSub==='boolean'?x.clickSub:defaults.clickSub,
 audibleBars:integer(x.audibleBars,1,8,defaults.audibleBars),silentBars:integer(x.silentBars,1,8,defaults.silentBars),ladderStep:integer(x.ladderStep,1,20,defaults.ladderStep),ladderMax:Math.max(bpm,integer(x.ladderMax,30,300,defaults.ladderMax)),
 visual:oneOf(x.visual,['grid','notation','pulse','timer'] as const,defaults.visual),showNext:typeof x.showNext==='boolean'?x.showNext:defaults.showNext};
}

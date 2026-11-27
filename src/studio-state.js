// Stable practice fields and formatting shared by the studio controller.
export function practiceFields(c){return Object.fromEntries(['bpm','beats','sub','minutes','countIn','mode','rudiment','clickSub','audibleBars','silentBars','ladderStep','ladderMax'].map(k=>[k,c[k]]))}
export function localDay(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function fmt(s){s=Math.max(0,Math.ceil(s)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}

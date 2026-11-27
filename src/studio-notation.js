// Musical illustrations and notation. Pure SVG output; no DOM or application state.
function glyph(id){let art='';const orange='#ff7840',grey='#72757a';if(id==='ladder'||id==='adaptive'){const pts=id==='ladder'?'M12 53 H48 V43 H84 V32 H120 V21 H156 V10 H188':'M12 51 H48 V33 H84 V43 H120 V23 H156 V12 H188';art='<path d="'+pts+'" fill="none" stroke="'+orange+'" stroke-width="2.5" stroke-linejoin="round"/>';}
else {const groups=id==='morph'?[2,3,4,6]:id==='burst'?[2,2,4,4]:[4,4,4,4];let index=0;for(let b=0;b<4;b++){const n=groups[b];for(let j=0;j<n;j++){const x=12+b*46+(j+.5)*38/n;const mute=id==='ghost'&&b>=2;const a=id==='accent'?j===b:j===0;const h=a?35:21;art+='<rect x="'+x+'" y="'+(33-h/2)+'" width="3.5" height="'+h+'" rx="1.7" fill="'+(mute?'#383b3f':a?orange:grey)+'"/>';index++;}if(b<3)art+='<path d="M'+(57+b*46)+' 12V54" stroke="#34363a" stroke-dasharray="2 4"/>';}}
return '<svg class="glyph" viewBox="0 0 200 66" aria-hidden="true">'+art+'</svg>'}
export function notesIcon(n){
  const spacing=Math.min(18,60/n), xs=Array.from({length:n},(_,i)=>40+(i-(n-1)/2)*spacing), beams=n===1?0:n<=3?1:n<=6?2:3;
  let a=xs.map(x=>`<ellipse cx="${x}" cy="30" rx="4.3" ry="3" transform="rotate(-20 ${x} 30)" fill="currentColor"/><path d="M${x+3.5} 29V11" stroke="currentColor" stroke-width="1.5"/>`).join('');
  if(beams)a+=Array.from({length:beams},(_,i)=>`<path d="M${xs[0]+3.5} ${11+i*5}H${xs[n-1]+3.5}" stroke="currentColor" stroke-width="2.8"/>`).join('');
  if([3,5,6].includes(n))a+=`<text x="40" y="7" font-size="9" fill="currentColor" text-anchor="middle">${n}</text>`;
  return `<svg viewBox="0 0 80 40" aria-hidden="true">${a}</svg>`;
}

export function renderNotation({beats,sticking,mode,width:viewportWidth},n,now=-1,bar=0,offset=bar*beats*n,live=false){
  const perRow=viewportWidth<=800?Math.min(2,beats):beats;
  const width=viewportWidth<=800?440:Math.max(880,beats*n*22);
  const height=Math.ceil(beats/perRow)*127;
  const cell=(width-12)/perRow;
  const top=36, sy=72, beams=n===1?0:n<=3?1:n<=6?2:3;
  let out='';
  for(let b=0;b<beats;b++){
    const left=6+(b%perRow)*cell;
    const dist=(cell-32)/n;
    const xs=Array.from({length:n},(_,j)=>left+16+(j+.5)*dist);
    out+=`<g transform="translate(0 ${Math.floor(b/perRow)*127})"><text x="${left+cell/2}" y="14" fill="#929397" font-size="12" font-weight="550" text-anchor="middle">${b+1}</text><path d="M${left+8} ${sy}H${left+cell-8}" stroke="#414347" stroke-width="1"/>`;
    if(b%perRow)out+=`<path d="M${left} 27V119" stroke="#292b2f" stroke-dasharray="2 4"/>`;
    for(let j=0;j<n;j++){
      const x=xs[j],k=b*n+j,is=k===now,ink=is?'#ff7840':now>=0&&k<now?'#85888c':'#eeedea';
      const hand=sticking[(offset+k)%sticking.length];
      if(live)out+=`<g data-note-index="${k}">`;
      if(mode==='accent'&&j===bar%n)out+=`<text x="${x}" y="23" fill="${ink}" font-size="20" text-anchor="middle">›</text>`;
      if(is||live)out+=`<rect ${live?'data-note-highlight="" visibility="hidden" ':''}x="${x-dist*.43}" y="25" width="${dist*.86}" height="97" rx="5" fill="#35251e"/><path ${live?'data-note-highlight="" visibility="hidden" ':''}d="M${x} 22v-5" stroke="#ff7840" stroke-width="3" stroke-linecap="round"/>`;
      out+=`<ellipse cx="${x}" cy="${sy}" rx="7" ry="4.8" transform="rotate(-20 ${x} ${sy})" fill="${ink}"/><path d="M${x+5.5} ${sy-1}V${top}" stroke="${ink}" stroke-width="1.7"/><text x="${x}" y="103" fill="${is?'#ff7840':now>=0&&k<now?'#85888c':'#c9c9c7'}" font-size="24" font-weight="650" text-anchor="middle">${hand}</text><text x="${x}" y="120" fill="#77797d" font-size="10" text-anchor="middle">${j===0?b+1:n===4?['','e','&amp;','a'][j]:n===2?'&amp;':'·'}</text>`;
      if(live)out+='</g>';
    }
    for(let i=0;i<beams;i++)out+=`<path d="M${xs[0]+5.5} ${top+i*6}H${xs[n-1]+5.5}" stroke="#eeedea" stroke-width="3.6"/>`;
    if([3,5,6].includes(n))out+=`<text x="${(xs[0]+xs[n-1])/2}" y="30" fill="#b0b0b0" font-size="11" text-anchor="middle">${n}</text>`;
    out+='</g>';
  }
  return `<svg class="staff" viewBox="0 0 ${width} ${height}" role="img">${out}</svg>`;
}

export function renderMusicArt(t,kind,opts={}){
 const white='#d7d9da',orange='#ff7840',grid='#515458',parts=[];
 const line=(x,y1,y2,dash=true)=>'<path d="M'+x+' '+y1+' V'+y2+'" stroke="'+grid+'" stroke-width=".85"'+(dash?' stroke-dasharray="2 3"':'')+'/>';
 const note=(x,y=44,r=2.6)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+white+'"/>';
 const label=(x,y,str,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="#b7babe" font-size="10" font-weight="500" text-anchor="'+anchor+'">'+str+'</text>';
 const click=(x,y=10,h=17)=>'<rect x="'+(x-1.25)+'" y="'+y+'" width="2.5" height="'+h+'" rx=".8" fill="'+orange+'"/>';
 const sub=opts.sub??4;
 if(kind==='timing'){
  parts.push(label(8,21,t('artUneven')),label(8,49,t('artEven')));
  for(let i=0;i<6;i++){const x=69+i*24;parts.push(line(x,10,54),note(x+[0,-7,5,-5,7,-4][i],18),note(x,46));}
 }
 else if(kind==='pulse'||kind==='ghost'){
  const audible=opts.audibleBars??1,silent=opts.silentBars??1,perBar=opts.beats??4,beats=(audible+silent)*perBar,w=184/beats,n=opts.sub??2;
  for(let i=0;i<beats;i++){const x=8+i*w+1.25;if(i<audible*perBar){parts.push(click(x));if(opts.clickSub)for(let j=1;j<n;j++)parts.push(click(x+j*w/n,16,11));}for(let j=0;j<n;j++)parts.push(note(x+j*w/n,43,Math.min(2.6,w/n*.34)));}
  parts.push(line(8+audible*perBar*w,6,51),label(8,60,t('artClick')),label(192,60,t('artSilent'),'end'));
 }
 else if(kind==='speed'){
  [80,120].forEach((bpm,i)=>{const y=20+i*28;parts.push(label(8,y+3,bpm+' BPM'));for(let j=0;j<8;j++)parts.push(note(62+j*18*80/bpm,y));});
 }
 else if(kind==='burst'||kind==='flexibility'||kind==='morph'){
  const groups=kind==='burst'?[2,2,4,4]:opts.morphSequence??[2,3,4,6],w=184/groups.length;
  groups.forEach((n,b)=>{const x=8+b*w;parts.push(label(x+w/2,11,String(n),'middle'),click(x+1.25,18,14));if(b)parts.push(line(x,17,48));for(let j=0;j<n;j++)parts.push(note(x+j*w/n+1.25,43,Math.min(2.6,w/n*.34)));});
  parts.push(label(100,63,t('artFixedTempo'),'middle'));
 }
 else if(kind==='dynamics'||kind==='accent'){
  // A representative beat from each of four bars; the accent shifts on every bar.
  const n=opts.sub??4,total=4*n,w=184/total;
  for(let i=0;i<total;i++){const x=8+(i+.5)*w,bar=Math.floor(i/n),accent=i%n===bar%n;if(i>0&&i%n===0)parts.push(line(8+i*w,19,50));parts.push(note(x,39,Math.min(accent?4.15:2.35,w*.37)));if(accent)parts.push('<path d="M'+(x-3.5)+' 16 l7 3 -7 3" stroke="'+white+'" stroke-width="1.4" stroke-linejoin="round" fill="none"/>');}
 }
 else if(kind==='endurance'){
  for(let i=0;i<20;i++){const x=8+i*9.65;parts.push(note(x,28));}
  parts.push('<path d="M8 43 V49 H192 V43" fill="none" stroke="#919498" stroke-width="1.1"/>',label(8,62,t('artStart')),label(192,62,t('artEnd'),'end'));
 }
 else if(kind==='steady'){
  const perBar=opts.beats??4,n=perBar*sub,w=184/n;
  for(let i=0;i<n;i++){const x=8+(i+.5)*w;if(i%sub===0||opts.clickSub)parts.push(click(x,i%sub===0?10:16,i%sub===0?17:11));parts.push(note(x,43,Math.min(2.6,w*.33)));}
 }
 else if(kind==='ladder'||kind==='adaptive'){
  const d=kind==='ladder'?'M8 50 H45 V40 H82 V30 H119 V20 H156 V10 H192':'M8 50 H45 V31 H82 V41 H119 V21 H156 V10 H192';
  parts.push('<path d="'+d+'" fill="none" stroke="'+orange+'" stroke-width="2" stroke-linejoin="round"/>');
 }
 else return glyph(kind);
 return '<svg class="glyph" viewBox="0 0 200 66" aria-hidden="true">'+parts.join('')+'</svg>';
}
export function renderRouteArt(t,x,pending=false){if(pending)return '<svg class="glyph" viewBox="0 0 200 66" aria-hidden="true"><path d="M10 50 H42 V40 H74 V28 H106 V16" fill="none" stroke="#ff7840" stroke-width="2.5"/><path d="M118 16 L138 35 H190" fill="none" stroke="#a8a9aa" stroke-width="2" stroke-dasharray="4 4"/></svg>';if(x.mode==='ladder'&&x.ladderMax!==undefined){const values=Array.from({length:5},(_,i)=>Math.min(x.ladderMax,x.bpm+i*(x.ladderStep??5))),y=v=>52-36*(v-x.bpm)/Math.max(1,x.ladderMax-x.bpm);return '<svg class="glyph" viewBox="0 0 200 66" aria-hidden="true"><path d="M8 '+y(values[0])+values.map((v,i)=>' H'+(8+i*40)+' V'+y(v)).join('')+' H192" stroke="#ff7840" stroke-width="2" fill="none"/></svg>';}return renderMusicArt(t,x.mode,x);}

// Update only the former/current note and any skipped notes when a frame arrives late.
export function createLiveNotation(container){
 let key='',last=-1,nodes=[];
 function update(context,n,step,bar,offset){
  const nextKey=[context.beats,context.sticking,context.mode,context.width<=800,n,bar,offset].join(':');
  if(nextKey!==key){container.innerHTML=renderNotation(context,n,-1,bar,offset,true);nodes=[...container.querySelectorAll('[data-note-index]')];key=nextKey;last=-1;}
  if(step===last)return;
  const from=Math.max(0,Math.min(last,step)),to=Math.min(nodes.length-1,Math.max(last,step));
  for(let i=from;i<=to;i++){
   const node=nodes[i];node.classList.toggle('note-current',i===step);node.classList.toggle('note-past',i<step);
   for(const highlight of node.querySelectorAll('[data-note-highlight]'))highlight.setAttribute('visibility',i===step?'visible':'hidden');
  }
  last=step;
 }
 return {update};
}

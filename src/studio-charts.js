// Measured result charts. Inputs are session aggregates, never invented sample data.
export function chartWidth(viewport=typeof window==='undefined'?1024:window.innerWidth){return viewport<=600?Math.max(280,viewport-24):660;}
export function renderTempoChart(t,shortDay,data){
 const width=chartWidth(),right=width-20; const values=data.flatMap(x=>[x.current,x.confirmed].filter(v=>v!=null));if(!values.length)return '<p class="analytics-empty">'+t('analyticsNoTempo')+'</p>';
 const lo=Math.max(0,Math.floor((Math.min(...values)-5)/10)*10),hi=Math.max(lo+10,Math.ceil((Math.max(...values)+5)/10)*10);
 const X=i=>44+i*(right-44)/Math.max(1,data.length-1),Y=v=>142-(v-lo)/(hi-lo)*118;
 const path=(key,step)=>{let d='',prior=null;data.forEach((v,i)=>{if(v[key]==null){prior=null;return;}const x=X(i),y=Y(v[key]);d+=prior===null?' M'+x+' '+y:step?' H'+x+' V'+y:' L'+x+' '+y;prior=v[key]});return d};
 return '<svg viewBox="0 0 '+width+' 174" role="img" aria-label="'+t('analyticsTempo')+'">'+Array.from({length:4},(_,i)=>{const v=lo+(hi-lo)*i/3,y=Y(v);return '<path d="M44 '+y+' H'+right+'" stroke="#343639" stroke-dasharray="3 4"/><text x="35" y="'+(y+4)+'" text-anchor="end" fill="#919399" font-size="12">'+Math.round(v)+'</text>'}).join('')+'<path d="'+path('current',true)+'" stroke="#ff7840" stroke-width="2" stroke-dasharray="5 4" fill="none"/><path d="'+path('confirmed',true)+'" stroke="#8bd5aa" stroke-width="2.5" fill="none"/>'+data.map((v,i)=>v.measured&&v.current!==null?'<circle cx="'+X(i)+'" cy="'+Y(v.current)+'" r="3.4" fill="#ff7840"><title>'+v.day+' · '+v.current+' BPM</title></circle>':'').join('')+'<text x="44" y="166" fill="#929497" font-size="12">'+shortDay(data[0].day)+'</text><text x="'+right+'" y="166" text-anchor="end" fill="#929497" font-size="12">'+shortDay(data.at(-1).day)+'</text></svg>';
}
export function renderActivityChart(t,shortDay,data){
 const width=chartWidth(),right=width-20; const max=Math.max(60,...data.map(x=>x.seconds)),step=(right-20)/data.length,w=Math.max(1,step*.66);
 return '<svg viewBox="0 0 '+width+' 90" role="img" aria-label="'+t('analyticsActivity')+'"><path d="M20 66 H'+right+'" stroke="#343639"/>'+data.map((x,i)=>{const bar=x.seconds?Math.max(2,x.seconds/max*56):2;return '<rect x="'+(20+i*step+(step-w)/2)+'" y="'+(66-bar)+'" width="'+w+'" height="'+bar+'" rx="1.5" fill="'+(x.seconds?'#ff7840':'#393b3d')+'"><title>'+x.day+' · '+Math.round(x.seconds/60)+' '+t('min')+'</title></rect>'}).join('')+'<text x="20" y="85" fill="#929497" font-size="12">'+shortDay(data[0].day)+'</text><text x="'+right+'" y="85" text-anchor="end" fill="#929497" font-size="12">'+shortDay(data.at(-1).day)+'</text></svg>';
}
export function renderComparisonChart(t,shortDay,points){
 const width=chartWidth(),right=width-20; if(points.length<2)return '';
 const dates=points.map(p=>Date.parse(p.day+'T00:00:00Z')),first=dates[0],span=Math.max(1,dates.at(-1)-first),x=i=>32+(dates[i]-first)/span*(right-32),y=v=>94-v*.75;
 return '<svg viewBox="0 0 '+width+' 122" role="img" aria-label="'+t('accuracy')+'">'+[0,50,100].map(v=>'<path d="M32 '+y(v)+' H'+right+'" stroke="#343639" stroke-dasharray="3 4"/><text x="26" y="'+(y(v)+4)+'" fill="#929497" font-size="12" text-anchor="end">'+v+'</text>').join('')+'<path d="'+points.map((p,i)=>(i?'L':'M')+x(i)+' '+y(p.accuracy)).join(' ')+'" stroke="#ff7840" stroke-width="2" fill="none"/>'+points.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p.accuracy)+'" r="3.5" fill="#ff7840"><title>'+p.day+' · '+p.accuracy+'%</title></circle>').join('')+'<text x="32" y="116" fill="#929497" font-size="12">'+shortDay(points[0].day)+'</text><text x="'+right+'" y="116" text-anchor="end" fill="#929497" font-size="12">'+shortDay(points.at(-1).day)+'</text></svg>';
}
export function timingDistribution(notes,until){
 const bins=new Map();for(const n of notes){if(n.time>until||!Number.isFinite(n.matched))continue;const bin=Math.floor(n.matched/10);bins.set(bin,(bins.get(bin)??0)+1);}return [...bins].sort((a,b)=>a[0]-b[0]);
}
export function renderDistributionChart(t,bins){
 const width=chartWidth(),right=width-20; if(!bins?.length)return '';
 const lo=Math.min(-3,bins[0][0]),hi=Math.max(2,bins.at(-1)[0]),max=Math.max(...bins.map(x=>x[1])),binWidth=(right-38)/(hi-lo+1),x=i=>38+(i-lo)*binWidth,zero=x(0);
 const ticks=[...new Set([0,Math.round(max/2),max])].map(v=>{const y=105-80*v/max;return '<path d="M38 '+y+' H'+right+'" stroke="#343639" stroke-dasharray="3 4"/><text x="31" y="'+(y+3)+'" fill="#a8a9aa" text-anchor="end" font-size="12">'+v+'</text>';}).join('');
 const cols=bins.map(([i,n])=>'<rect x="'+(x(i)+1)+'" y="'+(105-80*n/max)+'" width="'+Math.max(1,binWidth-2)+'" height="'+(80*n/max)+'" fill="'+(i<0?'#a1a5a9':'#d7d9da')+'"><title>'+i*10+' – '+(i+1)*10+' ms: '+n+'</title></rect>').join('');
 return '<section class="measured-chart"><h2>'+t('errorDistribution')+'</h2><svg viewBox="0 0 '+width+' 145" role="img" aria-label="'+t('errorDistribution')+'"><path d="M38 105 H'+right+' M'+zero+' 14 V108" stroke="#686b70" stroke-dasharray="3 3" fill="none"/>'+ticks+cols+'<text x="38" y="119" font-size="12" fill="#a8a9aa">'+lo*10+' ms</text><text x="'+zero+'" y="119" font-size="12" fill="#d7d9da" text-anchor="middle">0</text><text x="'+right+'" y="119" font-size="12" fill="#a8a9aa" text-anchor="end">'+(hi+1)*10+' ms</text><text x="38" y="139" font-size="12" fill="#a8a9aa">'+t('earlyGrid')+'</text><text x="'+right+'" y="139" font-size="12" fill="#a8a9aa" text-anchor="end">'+t('lateGrid')+'</text></svg><p>'+t('distributionHint')+'</p></section>';
}
export function renderSegmentChart(t,fmt,segments,elapsed){
 const width=chartWidth(),right=width-20; const valid=segments.filter(x=>x.stats.expected>=12);if(valid.length<2)return '';
 const X=v=>38+(right-38)*v/Math.max(1,elapsed),Y=v=>105-v*.8;
 return '<section class="measured-chart"><h2>'+t('accuracyOverTime')+'</h2><svg viewBox="0 0 '+width+' 132" role="img" aria-label="'+t('accuracyOverTime')+'">'+[0,50,100].map(v=>'<path d="M38 '+Y(v)+' H'+right+'" stroke="#3b3e41" stroke-dasharray="3 4"/><text x="30" y="'+(Y(v)+4)+'" text-anchor="end" fill="#a8a9aa" font-size="12">'+v+'%</text>').join('')+valid.map(p=>'<circle cx="'+X(p.seconds)+'" cy="'+Y(p.stats.accuracy)+'" r="4" fill="#ff7840"><title>'+fmt(p.seconds)+' · '+p.stats.accuracy+'%</title></circle>').join('')+'<text x="38" y="126" fill="#a8a9aa" font-size="12">00:00</text><text x="'+right+'" y="126" fill="#a8a9aa" font-size="12" text-anchor="end">'+fmt(elapsed)+'</text></svg><p>'+t('segmentHint')+'</p></section>';
}

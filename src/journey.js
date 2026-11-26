// Guided entry and checkpoint state. A checkpoint points to the next unfinished exercise.
export function restorePlan(value){
 if(!value||value.probe||!Array.isArray(value.items)||!Number.isInteger(value.index)||value.index<0||value.index>=value.items.length||!['timing','pulse','speed','flexibility','dynamics','endurance'].includes(value.skill))return null;
 const modes=['steady','ghost','burst','morph','ladder','adaptive','accent'];
 if(!value.items.every(x=>x&&modes.includes(x.mode)&&typeof x.name==='string'&&typeof x.reason==='string'&&typeof x.rudiment==='string'&&[1,2,3,4,5,6,8].includes(x.sub)&&Number.isInteger(x.minutes)&&x.minutes>0&&x.minutes<=30&&Number.isFinite(x.bpm)&&x.bpm>=30&&x.bpm<=300&&(x.morphSequence===undefined||(Array.isArray(x.morphSequence)&&x.morphSequence.length>=2&&x.morphSequence.length<=4&&x.morphSequence.every(n=>[2,3,4,6].includes(n))))&&(x.silentBars===undefined||[1,2,4].includes(x.silentBars))&&(x.audibleBars===undefined||x.audibleBars===2)))return null;
 return {...value,items:value.items.map(x=>({...x}))};
}
export function checkpointAfter(plan,proposed){
 if(!plan||plan.probe)return null;
 const next={...plan,items:plan.items.map(x=>({...x})),index:plan.index+1};
 if(proposed&&next.index<next.items.length){next.items[next.index]={...proposed.drill};next.items[next.index].resolvedControl=true;}
 return next.index<next.items.length?next:null;
}
export function pendingControl(items,index,current,skill){
 const x=items[index],prev=items[index-1];
 return skill==='speed'&&x?.name==='control'&&!x.confirmation&&!x.resolvedControl&&['adaptive','ladder'].includes(prev?.mode)&&current<index;
}

// Only an exercise matching its planned conditions can advance the checkpoint.
export function planMatches(drill,c){return !!drill&&!!c&&drill.mode===c.mode&&drill.bpm===c.bpm&&drill.minutes===c.minutes&&drill.sub===c.sub&&drill.rudiment===c.rudiment&&c.beats===4&&c.countIn===1&&(drill.clickSub??false)===c.clickSub&&(drill.mode!=='ghost'||((drill.audibleBars??2)===(c.audibleBars??2)&&(drill.silentBars??2)===(c.silentBars??2)))&&(drill.mode!=='morph'||JSON.stringify(drill.morphSequence??[2,3,4,6])===JSON.stringify(c.morphSequence??[2,3,4,6]));}

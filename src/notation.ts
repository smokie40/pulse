export function noteStyle(sub:number){return {beams:sub===1?0:sub<=3?1:sub<=6?2:3,tuplet:sub===3||sub===5||sub===6?sub:null};}

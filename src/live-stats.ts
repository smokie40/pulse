import type {Note,Stats} from './training';
export class LiveStats {
 private cursor=0;
 private hits=0;
 private precise=0;
 private sum=0;
 private squares=0;
 private lastUntil=-Infinity;
 private dirty=false;
 reset(){this.cursor=0;this.hits=0;this.precise=0;this.sum=0;this.squares=0;this.lastUntil=-Infinity;this.dirty=false;}
 // global is the contiguous note index assigned by the scheduler.
 matched(note:Note){if(note.global<this.cursor)this.dirty=true;}
 read(notes:readonly Note[],extra:number,until:number):Stats{
  if(this.dirty||until<this.lastUntil||notes.length<this.cursor)this.reset();
  while(this.cursor<notes.length&&notes[this.cursor].time<=until){
   const n=notes[this.cursor++],v=n.matched;
   if(v===undefined)continue;
   this.hits++;this.sum+=v;this.squares+=v*v;
   if(Math.abs(v)<=Math.min(30,n.interval*350))this.precise++;
  }
  this.lastUntil=until;
  return {expected:this.cursor,hits:this.hits,missed:this.cursor-this.hits,extra,
   accuracy:this.cursor?Math.round(100*this.precise/(this.cursor+extra)):0,
   deviation:this.hits?Math.round(Math.sqrt(this.squares/this.hits)*10)/10:null,
   bias:this.hits?Math.round(this.sum/this.hits*10)/10:null};
 }
}

// Lower/upper bounds for chronologically ordered events; no history-wide scan.
export function lowerBound<T>(items:readonly T[],value:number,key:(x:T)=>number):number{
 let lo=0,hi=items.length;
 while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(key(items[mid])<value)lo=mid+1;else hi=mid;}
 return lo;
}
export function upperBound<T>(items:readonly T[],value:number,key:(x:T)=>number):number{
 let lo=0,hi=items.length;
 while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(key(items[mid])<=value)lo=mid+1;else hi=mid;}
 return lo;
}
export const identity=(n:number)=>n;
export function ordered<T>(items:readonly T[],key:(x:T)=>number):readonly T[]{
 for(let i=1;i<items.length;i++)if(key(items[i])<key(items[i-1]))return [...items].sort((a,b)=>key(a)-key(b));
 return items;
}
export function countBetween(times:readonly number[],from:number,to:number,inclusiveEnd=false){
 return (inclusiveEnd?upperBound:lowerBound)(times,to,identity)-lowerBound(times,from,identity);
}

import {test,expect} from 'vitest';
import {lowerBound,upperBound,countBetween,ordered,identity} from './event-range';
test('event bounds preserve duplicate timestamps and half-open or closed intervals',()=>{
 const a=[0,1,1,2,3];expect(lowerBound(a,1,identity)).toBe(1);expect(upperBound(a,1,identity)).toBe(3);expect(countBetween(a,1,2)).toBe(2);expect(countBetween(a,1,2,true)).toBe(3);expect(ordered([3,1,2],identity)).toEqual([1,2,3]);
});

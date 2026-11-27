import {test,expect} from 'vitest';
import {createNavigation,createScreenPresenter} from './navigation.js';
function fixture(checkpoint=null){
 const events=[];
 const plans={active:null,checkpoint,leave(){events.push('leave');this.active=null;},resume(){events.push('resume');this.active=this.checkpoint;}};
 const nav=createNavigation({plans,present:p=>events.push(p),loadPlanStep:auto=>events.push(['step',auto])});
 return {nav,plans,events};
}
test('training home leaves active route, detail resumes saved route',()=>{
 const checkpoint={index:2};const {nav,plans,events}=fixture(checkpoint);plans.active=checkpoint;
 nav.showPage('training');expect(plans.active).toBeNull();expect(plans.checkpoint).toBe(checkpoint);expect(nav.trainingDetail).toBe(false);
 nav.showPage('training',true);expect(plans.active).toBe(checkpoint);expect(nav.trainingDetail).toBe(true);expect(events).toEqual(['leave','training','leave','resume','training']);
});
test('guide returns to setup with a saved route and leaves free setup intact',()=>{
 const {nav,plans,events}=fixture({index:1});plans.resume();nav.showPage('setup');nav.openGuide('plan');expect(nav.guidePurpose).toBe('plan');expect(nav.guideReturnSetup).toBe(true);expect(plans.active).toBeNull();
 nav.returnFromGuide();expect(plans.active).toBe(plans.checkpoint);expect(events.at(-1)).toEqual(['step',false]);expect(nav.guidePurpose).toBeNull();
 const free=fixture();free.nav.showPage('setup');free.nav.openGuide('adaptive');free.nav.returnFromGuide();expect(free.nav.page).toBe('setup');
});
test('probe context from progress and back navigation preserve the pending plan',()=>{
 const {nav,plans}=fixture({index:1});const context={rudiment:'LR',sub:3};nav.showPage('progress');nav.openGuide('probe',context);
 expect(nav.guideProbeContext).toBe(context);expect(nav.guideReturnProgress).toBe(true);nav.returnFromGuide();expect(nav.page).toBe('progress');expect(nav.guideProbeContext).toBeNull();
 plans.active={probe:true,fromProgress:true};nav.showPage('results');nav.backFromPractice(true);expect(nav.page).toBe('progress');expect(plans.checkpoint).toEqual({index:1});
 nav.showPage('setup');nav.backFromPractice();expect(nav.page).toBe('library');nav.openGuide('plan');nav.showLab();expect(nav.guidePurpose).toBeNull();
});
test('screen presenter controls visibility, navigation lock and selected tab',()=>{
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,setAttribute(k,v){this[k]=v;}});return elements.get(id);};
 let performing=false,busy=false,renders=0,scrolls=0;
 const present=createScreenPresenter({$,doc:{body:{classList:{toggle(k,v){performing=v;}}}},scrollTo:()=>scrolls++,getBusy:()=>busy,render:()=>renders++});
 present('skills');expect($('skills').hidden).toBe(false);expect($('training').hidden).toBe(true);expect($('trainingBtn')['aria-current']).toBe('page');expect($('libraryBtn').disabled).toBe(false);
 present('playing');expect(performing).toBe(true);expect($('progressBtn').disabled).toBe(true);busy=true;present('lab');expect(performing).toBe(false);expect($('labBtn').disabled).toBe(true);expect($('labBtn')['aria-current']).toBe('page');expect(renders).toBe(3);expect(scrolls).toBe(3);
});

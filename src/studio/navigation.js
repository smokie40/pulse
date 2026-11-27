const pages=['training','skills','progress','lab','library','setup','playing','results'];
const navPages=[['trainingBtn','training'],['progressBtn','progress'],['libraryBtn','library'],['labBtn','lab']];

// Screen/guide transitions are independent of DOM and audio implementation.
export function createNavigation({plans,present,loadPlanStep}){
 let page='training',trainingDetail=false,guidePurpose=null;
 let guideReturnDetail=false,guideReturnSetup=false,guideReturnProgress=false,guideProbeContext=null;
 function clearGuide(){guidePurpose=null;}
 function showPage(p,detail=false){
  if(p==='training'){clearGuide();plans.leave();trainingDetail=detail;if(detail&&plans.checkpoint)plans.resume();}
  else if(['library','progress','skills'].includes(p))plans.leave();
  if(p!=='lab'&&p!=='training')clearGuide();
  page=p;present(p);
 }
 function openGuide(purpose,context=null){
  guideReturnProgress=page==='progress';guideProbeContext=context;
  guideReturnSetup=page==='setup'&&purpose!=='probe';
  guideReturnDetail=page==='training'&&trainingDetail||!!plans.active;
  plans.leave();guidePurpose=purpose;showPage('lab');
 }
 function returnFromGuide(){
  const setup=guideReturnSetup,progress=guideReturnProgress;
  clearGuide();guideReturnSetup=false;guideReturnProgress=false;guideProbeContext=null;
  if(progress){showPage('progress');return;}
  if(setup){if(plans.checkpoint&&guideReturnDetail){plans.resume();loadPlanStep(false);}else showPage('setup');}
  else showPage('training',guideReturnDetail);
 }
 function backFromPractice(fromResults=false){
  if(plans.active?.probe){const fromProgress=plans.active.fromProgress;plans.leave();showPage(fromProgress?'progress':'training');}
  else if(fromResults)showPage('training',true);
  else showPage(plans.active?'training':'library',!!plans.active);
 }
 function showLab(){clearGuide();showPage('lab');}
 return {get page(){return page;},get trainingDetail(){return trainingDetail;},get guidePurpose(){return guidePurpose;},get guideReturnSetup(){return guideReturnSetup;},get guideReturnProgress(){return guideReturnProgress;},get guideProbeContext(){return guideProbeContext;},setGuideReturnProgress:value=>{guideReturnProgress=value;},clearGuide,showPage,openGuide,returnFromGuide,backFromPractice,showLab};
}

export function createScreenPresenter({$,doc,scrollTo,getBusy,render}){
 return p=>{
  doc.body.classList.toggle('performing',p==='playing');
  for(const id of pages)$(id).hidden=id!==p;
  // Keep the existing navigation lock and active-tab semantics.
  const busy=getBusy();
  for(const [id,pg] of navPages){
   $(id).disabled=p==='playing'||busy;
   $(id).setAttribute('aria-current',p===pg||pg==='training'&&p==='skills'?'page':'false');
  }
  scrollTo(0,0);render();
 };
}

// Modal focus ownership and keyboard containment.
export function createDialog($){
let lastFocus=null;
function dialog(title,html){lastFocus=document.activeElement; $('dialogTitle').textContent=title; $('dialogContent').innerHTML=html; $('overlay').hidden=false; $('close').focus()}
function closeDialog(){if(!$('overlay').hidden){$('overlay').hidden=true; lastFocus && lastFocus.focus()}}
$('close').onclick=closeDialog;
$('overlay').onclick=e=>{if(e.target===$('overlay')) closeDialog()};
document.addEventListener('keydown',e=>{if(e.key==='Tab'&&!$('overlay').hidden){const nodes=[...$('overlay').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(first&&e.shiftKey&&(document.activeElement===first||!$('overlay').contains(document.activeElement))){e.preventDefault();last.focus();return;}if(last&&!e.shiftKey&&(document.activeElement===last||!$('overlay').contains(document.activeElement))){e.preventDefault();first.focus();return;}}if(e.key==='Escape'){closeDialog(); return} });
return {open:dialog,close:closeDialog};
}

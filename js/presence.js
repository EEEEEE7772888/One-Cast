/* One Cast "Still fishing?": every so often, hand-worked lures need a quick check that a real person is playing.
   The server hides a fish in one of 16 squares; tap it to keep fishing. Wrong taps rest the lures for a while.
   Soak baits are never affected. This stops autoclickers and overnight macros. */
(function(root){
'use strict';
var N=root.NET, A=root.ART, UI=root.UI, $=function(id){ return document.getElementById(id); };
var box=null, timer=0, onDone=null;
function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }
function decoy(i){ var c=document.createElement('canvas'); c.width=12; c.height=12; c.className='px'; var x=c.getContext('2d'), k=(i*7+3)%4;
  if(k===0){ x.fillStyle='#6A7480'; x.fillRect(2,5,8,5); x.fillRect(3,4,6,1); x.fillStyle='#8A949E'; x.fillRect(3,5,3,1); }          // rock
  else if(k===1){ x.fillStyle='#3F8A47'; for(var y=2;y<11;y++) x.fillRect(5+Math.round(Math.sin(y*0.8)),y,2,1); x.fillRect(3,7,2,1); } // weed
  else if(k===2){ x.fillStyle='#E8C8A0'; x.fillRect(3,6,6,4); x.fillStyle='#C8A070'; x.fillRect(4,7,1,3); x.fillRect(6,7,1,3); }      // shell
  else { x.strokeStyle='#CFE6F0'; x.beginPath(); x.arc(6,6,3,0,Math.PI*2); x.stroke(); x.fillStyle='#FFFFFF'; x.fillRect(4,4,1,1); }     // bubble
  return c; }
function build(){ if(box) return box;
  box=el('div','overlay still-ov'); box.id='stillOv'; box.hidden=true;
  box.innerHTML='<div class="dialog still"><h2 class="d-title">STILL FISHING?</h2><p class="still-msg" id="stillMsg">Tap the <b>fish</b> to keep fishing with lures.</p><div class="still-grid" id="stillGrid"></div><div class="reset-row"><button class="pbtn" id="stillBait" type="button">FISH WITH BAIT INSTEAD</button></div><p class="note">This quick check keeps autoclickers out. Soak baits always work.</p></div>';
  document.body.appendChild(box);
  $('stillBait').onclick=function(){ close(false); };
  return box; }
function close(ok){ clearInterval(timer); if(box) box.hidden=true; var f=onDone; onDone=null; if(f) f(ok); }
function render(r){
  var grid=$('stillGrid'); grid.innerHTML='';
  var locked=r.lockedUntil&&Date.parse(r.lockedUntil)>N.now();
  if(locked){ grid.classList.add('locked'); clearInterval(timer);
    function tick(){ var s=Math.max(0,Math.round((Date.parse(r.lockedUntil)-N.now())/1000)); $('stillMsg').innerHTML='Wrong one! Your lures are resting for <b>'+Math.floor(s/60)+':'+('0'+(s%60)).slice(-2)+'</b>. Soak baits still work.'; if(s<=0){ clearInterval(timer); ask(); } }
    tick(); timer=setInterval(tick,1000); return; }
  grid.classList.remove('locked'); $('stillMsg').innerHTML='Tap the <b>fish</b> to keep fishing with lures.';
  for(var i=0;i<16;i++){ var b=el('button','still-cell'); b.type='button'; b.setAttribute('aria-label',i===r.cell?'Fish':'Not the fish');
    b.appendChild(i===r.cell?A.fishImg('bluegill',14,false,3,null,null,'Fish'):decoy(i+Math.floor(Math.random()*4)));
    (function(cell){ b.onclick=function(){ answer(cell); }; })(i); grid.appendChild(b); }
}
function ask(){ return N.me('presence_get').then(function(r){ if(!r.needed){ close(true); return; } render(r); }).catch(function(e){ root.G.fail(e); close(false); }); }
function answer(cell){ $('stillGrid').querySelectorAll('button').forEach(function(b){ b.disabled=true; });
  N.me('presence_answer',{p_cell:cell}).then(function(r){ if(r.result==='ok'){ root.G.toast('Thanks! Back to fishing.',1800,'good'); close(true); } else render(r); })
    .catch(function(e){ root.G.fail(e); close(false); }); }
/* opens the check; resolves true when passed (then the cast can be tried again) */
UI.stillFishing=function(){ build(); box.hidden=false; return new Promise(function(res){ onDone=res; ask(); }); };
})(typeof window!=='undefined'?window:this);

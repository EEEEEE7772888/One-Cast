/* One Cast events (Halloween): a page with the spooky fish, costumes, boat paint and the special derby,
   shown once when the event starts, plus an orange-and-purple theme while it is on. */
(function(root){
'use strict';
var D=root.OC, A=root.ART, N=root.NET, UI=root.UI, $=function(id){ return document.getElementById(id); };
function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function on(){ return D.eventOn('halloween'); }
function left(ms){ var m=Math.max(0,Math.round(ms/60000)), d=Math.floor(m/1440), h=Math.floor(m%1440/60); return d?d+' day'+(d>1?'s':'')+' '+h+'h':h+'h '+(m%60)+'m'; }
UI.eventBlurb=function(){ return on()?'Spooky fish, costumes and boat paint · ends in '+left(Date.parse(D.EVENTS.halloween.end)-N.now()):''; };
UI.eventOn=on;
function render(){
  var body=$('eventBody'); body.innerHTML=''; var G=root.G, j=(G&&G.s&&G.s.journal)||{};
  body.appendChild(el('p','ev-intro','The spooky fish are biting until <b>Sunday night at midnight</b> (Eastern), '+left(Date.parse(D.EVENTS.halloween.end)-N.now())+' from now. When Monday comes, they are gone until next year.'));
  body.appendChild(el('div','gear-group','SPOOKY FISH'));
  D.EVENT_SPECIES.forEach(function(sp){ var caught=!!j[sp.id], row=el('div','ev-fish'+(caught?' got':''));
    var pic=el('div','ev-pic'); pic.appendChild(A.fishImg(sp.id,34,false,2,null,null,'')); row.appendChild(pic);
    var homes=D.SPOTS.filter(function(s){ return (sp.spots[s.id]||0)>0; }).map(function(s){ return s.name; });
    var baits=Object.keys(sp.baits).sort(function(a,b){ return sp.baits[b]-sp.baits[a]; }).slice(0,3).map(function(b){ return D.BAIT_BY_ID[b].name; });
    var prof=D.ACT_PROFILES[sp.act], best=Object.keys(prof).sort(function(a,b){ return prof[b]-prof[a]; })[0];
    row.appendChild(el('div',null,'<div class="ev-n">'+esc(sp.name.toUpperCase())+(caught?' <span class="tag green">CAUGHT</span>':'')+'</div><div class="ev-d">'+esc(sp.desc)+'</div><div class="ev-f"><b>Where:</b> '+esc(homes.length>3?homes.slice(0,3).join(', ')+' and '+(homes.length-3)+' more Home waters spots':homes.join(', '))+'<br><b>Bait:</b> '+esc(baits.join(', '))+' · <b>Best:</b> '+D.PERIOD_NAME[best].toLowerCase()+' · up to '+D.fmtWeight(sp.max)+'</div>'));
    body.appendChild(row); });
  body.appendChild(el('div','gear-group','HALLOWEEN DERBY'));
  var dv=el('div','ev-box','This weekend\'s derby is the <b>Ghost Carp Derby</b>: the biggest ghost carp caught Saturday or Sunday wins '+D.money(D.DERBY.prizes[0])+' and the Derby Champion cap. ');
  var db=el('button','pbtn gold','SEE THE DERBY'); db.type='button'; db.onclick=function(){ UI.open('derbyOv'); }; dv.appendChild(db); body.appendChild(dv);
  body.appendChild(el('div','gear-group','COSTUMES AND BOAT PAINT'));
  var cs=el('div','ev-box','Only sold until Monday, and you keep them forever: '+D.ITEMS.filter(function(i){ return i.event==='halloween'; }).map(function(i){ return '<b>'+esc(i.name)+'</b> '+D.money(i.price); }).join(' · ')+'. ');
  var c1=el('button','pbtn','CLOTHES'); c1.type='button'; c1.onclick=function(){ UI.open('shopOv'); }; var c2=el('button','pbtn','PAINT MY BOAT'); c2.type='button'; c2.onclick=function(){ UI.open('dockOv'); };
  var row=el('div','reset-row'); row.appendChild(c1); row.appendChild(c2); cs.appendChild(row); body.appendChild(cs);
}
UI.RENDER.eventOv=render;
function theme(){ document.body.classList.toggle('halloween',on()); }
theme(); setInterval(theme,60000);
/* show the page once, the first time a player comes in during the event */
UI.eventIntro=function(){ if(!on()) return; var k='onecast.seenHalloween2026'; try{ if(localStorage.getItem(k)) return; localStorage.setItem(k,'1'); }catch(e){ return; }
  setTimeout(function(){ if(!UI.anyOpen()) UI.open('eventOv'); },1800); };
})(typeof window!=='undefined'?window:this);

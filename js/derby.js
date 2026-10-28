/* One Cast weekend derby: every Saturday and Sunday (US Eastern) one Home waters fish is featured. The biggest one wins.
   The server keeps the board and pays the prizes; this page shows the rules, how to catch the fish, and the live top 10. */
(function(root){
'use strict';
var D=root.OC, A=root.ART, N=root.NET, UI=root.UI, $=function(id){ return document.getElementById(id); };
var derby=null, loadedAt=0, me=null;
function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function G(){ return root.G; }
function load(force){ if(!force&&derby&&Date.now()-loadedAt<90000) return Promise.resolve(derby);
  return N.rpc('get_derby',{p_pid:N.id?N.id.pid:null}).then(function(d){ derby=d; loadedAt=Date.now(); chip(); return d; }); }
UI.loadDerby=load;
function left(ms){ var m=Math.max(0,Math.round(ms/60000)), d=Math.floor(m/1440), h=Math.floor(m%1440/60), mm=m%60; return d?d+'d '+h+'h':h?h+'h '+mm+'m':mm+'m'; }
function spName(id){ var s=D.SP_BY_ID[id]; return s?s.name:id; }
function short(id){ return spName(id).replace(/^(Largemouth|Smallmouth|Black|Yellow|Channel|Striped|Red|Common) /,'').toUpperCase(); }
UI.derbyBlurb=function(){ if(!derby) return 'Biggest fish of the weekend wins'; var now=N.now(); return derby.live?spName(derby.sp)+' · LIVE · ends in '+left(Date.parse(derby.endsAt)-now):spName(derby.sp)+' · starts in '+left(Date.parse(derby.startsAt)-now); };
function chip(){ var c=$('derbyChip'); if(!c||!derby) return; var now=N.now(), toStart=Date.parse(derby.startsAt)-now;
  if(derby.live){ c.hidden=false; c.classList.add('live'); $('derbyTxt').textContent=short(derby.sp)+' · '+left(Date.parse(derby.endsAt)-now); }
  else if(toStart<36*3600e3){ c.hidden=false; c.classList.remove('live'); $('derbyTxt').textContent=short(derby.sp)+' · in '+left(toStart); }
  else c.hidden=true; }
/* how to catch the featured fish, from the fish data plus a hand-written tip */
function howTo(spId){
  var sp=D.SP_BY_ID[spId]; if(!sp) return '';
  var home=D.SPOTS.filter(function(s){ return s.region==='home'&&(sp.spots[s.id]||0)>0; }).sort(function(a,b){ return sp.spots[b.id]-sp.spots[a.id]; });
  var baits=Object.keys(sp.baits).filter(function(b){ return sp.baits[b]>0&&D.BAIT_BY_ID[b]; }).sort(function(a,b){ return sp.baits[b]-sp.baits[a]; }).slice(0,4);
  var prof=D.ACT_PROFILES[sp.act], times=Object.keys(prof).sort(function(a,b){ return prof[b]-prof[a]; });
  var soak=baits.some(function(b){ return !D.BAIT_BY_ID[b].uses&&b!=='fly'; });
  var g=G(), owned=g&&g.s?g.s.baits:[];
  var li=[];
  li.push('<b>Where:</b> '+(home.length?home.slice(0,4).map(function(s){ return esc(s.name); }).join(', ')+(home.length>4?' and more':'')+' (all free in Home waters).':'Anywhere it lives.'));
  li.push('<b>Best bait:</b> '+baits.map(function(b){ return '<span class="'+(owned.indexOf(b)>=0?'have':'')+'">'+esc(D.BAIT_BY_ID[b].name)+'</span>'; }).join(', ')+'.');
  li.push('<b>Best time:</b> '+D.PERIOD_NAME[times[0]]+(prof[times[1]]>=prof[times[0]]*0.8?' and '+D.PERIOD_NAME[times[1]].toLowerCase():'')+' (local time at the spot). Slowest at '+D.PERIOD_NAME[times[3]].toLowerCase()+'.');
  li.push('<b>Size:</b> they get up to '+D.fmtWeight(sp.max)+'. '+(sp.minWait>=30?'They only start biting after '+D.fmtDuration(sp.minWait)+'.':'They can bite right away.'));
  li.push('<b>Go big:</b> '+(soak?'with soak baits, the longer your bait waits before a bite, the bigger the fish can be. ':'')+'A better rod makes every fish bigger, and dawn and dusk double the chance of a trophy.');
  var tip=(D.DERBY.tips||{})[spId];
  return (tip?'<p class="derby-tip">'+esc(tip)+'</p>':'')+'<ul class="derby-how">'+li.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>';
}
function rules(d){ var P=d.prizes||D.DERBY.prizes, E=d.entry!=null?d.entry:D.DERBY.entry;
  return '<ul class="derby-rules">'+[
    'Runs all weekend: <b>Saturday 12:00 AM to Sunday 11:59 PM</b> (US Eastern time).',
    'Only <b>'+esc(spName(d.sp).toLowerCase())+'</b> count. Catch one anywhere in the world.',
    'Only your <b>single biggest</b> one counts. You can sell it, it stays entered.',
    'Legends do not count. Ties go to whoever caught it first.',
    'Prizes are paid automatically after the derby ends.'].map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>'+
    '<div class="derby-prizes"><div><b>1ST</b>'+D.money(P[0])+'<small>+ Derby Champion cap</small></div><div><b>2ND</b>'+D.money(P[1])+'</div><div><b>3RD</b>'+D.money(P[2])+'</div><div><b>EVERYONE</b>'+D.money(E)+'<small>just for entering</small></div></div>'; }
function render(){
  var body=$('derbyBody'); if(!derby) body.innerHTML='<p class="note">Loading the derby...</p>';
  load(true).then(function(d){ body.innerHTML=''; var now=N.now(), g=G();
    var head=el('div','derby-head'); var pic=el('div','derby-pic'); pic.appendChild(A.fishImg(d.sp,46,false,2,null,null,'')); head.appendChild(pic);
    head.appendChild(el('div',null,'<div class="derby-sp">'+esc(((D.DERBY.special||{})[d.key]||{}).name?D.DERBY.special[d.key].name.toUpperCase():spName(d.sp).toUpperCase()+' DERBY')+'</div><div class="derby-when '+(d.live?'live':'')+'">'+(d.live?'LIVE NOW · ends in '+left(Date.parse(d.endsAt)-now):'Starts '+new Date(d.startsAt).toLocaleString([], {weekday:'long',hour:'numeric',minute:'2-digit'})+' · in '+left(Date.parse(d.startsAt)-now))+'</div><div class="note">Biggest '+esc(spName(d.sp).toLowerCase())+' of the weekend wins. '+d.entrants+' angler'+(d.entrants===1?'':'s')+' entered so far.</div>'));
    body.appendChild(head);
    if(d.me) body.appendChild(el('div','derby-me','Your best: <b>'+D.fmtWeight(+d.me.lb)+'</b> · you are <b>#'+d.me.rank+'</b>'+(d.me.rank<=3?' (in the money!)':'')));
    else if(d.live) body.appendChild(el('div','derby-me','You have not entered yet. Catch any '+esc(spName(d.sp).toLowerCase())+' to get on the board.'));
    body.appendChild(el('div','gear-group',d.live?'LEADERBOARD':'THE BOARD (OPENS SATURDAY)'));
    var ol=el('ol','derby-board'); if(!d.board.length) ol.appendChild(el('li','gap',d.live?'Nobody yet. Be first!':'Empty until the derby starts.'));
    d.board.forEach(function(r){ var li=el('li',r.pid===(g&&g.s&&g.s.pid)?'me':''); li.innerHTML='<span class="rk">#'+r.rank+'</span><span class="nm"><a href="#" data-pid="'+r.pid+'">'+esc(r.name)+'</a><small>#'+r.tag+'</small></span><span class="lb">'+D.fmtWeight(+r.lb)+'</span>'; ol.appendChild(li); });
    body.appendChild(ol); ol.querySelectorAll('a[data-pid]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); UI.profile(a.getAttribute('data-pid')); }; });
    body.appendChild(el('div','gear-group','HOW TO CATCH '+esc(spName(d.sp).toUpperCase())));
    body.appendChild(el('div','derby-box',howTo(d.sp)));
    body.appendChild(el('div','gear-group','RULES AND PRIZES')); body.appendChild(el('div','derby-box',rules(d)));
    if(d.last&&d.last.results&&d.last.results.length){ body.appendChild(el('div','gear-group','LAST WEEKEND: '+esc(spName(d.last.sp).toUpperCase())));
      body.appendChild(el('div','derby-box','<ol class="derby-board">'+d.last.results.slice(0,3).map(function(r){ return '<li><span class="rk">#'+r.rank+'</span><span class="nm">'+esc(r.name)+'<small>#'+r.tag+'</small></span><span class="lb">'+D.fmtWeight(+r.lb)+' · '+D.money(r.prize)+'</span></li>'; }).join('')+'</ol>')); }
  }).catch(function(e){ body.innerHTML='<div class="empty">'+esc(e.message)+'</div>'; });
}
UI.RENDER.derbyOv=render;
/* after a catch that counts */
UI.derbyCatch=function(x){ var g=G(); if(!g) return; loadedAt=0;
  g.toast(x.improved?(x.first?'DERBY ENTRY! ':'NEW DERBY BEST! ')+D.fmtWeight(+x.best)+' '+spName(x.sp).toLowerCase()+'. You are #'+x.rank+' of '+x.entrants+'.':'Derby: your best is still '+D.fmtWeight(+x.best)+' (#'+x.rank+').',4200,x.improved?'good':'info'); load(true); };
function bind(){ var c=$('derbyChip'); if(c) c.onclick=function(){ UI.open('derbyOv'); }; }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
setInterval(function(){ if(N.id) load(false).catch(function(){}); chip(); },60000);
setTimeout(function(){ if(N.id) load(true).catch(function(){}); },2500);
UI._derby=function(){ return derby; };
})(typeof window!=='undefined'?window:this);

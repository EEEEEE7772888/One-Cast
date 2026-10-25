/* One Cast main: state, the fishing console, casting and reeling, the catch card, alerts, tutorial. Overlays live in ui.js. */
(function(){
'use strict';
var D=window.OC, A=window.ART, N=window.NET, SC=window.SCENE, UI=window.UI, G=window.G;
function $(id){ return document.getElementById(id); }
G.s=null; G.sel=0; G.bait='worm'; G.busy=false; G.last=null; G.world=null; G.legends=null;
var toastTimer=0, toastQ=[], toastBusy=false, lastRefresh=0, loopStarted=false, hourCache={};

/* ---------- helpers ---------- */
G.spot=function(){ return D.SPOT_BY_ID[(G.s&&G.s.spot)||'basslake']; };
G.method=function(){ return G.spot().method; };
G.lines=function(){ return G.s?G.s.lines:[]; };
G.line=function(i){ return G.lines().filter(function(l){ return l.idx===(i==null?G.sel:i); })[0]||null; };
G.lineCount=function(){ return G.s?(G.s.gear.lines||1):1; };
G.hooked=function(l){ return !!l&&Date.parse(l.biteAt)<=N.now(); };
G.minutes=function(l){ return Math.max(0,(N.now()-Date.parse(l.castAt))/60000); };
G.hourAt=function(spot){
  var key=spot.tz+'|'+Math.floor(Date.now()/30000); if(hourCache[key]!=null) return hourCache[key];
  var h; try{ var parts=new Intl.DateTimeFormat('en-US',{timeZone:spot.tz,hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date()), o={}; parts.forEach(function(p){ o[p.type]=p.value; }); h=(+o.hour%24)+(+o.minute)/60; }
  catch(e){ h=((new Date().getUTCHours()+spot.lon/15)%24+24)%24; }
  hourCache={}; hourCache[key]=h; return h;
};
G.clockAt=function(spot){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:spot.tz,hour:'numeric',minute:'2-digit'}).format(new Date()); }catch(e){ var h=G.hourAt(spot); return Math.floor(h)+':'+String(Math.round((h%1)*60)).padStart(2,'0'); } };
G.period=function(spot){ return D.periodOf(G.hourAt(spot||G.spot())); };
G.toast=function(msg,ms,kind){ var t=$('toast'); t.textContent=msg; t.className='toast'+(kind==='good'?' good':kind==='info'?' info':''); t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.hidden=true; },ms||2600); };
G.queueToast=function(msg){ toastQ.push(msg); pump(); };
function pump(){ if(toastBusy||!toastQ.length) return; toastBusy=true; G.toast(toastQ.shift(),2600,'good'); setTimeout(function(){ toastBusy=false; pump(); },2900); }
G.money=D.money;
G.bump=function(){ var c=$('coinChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); };
G.fail=function(e){ if(e&&e.offline){ G.toast("Can't reach the server right now. Try again in a moment."); } else G.toast((e&&e.message)||'Something went wrong.'); };
/* What you can do at a spot with the boat you have out (or your host's boat if you're riding along). */
G.boatId=function(){ return (G.s.crew&&G.s.crew.guest&&G.s.crew.boat)||G.s.gear.boat||'paddle'; };
G.hasRig=function(){ return (G.s.gear.methods||[]).indexOf('deeprig')>=0; };
G.access=function(spot){ spot=spot||G.spot(); var b=D.GEAR_BY_ID[G.boatId()]||D.GEAR_BY_ID.paddle, lvl=b.lvl;
  var blocked=spot.method==='boat'&&lvl<spot.need?(spot.need===1?'kayak':'skiff'):null;
  var small=(spot.method==='troll'&&lvl<5)||(spot.method==='deep'&&!G.hasRig());
  return {boat:b,lvl:lvl,blocked:blocked,small:small,why:small?(spot.method==='troll'?'Small fish only: the big ones need a sportfisher.':'Small fish only: the giants need the deep-drop rig.'):''}; };
G.baitWorksHere=function(bait,spot){ spot=spot||G.spot(); var ac=G.access(spot); if(D.METHOD_BAITS[spot.method].indexOf(bait)<0) return false; if(bait==='deepbait'&&!G.hasRig()) return false; if(bait==='lure'&&ac.lvl<5) return false; return D.speciesWeights(spot.id,bait,99999,null,ac.small).some(function(x){ return x.w>0; }); };
G.needGear=function(spot){ var ac=G.access(spot); return ac.blocked; };
G.lineTest=function(){ return D.LINE_TESTS[G.s.gear.line||0]; };
G.bestOf=function(sp){ var b=null; G.s.fish.forEach(function(f){ if(f.sp===sp&&!f.legend&&!f.released&&(!b||f.lb>b.lb)) b=f; }); return b; };
G.prefs=function(patch){ Object.assign(G.s.prefs,patch); N.me('set_prefs',{p_prefs:patch}).catch(function(){}); };

/* ---------- state ---------- */
G.apply=function(s){
  var first=!G.s; G.s=s; N.cache(s);
  if(first){ G.sel=0; }
  if(!G.s.prefs) G.s.prefs={};
  var pb=G.s.prefs.bait||{}; var want=pb[G.s.spot]||G.bait; if(G.s.baits.indexOf(want)<0||!G.baitWorksHere(want)) want=firstGoodBait(); G.bait=want;
  if(G.sel>=G.lineCount()) G.sel=0;
  if(!first) SC.measure();
  G.renderAll();
};
function firstGoodBait(){ var best=null; D.BAITS.forEach(function(b){ if(G.s.baits.indexOf(b.id)>=0&&G.baitWorksHere(b.id)) best=b.id; }); return best||'worm'; }
G.refresh=function(force){
  if(!N.id||G.busy&&!force) return Promise.resolve();
  if(!force&&Date.now()-lastRefresh<15000) return Promise.resolve();
  lastRefresh=Date.now();
  return N.me('get_state').then(function(s){ var openTrade=G.tradeId; G.apply(s); UI.afterRefresh&&UI.afterRefresh(); if(openTrade) G.tradeId=openTrade; if($('cardOv').hidden) setTimeout(G.checkAch,1500); /* new stats: award achievements right away */ }).catch(function(e){ if(!e.offline) G.fail(e); });
};
G.setBait=function(id){ G.bait=id; var pb=Object.assign({},G.s.prefs.bait||{}); pb[G.s.spot]=id; G.prefs({bait:pb}); G.renderPanel(); };

/* ---------- render ---------- */
G.renderAll=function(){ G.renderHUD(); G.renderHoles(); G.renderPanel(); G.renderSonar(); G.renderStatus(); UI.renderMenuBadge(); G.updateCoach(); };
G.renderHUD=function(){
  $('coinTxt').textContent=D.money(G.s.coins); $('whereTxt').textContent=G.spot().name; $('timeTxt').textContent=G.clockAt(G.spot());
  document.title=anyHooked()?'FISH ON! | One Cast':'One Cast';
};
function anyHooked(){ return G.lines().some(G.hooked); }
G.renderHoles=function(){
  var box=$('holes'); box.innerHTML=''; var n=G.lineCount(), anyLock=false;
  for(var i=0;i<4;i++){
    var b=document.createElement('button'); b.type='button'; b.className='hole-chip';
    if(i<n){ var l=G.line(i), st=l?(G.hooked(l)?'BITE!':D.fmtDuration(G.minutes(l))):'empty';
      b.innerHTML='<span class="hn">LINE '+(i+1)+'</span><span class="hs">'+st+'</span>'; b.setAttribute('aria-pressed',String(i===G.sel)); if(l&&G.hooked(l)) b.classList.add('on');
      b.onclick=(function(i){ return function(){ G.sel=i; G.renderAll(); }; })(i); }
    else { b.classList.add('locked'); b.innerHTML='<span class="hn">LINE '+(i+1)+'</span><span class="hs">'+D.money(D.GEAR_BY_ID['hole'+(i+1)].price)+'</span>'; b.title='Buy another line in the gear shop'; b.onclick=function(){ UI.open('gearOv'); }; anyLock=true; }
    box.appendChild(b);
  }
  var out=G.lines().length; $('linesDesc').textContent=out?out+' of '+n+' in the water':(n>1?n+' lines ready':'1 line');
};
G.renderPanel=function(){
  var l=G.line(), go=$('goBtn'), b=D.BAIT_BY_ID[G.bait], sp=G.spot(), need=G.needGear();
  var ic=$('baitIcon'), art=A.BAIT_ART[l?l.bait:G.bait]||A.BAIT_ART.worm; ic.width=8; ic.height=8; A.drawSprite(ic.getContext('2d'),art.rows,art.map,0,0);
  $('loadoutTxt').textContent=(l?D.BAIT_BY_ID[l.bait].name:b.name).toUpperCase()+' · '+D.METHOD_NAME[sp.method].toUpperCase();
  $('tackleBtn').disabled=!!l;
  go.className='go'; go.disabled=false;
  if(SC.busy()){ go.textContent='...'; go.disabled=true; }
  else if(!l){ if(need){ go.textContent='TAKE OUT A '+(need==='kayak'?'KAYAK':'SKIFF')+' OR BIGGER'; go.className='go alt'; go.onclick=function(){ UI.open('dockOv'); }; }
    else if(!G.baitWorksHere(G.bait)){ go.textContent='NOTHING HERE TAKES '+b.name.toUpperCase(); go.className='go alt'; go.onclick=function(){ UI.open('tackleOv'); }; }
    else { go.textContent='CAST'; go.onclick=G.cast; } }
  else if(G.hooked(l)){ go.textContent='REEL IN!'; go.className='go reel arm'; go.onclick=G.reel; }
  else { go.textContent='PULL LINE (NOTHING YET)'; go.className='go alt'; go.onclick=function(){ UI.confirm({title:'PULL THE LINE?',note:'Nothing has bitten yet. Pulling it in now means starting the wait over.',yes:'PULL IT',no:'LEAVE IT'}).then(function(v){ if(v) G.reel(); }); }; }
};
G.renderSonar=function(){
  var l=G.line(), box=$('sonar'), f=G.s.gear.finder||0;
  if(!l||!f){ box.hidden=true; return; }
  box.hidden=false; var msg=$('sonarMsg');
  if(l.legendNear){ $('sonarSub').textContent='LEGEND'; msg.innerHTML='<span class="s-legend">SOMETHING ENORMOUS IS CIRCLING YOUR BAIT.</span>'; return; }
  if(!G.hooked(l)){ $('sonarSub').textContent='SCANNING'; msg.textContent=f>=2&&l.peekSp?aAn(D.SP_BY_ID[l.peekSp].name.toLowerCase())+' is nosing around your bait.':f>=1&&l.peekSp?'Something '+sizeWord(D.SP_BY_ID[l.peekSp].max)+' is near your bait.':'Nothing on the hook yet.'; return; }
  $('sonarSub').textContent='FISH ON';
  if(f>=2&&l.peekLb!=null) msg.innerHTML='<b>'+D.SP_BY_ID[l.peekSp].name+'</b>, about <b>'+D.fmtWeight(l.peekLb)+'</b>.'+(l.peekLb>G.lineTest()?' <span style="color:#FF8A8D">Heavier than your '+G.lineTest()+' lb line!</span>':'');
  else if(l.peekSp){ msg.innerHTML=''; var img=A.fishImg(l.peekSp,Math.min(30,A.sceneLen(D.SP_BY_ID[l.peekSp].max)+6),'#5CF08A',2,null,null,'Fish shape'); img.style.verticalAlign='middle'; msg.appendChild(img); msg.appendChild(document.createTextNode(' Shape on the finder: looks like a '+D.SP_BY_ID[l.peekSp].name.toLowerCase()+'.')); }
  else msg.textContent='Fish on the line!';
};
function aAn(n){ return (/^[aeiou]/i.test(n)?'An ':'A ')+n; }
function sizeWord(max){ return max<5?'small':max<30?'medium-sized':max<150?'big':'huge'; }
G.renderStatus=function(){
  var l=G.line(), sp=G.spot(), per=G.period(sp), clock=$('clock'), st=$('status');
  if(l){ var sec=(N.now()-Date.parse(l.castAt))/1000; clock.textContent=D.fmtClock(sec); clock.classList.toggle('ready',G.hooked(l));
    if(G.hooked(l)) st.innerHTML='<span class="n">FISH ON!</span> Something took the '+D.BAIT_BY_ID[l.bait].name.toLowerCase()+'. Reel it in.';
    else st.innerHTML=D.BAIT_BY_ID[l.bait].name+' in the water at <span class="n">'+sp.name+'</span>. '+todLine(sp,per); }
  else { clock.textContent=G.clockAt(sp); clock.classList.remove('ready'); var ac=G.access(sp); st.innerHTML='<span class="n">'+sp.name+'</span>. '+(ac.small?ac.why+' ':'')+todLine(sp,per); }
};
function todLine(sp,per){
  var small=G.access(sp).small, list=D.spotSpecies(sp.id).filter(function(s){ return !small||s.small; }).sort(function(a,b){ return D.ACT_PROFILES[b.act][per]-D.ACT_PROFILES[a.act][per]; }).slice(0,2).map(function(s){ return s.name.toLowerCase(); });
  var lead={dawn:'Prime time: trophies bite at dawn.',day:'Midday: steady bites, smaller fish.',dusk:'Prime time: trophies bite at dusk.',night:'Night: catfish and the big ones prowl.'}[per];
  return lead+(list.length?' Biting now: '+list.join(', ')+'.':'');
}

/* ---------- the loop ---------- */
var lastHoles='', lastSec=-1;
function tick(){
  if(!G.s) return;
  var now=N.now(), sec=Math.floor(now/1000);
  var sig=G.lines().map(function(l){ return l.idx+':'+(G.hooked(l)?1:0); }).join(',')+'|'+G.sel;
  if(sig!==lastHoles){ lastHoles=sig; G.renderHoles(); G.renderPanel(); G.renderSonar(); G.renderHUD(); checkBiteAlert(); }
  if(sec!==lastSec){ lastSec=sec; G.renderStatus(); if(sec%5===0) G.renderHoles(); if(sec%30===0) G.renderHUD(); if(sec%60===0&&!document.hidden) G.refresh(); }
}
function loop(ms){ requestAnimationFrame(loop); tick(); SC.draw(ms); }

/* ---------- casting and reeling ---------- */
G.cast=function(){
  if(G.busy||G.line()) return; G.busy=true; $('goBtn').disabled=true;
  N.me('cast_line',{p_idx:G.sel,p_bait:G.bait}).then(function(r){ G.s.lines.push(r.line); SC.cast(); G.renderAll(); G.coachEvent('cast'); })
    .catch(function(e){ G.fail(e); if(!e.offline) G.refresh(true); }).then(function(){ G.busy=false; G.renderPanel(); });
};
G.reel=function(){
  var l=G.line(); if(G.busy||!l||SC.busy()) return; G.busy=true; $('goBtn').disabled=true;
  var idx=G.sel;
  N.me('reel_line',{p_idx:idx}).then(function(r){
    G.s.lines=G.s.lines.filter(function(x){ return x.idx!==idx; });
    if(r.result==='early'||r.result==='nothing'){ G.toast(r.result==='early'?'Nothing yet. Your bait is back in the box.':'Whatever it was, it got off the hook.',2600,'info'); G.renderAll(); return; }
    if(r.result==='snap'){ G.last={snap:true,sp:r.sp,lb:r.lb}; SC.startCatch({sp:r.sp,lb:r.lb,snap:true,idx:idx,bait:l.bait,max:D.SP_BY_ID[r.sp].max}); G.renderAll();
      setTimeout(function(){ G.toast('SNAP! A '+D.fmtWeight(r.lb)+' '+D.SP_BY_ID[r.sp].name.toLowerCase()+' broke your '+r.test+' lb line. Stronger line is in the gear shop.',4200); },1200); return; }
    if(r.result==='legendsnap'){ G.last=null; SC.startCatch({sp:r.legend.sp,lb:r.legend.lb,snap:true,colors:r.legend.colors,idx:idx,bait:l.bait,max:1}); G.renderAll();
      setTimeout(function(){ G.toast('SOMETHING ENORMOUS snapped your line like thread. The legend is still out there. You need heavier line.',5200); },1200); return; }
    var f=r.fish; G.s.fish.unshift(f); if(r.reward){ G.s.coins+=r.reward; }
    var sp=D.SP_BY_ID[f.sp]; G.last=Object.assign({newSpecies:r.newSpecies,newBest:r.newBest,worldRecord:r.worldRecord,minutes:r.minutes,daily:r.daily,reward:r.reward,legendInfo:r.legend},f);
    var wait=SC.startCatch({sp:f.sp,lb:f.lb,variant:f.variant,colors:f.colors,legend:!!f.legend,idx:idx,bait:l.bait,max:sp.max,newBest:r.newBest});
    G.renderAll(); G.coachEvent('reel');
    setTimeout(function(){ UI.showCard(G.last); },wait+350);
    if(r.daily) G.s.daily=r.daily;
  }).catch(function(e){ G.fail(e); if(!e.offline) G.refresh(true); }).then(function(){ G.busy=false; G.renderPanel(); });
};
SC.hooks={state:function(){ return G.s; },sel:function(){ return G.sel; },selLine:function(){ return G.line(); },lines:G.lines,lineCount:G.lineCount,method:G.method,spot:G.spot,hourAt:G.hourAt,outfit:function(){ return G.s.outfit; },boat:function(){ return G.boatId(); },crew:function(){ var c=G.s.crew; if(!c||!c.members) return []; return c.members.filter(function(x){ return x.pid!==G.s.pid&&c.spot===G.s.spot; }); },bait:function(){ return G.bait; },afterCatch:function(){ G.renderPanel(); G.refresh(true); }};

/* ---------- travel ---------- */
G.travelTo=function(spotId){
  var sp=D.SPOT_BY_ID[spotId], rg=D.REGION_BY_ID[sp.region];
  if(G.lines().length){ G.toast('Reel in all your lines before you travel.'); return Promise.resolve(false); }
  if(spotId===G.s.spot){ G.toast("You're already here.",2000,'info'); return Promise.resolve(false); }
  var buy=G.s.regions.indexOf(sp.region)<0;
  var p=Promise.resolve(true);
  if(buy){ if(G.s.coins<rg.ticket){ G.toast('A ticket to '+rg.name+' costs '+D.money(rg.ticket)+'. You have '+D.money(G.s.coins)+'.'); return Promise.resolve(false); }
    p=UI.confirm({title:'FIRST TRIP TO '+rg.name.toUpperCase(),note:'A one-time ticket costs '+D.money(rg.ticket)+'. After that, you can come back here for free, forever.',yes:'BUY TICKET',no:'NOT YET'}).then(function(v){ if(!v) return false; return N.me('buy',{p_kind:'region',p_id:sp.region}).then(function(r){ G.s.coins=r.coins; G.s.regions=r.regions; G.bump(); return true; }); }); }
  return p.then(function(ok){ if(!ok) return false;
    UI.closeAll(); UI.travelScene(rg.by,G.spot(),sp);
    return N.me('travel',{p_spot:spotId}).then(function(r){ return new Promise(function(res){ setTimeout(function(){ G.s.spot=spotId; G.s.legendsHere=r.legendsHere; G.sel=0; $('travelOv').hidden=true; G.apply(G.s); SC.layout(); G.coachEvent('travel'); G.toast('Welcome to '+sp.name+'. '+(r.legendsHere.length?'The legend here: '+r.legendsHere[0].name+'.':''),3600,'good'); res(true); },2700); }); });
  }).catch(function(e){ $('travelOv').hidden=true; G.fail(e); return false; });
};

/* ---------- fish alert (picture-in-picture window) ---------- */
var pipWin=null, alerted={}, miniKey='';
function inFrame(){ try{ return window.self!==window.top; }catch(e){ return true; } }
function canPip(){ return 'documentPictureInPicture' in window&&!inFrame(); }
function canNotify(){ return 'Notification' in window; }
function desktop(){ try{ return matchMedia('(pointer:fine)').matches; }catch(e){ return true; } }
function notifyActive(){ return !!(G.s&&G.s.prefs.notify)&&canNotify()&&Notification.permission==='granted'; }
G.renderAlertBtn=function(){ var ok=canPip()||canNotify(), on=!!pipWin||notifyActive(), b=$('alertBtn'), h=$('hudAlert');
  b.hidden=!ok; h.hidden=!ok; h.classList.toggle('on',on); h.textContent=on?'ALERT ON':'ALERT'; b.classList.toggle('on',on);
  $('alertT').textContent=pipWin?'FISH ALERT: WINDOW OPEN':on?'FISH ALERT: ON':'FISH ALERT: OFF';
  $('alertS').textContent=pipWin?'Tap to close the little window.':on?'You get a silent pop-up when something bites. Tap to turn off.':canPip()?'Opens a tiny window that stays on top of your other tabs and apps and lights up when a fish bites.':'Sends a silent pop-up notification when a fish bites.';
  var ic=$('alertIcon'); if(ic&&!ic.dataset.done){ var src=A.fishCanvas('largemouth',14,false); ic.width=src.width; ic.height=src.height; ic.getContext('2d').drawImage(src,0,0); ic.style.width='40px'; ic.style.height='auto'; ic.dataset.done=1; } };
var MINI_CSS="html,body{margin:0;height:100%;background:#0A1530;color:#EAF5FF;font:18px/1.1 'VT323',ui-monospace,monospace;overflow:hidden}*{box-sizing:border-box}.m{height:100%;display:grid;grid-template-rows:auto 1fr auto auto;gap:4px;padding:8px 10px;border:3px solid #050B1C}.top{display:flex;justify-content:space-between;font:8px/1.3 'Press Start 2P',monospace;color:#93B2D2}.top b{color:#FFC94A;font-weight:400}.mid{display:grid;place-items:center;min-height:0}canvas{image-rendering:pixelated;max-width:100%;max-height:100%}.ms{font:13px/1.2 'Press Start 2P',monospace;text-align:center;font-variant-numeric:tabular-nums}.mx{text-align:center;color:#93B2D2}.on{background:#1D3866;animation:fl .7s steps(2) infinite}.on .ms{color:#FFC94A}.on .mx{color:#EAF5FF}.jump{animation:jp .5s steps(3) infinite alternate}.bob{animation:bb 2s steps(4) infinite alternate}@keyframes fl{50%{background:#0A1530}}@keyframes jp{to{transform:translateY(-10px) rotate(-12deg)}}@keyframes bb{to{transform:translateY(3px)}}";
function buildMini(w){ var d=w.document; d.title='One Cast'; var l=d.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap'; d.head.appendChild(l); var st=d.createElement('style'); st.textContent=MINI_CSS; d.head.appendChild(st);
  d.body.innerHTML='<div class="m" id="m"><div class="top"><span>ONE <b>CAST</b></span><span id="mt"></span></div><div class="mid"><canvas id="mf"></canvas></div><div class="ms" id="ms"></div><div class="mx" id="mx"></div></div>'; miniKey=''; }
function renderMini(){
  if(!pipWin||pipWin.closed||!G.s) return; var d=pipWin.document, m=d.getElementById('m'); if(!m) return;
  var ls=G.lines(), on=ls.filter(G.hooked), line=G.line()||ls[0], catching=SC.busy(), mode=catching?'catch':on.length?'on':line?'wait':'none';
  d.getElementById('mt').textContent=ls.length>1?ls.length+' LINES OUT':(line?D.BAIT_BY_ID[line.bait].name.toUpperCase():'');
  if(mode!==miniKey){ miniKey=mode; m.classList.toggle('on',mode==='on'); var cv=d.getElementById('mf'), src=A.fishCanvas(catching&&G.last?G.last.sp:'largemouth',22,mode==='on'||mode==='catch'?false:'#2C5088');
    cv.width=src.width; cv.height=src.height; var x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height); x.drawImage(src,0,0); cv.style.width=(src.width*4)+'px'; cv.style.height=(src.height*4)+'px'; cv.className=mode==='on'?'jump':mode==='wait'?'bob':''; }
  var ms=d.getElementById('ms'), mx=d.getElementById('mx');
  if(mode==='catch'){ ms.textContent='NICE CATCH!'; mx.textContent='Check the game tab'; }
  else if(mode==='on'){ ms.textContent='FISH ON!'; mx.textContent=ls.length>1?'Line '+on.map(function(l){ return l.idx+1; }).join(' and ')+'. Go reel it in!':'Go reel it in!'; }
  else if(mode==='wait'){ ms.textContent=D.fmtClock(G.minutes(line)*60); mx.textContent='Waiting for a bite at '+G.spot().name; }
  else { ms.textContent='NO LINE OUT'; mx.textContent='Cast in the game tab'; }
}
function checkBiteAlert(){
  G.lines().forEach(function(l){ var k=l.idx+'|'+l.castAt; if(!G.hooked(l)||alerted[k]) return; alerted[k]=1; if(!document.hidden||pipWin||!notifyActive()) return;
    try{ var n=new Notification('FISH ON! | One Cast',{body:'Something bit your '+D.BAIT_BY_ID[l.bait].name.toLowerCase()+' at '+G.spot().name+'. Go reel it in!',silent:true,tag:'onecast-'+l.idx}); n.onclick=function(){ try{ window.focus(); }catch(e){} n.close(); }; }catch(e){} });
}
G.openAlert=async function(){
  if(pipWin){ try{ pipWin.close(); }catch(e){} pipWin=null; G.renderAlertBtn(); return; }
  if(notifyActive()){ G.prefs({notify:false}); G.renderAlertBtn(); G.toast('Fish alert pop-ups are off.',2200,'info'); return; }
  if(inFrame()){ G.toast("Fish alerts only work on the game's own website.",4000); return; }
  if(canPip()){ try{ pipWin=await window.documentPictureInPicture.requestWindow({width:260,height:180}); buildMini(pipWin); renderMini(); pipWin.setInterval(renderMini,1000); pipWin.addEventListener('pagehide',function(){ pipWin=null; G.renderAlertBtn(); }); G.renderAlertBtn(); G.toast('Fish alert window is open. Drag it anywhere; it stays on top of your other apps.',4000,'good'); return; }catch(e){} }
  if(canNotify()){ try{ var perm=Notification.permission==='granted'?'granted':await Notification.requestPermission(); if(perm==='granted'){ G.prefs({notify:true}); G.renderAlertBtn(); G.toast('Fish alerts are on. You get a silent pop-up when something bites.',4000,'good'); return; } }catch(e){} G.toast('Your browser blocked notifications. Allow them for this site, then try again.',4500); return; }
  G.toast("This browser can't show fish alerts. Try Chrome or Edge on a computer.",4500);
};

/* ---------- tutorial ---------- */
var TUT=[
 {id:'cast',t:'Welcome to One Cast! Pick a bait in the TACKLE BOX, then press CAST. Worms get bites in about a minute.'},
 {id:'wait',t:'Now wait. The line stays in the water even if you close this tab. When it says BITE!, come back and reel.'},
 {id:'reel',t:'FISH ON! Press REEL IN. The longer a fish waited before biting, the bigger it can be.'},
 {id:'sell',t:'This is how you make money: every fish is worth coins. Press SELL on the catch card, or KEEP it and sell later from MENU, then YOUR FISH. Spend coins on minnows and a second line to earn faster.'},
 {id:'map',t:'Open the MAP. Home waters has ten famous lakes to try for free. Farther regions need a one-time ticket.'},
 {id:'legend',t:'Every spot hides one LEGEND only one player on Earth can own. Read its clue in the Legends screen. Good luck out there.'}
];
G.updateCoach=function(){ var i=G.s.prefs.tut||0, c=$('coach'); if(i>=TUT.length){ c.hidden=true; return; } var step=TUT[i]; if(step.id==='wait'&&!G.line()){ c.hidden=true; return; } if(step.id==='reel'&&!anyHooked()){ c.hidden=true; return; } $('coachTxt').textContent=step.t; c.hidden=false; };
G.coachEvent=function(ev){ var i=G.s.prefs.tut||0; if(i>=TUT.length) return; var step=TUT[i]; if((step.id==='cast'&&ev==='cast')||(step.id==='wait'&&ev==='reel')||(step.id==='reel'&&ev==='reel')||(step.id==='sell'&&ev==='sell')||(step.id==='map'&&(ev==='travel'||ev==='map'))){ G.prefs({tut:i+1}); if(step.id==='wait'||step.id==='reel'){ G.prefs({tut:3}); } G.updateCoach(); } };
$('coachNext').onclick=function(){ var i=G.s.prefs.tut||0; G.prefs({tut:i+1}); G.updateCoach(); };
$('coachSkip').onclick=function(){ G.prefs({tut:TUT.length}); G.updateCoach(); };

/* ---------- achievements ---------- */
G.ACH=[
 {id:'first',name:'First Cast',desc:'Catch your first fish',n:function(s){ return [Math.min(1,s.stats.catches||0),1]; }},
 {id:'ten',name:'Getting the Hang',desc:'Catch 10 fish',n:function(s){ return [s.stats.catches||0,10]; }},
 {id:'hundred',name:'Hundred Club',desc:'Catch 100 fish',n:function(s){ return [s.stats.catches||0,100]; }},
 {id:'thousand',name:'Lifer',desc:'Catch 1,000 fish',n:function(s){ return [s.stats.catches||0,1000]; }},
 {id:'ten_sp',name:'Collector',desc:'Catch 10 different species',n:function(s){ return [speciesCount(s),10]; }},
 {id:'thirty_sp',name:'Naturalist',desc:'Catch 30 different species',n:function(s){ return [speciesCount(s),30]; }},
 {id:'all_sp',name:'World Journal',desc:'Catch every species',n:function(s){ return [speciesCount(s),D.SPECIES.length]; }},
 {id:'five_lb',name:'Keeper',desc:'Land a fish over 5 lb',n:function(s){ return [Math.min(5,s.stats.bestlb||0),5]; }},
 {id:'fifty_lb',name:'Heavyweight',desc:'Land a fish over 50 lb',n:function(s){ return [Math.min(50,s.stats.bestlb||0),50]; }},
 {id:'fivehundred_lb',name:'Sea Monster',desc:'Land a fish over 500 lb',n:function(s){ return [Math.min(500,s.stats.bestlb||0),500]; }},
 {id:'golden',name:'Golden Touch',desc:'Catch a golden fish',n:function(s){ return [Math.min(1,s.stats.golden||0),1]; }},
 {id:'albino',name:'Ghost Hunter',desc:'Catch an albino fish',n:function(s){ return [Math.min(1,s.stats.albino||0),1]; }},
 {id:'legend',name:'One of a Kind',desc:'Own a legend',n:function(s){ return [Math.min(1,s.stats.legends||0),1]; }},
 {id:'legends3',name:'Myth Maker',desc:'Catch 3 legends',n:function(s){ return [s.stats.legends||0,3]; }},
 {id:'dawn',name:'Early Bird',desc:'Catch 25 fish at dawn',n:function(s){ return [s.stats.dawn||0,25]; }},
 {id:'night',name:'Night Owl',desc:'Catch 25 fish at night',n:function(s){ return [s.stats.night||0,25]; }},
 {id:'patient',name:'Patience',desc:'Catch a fish after a 6-hour wait',n:function(s){ return [Math.min(360,s.stats.longest||0),360]; }},
 {id:'overnight',name:'Overnighter',desc:'Catch a fish after a 12-hour wait',n:function(s){ return [Math.min(720,s.stats.longest||0),720]; }},
 {id:'regions3',name:'Traveler',desc:'Fish in 3 regions',n:function(s){ return [(s.stats.regions||[]).length,3]; }},
 {id:'regions7',name:'Globetrotter',desc:'Fish in 7 regions',n:function(s){ return [(s.stats.regions||[]).length,7]; }},
 {id:'regions14',name:'Seven Seas',desc:'Fish in every region',n:function(s){ return [(s.stats.regions||[]).length,14]; }},
 {id:'spots20',name:'Explorer',desc:'Fish at 20 different spots',n:function(s){ return [(s.stats.spots||[]).length,20]; }},
 {id:'salt',name:'Salty',desc:'Catch a saltwater fish',n:function(s){ return [saltCaught(s)?1:0,1]; }},
 {id:'troll',name:'Blue Water',desc:'Catch a fish while trolling',n:function(s){ return [(s.stats.spots||[]).some(function(x){ return D.SPOT_BY_ID[x]&&D.SPOT_BY_ID[x].method==='troll'; })?1:0,1]; }},
 {id:'deep',name:'Into the Dark',desc:'Catch a fish on a deep drop',n:function(s){ return [(s.stats.spots||[]).some(function(x){ return D.SPOT_BY_ID[x]&&D.SPOT_BY_ID[x].method==='deep'; })?1:0,1]; }},
 {id:'snaps',name:'The One That Got Away',desc:'Lose 5 fish to snapped line',n:function(s){ return [s.stats.snaps||0,5]; }},
 {id:'trade',name:'Dealmaker',desc:'Complete a trade',n:function(s){ return [s.stats.traded||0,1]; }},
 {id:'dailies',name:'Regular',desc:'Finish 7 daily challenges',n:function(s){ return [s.stats.dailies||0,7]; }},
 {id:'rich',name:'Loaded',desc:'Earn $100,000 selling fish',n:function(s){ return [Math.min(100000,s.stats.earned||0),100000]; }},
 {id:'fourlines',name:'Four on the Floor',desc:'Own four lines',n:function(s){ return [s.gear.lines||1,4]; }}
];
function speciesCount(s){ return Object.keys(s.journal).filter(function(k){ return k.indexOf('legend:')!==0; }).length; }
function saltCaught(s){ return Object.keys(s.journal).some(function(k){ var sp=D.SP_BY_ID[k]; return sp&&Object.keys(sp.baits).some(function(b){ return D.BAIT_BY_ID[b].water==='salt'; }); }); }
G.checkAch=function(){ if(!G.s) return; var have=G.s.prefs.ach||[], got=[]; G.ACH.forEach(function(a){ var v=a.n(G.s); if(v[0]>=v[1]&&have.indexOf(a.id)<0) got.push(a.id); }); if(got.length){ G.prefs({ach:have.concat(got)}); got.forEach(function(id){ var a=G.ACH.filter(function(x){ return x.id===id; })[0]; G.queueToast('ACHIEVEMENT: '+a.name); }); } };

/* ---------- boot ---------- */
function showBoot(msg,retry){ $('bootOv').hidden=false; $('bootMsg').textContent=msg; $('bootRetry').hidden=!retry; }
function hideBoot(){ $('bootOv').hidden=true; }
var retryTimer=0;
function boot(){
  var id=N.loadId();
  if(!id){ hideBoot(); $('nameOv').hidden=false; setTimeout(function(){ $('nameIn').focus(); },50); return; }
  N.id=id; showBoot('Casting a line to the server...',false);
  N.rpc('login',{p_pid:id.pid,p_secret:id.secret,p_name:null}).then(function(s){ start(s); })
    .catch(function(e){ if(e.message==='bad name'){ hideBoot(); $('nameOv').hidden=false; return; }
      if(e.message==='banned'){ showBoot('This game has been locked by the admin.',false); return; }
      if(e.message==='not your game'){ showBoot('This device has a save that does not match the server. Paste your save code to continue.',false); N.clearId(); $('nameOv').hidden=false; return; }
      showBoot((e.offline?"Can't reach the One Cast server. Check your connection; some school networks block it.":e.message)+' Retrying...',true); clearTimeout(retryTimer); retryTimer=setTimeout(boot,8000); });
}
$('bootRetry').onclick=function(){ clearTimeout(retryTimer); boot(); };
function start(s){
  hideBoot(); $('nameOv').hidden=true;
  var cached=N.cached();
  G.apply(s); G.renderAlertBtn(); UI.crewTick(); UI.startCrewPoll();
  if(!loopStarted){ loopStarted=true; SC.init($('scene'),$('game')); SC.layout(); requestAnimationFrame(loop); window.addEventListener('resize',function(){ SC.layout(); }); }
  else SC.layout();
  N.listeners.push(function(on){ $('offline').hidden=on; });
  if(cached&&cached.at&&Date.now()-cached.at>20*60000&&cached.state&&cached.state.pid===s.pid) UI.welcomeBack(cached);
  G.checkAch();
  if(s.prefs.tut==null) G.prefs({tut:0});
  G.updateCoach();
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){ G.refresh(true); G.renderHUD(); } });
}
$('nameGo').onclick=function(){
  var n=$('nameIn').value.trim(), err=$('nameErr'); err.textContent='';
  if(!/^[A-Za-z0-9_]{2,16}$/.test(n)){ err.textContent='2 to 16 letters, numbers or _ please.'; return; }
  var id=N.id&&!G.s?N.id:N.newId(); N.saveId(id); $('nameGo').disabled=true;
  N.rpc('login',{p_pid:id.pid,p_secret:id.secret,p_name:n}).then(function(s){ $('nameGo').disabled=false; start(s); G.toast('Welcome, '+s.name+'#'+s.tag+'! Here is $50 to get you started. Your #tag is how friends find you.',5000,'good'); })
    .catch(function(e){ $('nameGo').disabled=false; err.textContent=e.message==='bad name'?"That name isn't allowed. Try another.":e.offline?"Can't reach the server. Try again in a moment.":e.message; });
};
$('nameIn').addEventListener('keydown',function(e){ if(e.key==='Enter') $('nameGo').click(); });
$('nameHaveCode').onclick=function(){ $('codeBox').hidden=!$('codeBox').hidden; };
$('codeGo').onclick=function(){ G.loadCode($('codeIn').value,$('nameErr')); };
G.loadCode=function(code,errEl){
  var id=N.parseCode(code); if(!id){ errEl.textContent="That doesn't look like a One Cast save code."; return; }
  N.rpc('get_state',{p_pid:id.pid,p_secret:id.secret}).then(function(s){ N.saveId(id); location.reload(); })
    .catch(function(e){ errEl.textContent=e.message==='no player'?'No game found for that code.':e.message==='not your game'?'That code is wrong.':e.offline?"Can't reach the server.":e.message; });
};
window.addEventListener('keydown',function(e){ if(e.key==='Escape') UI.closeAll(); });
boot();
})();

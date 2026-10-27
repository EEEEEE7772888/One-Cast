/* One Cast lure fishing: crankbaits and jigs are worked by hand instead of left to soak.
   Crankbait: hold to reel, keep the speed in the green. Jig: tap to hop it, fish hit on the fall.
   The server decides the fish and the strike time; a strike has to be answered within a few seconds.
   Crankbait fish then fight: keep them inside your green box until the catch meter fills (bigger fish are faster). */
(function(root){
'use strict';
var D=root.OC, G, $=function(id){ return document.getElementById(id); };
var L={active:false};
var st=null, raf=0;
D.LURES=['crank','jig'];
D.isLure=function(b){ return D.LURES.indexOf(b)>=0; };

var TIP={crank:'Hold to reel. Keep the speed in the green.',jig:'Tap to hop the jig. Fish hit it on the way down.'};
/* step-by-step help shown under the lure picture */
var HOW={
  crank:['<b>Hold</b> the button (or Space) to reel. Keep the <b style="color:#FFC94A">yellow mark</b> inside the <b style="color:#5CF08A">green</b> part of the bar at the top.',
         'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away to set the hook.',
         '<b>The fight:</b> hold to push your <b style="color:#5CF08A">green box</b> right, let go and it slides left. Keep the fish inside the box.',
         'While the fish is in the box the meter fills. Fill it to land the fish. If the meter runs empty, it gets away. <b>Faster fish are bigger, better fish.</b>'],
  jig:['<b>Tap</b> the button (or Space) to hop the jig up off the bottom.',
       'Then <b>wait</b> and let it sink. Fish only bite while it is <b>falling</b>, not while it goes up.',
       'Tap again every 1 to 3 seconds. Tapping too fast means it never falls; waiting too long leaves it lying on the bottom.',
       'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away. You have about 1 second.']
};
L.start=function(line){
  G=root.G; L.stop(true);
  st={line:line,idx:line.idx,bait:line.bait,bite:Date.parse(line.biteAt),dist:100,speed:0,speeds:[],holding:false,fight:null,h:0,lastTap:-99,tapCount:0,strikeAt:0,phase:'work',t:0,lastMsg:''};
  L.active=true; $('lureBox').hidden=false;
  $('lureName').textContent=line.bait==='crank'?'CRANKBAIT':'JIG';
  $('lureTip').textContent=TIP[line.bait];
  $('lureHow').innerHTML=HOW[line.bait].map(function(t){ return '<li>'+t+'</li>'; }).join(''); showHow(line.bait);
  setBtn(line.bait==='crank'?'HOLD TO REEL':'HOP',false);
  say('');
  var last=performance.now();
  function frame(now){ var dt=Math.min(0.05,(now-last)/1000); last=now; tick(dt); draw(); if(L.active) raf=requestAnimationFrame(frame); }
  raf=requestAnimationFrame(frame);
  G.renderPanel();
};
L.stop=function(silent){ L.active=false; cancelAnimationFrame(raf); if($('lureBox')) $('lureBox').hidden=true; st=null; if(!silent&&root.G) root.G.renderPanel(); };
/* the instructions can be closed with X (remembered per bait) and brought back with HOW TO PLAY */
function howKey(b){ return 'onecast.lureHowHidden.'+b; }
function showHow(b){ var hidden=false; try{ hidden=localStorage.getItem(howKey(b))==='1'; }catch(e){} $('lureHowBox').hidden=hidden; $('lureHowShow').hidden=!hidden; }
function setHow(hide){ if(!st) return; try{ localStorage.setItem(howKey(st.bait),hide?'1':'0'); }catch(e){} showHow(st.bait); }
function setBtn(t,strike){ var b=$('lureBtn'); b.textContent=t; b.classList.toggle('strike',!!strike); }
function say(t){ if(st&&t===st.lastMsg) return; if(st) st.lastMsg=t; $('lureMsg').textContent=t; }
function inZone(){ // is the lure doing what fish want right now?
  var nowS=st.t;
  if(st.bait==='crank'){ var recent=st.speeds.filter(function(s){ return nowS-s[0]<=1; }); if(!recent.length) return false;
    var avg=recent.reduce(function(a,s){ return a+s[1]; },0)/recent.length; return avg>=0.38&&avg<=0.72; }
  var since=nowS-st.lastTap; return since>=0.45&&since<=3&&st.h>0.02;
}
function tick(dt){
  if(!st) return; st.t+=dt; var now=root.NET.now();
  if(st.phase==='work'){
    if(st.bait==='crank'){
      st.speed=Math.max(0,Math.min(1,st.speed+(st.holding?1.1:-1.4)*dt));
      st.speeds.push([st.t,st.speed]); if(st.speeds.length>90) st.speeds.shift();
      st.dist-=st.speed*7*dt;
      say(st.speed<0.38?(st.holding?'':'Too slow. It is not wobbling.'):st.speed>0.72?'Too fast! Ease off.':'Nice and steady...');
    } else {
      st.h=Math.max(0,st.h-0.22*dt);
      var since=st.t-st.lastTap;
      say(since<0.45?'':st.h<=0.02&&since>2?'It is sitting on the bottom. Hop it!':since>3?'Hop it!':'Let it fall...');
    }
    if(now>=st.bite){ // a fish is there; does it bite?
      if(inZone()){ st.phase='strike'; st.strikeAt=st.t; setBtn('STRIKE! TAP!',true); say(''); if(root.NATIVE) root.NATIVE.buzz('bite'); }
      else if(now>st.bite+1500){ st.phase='done'; finish('A fish swiped at it and turned away. Keep the lure working right and cast again.'); return; }
    }
    if(st.phase==='work'&&st.dist<=0){ st.phase='done'; finish('Your lure came back with nothing. Cast again!'); }
  } else if(st.phase==='strike'){
    if(st.t-st.strikeAt>1.2){ st.phase='done'; finish('Too slow on the hook-set! It spit the lure.'); }
  } else if(st.phase==='fight') fightTick(dt);
}
/* ---- crankbait fight (Stardew style): keep the fish inside your green box until the meter is full ---- */
var TRACK=144;
function startFight(d){
  var zw=Math.round(48-16*d);
  st.fight={d:d,zw:zw,zx:Math.round((TRACK-zw)/2),zv:0,fx:TRACK/2,ftarget:TRACK/2,fnext:0,meter:0.3,t:0,inside:true};
  st.phase='fight'; st.holding=false; setBtn('HOLD TO PULL',false);
  $('lureName').textContent=d>0.7?'FISH ON! A MONSTER!':d>0.45?'FISH ON! A FIGHTER!':'FISH ON!';
  if(root.NATIVE) root.NATIVE.buzz(d>0.6?'big':'bite');
}
function fightTick(dt){
  var f=st.fight; f.t+=dt;
  // your box: pushed right while holding, slides left when you let go, bounces softly at the ends
  f.zv+=(st.holding?300:-300)*dt; f.zv=Math.max(-150,Math.min(150,f.zv)); f.zx+=f.zv*dt;
  if(f.zx<0){ f.zx=0; f.zv=-f.zv*0.3; } if(f.zx>TRACK-f.zw){ f.zx=TRACK-f.zw; f.zv=-f.zv*0.3; }
  // the fish: darts to new spots; better fish are faster and change direction more often
  f.fnext-=dt; if(f.fnext<=0){ var reach=20+TRACK*0.8*f.d; f.ftarget=Math.max(4,Math.min(TRACK-4,f.fx+(Math.random()*2-1)*reach)); if(Math.random()<0.15) f.ftarget=4+Math.random()*(TRACK-8); f.fnext=(0.5+Math.random()*1.3)*(1.2-0.5*f.d); }
  var spd=20+48*f.d, step=Math.max(-spd*dt,Math.min(spd*dt,f.ftarget-f.fx)); f.fx+=step+Math.sin(f.t*(9+18*f.d))*f.d*0.4;
  f.fx=Math.max(4,Math.min(TRACK-4,f.fx));
  f.inside=f.fx>=f.zx&&f.fx<=f.zx+f.zw;
  f.meter+=f.inside?(0.22-0.08*f.d)*dt:-(0.12+0.08*f.d)*dt; // tuned by simulation: small fish ~3s, monsters land ~1 in 4 for a good player
  say(f.inside?'Got it! Keep it in the green...':'It is getting away! Move the green box over it!');
  if(f.meter>=1){ st.phase='done'; var idx=st.idx; L.stop(true); root.G.sel=idx; root.G.reel(); return; }
  if(f.meter<=0||f.t>80){ st.phase='done'; finish('It got away! The fish shook the hook. Cast again.'); }
}
function finish(msg){ // clear the line on the server, then report
  var idx=st.idx; L.stop(true); G=root.G; G.sel=idx;
  root.NET.me('lure_lose',{p_idx:idx}).catch(function(){ return root.NET.me('reel_line',{p_idx:idx}).catch(function(){}); }).then(function(){ G.s.lines=G.s.lines.filter(function(x){ return x.idx!==idx; }); G.renderAll(); G.toast(msg,3200,'info'); });
}
function press(down){
  if(!st) return;
  if(st.phase==='strike'){ if(!down) return; var idx=st.idx;
    if(st.bait!=='crank'){ st.phase='done'; L.stop(true); root.G.sel=idx; root.G.reel(); return; }
    st.phase='setting'; setBtn('...',false);
    root.NET.me('lure_strike',{p_idx:idx}).then(function(r){ if(!st||st.idx!==idx) return;
      if(r.result==='fight') startFight(+r.difficulty||0.4); else { st.phase='done'; finish('Too slow on the hook-set! It spit the lure.'); } })
      .catch(function(e){ if(!st||st.idx!==idx) return; // server not updated yet: land it the old way
        st.phase='done'; L.stop(true); root.G.sel=idx; root.G.reel(); });
    return; }
  if(st.phase==='fight'){ st.holding=down; return; }
  if(st.phase!=='work') return;
  if(st.bait==='crank'){ st.holding=down; return; }
  if(down){ st.h=Math.min(1,st.h+0.32); st.lastTap=st.t; st.dist-=4; }
}
function drawFight(x,W,H){
  var f=st.fight, ox=8, ty=12, th=14;
  x.fillStyle='#0D2A4A'; x.fillRect(0,0,W,H); for(var y=0;y<H;y+=2){ x.fillStyle='rgba(95,178,207,'+(0.05+0.08*(1-y/H))+')'; x.fillRect(0,y,W,1); }
  // track
  x.fillStyle='#071530'; x.fillRect(ox-2,ty-2,TRACK+4,th+4); x.fillStyle='#13234A'; x.fillRect(ox,ty,TRACK,th);
  // your green box
  var zx=Math.round(ox+f.zx); x.fillStyle=f.inside?'#5CF08A':'#2E7D3A'; x.fillRect(zx,ty,f.zw,th); x.fillStyle='rgba(255,255,255,0.35)'; x.fillRect(zx,ty,f.zw,2);
  // the fish (colour by how good it is)
  var col=f.d>0.7?'#FF4D6D':f.d>0.45?'#FF9F3A':'#B8F6FF', fx=Math.round(ox+f.fx), fy=ty+th/2-3+Math.round(Math.sin(f.t*12)*f.d*1.5);
  root.ART.drawSprite(x,['..kk....','.kCCk.k.','kCwCCkCk','kCCCCCk.','.kCCk.k.','..kk....'],{k:'#050B1C',C:col,w:'#FFFFFF'},fx-4,fy);
  // catch meter
  var my=H-12; x.fillStyle='#071530'; x.fillRect(ox-2,my-2,TRACK+4,8); x.fillStyle=f.meter>0.6?'#5CF08A':f.meter>0.3?'#FFC94A':'#FF4D6D'; x.fillRect(ox,my,Math.round(TRACK*Math.max(0,Math.min(1,f.meter))),4);
  x.fillStyle='#93B2D2'; x.font='6px monospace'; x.fillText('CATCH',ox,my-4);
  $('lureDist').style.width=Math.round(f.meter*100)+'%';
}
function draw(){
  if(!st) return; var c=$('lureCanvas'), x=c.getContext('2d'), W=c.width, H=c.height; x.imageSmoothingEnabled=false;
  if(st.phase==='fight'&&st.fight){ drawFight(x,W,H); return; }
  x.fillStyle='#0D2A4A'; x.fillRect(0,0,W,H);
  for(var y=0;y<H;y+=2){ x.fillStyle='rgba(95,178,207,'+(0.05+0.08*(1-y/H))+')'; x.fillRect(0,y,W,1); }
  x.fillStyle='#3A2A1C'; x.fillRect(0,H-6,W,6); // bottom
  var px=Math.round(8+(W-24)*(st.dist/100)), py;
  if(st.bait==='crank'){
    py=Math.round(H*0.35+st.speed*(H*0.35)); // faster dives deeper
    // speed meter
    var mx=6,my=4,mw=W-12; x.fillStyle='#13234A'; x.fillRect(mx,my,mw,6);
    x.fillStyle='#2E7D3A'; x.fillRect(mx+Math.round(mw*0.38),my,Math.round(mw*0.34),6);
    x.fillStyle='#FFC94A'; x.fillRect(mx+Math.round(mw*st.speed)-1,my-1,3,8);
  } else {
    py=Math.round((H-10)-st.h*(H-22));
  }
  x.strokeStyle='rgba(234,245,255,0.6)'; x.beginPath(); x.moveTo(W,0); x.lineTo(px+4,py); x.stroke();
  var art=root.ART.BAIT_ART[st.bait]; root.ART.drawSprite(x,art.rows,art.map,px-4,py-4);
  if(st.phase==='strike'&&Math.floor(st.t*8)%2===0){ x.fillStyle='#FFF2B0'; x.fillRect(px-7,py-1,3,3); x.fillRect(px+9,py-1,3,3); x.fillRect(px+1,py-8,3,3); }
  $('lureDist').style.width=Math.max(0,st.dist)+'%';
}
function bind(){
  var b=$('lureBtn');
  b.addEventListener('pointerdown',function(e){ e.preventDefault(); press(true); });
  b.addEventListener('pointerup',function(){ press(false); }); b.addEventListener('pointerleave',function(){ press(false); }); b.addEventListener('pointercancel',function(){ press(false); });
  window.addEventListener('keydown',function(e){ if(L.active&&(e.code==='Space'||e.key===' ')){ e.preventDefault(); if(!e.repeat) press(true); } });
  window.addEventListener('keyup',function(e){ if(L.active&&(e.code==='Space'||e.key===' ')) press(false); });
  $('lureHowX').onclick=function(){ setHow(true); }; $('lureHowShow').onclick=function(){ setHow(false); };
  $('lureQuit').onclick=function(){ if(!st) return; st.phase='done'; finish('You reeled the lure in.'); };
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
L._state=function(){ return st&&{fight:st.fight&&{d:st.fight.d,meter:+st.fight.meter.toFixed(2),inside:st.fight.inside,fx:Math.round(st.fight.fx),zx:Math.round(st.fight.zx),zw:st.fight.zw},phase:st.phase,t:+st.t.toFixed(1),dist:+st.dist.toFixed(1),speed:+st.speed.toFixed(2),toBite:Math.round((st.bite-root.NET.now())/100)/10}; };
root.LURE=L;
})(typeof window!=='undefined'?window:this);

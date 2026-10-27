/* One Cast lure fishing: crankbaits and jigs are worked by hand instead of left to soak.
   Crankbait: hold to reel, keep the speed in the green. Jig: tap to hop it, fish hit on the fall.
   The server decides the fish and the strike time; a strike has to be answered within a few seconds. */
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
  crank:['<b>Hold</b> the button (or Space) to reel. Let go to slow down.',
         'Keep the <b style="color:#FFC94A">yellow mark</b> inside the <b style="color:#5CF08A">green</b> part of the bar at the top. Too slow and it stops wobbling, too fast and fish ignore it.',
         'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away. You have about 1 second.',
         'The blue bar is how far away your lure is. If it reaches you with no bite, cast again.'],
  jig:['<b>Tap</b> the button (or Space) to hop the jig up off the bottom.',
       'Then <b>wait</b> and let it sink. Fish only bite while it is <b>falling</b>, not while it goes up.',
       'Tap again every 1 to 3 seconds. Tapping too fast means it never falls; waiting too long leaves it lying on the bottom.',
       'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away. You have about 1 second.']
};
L.start=function(line){
  G=root.G; L.stop(true);
  st={line:line,idx:line.idx,bait:line.bait,bite:Date.parse(line.biteAt),dist:100,speed:0,speeds:[],holding:false,h:0,lastTap:-99,tapCount:0,strikeAt:0,phase:'work',t:0,lastMsg:''};
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
  }
}
function finish(msg){ // clear the line on the server, then report
  var idx=st.idx; L.stop(true); G=root.G; G.sel=idx;
  root.NET.me('reel_line',{p_idx:idx}).catch(function(){}).then(function(){ G.s.lines=G.s.lines.filter(function(x){ return x.idx!==idx; }); G.renderAll(); G.toast(msg,3200,'info'); });
}
function press(down){
  if(!st) return;
  if(st.phase==='strike'){ if(down){ st.phase='done'; var idx=st.idx; L.stop(true); root.G.sel=idx; root.G.reel(); } return; }
  if(st.phase!=='work') return;
  if(st.bait==='crank'){ st.holding=down; return; }
  if(down){ st.h=Math.min(1,st.h+0.32); st.lastTap=st.t; st.dist-=4; }
}
function draw(){
  if(!st) return; var c=$('lureCanvas'), x=c.getContext('2d'), W=c.width, H=c.height; x.imageSmoothingEnabled=false;
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
L._state=function(){ return st&&{phase:st.phase,t:+st.t.toFixed(1),dist:+st.dist.toFixed(1),speed:+st.speed.toFixed(2),toBite:Math.round((st.bite-root.NET.now())/100)/10}; };
root.LURE=L;
})(typeof window!=='undefined'?window:this);

/* One Cast lure fishing: crankbaits and jigs are worked by hand instead of left to soak.
   Crankbait: hold to reel, keep the speed in the green. Jig: tap to hop it, fish hit on the fall.
   The server decides the fish and the strike time; a strike has to be answered within a few seconds.
   Jerkbait: twitch it twice, then pause; fish hit on the pause.
   Crankbait and jerkbait fish then fight: keep them inside your green box until the catch meter fills (bigger fish are faster).
   Hard lures can snag: PULL to try to work it free, or it breaks off and the lure is gone.
   Every lure has a play style (D.BAITS[].play), and new lures reuse one:
   top (poppers, frogs): pop, let the rings settle, pop again. walk (stickbaits): tap in a steady rhythm.
   buzz (buzzbaits): hold to reel fast on the surface. Topwater fish blow up on the lure: WAIT a heartbeat, then set. */
(function(root){
'use strict';
var D=root.OC, G, $=function(id){ return document.getElementById(id); };
var L={active:false};
var st=null, raf=0;
D.LURES=D.BAITS.filter(function(b){ return b.play; }).map(function(b){ return b.id; });
D.playOf=function(b){ var x=D.BAIT_BY_ID[b]; return x&&x.play||null; };
var FIGHTS={crank:1,jerk:1,top:1,walk:1,buzz:1}, TOPWATER={top:1,walk:1,buzz:1},
    SNAG_ON={crank:'a sunken log',jig:'the rocks',jerk:'the weeds',top:'the lily pads',walk:'a stump',buzz:'a branch'},
    BTN={crank:'HOLD TO REEL',buzz:'HOLD TO REEL',fly:'MEND',jerk:'TWITCH',jig:'HOP',top:'POP',walk:'WALK'};
D.isLure=function(b){ return D.LURES.indexOf(b)>=0; };

var TIP={jerk:'Twitch it twice, then pause. Fish hit it on the pause.',crank:'Hold to reel. Keep the speed in the green.',jig:'Tap to hop it. Fish hit it on the way down.',fly:'Let the fly drift. Mend when the line drags. Set gently when a trout rises.',
  top:'Pop it, let the rings settle, pop again. When a fish blows up on it: WAIT, then set.',walk:'Tap in a steady rhythm to walk it side to side. Blow-up? WAIT, then set.',buzz:'Hold to reel FAST so it buzzes on top. Blow-up? WAIT, then set.'};
var WAITSET='<b>Topwater rule:</b> when a fish <b style="color:#FF8A8D">BLOWS UP</b> on it, the button says <b>WAIT...</b>. Don\'t tap yet! When it says <b style="color:#FF8A8D">SET IT!</b>, tap right away. Tap too early and you pull the lure out of its mouth.';
/* step-by-step help shown under the lure picture */
var HOW={
  crank:['<b>Hold</b> the button (or Space) to reel. Keep the <b style="color:#FFC94A">yellow mark</b> inside the <b style="color:#5CF08A">green</b> part of the bar at the top.',
         'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away to set the hook.',
         '<b>The fight:</b> hold to push your <b style="color:#5CF08A">green box</b> right, let go and it slides left. Keep the fish inside the box.',
         'While the fish is in the box the meter fills. Fill it to land the fish. If the meter runs empty, it gets away. <b>Faster fish are bigger, better fish.</b>',
         '<b>Snags:</b> sometimes the lure hangs up on a log. Tap <b>PULL IT FREE</b> to try to save it (about 1 in 3 works). If not, it breaks off and is gone.'],
  jig:['<b>Tap</b> the button (or Space) to hop the jig up off the bottom.',
       'Then <b>wait</b> and let it sink. Fish only bite while it is <b>falling</b>, not while it goes up.',
       'Tap again every 1 to 3 seconds. Tapping too fast means it never falls; waiting too long leaves it lying on the bottom.',
       'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap it right away. You have about 1 second.',
       '<b>Snags:</b> jigs live on the bottom, so they snag the most. Tap <b>PULL IT FREE</b> to try to save it (about 1 in 3 works). If not, it breaks off and is gone.'],
  jerk:['<b>Tap twice quickly</b> (or Space twice) to twitch the jerkbait: it darts like a hurt baitfish.',
        'Then <b>pause</b>. A jerkbait just hangs there, and that is when fish smash it. Wait about 1 to 2 seconds, then twitch-twitch again.',
        'One twitch alone, or twitching nonstop, does not fool them. It has to be <b>twitch, twitch, pause</b>.',
        'When the button flashes <b style="color:#FF8A8D">STRIKE! TAP!</b>, tap right away. Then fight it like a crankbait fish: keep it in your <b style="color:#5CF08A">green box</b>.',
        '<b>Snags:</b> sometimes the lure hangs up. Tap <b>PULL IT FREE</b> to try to save it (about 1 in 3 works). If not, it breaks off and is gone.'],
  top:['<b>Tap</b> to <b>POP</b> it: it spits water and makes rings, like a frog or a hurt baitfish.',
       'Then <b>wait</b> for the rings to settle (1 to 4 seconds) and pop it again. Popping nonstop scares them.',
       WAITSET,
       'Then fight it: keep it in your <b style="color:#5CF08A">green box</b> until the meter fills.'],
  walk:['<b>Tap in a steady rhythm</b>, about twice a second, like a clock: tap... tap... tap...',
        'Each tap kicks the lure to the other side, so it <b>walks the dog</b> back and forth across the top. A steady beat looks alive; a messy one does not.',
        WAITSET,
        'Then fight it: keep it in your <b style="color:#5CF08A">green box</b> until the meter fills.'],
  buzz:['<b>Hold</b> to reel. A buzzbait has to go <b>fast</b> so its blade churns on top. Keep the <b style="color:#FFC94A">yellow mark</b> in the <b style="color:#5CF08A">green</b>, near the right side.',
        'Too slow and it sinks and stops buzzing.',
        WAITSET,
        'Then fight it: keep it in your <b style="color:#5CF08A">green box</b> until the meter fills.'],
  fly:['Your fly floats down the stream on its own. Just <b>let it drift</b> and enjoy the water.',
       'The current slowly pulls on your line. When the <b style="color:#FFC94A">DRAG</b> bar fills up, tap <b>MEND</b> to flip some slack upstream.',
       'Trout only rise to a fly that drifts naturally, so keep the drag low. Watch for a shadow under your fly...',
       'When a trout <b style="color:#9FE0FF">sips</b> your fly, tap <b>SET</b>. No rush, you have a moment.']
};
L.start=function(line){
  G=root.G; L.stop(true);
  var play=D.playOf(line.bait)||'jig';
  st={line:line,idx:line.idx,bait:line.bait,play:play,side:1,pop:0,blowT:0,bite:Date.parse(line.biteAt),snag:line.snagAt?Date.parse(line.snagAt):0,taps:[],jx:0,dist:100,speed:0,speeds:[],holding:false,fight:null,drag:0.1,mendAt:-9,rings:[],refusedAt:0,h:0,lastTap:-99,tapCount:0,strikeAt:0,phase:'work',t:0,lastMsg:''};
  L.active=true; $('lureBox').hidden=false;
  var bn=D.BAIT_BY_ID[line.bait]; $('lureName').textContent=line.bait==='fly'?'DRY FLY':bn.name.toUpperCase().replace(/S$/,'');
  $('lureBox').classList.toggle('fly',play==='fly');
  $('lureTip').textContent=TIP[play];
  $('lureHow').innerHTML=HOW[play].map(function(t){ return '<li>'+t+'</li>'; }).join(''); showHow(play);
  setBtn(BTN[play],false);
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
function setHow(hide){ if(!st) return; try{ localStorage.setItem(howKey(st.play),hide?'1':'0'); }catch(e){} showHow(st.play); }
function setBtn(t,strike){ var b=$('lureBtn'); b.textContent=t; b.classList.toggle('strike',!!strike); }
function say(t){ if(st&&t===st.lastMsg) return; if(st) st.lastMsg=t; $('lureMsg').textContent=t; }
function inZone(){ // is the lure doing what fish want right now?
  var nowS=st.t;
  if(st.play==='crank'||st.play==='buzz'){ var recent=st.speeds.filter(function(s){ return nowS-s[0]<=1; }); if(!recent.length) return false;
    var avg=recent.reduce(function(a,s){ return a+s[1]; },0)/recent.length, band=SPEED[st.play]; return avg>=band[0]&&avg<=band[1]; }
  if(st.play==='top'){ var k=st.taps.length; if(!k) return false; var sn=nowS-st.taps[k-1]; return sn>=0.9&&sn<=4&&(k<2||st.taps[k-1]-st.taps[k-2]>=0.9); }
  if(st.play==='walk') return walkGood();
  if(st.play==='jerk'){ var n=st.taps.length; if(n<2) return false; var gap=st.taps[n-1]-st.taps[n-2], pause=nowS-st.taps[n-1], before=n>=3?st.taps[n-2]-st.taps[n-3]:9;
    return gap<=0.8&&before>0.8&&pause>=0.5&&pause<=2.6; } // twitch-twitch (not three in a row), then a pause
  var since=nowS-st.lastTap; return since>=0.45&&since<=3&&st.h>0.02;
}
var SPEED={crank:[0.38,0.72],buzz:[0.6,0.95]};
function walkGood(){ var t=st.taps, k=t.length; if(k<4||st.t-t[k-1]>0.9) return false; var g=[t[k-1]-t[k-2],t[k-2]-t[k-3],t[k-3]-t[k-4]];
  return g.every(function(x){ return x>=0.3&&x<=0.8; })&&Math.max.apply(null,g)-Math.min.apply(null,g)<=0.25; }
function tick(dt){
  if(!st) return; st.t+=dt; var now=root.NET.now();
  if(st.phase==='work'){
    if(st.play==='fly'){ flyTick(dt,now); return; }
    if(st.snag&&now>=st.snag){ st.phase='snag'; st.snagT=st.t; setBtn('PULL IT FREE',true); say('SNAGGED on '+SNAG_ON[st.play]+'! Pull to try to work it free.'); if(root.NATIVE) root.NATIVE.buzz('bite'); return; }
    st.pop=Math.max(0,st.pop-dt*2.5); st.rings=st.rings.filter(function(r){ return st.t-r.t<2.2; });
    if(st.play==='crank'||st.play==='buzz'){
      st.speed=Math.max(0,Math.min(1,st.speed+(st.holding?1.1:-1.4)*dt));
      st.speeds.push([st.t,st.speed]); if(st.speeds.length>90) st.speeds.shift();
      st.dist-=st.speed*7*dt;
      var bd=SPEED[st.play];
      if(st.play==='buzz') say(st.speed<bd[0]?(st.holding?'Faster...':'Too slow! It is sinking. Hold to reel.'):st.speed>bd[1]?'Whoa, too fast!':'Buzz buzz buzz... perfect.');
      else say(st.speed<bd[0]?(st.holding?'':'Too slow. It is not wobbling.'):st.speed>bd[1]?'Too fast! Ease off.':'Nice and steady...');
    } else if(st.play==='top'){
      st.dist-=dt*0.6; var tk=st.taps.length, sn=tk?st.t-st.taps[tk-1]:99;
      say(!tk?'Pop it!':tk>=2&&st.taps[tk-1]-st.taps[tk-2]<0.9&&sn<0.9?'Too fast! Let the rings settle between pops.':sn<0.9?'':sn<=4?'Let the rings settle...':'Pop it again!');
    } else if(st.play==='walk'){
      st.dist-=dt*0.3; var wk=st.taps.length;
      say(wk&&st.t-st.taps[wk-1]>0.9?'Keep tapping! Tap... tap... tap...':walkGood()?'Walking the dog... keep that beat!':wk<4?'Steady taps, like a clock.':'Keep the beat even, about twice a second.');
    } else if(st.play==='jerk'){
      st.jx=Math.max(0,st.jx-dt*3); st.dist-=dt*0.5; // a suspending jerkbait barely drifts on its own
      var tn=st.taps.length, pz=tn?st.t-st.taps[tn-1]:99;
      say(pz<0.5?'':tn>=2&&st.taps[tn-1]-st.taps[tn-2]<=0.8&&!(tn>=3&&st.taps[tn-2]-st.taps[tn-3]<=0.8)?(pz<=2.6?'Pause... let it hang there...':'Twitch-twitch again!'):pz>2.6?'Twitch it twice, quick!':'Twice quick, then pause.');
    } else {
      st.h=Math.max(0,st.h-0.22*dt);
      var since=st.t-st.lastTap;
      say(since<0.45?'':st.h<=0.02&&since>2?'It is sitting on the bottom. Hop it!':since>3?'Hop it!':'Let it fall...');
    }
    if(now>=st.bite){ // a fish is there; does it bite?
      if(inZone()&&TOPWATER[st.play]){ st.phase='blowup'; st.blowT=st.t; st.rings.push({t:st.t,big:true}); setBtn('WAIT...',false); say('BLOW-UP! Wait for it...'); if(root.NATIVE) root.NATIVE.buzz('big'); }
      else if(inZone()){ st.phase='strike'; st.strikeAt=st.t; setBtn('STRIKE! TAP!',true); say(''); if(root.NATIVE) root.NATIVE.buzz('bite'); }
      else if(now>st.bite+1500){ st.phase='done'; finish('A fish swiped at it and turned away. Keep the lure working right and cast again.'); return; }
    }
    if(st.phase==='work'&&st.dist<=0){ st.phase='done'; finish('Your lure came back with nothing. Cast again!'); }
  } else if(st.phase==='blowup'){
    if(st.t-st.blowT>=0.6){ st.phase='strike'; st.strikeAt=st.t; setBtn('SET IT!',true); say('NOW! Set the hook!'); if(root.NATIVE) root.NATIVE.buzz('bite'); }
  } else if(st.phase==='strike'){
    if(st.play==='fly'){ if(st.t-st.strikeAt>1.4){ st.phase='done'; finish('The trout let go of the fly. They are gentle, so set a little sooner next time.'); } return; }
    if(st.t-st.strikeAt>1.2){ st.phase='done'; finish('Too slow on the hook-set! It spit the lure.'); }
  } else if(st.phase==='fight') fightTick(dt);
  else if(st.phase==='snag'){ if(st.t-st.snagT>8){ snagDone(false); } }
}
/* ---- dry fly: a slow, cozy drift. The current builds drag on the line; MEND resets it. Trout rise only to a natural drift. ---- */
function flyTick(dt,now){
  st.dist-=dt*100/34; // about 34 seconds to drift through the run
  st.drag=Math.min(1,st.drag+dt*(0.055+0.035*Math.sin(st.t*0.7)+0.02*Math.sin(st.t*2.3)));
  st.rings=st.rings.filter(function(r){ return st.t-r.t<2.2; });
  if(Math.random()<dt*0.5) st.rings.push({t:st.t,x:10+Math.random()*140,small:true}); // little rises out in the stream, just for looks
  var toBite=st.bite-now;
  if(toBite<=0){
    if(st.drag<0.72){ st.phase='strike'; st.strikeAt=st.t; st.rings.push({t:st.t,x:flyX(),small:false}); setBtn('SET',true); say('A trout sips your fly...'); if(root.NATIVE) root.NATIVE.buzz('bite'); return; }
    if(!st.refusedAt){ st.refusedAt=st.t; say('A trout comes up for a look... the line is dragging. MEND!'); }
    if(now>st.bite+2500){ st.phase='done'; finish('The trout turned away from the dragging fly. Mend a little sooner and cast again.'); return; }
  } else if(toBite<2600) say('A shadow is moving under your fly...');
  else say(st.drag>0.72?'The line is dragging the fly. Tap MEND.':st.drag>0.5?'The current is starting to pull...':st.t-st.mendAt<1.2?'Nice mend.':'Let it drift...');
  if(st.dist<=0){ st.phase='done'; finish('Your fly drifted through the run without a take. Cast again, the trout are still there.'); }
}
function flyX(){ return Math.round(8+(144)*(1-st.dist/100)); }
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
  root.NET.me('lure_lose',{p_idx:idx}).catch(function(){ return root.NET.me('reel_line',{p_idx:idx}).catch(function(){}); }).then(function(r){ if(r&&r.gear){ G.s.gear=r.gear; G.s.baits=r.baits; G.keepBaitOwned(); } G.s.lines=G.s.lines.filter(function(x){ return x.idx!==idx; }); G.renderAll(); G.toast(msg,3200,'info'); });
}
/* a snag: pull (about 1 in 3 comes free) or let it break off */
function snagDone(pull){
  if(!st||st.phase!=='snag') return; var idx=st.idx, name=root.OC.BAIT_BY_ID[st.bait].name.toLowerCase().replace(/s$/,''); st.phase='pulling'; setBtn('PULLING...',false); say('Pulling...');
  root.NET.me('lure_snag',{p_idx:idx,p_pull:!!pull}).then(function(r){ L.stop(true); G=root.G; G.sel=idx; if(r.gear){ G.s.gear=r.gear; G.s.baits=r.baits; G.keepBaitOwned(); }
    G.s.lines=G.s.lines.filter(function(x){ return x.idx!==idx; }); G.renderAll();
    G.toast(r.result==='freed'?'POP! You pulled it free. Your '+name+' is saved.':'SNAP! The line broke. Your '+name+' is gone.'+(G.lureCount(r.bait)?' You have '+G.lureCount(r.bait)+' more.':' That was your last one.'),3600,r.result==='freed'?'good':'info'); })
    .catch(function(e){ L.stop(true); root.G.fail(e); root.G.refresh(true); });
}
function press(down){
  if(!st) return;
  if(st.phase==='strike'){ if(!down) return; var idx=st.idx;
    if(!FIGHTS[st.play]){ st.phase='done'; L.stop(true); root.G.sel=idx; root.G.reel(); return; }
    st.phase='setting'; setBtn('...',false);
    root.NET.me('lure_strike',{p_idx:idx}).then(function(r){ if(!st||st.idx!==idx) return;
      if(r.result==='fight') startFight(+r.difficulty||0.4); else { st.phase='done'; finish('Too slow on the hook-set! It spit the lure.'); } })
      .catch(function(e){ if(!st||st.idx!==idx) return; // server not updated yet: land it the old way
        st.phase='done'; L.stop(true); root.G.sel=idx; root.G.reel(); });
    return; }
  if(st.phase==='blowup'){ if(down&&st.t-st.blowT>=0.25){ st.phase='done'; finish('Too early! You pulled it right out of its mouth. With topwater, WAIT until it says SET IT.'); } return; }
  if(st.phase==='fight'){ st.holding=down; return; }
  if(st.phase==='snag'){ if(down) snagDone(true); return; }
  if(st.phase!=='work') return;
  if(st.play==='fly'){ if(down){ st.drag=Math.max(0,st.drag-0.62); st.mendAt=st.t; } return; }
  if(st.play==='crank'||st.play==='buzz'){ st.holding=down; return; }
  if(st.play==='top'){ if(down){ st.taps.push(st.t); if(st.taps.length>6) st.taps.shift(); st.pop=1; st.rings.push({t:st.t}); st.dist-=3; } return; }
  if(st.play==='walk'){ if(down){ st.taps.push(st.t); if(st.taps.length>8) st.taps.shift(); st.side=-st.side; st.dist-=1.6; } return; }
  if(st.play==='jerk'){ if(down){ st.taps.push(st.t); if(st.taps.length>6) st.taps.shift(); st.jx=1; st.dist-=2; } return; }
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
function drawFly(x,W,H){
  var t=st.t, sy=18; // water surface row
  // autumn bank and sky
  x.fillStyle='#F2C88A'; x.fillRect(0,0,W,sy); for(var i=0;i<W;i+=3){ var h=4+Math.round(3*Math.sin(i*0.21)+2*Math.sin(i*0.07)); x.fillStyle=['#C8602A','#E0A040','#B8402A','#7A9A3A'][Math.floor(i/9)%4]; x.fillRect(i,sy-h-3,3,h); }
  x.fillStyle='#5A4A3A'; x.fillRect(0,sy-3,W,3);
  // clear stream with pebbles
  for(var y=sy;y<H;y++){ var k=(y-sy)/(H-sy); x.fillStyle='rgb('+Math.round(58+20*(1-k))+','+Math.round(122+30*(1-k))+','+Math.round(118+20*(1-k))+')'; x.fillRect(0,y,W,1); }
  for(i=0;i<46;i++){ var px=Math.floor((i*37.7)%W), py=H-3-Math.floor((i*13)%7); x.fillStyle=['#8A7A5A','#6A6A5A','#A08A6A','#5A6A4A'][i%4]; x.fillRect(px,py,2+(i%3),2); }
  // current lines drifting right
  x.fillStyle='rgba(230,248,255,0.35)'; for(i=0;i<14;i++){ var cx=Math.floor((i*29+t*18*(1+(i%3)*0.3))%(W+20))-10, cy=sy+3+((i*7)%(H-sy-10)); x.fillRect(cx,cy,6+(i%4)*2,1); }
  x.fillStyle='rgba(240,250,255,0.6)'; x.fillRect(0,sy,W,1);
  // rise rings
  st.rings.forEach(function(r){ var a=(t-r.t)/2.2, rad=Math.round((r.small?3:6)+a*(r.small?6:12)); x.strokeStyle='rgba(235,250,255,'+(0.7*(1-a)).toFixed(2)+')'; x.beginPath(); x.ellipse(r.x+(t-r.t)*6,sy+1,rad,Math.max(1,rad/4),0,0,Math.PI*2); x.stroke(); });
  // the trout coming up under the fly before it bites
  var fxp=flyX(), toBite=st.bite-root.NET.now();
  if(st.phase==='work'&&toBite<2600&&toBite>-2500){ var up=Math.max(0,Math.min(1,1-toBite/2600)); x.globalAlpha=0.35+0.3*up; root.ART.drawSprite(x,['...kk.....','.kkkkkk.kk','kkkkkkkkk.','.kkkkkk.kk','...kk.....'],{k:'#1A3A3A'},fxp-12,Math.round(H-10-(H-sy-12)*up)); x.globalAlpha=1; }
  // fly line from the rod (upper left); taut and straight when dragging, a soft upstream belly after a mend
  var sag=Math.max(0,1-st.drag)*10; x.strokeStyle='rgba(255,236,170,0.85)'; x.beginPath(); x.moveTo(0,2); x.quadraticCurveTo(fxp*0.45,sy-2+sag,fxp-2,sy); x.stroke();
  if(st.drag>0.72&&st.phase==='work'){ x.strokeStyle='rgba(240,250,255,0.7)'; x.beginPath(); x.moveTo(fxp-1,sy+1); x.lineTo(fxp-10,sy+4); x.moveTo(fxp-1,sy+1); x.lineTo(fxp-10,sy-1); x.stroke(); }
  var art=root.ART.BAIT_ART.fly; root.ART.drawSprite(x,art.rows,art.map,fxp-4,sy-6+Math.round(Math.sin(t*3)*0.6));
  if(st.phase==='strike'&&Math.floor(t*6)%2===0){ x.fillStyle='rgba(255,255,255,0.9)'; x.fillRect(fxp-6,sy-1,2,2); x.fillRect(fxp+6,sy-1,2,2); }
  // drag meter
  var mx=W-58, my=3, mw=52; x.fillStyle='rgba(20,30,40,0.6)'; x.fillRect(mx-1,my-1,mw+2,7); x.fillStyle=st.drag>0.72?'#E5484D':st.drag>0.5?'#FFC94A':'#5CF08A'; x.fillRect(mx,my,Math.round(mw*st.drag),5);
  x.fillStyle='#3A2A1A'; x.font='6px monospace'; x.fillText('DRAG',mx-22,my+5);
  $('lureDist').style.width=Math.max(0,st.dist)+'%';
}
/* topwater: the lure sits on the surface; pops make rings, a buzzbait throws spray, a blow-up is a big splash */
function drawTop(x,W,H){
  var sy=16, t=st.t, i;
  x.fillStyle='#2A3E5E'; x.fillRect(0,0,W,sy); x.fillStyle='#3A5476'; x.fillRect(0,sy-5,W,5);
  for(i=0;i<W;i+=7){ x.fillStyle='#22362A'; x.fillRect(i,sy-3-((i*13)%4),5,3+((i*13)%4)); } // far shore
  for(var y=sy;y<H;y++){ var k=(y-sy)/(H-sy); x.fillStyle='rgb('+Math.round(20+18*(1-k))+','+Math.round(52+40*(1-k))+','+Math.round(82+40*(1-k))+')'; x.fillRect(0,y,W,1); }
  if(st.play==='top'&&st.bait==='frog'){ for(i=0;i<9;i++){ var lx=Math.floor((i*41.3)%W), lw=8+(i%3)*3; x.fillStyle='#3A7A3A'; x.fillRect(lx,sy,lw,2); x.fillStyle='#2A5A2A'; x.fillRect(lx+2,sy,1,1); } }
  x.fillStyle='rgba(230,245,255,0.55)'; x.fillRect(0,sy,W,1);
  var px=Math.round(8+(W-24)*(st.dist/100)), py=sy-5;
  if(st.play==='walk') px+=st.side*3;
  if(st.play==='top') py-=Math.round(st.pop*2);
  st.rings.forEach(function(r){ var a=(t-r.t)/2.2, rad=Math.round((r.big?7:3)+a*(r.big?16:10)); x.strokeStyle='rgba(235,250,255,'+(0.75*(1-a)).toFixed(2)+')'; x.beginPath(); x.ellipse(px+4,sy+1,rad,Math.max(1,rad/4),0,0,Math.PI*2); x.stroke(); });
  if(st.play==='buzz'&&st.speed>0.3){ for(i=0;i<6;i++){ x.fillStyle='rgba(240,250,255,'+(0.4+0.4*Math.random()).toFixed(2)+')'; x.fillRect(px+8+i*2+Math.round(Math.random()*2),sy-1-Math.round(Math.random()*3*st.speed),1,1); } }
  if(st.play==='top'&&st.pop>0.4){ x.fillStyle='rgba(240,250,255,0.85)'; x.fillRect(px-3,sy-4,2,2); x.fillRect(px-5,sy-2,2,1); x.fillRect(px-2,sy-7,1,2); }
  x.strokeStyle='rgba(234,245,255,0.6)'; x.beginPath(); x.moveTo(W,0); x.lineTo(px+7,py+3); x.stroke();
  var art=root.ART.BAIT_ART[st.bait]; root.ART.drawSprite(x,art.rows,art.map,px,py);
  if(st.phase==='blowup'||(st.phase==='strike'&&st.t-st.strikeAt<0.6)){ // the fish crashes it: spray everywhere and a big mouth
    var g=Math.min(1,(t-st.blowT)/0.3); x.fillStyle='rgba(245,252,255,0.9)';
    for(i=0;i<14;i++){ var an=i/14*Math.PI, rr=4+g*9+(i%3); x.fillRect(px+4+Math.round(Math.cos(an)*rr),sy-Math.round(Math.sin(an)*rr*0.9),2,2); }
    root.ART.drawSprite(x,['.kkk....','kkkkkk.k','kwkkkkkk','kkkkkk.k','.kkk....'],{k:'#1A2A20',w:'#F0F0F0'},px-2,sy+1);
  }
  if(st.phase==='strike'&&Math.floor(t*8)%2===0){ x.fillStyle='#FFF2B0'; x.fillRect(px-6,py,3,3); x.fillRect(px+11,py,3,3); }
  if(st.play==='buzz'){ var mx=6,my=H-8,mw=W-12; x.fillStyle='#13234A'; x.fillRect(mx,my,mw,5); x.fillStyle='#2E7D3A'; x.fillRect(mx+Math.round(mw*0.6),my,Math.round(mw*0.35),5); x.fillStyle='#FFC94A'; x.fillRect(mx+Math.round(mw*st.speed)-1,my-1,3,7); }
  $('lureDist').style.width=Math.max(0,st.dist)+'%';
}
function draw(){
  if(!st) return; var c=$('lureCanvas'), x=c.getContext('2d'), W=c.width, H=c.height; x.imageSmoothingEnabled=false;
  if(st.phase==='fight'&&st.fight){ drawFight(x,W,H); return; }
  if(st.play==='fly'){ drawFly(x,W,H); return; }
  if(TOPWATER[st.play]&&st.phase!=='snag'&&st.phase!=='pulling'){ drawTop(x,W,H); return; }
  x.fillStyle='#0D2A4A'; x.fillRect(0,0,W,H);
  for(var y=0;y<H;y+=2){ x.fillStyle='rgba(95,178,207,'+(0.05+0.08*(1-y/H))+')'; x.fillRect(0,y,W,1); }
  x.fillStyle='#3A2A1C'; x.fillRect(0,H-6,W,6); // bottom
  var px=Math.round(8+(W-24)*(st.dist/100)), py;
  if(st.play==='crank'){
    py=Math.round(H*0.35+st.speed*(H*0.35)); // faster dives deeper
    // speed meter
    var mx=6,my=4,mw=W-12; x.fillStyle='#13234A'; x.fillRect(mx,my,mw,6);
    x.fillStyle='#2E7D3A'; x.fillRect(mx+Math.round(mw*0.38),my,Math.round(mw*0.34),6);
    x.fillStyle='#FFC94A'; x.fillRect(mx+Math.round(mw*st.speed)-1,my-1,3,8);
  } else if(st.play==='jerk'){
    py=Math.round(H*0.5+Math.sin(st.t*2)*2-st.jx*3); px-=Math.round(st.jx*6);
  } else {
    py=Math.round((H-10)-st.h*(H-22));
  }
  if(st.phase==='snag'||st.phase==='pulling'){ // hung up on the bottom: a log, rocks or weeds, and the line pulled tight
    py=H-10; var sh=Math.round(Math.sin(st.t*40)*1);
    if(st.play==='crank'||st.play==='walk'||st.play==='buzz'){ x.fillStyle='#5A3A20'; x.fillRect(px-26,H-12,52,6); x.fillStyle='#3A2412'; x.fillRect(px-26,H-12,52,1); x.fillRect(px+6,H-18,3,7); }
    else if(st.play==='jig'){ x.fillStyle='#6A6A72'; x.fillRect(px-12,H-13,14,8); x.fillRect(px+2,H-10,10,5); x.fillStyle='#8A8A92'; x.fillRect(px-11,H-13,12,2); }
    else { x.fillStyle='#3A7A3A'; for(var w=0;w<7;w++){ var wx=px-12+w*4; x.fillRect(wx+Math.round(Math.sin(st.t*2+w)*1),H-26+(w%3)*4,2,22-(w%3)*4); } }
    x.strokeStyle='rgba(255,236,170,0.9)'; x.beginPath(); x.moveTo(W,0); x.lineTo(px+4+sh,py); x.stroke();
    var a2=root.ART.BAIT_ART[st.bait]; root.ART.drawSprite(x,a2.rows,a2.map,px-4+sh,py-4);
    if(Math.floor(st.t*4)%2===0){ x.fillStyle='#FF8A8D'; x.font='8px monospace'; x.fillText('SNAGGED!',6,12); }
    $('lureDist').style.width=Math.max(0,st.dist)+'%'; return;
  }
  x.strokeStyle='rgba(234,245,255,0.6)'; x.beginPath(); x.moveTo(W,0); x.lineTo(px+4,py); x.stroke();
  var art=root.ART.BAIT_ART[st.bait]; root.ART.drawSprite(x,art.rows,art.map,px-4,py-4);
  if(st.play==='jerk'&&st.jx>0.3){ x.fillStyle='rgba(255,255,255,'+(0.5*st.jx).toFixed(2)+')'; x.fillRect(px+8,py-1,6,1); x.fillRect(px+10,py+2,4,1); }
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
  $('lureQuit').onclick=function(){ if(!st) return; if(st.phase==='snag'){ snagDone(false); return; } if(st.phase==='pulling') return; st.phase='done'; finish('You reeled the lure in.'); };
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
L._state=function(){ return st&&{play:st.play,drag:+st.drag.toFixed(2),fight:st.fight&&{d:st.fight.d,meter:+st.fight.meter.toFixed(2),inside:st.fight.inside,fx:Math.round(st.fight.fx),zx:Math.round(st.fight.zx),zw:st.fight.zw},phase:st.phase,snag:st.snag,t:+st.t.toFixed(1),dist:+st.dist.toFixed(1),speed:+st.speed.toFixed(2),toBite:Math.round((st.bite-root.NET.now())/100)/10}; };
root.LURE=L;
})(typeof window!=='undefined'?window:this);

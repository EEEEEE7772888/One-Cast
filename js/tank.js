/* One Cast fish tank: a player's best kept fish (one of each kind) swim around an aquarium on their profile.
   Bigger fish look bigger. Tap a fish to see what it is. */
(function(root){
'use strict';
var D=root.OC, A=root.ART, UI=root.UI;
var TW=168, TH=84, SAND=TH-9, running=[];
function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
UI.fishTank=function(fish,owner){
  var wrap=document.createElement('div'); wrap.className='tank';
  var c=document.createElement('canvas'); c.width=TW; c.height=TH; c.className='px tank-cv'; wrap.appendChild(c);
  var label=document.createElement('div'); label.className='tank-label'; wrap.appendChild(label);
  var list=(fish||[]).filter(function(f){ return D.SP_BY_ID[f.sp]; }).sort(function(a,b){ return (b.value||0)-(a.value||0); }).slice(0,10);
  label.textContent=list.length?'Tap a fish to see it.':(owner?'Your tank is empty. Keep a fish (don\'t sell it) and it will swim here.':'This tank is empty.');
  var maxIn=Math.max.apply(null,list.map(function(f){ return +f.inches||10; }).concat([10]));
  var swim=list.map(function(f,i){ var L=Math.round(12+26*Math.pow((+f.inches||10)/maxIn,0.8)), spr=A.fishCanvas(f.sp,L,false,f.variant,f.colors);
    return {f:f,spr:spr,x:8+hash(i*3.1)*(TW-16-spr.width),y:8+hash(i*5.7)*(SAND-14-spr.height),dir:hash(i)>0.5?1:-1,v:4+hash(i*2.2)*7,ph:hash(i*9)*6,turn:2+hash(i*4)*5}; });
  var x=c.getContext('2d'), last=performance.now(), t=0, bubbles=[], spooky=D.eventOn&&D.eventOn('halloween');
  var plants=[]; for(var i=0;i<9;i++) plants.push({x:Math.round(6+hash(i*7.3)*(TW-12)),h:10+Math.round(hash(i*1.9)*22),c:['#2E7D3A','#3F9A47','#5A8A2A'][i%3]});
  function frame(now){ if(!c.isConnected){ return; } var dt=Math.min(0.05,(now-last)/1000); last=now; t+=dt;
    // water
    var g=x.createLinearGradient(0,0,0,TH); g.addColorStop(0,'#3FA8D8'); g.addColorStop(1,'#14506E'); x.fillStyle=g; x.fillRect(0,0,TW,TH);
    x.fillStyle='rgba(255,255,255,0.07)'; for(i=0;i<4;i++){ var rx=((i*47+t*6)%(TW+40))-20; x.beginPath(); x.moveTo(rx,0); x.lineTo(rx+10,0); x.lineTo(rx-14,SAND); x.lineTo(rx-22,SAND); x.fill(); }
    // sand, rocks, chest
    x.fillStyle='#D8C08A'; x.fillRect(0,SAND,TW,TH-SAND); x.fillStyle='#BFA46E'; for(i=0;i<TW;i+=3) x.fillRect(i,SAND+((i*7)%5),2,1);
    x.fillStyle='#7A808A'; x.fillRect(20,SAND-4,10,5); x.fillRect(24,SAND-6,5,2); x.fillStyle='#5A606A'; x.fillRect(TW-34,SAND-3,12,4);
    x.fillStyle='#8A5A2A'; x.fillRect(TW-60,SAND-7,12,8); x.fillStyle='#C9A050'; x.fillRect(TW-60,SAND-5,12,1); x.fillRect(TW-55,SAND-4,2,2);
    if(spooky){ x.fillStyle='#E8701A'; x.fillRect(46,SAND-5,7,5); x.fillStyle='#3A7A2A'; x.fillRect(49,SAND-6,1,1); x.fillStyle=Math.floor(t*2)%2?'#FFE26A':'#FFC94A'; x.fillRect(47,SAND-4,1,1); x.fillRect(51,SAND-4,1,1); x.fillRect(48,SAND-2,3,1); }
    plants.forEach(function(p,k){ for(var y=0;y<p.h;y++){ var sw=Math.round(Math.sin(t*1.4+k+y*0.25)*(y/p.h)*2.5); x.fillStyle=y%4<2?p.c:'#2A6A30'; x.fillRect(p.x+sw,SAND-y,2,1); } });
    // bubbles from the bubbler
    if(Math.random()<dt*6) bubbles.push({x:12+Math.random()*3,y:SAND-2,v:10+Math.random()*8});
    x.fillStyle='rgba(230,248,255,0.8)'; bubbles=bubbles.filter(function(b){ b.y-=b.v*dt; b.x+=Math.sin(t*5+b.v)*0.2; if(b.y>1) x.fillRect(Math.round(b.x),Math.round(b.y),1,1); return b.y>1; });
    x.fillStyle='#4A505A'; x.fillRect(10,SAND-2,7,3);
    // fish
    swim.forEach(function(s){ s.turn-=dt; if(s.turn<=0){ s.turn=2+Math.random()*6; if(Math.random()<0.4) s.dir*=-1; }
      s.x+=s.dir*s.v*dt; if(s.x<2){ s.x=2; s.dir=1; } if(s.x>TW-2-s.spr.width){ s.x=TW-2-s.spr.width; s.dir=-1; }
      var yy=Math.round(s.y+Math.sin(t*0.8+s.ph)*2); s.dy=yy;
      x.save(); if(s.dir<0){ x.translate(Math.round(s.x)+s.spr.width,yy); x.scale(-1,1); x.drawImage(s.spr,0,0); } else x.drawImage(s.spr,Math.round(s.x),yy); x.restore(); });
    // glass shine
    x.fillStyle='rgba(255,255,255,0.12)'; x.fillRect(3,3,2,TH-14); x.fillRect(6,3,1,TH-20);
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  c.addEventListener('click',function(e){ var r=c.getBoundingClientRect(), px=(e.clientX-r.left)*TW/r.width, py=(e.clientY-r.top)*TH/r.height, hit=null;
    swim.forEach(function(s){ if(px>=s.x-2&&px<=s.x+s.spr.width+2&&py>=s.dy-2&&py<=s.dy+s.spr.height+2) hit=s; });
    if(hit){ var f=hit.f, sp=D.SP_BY_ID[f.sp]; label.innerHTML='<b>'+(f.variant?f.variant.toUpperCase()+' ':'')+sp.name+'</b> · '+D.fmtWeight(+f.lb)+(f.inches?' · '+f.inches+' in':''); } });
  UI._tank=function(){ return {fish:swim.length}; };
  return wrap;
};
})(typeof window!=='undefined'?window:this);

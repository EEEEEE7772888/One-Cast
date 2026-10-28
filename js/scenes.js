/* One Cast scenes: five ways to fish, each drawn pixel by pixel on one canvas. Ice hole, shore, small boat, ocean trolling and deep drop. */
(function(root){
'use strict';
var D=root.OC, A=root.ART, S={};
var canvas, ctx, game, px=3, W=0, H=0, horizonY=70, floorY=0, floorTarget=0, hudB=8, centerB=40, panelTop=0;
var ICE_H=7, REEL=1300, HAUL=800;
var fx=null, parts=[], debris=[], cracks=[], shakeUntil=0, shakeAmp=0, castAnim=0, flash=0, scroll=0, lastT=0;
var reduceMotion=false; try{ reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
var hash=A.hash;
S.hooks={}; /* main.js fills: state(), sel(), hourAt(), method(), outfit() */
S.get=function(){ return {fx:fx,W:W,H:H,horizonY:horizonY}; };

function easeIO(k){ return k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; }
function easeOutBack(k){ var c1=1.5,c3=c1+1; return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2); }
function hexC(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
function mixC(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function rgb(c){ return 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'; }
var DARK=[2,6,16];
function shade(hex,k){ return rgb(mixC(hexC(hex),DARK,k)); }
function P(x,y,c){ ctx.fillStyle=c; ctx.fillRect(x,y,1,1); }
function R(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
function disc(cx,cy,r,c){ ctx.fillStyle=c; for(var y=-r;y<=r;y++){ var w=Math.floor(Math.sqrt(r*r-y*y)); ctx.fillRect(cx-w,cy+y,w*2+1,1); } }
function line(x0,y0,x1,y1,c){ x0|=0;y0|=0;x1|=0;y1|=0; var dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy; ctx.fillStyle=c; for(var n=0;n<600;n++){ ctx.fillRect(x0,y0,1,1); if(x0===x1&&y0===y1) break; var e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} } }

/* ---- themes ---- */
var SKYS={
 temperate:[[0,'#070E22','#142446'],[5,'#070E22','#142446'],[6.5,'#3E4A7A','#F0A67A'],[8,'#6FA9D8','#D2E8F2'],[16.5,'#6FA9D8','#D2E8F2'],[18,'#3A3566','#EE8A62'],[19.5,'#070E22','#142446'],[24,'#070E22','#142446']],
 tropic:[[0,'#060C20','#10203E'],[5,'#060C20','#10203E'],[6.5,'#4A3A7A','#F8B070'],[8,'#3F9AE8','#BFE6F8'],[16.5,'#3F9AE8','#BFE6F8'],[18,'#5A2E6A','#F86A52'],[19.5,'#060C20','#10203E'],[24,'#060C20','#10203E']],
 polar:[[0,'#050A1C','#0E1A36'],[5,'#050A1C','#0E1A36'],[6.5,'#5A5A8A','#E8B0A0'],[8,'#8AB8DC','#E8F2F8'],[16.5,'#8AB8DC','#E8F2F8'],[18,'#4A4070','#E89A80'],[19.5,'#050A1C','#0E1A36'],[24,'#050A1C','#0E1A36']],
 dry:[[0,'#0A0C20','#1A1E44'],[5,'#0A0C20','#1A1E44'],[6.5,'#6A3A5A','#F8A860'],[8,'#5AA8E8','#F0E4C8'],[16.5,'#5AA8E8','#F0E4C8'],[18,'#7A3A3A','#F88A50'],[19.5,'#0A0C20','#1A1E44'],[24,'#0A0C20','#1A1E44']]
};
var T={
 pond:{sky:'temperate',back:'hills',trees:'round',ground:'#4E7A3A',water:['#2F84A0','#134262']},
 farm:{sky:'temperate',back:'hills',trees:'round',barn:1,ground:'#6A7A3A',water:['#5A7A5A','#2A3A2A']},
 woods:{sky:'temperate',back:'hills',trees:'pine',ground:'#3E6A32',water:['#2A7A98','#0E3A5A']},
 city:{sky:'temperate',back:'skyline',trees:'round',ground:'#4E7A3A',water:['#3A6A7A','#14303A']},
 south:{sky:'tropic',back:'hills',trees:'cypress',ground:'#5A7A3A',water:['#3A8A7A','#124238']},
 west:{sky:'dry',back:'mountains',trees:'oak',ground:'#8A8A4A',water:['#2F84A0','#134262']},
 mountain:{sky:'temperate',back:'mountains',trees:'pine',ground:'#5A6A4A',water:['#3A9AB8','#0F4766']},
 ice_pines:{sky:'polar',back:'hills',trees:'pine',ice:1,snow:1,water:['#2A7690','#0E3450']},
 ice_city:{sky:'polar',back:'skyline',trees:'pine',ice:1,snow:1,water:['#2A6A86','#0E3450']},
 ice_flat:{sky:'polar',back:'flat',trees:'none',ice:1,snow:1,water:['#2A7690','#0E3450']},
 ice_cliffs:{sky:'polar',back:'cliffs',trees:'pine',ice:1,snow:1,water:['#1A4A68','#05122A']},
 ice_arctic:{sky:'polar',back:'icebergs',trees:'none',ice:1,snow:1,aurora:1,water:['#1E4A6A','#04101E']},
 ice_sea:{sky:'polar',back:'icebergs',trees:'none',snow:1,aurora:1,water:['#163A58','#020810']},
 antarctic:{sky:'polar',back:'shelf',trees:'none',snow:1,aurora:1,water:['#143A58','#020810']},
 bigwater:{sky:'temperate',back:'open',trees:'none',water:['#2A6A98','#0A2A4A']},
 river:{sky:'tropic',back:'hills',trees:'cypress',ground:'#6A5A3A',water:['#6A6A3A','#2A2A14']},
 swamp:{sky:'tropic',back:'mangrove',trees:'mangrove',ground:'#5A7A3A',water:['#3A6A4A','#122A1A']},
 flats:{sky:'tropic',back:'open',trees:'mangrove',island:1,water:['#46D8D0','#1A8A98']},
 offshore:{sky:'tropic',back:'open',trees:'none',water:['#1E6AA8','#062A50']},
 river_mountain:{sky:'temperate',back:'mountains',trees:'pine',ground:'#4A6A4A',water:['#3A8AA8','#0E3A5A']},
 coldsea:{sky:'polar',back:'mountains',trees:'pine',water:['#1E4A6A','#04101E']},
 tropic_sea:{sky:'tropic',back:'volcano',trees:'palm',water:['#1E6AB8','#062A58']},
 open_sea:{sky:'tropic',back:'open',trees:'none',water:['#1A5AB0','#042050']},
 jungle_river:{sky:'tropic',back:'jungle',trees:'jungle',ground:'#3A5A2A',water:['#2A2A1A','#0A0A04']},
 jungle:{sky:'tropic',back:'jungle',trees:'jungle',ground:'#3A5A2A',water:['#4A5A2A','#1A200A']},
 savanna_lake:{sky:'dry',back:'flat',trees:'acacia',ground:'#B89A5A',water:['#4A8A8A','#143A3A']},
 savanna_river:{sky:'dry',back:'flat',trees:'acacia',ground:'#B89A5A',water:['#5A7A5A','#1A2A1A']},
 europe_river:{sky:'temperate',back:'hills',trees:'round',castle:1,ground:'#6A8A3A',water:['#3A7A6A','#12382A']},
 loch:{sky:'polar',back:'mountains',trees:'none',castle:1,ground:'#4A6A3A',water:['#1A3A3A','#040C0C']},
 steppe_river:{sky:'dry',back:'hills',trees:'none',ground:'#9A9A5A',water:['#3A8AA8','#0E3A5A']},
 thai:{sky:'tropic',back:'temple',trees:'palm',ground:'#5A8A3A',water:['#5A7A4A','#1A2A14']},
 japan:{sky:'temperate',back:'mountains',trees:'round',torii:1,ground:'#5A8A4A',water:['#2F84A0','#134262']},
 outback_river:{sky:'dry',back:'flat',trees:'gum',ground:'#B85A3A',water:['#6A6A3A','#2A2A14']},
 reef:{sky:'tropic',back:'open',trees:'palm',island:1,water:['#2AB8C8','#0A5A78']},
 beach:{sky:'temperate',back:'open',trees:'none',beach:1,lighthouse:1,ground:'#E2CC8E',water:['#2E86A8','#0C3456']}
};
S.themeOf=function(spot){ return T[spot&&spot.scene]||T.pond; };

function skyAt(h,sk){ var SK=SKYS[sk]||SKYS.temperate; for(var i=0;i<SK.length-1;i++){ var a=SK[i],b=SK[i+1]; if(h>=a[0]&&h<=b[0]){ var t=(h-a[0])/(b[0]-a[0]); return [mixC(hexC(a[1]),hexC(b[1]),t),mixC(hexC(a[2]),hexC(b[2]),t)]; } } return [hexC(SK[0][1]),hexC(SK[0][2])]; }
function lightAt(h){ if(h>=8&&h<=16.5) return 1; if(h<=5||h>=19.5) return 0; return h<12?(h-5)/3:(19.5-h)/3; }
S.lightAt=lightAt;

/* ---- layout ---- */
S.init=function(c,g){ canvas=c; ctx=c.getContext('2d'); game=g; };
S.layout=function(){
  var r=game.getBoundingClientRect();
  px=r.width<600?3:4;
  W=Math.ceil(r.width/px); H=Math.ceil(r.height/px);
  canvas.width=W; canvas.height=H; canvas.style.width=(W*px)+'px'; canvas.style.height=(H*px)+'px';
  ctx.imageSmoothingEnabled=false;
  S.measure(); floorY=floorTarget; fishes=[]; for(var i=0;i<3;i++) spawnFish(true);
};
S.measure=function(){
  if(!W) return;
  var g=game.getBoundingClientRect(), cb=document.getElementById('center').getBoundingClientRect(), pb=document.getElementById('panel').getBoundingClientRect();
  centerB=Math.ceil((cb.bottom-g.top)/px); hudB=Math.ceil((document.querySelector('.hud').getBoundingClientRect().bottom-g.top)/px);
  panelTop=Math.floor((pb.top-g.top)/px)-2;
  var m=method();
  if(m==='troll') horizonY=Math.max(Math.round(H*0.42),centerB+18);
  else horizonY=Math.max(Math.round(H*0.24),centerB+22);
  // the Dev Flagship is tall: drop the waterline so its decks sit below the spot text (but keep some water above the panel)
  if((m==='boat'||m==='troll'||m==='deep')&&S.hooks.boat&&S.hooks.boat()==='devboat') horizonY=Math.max(horizonY,Math.min(centerB+40,panelTop-46));
  floorTarget=panelTop; if(floorTarget<horizonY+40) floorTarget=horizonY+40;
  if(!floorY) floorY=floorTarget;
};
function method(){ return S.hooks.method?S.hooks.method():'shore'; }
function spot(){ return S.hooks.spot?S.hooks.spot():D.SPOT_BY_ID.basslake; }
function theme(){ return S.themeOf(spot()); }

/* ---- geometry per method ---- */
function anglerX(){ var m=method(); if(m==='ice') return holeX()-21; if(m==='shore') return dockEnd()-15; if(m==='boat') return Math.round(W/2)-10; return bigX()+14; }
function bigX(){ return Math.round(W/2)-34; }
function holeX(){ return Math.round(W/2)+8; }
function dockEnd(){ return Math.min(Math.round(W*0.34),76); }
function trollX(){ return bigX(); }
function waterTop(){ return theme().ice?horizonY+ICE_H:horizonY+1; }
/* Where the selected line's hook sits while waiting. */
function hookPos(idx,bait){
  var m=method(), b=D.BAIT_BY_ID[bait]||D.BAIT_BY_ID.worm, wt=waterTop(), depth=Math.min(0.9,0.35+0.5*Math.log(b.tau+1)/Math.log(1000));
  if(m==='ice') return [holeX(),Math.round(wt+(floorY-wt)*depth)];
  if(m==='shore'){ var bx=bobberX(idx); return [bx,Math.round(wt+(floorY-wt)*Math.min(0.75,depth))]; }
  if(m==='boat') return [Math.round(W/2)+14,Math.round(wt+(floorY-wt)*depth)];
  if(m==='troll') return [lureX(idx),horizonY+3];
  return [bigX()+2,Math.round(floorY-6)];
}
function bobberX(idx){ return dockEnd()+22+Math.round((W-dockEnd()-40)*[0.45,0.7,0.25,0.9][idx%4]); }
function lureX(idx){ return bigX()-8-idx*11; }
function landPos(){ var m=method(), wt=waterTop(); if(m==='ice') return [holeX(),wt+1]; if(m==='shore') return [dockEnd()+10,wt+1]; if(m==='boat') return [Math.round(W/2)+14,wt+1]; if(m==='troll') return [bigX()-3,wt+1]; return [bigX()+2,wt+1]; }
function hangPos(big,L){ var m=method(), base=horizonY-21, bigY=Math.max(hudB+3,horizonY-Math.round(L*0.8)); var x=m==='ice'?holeX():m==='shore'?dockEnd()+10:m==='boat'?Math.round(W/2)+14:m==='troll'?bigX()-3:bigX()+2; return [x,big?bigY:base]; }

/* ---- background fish ---- */
var fishes=[];
function poolTarget(){ var l=selLine(); return l?Math.min(7,3+Math.floor(minutesOf(l)/120)):3; }
function selLine(){ return S.hooks.selLine?S.hooks.selLine():null; }
function minutesOf(l){ return Math.max(0,(root.NET.now()-Date.parse(l.castAt))/60000); }
S._fishCheck=function(){ var wt=waterTop(); return fishes.map(function(f){ var h=A.fishCanvas(f.id,f.L,true).height; return {top:Math.round(f.y-h/2),wt:wt}; }); }; // used by tests
function spawnFish(initial){
  var sp=spot(), l=selLine(), bait=l?l.bait:(S.hooks.bait?S.hooks.bait():'worm');
  var list=D.speciesWeights(sp.id,bait,l?minutesOf(l):0,null).filter(function(x){ return x.w>0; });
  if(!list.length) list=D.spotSpecies(sp.id).map(function(s){ return {sp:s,w:s.spots[sp.id]}; });
  if(!list.length) return;
  var tot=0; list.forEach(function(x){ tot+=x.w; }); var r=Math.random()*tot, chosen=list[0].sp;
  for(var i=0;i<list.length;i++){ r-=list[i].w; if(r<=0){ chosen=list[i].sp; break; } }
  var L=A.sceneLen(chosen.max), dir=Math.random()<.5?1:-1, wt=waterTop(), bot=method()==='troll'?Math.min(H-4,horizonY+40):floorY-5, top=wt+5;
  var y=Math.max(top,Math.min(bot,top+Math.random()*(bot-top)));
  fishes.push({id:chosen.id,L:L,x:initial?Math.random()*W:(dir>0?-L-4:W+4),y:y,dir:dir,v:(L>20?3:5)+Math.random()*4,ph:Math.random()*6});
}

/* ---- catch animation ---- */
S.startCatch=function(o){
  var L=A.heroLen(o.lb), big=o.lb>=Math.max(8,o.max*0.4)||o.lb>=60;
  L=big?Math.max(28,Math.min(Math.round(L*1.6),Math.round(horizonY*1.1),Math.round(W*0.55))):Math.min(L,24);
  if(o.snap){ big=false; L=Math.min(A.heroLen(o.lb),30); }
  var m=method(), reel=m==='deep'?3200:m==='troll'?2200:REEL;
  fx={start:performance.now(),sp:o.sp,lb:o.lb,big:big,L:L,variant:o.variant||null,colors:o.colors||null,legend:!!o.legend,snap:!!o.snap,idx:o.idx||0,bait:o.bait,method:m,reel:reel,breached:false,sparked:false,out:0,hook:hookPos(o.idx||0,o.bait)};
  parts=[]; if(o.legend) flash=performance.now();
  return reel+HAUL;
};
S.endCatch=function(){ if(fx&&!fx.out) fx.out=performance.now(); };
S.busy=function(){ return !!fx; };
S.cast=function(){ castAnim=performance.now(); };
function makeCracks(big){ cracks=[]; var n=big?4:2; for(var s=-1;s<=1;s+=2) for(var i=0;i<n;i++){ var x=s*6, y=2+Math.floor(Math.random()*(ICE_H-3)), len=(big?14:5)+Math.random()*(big?26:8); for(var k=0;k<len;k++){ x+=s; if(Math.random()<0.4) y+=Math.random()<0.5?-1:1; y=Math.max(1,Math.min(ICE_H-2,y)); cracks.push([x,y]); } } }
function splash(x,y,big,ice){
  var n=big?84:34;
  if(ice) makeCracks(big);
  for(var i=0;i<n;i++){ var chunk=ice&&Math.random()<0.55;
    parts.push({k:chunk?'ice':'drop',x:x+(Math.random()-0.5)*8,y:y,vx:(Math.random()-0.5)*(big?64:34),vy:-(18+Math.random()*(big?58:32)),g:75,c:chunk?['#F4F9FC','#BFE3F2','#9FD3F2'][i%3]:'#8ED0EE',sz:chunk&&Math.random()<(big?0.45:0.25)?2:1,life:4}); }
  if(!reduceMotion){ shakeUntil=performance.now()+(big?550:300); shakeAmp=big?2:1; }
}
function sparkle(x,y,L){ for(var i=0;i<28;i++) parts.push({k:'spark',x:x+(Math.random()-0.5)*18,y:y+Math.random()*L,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,g:0,c:i%3?'#FFC94A':'#FFFFFF',sz:1,life:0.6+Math.random()}); }
function drawHero(cs,x,y,th){ var r=A.rotated(cs,-Math.PI/2+th), p=r._pivot(cs.width-2.5,Math.floor(cs.height/2)+1); ctx.drawImage(r,Math.round(x-p[0]),Math.round(y-p[1])); }
function drawCrane(cx,baseY,tx,ty,dk,ms){
  var cabY=baseY-A.CRANE_CAB.length, px0=cx+3, py0=cabY+3, dx=tx-px0, dy=ty-py0, len=Math.max(1,Math.sqrt(dx*dx+dy*dy)), nx=-dy/len, ny=dx/len;
  var Rc=shade('#D93A3A',dk*0.6), rc=shade('#8E2430',dk*0.6);
  line(px0,py0,tx,ty,Rc); line(Math.round(px0+nx*3),Math.round(py0+ny*3),Math.round(tx+nx),Math.round(ty+ny),Rc);
  for(var k=2;k<len-1;k+=3){ var a=k/len, b=Math.min(1,(k+1.5)/len), w=3-2*b; line(Math.round(px0+dx*a),Math.round(py0+dy*a),Math.round(px0+dx*b+nx*w),Math.round(py0+dy*b+ny*w),rc); }
  var anim=Math.floor(ms/110)%2;
  A.drawSprite(ctx,A.CRANE_CAB,{R:Rc,r:rc,w:'#BFE3F2',k:'#1B1F2A',K:anim?'#6E7A8C':'#1B1F2A'},cx,cabY);
  P(tx,ty,'#1B1F2A'); P(tx-1,ty,'#1B1F2A'); P(tx,ty+1,'#1B1F2A');
}

/* ---- backdrops ---- */
function drawHills(col,amp,dk){ for(var x=0;x<W;x++){ var hy=horizonY-4-Math.round(amp*Math.sin(x*0.035+1)+3*Math.sin(x*0.09)); R(x,hy,1,horizonY-hy,col); } }
function drawMountains(dk,snowy){
  var rockC=shade('#7A8EA2',0.15+dk), rockD=shade('#5A6E82',0.2+dk), capC=shade('#F4F9FC',0.1+dk*0.8);
  for(var x=0;x<W;x++){ var mh=0; for(var i=0;i<6;i++){ var pxk=W*(i/5)+(hash(i+21)-0.5)*W*0.18, pk=horizonY*(0.42+hash(i+3)*0.28); mh=Math.max(mh,pk-Math.abs(x-pxk)*(0.9+hash(i+9)*0.5)); }
    if(mh<=0) continue; var top=Math.round(horizonY-mh); R(x,top,1,horizonY-top,(x%9<4)?rockD:rockC); if(snowy!==false) R(x,top,1,Math.max(1,Math.round(Math.min(mh*0.28,9))),capC); }
}
function drawSkyline(dk,lt){
  var bc=shade('#3A4256',0.2+dk*0.5), bd=shade('#2A3042',0.25+dk*0.5), win=lt<0.5?'#F8D878':'#8AA0B8';
  var x=2, i=0; while(x<W){ var bw=6+Math.round(hash(i*3.1)*10), bh=14+Math.round(hash(i*7.7)*Math.max(10,horizonY*0.55)); R(x,horizonY-bh,bw,bh,i%2?bc:bd);
    for(var wy=horizonY-bh+2;wy<horizonY-3;wy+=3) for(var wx=x+1;wx<x+bw-1;wx+=3) if(hash(wx*1.7+wy*3.3)<(lt<0.5?0.5:0.3)) P(wx,wy,win);
    if(hash(i+9)<0.3) R(x+Math.floor(bw/2),horizonY-bh-4,1,4,bd); x+=bw+1+Math.round(hash(i)*3); i++; }
}
function drawTrees(kind,dk,gap,base){
  base=base||horizonY-2; var tc=shade(kind==='pine'?'#1E4A3E':kind==='palm'?'#2E7A3A':kind==='gum'?'#6A8A5A':kind==='acacia'?'#5A7A2A':kind==='jungle'?'#1E5A2E':kind==='cypress'?'#3E6A3A':kind==='mangrove'?'#2E6A3A':'#2E6A32',0.25+dk*0.8);
  var tr=shade(kind==='gum'?'#D8D0C0':'#4A3020',0.3+dk), hi=shade('#8AC070',0.2+dk);
  for(var i=0;i<W/gap;i++){ var bx=Math.round(i*gap+hash(i)*5); if(Math.abs(bx-holeX())<26&&method()==='ice'&&hash(i+5)<0.7) continue;
    var h=8+Math.round(hash(i+11)*9);
    if(kind==='pine'){ for(var r=0;r<h;r++){ var wdt=Math.floor(r/2.2)+1; R(bx-wdt+1,base-h+r,wdt*2-1,1,tc); if(r%3===1) R(bx-wdt+1,base-h+r,Math.max(1,wdt-1),1,shade('#EAF4FA',0.15+dk)); } R(bx,base,1,2,tr); }
    else if(kind==='palm'){ R(bx,base-h,1,h+2,tr); R(bx+1,base-h+2,1,h,tr); for(var f=0;f<5;f++){ var ang=-0.5+f*0.45, len=6+Math.round(hash(i+f)*3); for(var k=0;k<len;k++) P(Math.round(bx+Math.cos(ang+Math.PI*0.75+f*0.1)*k),Math.round(base-h-Math.abs(Math.sin(ang))*k*0.3+k*0.25),tc); } }
    else if(kind==='acacia'){ R(bx,base-h,1,h+2,tr); R(bx-6,base-h-2,13,3,tc); R(bx-4,base-h-3,9,1,tc); }
    else if(kind==='gum'){ R(bx,base-h,2,h+2,tr); disc(bx-2,base-h-1,3,tc); disc(bx+4,base-h-3,3,tc); disc(bx+1,base-h-5,3,tc); }
    else if(kind==='jungle'){ var hh=h+8; R(bx,base-hh,1,hh+2,tr); disc(bx,base-hh,5,tc); disc(bx-4,base-hh+3,4,tc); disc(bx+4,base-hh+2,4,shade('#2E7A3E',0.25+dk*0.8)); if(i%2) line(bx+2,base-hh+4,bx+3,base-2,shade('#4A6A2A',0.3+dk)); }
    else if(kind==='cypress'){ R(bx,base-h,1,h+2,tr); R(bx-1,base-1,3,2,tr); for(var r2=0;r2<h-2;r2++){ var w2=Math.max(1,Math.floor((h-2-r2)/3)); R(bx-w2,base-h+r2,w2*2+1,1,tc); } if(i%2) R(bx+2,base-h+3,1,4,shade('#9AA088',0.3+dk)); }
    else if(kind==='mangrove'){ disc(bx,base-h+2,4,tc); disc(bx+3,base-h+1,3,tc); for(var rr=-2;rr<=2;rr++) line(bx+rr*2,base-h+5,bx+rr*3,base+1,tr); }
    else if(kind==='oak'){ R(bx,base-h+3,1,h-1,tr); disc(bx,base-h+2,4,tc); disc(bx-2,base-h+3,3,shade('#4A7A2A',0.25+dk*0.8)); }
    else { R(bx,base-h+3,1,h-1,tr); disc(bx,base-h+2,Math.max(3,Math.round(h*0.4)),tc); P(bx-1,base-h,hi); }
  }
}
function drawIcebergs(dk){ var ic=shade('#DCEFF8',0.1+dk*0.8), id=shade('#9FC8E0',0.2+dk*0.8); for(var i=0;i<5;i++){ var bx=Math.round(W*(i/4)+(hash(i+31)-0.5)*W*0.2), bw=14+Math.round(hash(i+2)*20), bh=5+Math.round(hash(i+5)*12); for(var x=0;x<bw;x++){ var hh=Math.round(bh*Math.sin(Math.PI*x/bw)*(0.6+0.4*hash(x+i))); R(bx+x,horizonY-hh,1,hh,x%5<3?ic:id); } } }
function drawCliffs(dk){ var c=shade('#5A4A3A',0.2+dk), c2=shade('#7A6A5A',0.2+dk); for(var x=0;x<W;x++){ var hh=Math.round(horizonY*(0.3+0.1*Math.sin(x*0.05))+2*Math.sin(x*0.3)); R(x,horizonY-hh,1,hh,(x%7<3)?c:c2); if(x%11===0) R(x,horizonY-hh,1,2,shade('#F4F9FC',0.1+dk)); } }
function drawShelf(dk){ var c=shade('#DCEFF8',0.1+dk*0.8), c2=shade('#A8D0E8',0.2+dk*0.8); var hh=Math.round(horizonY*0.35); for(var x=0;x<W;x++){ var top=horizonY-hh-Math.round(2*Math.sin(x*0.2)); R(x,top,1,horizonY-top,(x%9<2)?c2:c); } }
function drawVolcano(dk,lt){ var cx=Math.round(W*0.72), rc=shade('#4A3A3A',0.2+dk), rd=shade('#2E2424',0.25+dk); for(var x=0;x<W;x++){ var hh=Math.max(0,Math.round(horizonY*0.55-Math.abs(x-cx)*0.55)); if(hh>0) R(x,horizonY-hh,1,hh,x%6<3?rc:rd); } if(lt<0.6) R(cx-1,horizonY-Math.round(horizonY*0.55)-1,3,1,'#F06030'); for(var i=0;i<6;i++) P(cx-3+i+Math.round(Math.sin(i*2+performance.now()/900)*1),horizonY-Math.round(horizonY*0.55)-3-i,'rgba(200,200,210,'+(0.4-i*0.05)+')'); }
function drawBarn(dk){ var x=Math.round(W*0.72), c=shade('#9A2E2A',0.2+dk), r=shade('#E8E8E8',0.2+dk); R(x,horizonY-12,16,10,c); for(var i=0;i<8;i++) R(x-1+i,horizonY-13-i,18-i*2,1,r); R(x+6,horizonY-7,4,5,'#2A1A10'); }
function drawCastle(dk){ var x=Math.round(W*0.7), c=shade('#6A6A6A',0.25+dk), d=shade('#4A4A4A',0.25+dk); R(x,horizonY-14,22,12,c); R(x,horizonY-20,5,18,d); R(x+17,horizonY-20,5,18,d); for(var i=0;i<5;i+=2){ P(x+i,horizonY-21,d); P(x+17+i,horizonY-21,d); } P(x+9,horizonY-9,'#F8D878'); }
function drawTemple(dk){ var x=Math.round(W*0.7), g=shade('#E0B030',0.15+dk), r=shade('#B03030',0.2+dk); R(x,horizonY-10,14,8,r); for(var i=0;i<9;i++) R(x+6-Math.floor(i*0.6),horizonY-10-i,Math.max(1,3+Math.floor((9-i)*0.6)),1,g); R(x+6,horizonY-22,2,4,g); }
function drawTorii(dk){ var x=Math.round(W*0.68), r=shade('#D83A2A',0.15+dk); R(x,horizonY-12,2,10,r); R(x+10,horizonY-12,2,10,r); R(x-2,horizonY-13,16,2,r); R(x-1,horizonY-10,14,1,r); }
/* Cape Hatteras Lighthouse: black-and-white spiral, red brick base, black lantern; the light sweeps at night */
function drawLighthouse(dk,t,night){ var x0=Math.max(4,dockEnd()-46), base=horizonY-3, h=34, wht=shade('#F4F2EA',0.15+dk), blk=shade('#1A1A1E',0.1+dk), brick=shade('#9A3A2A',0.2+dk);
  for(var y=0;y<h;y++){ var wdt=7-Math.floor(y/h*3), xl=x0+Math.floor((7-wdt)/2), yy=base-y;
    for(var i=0;i<wdt;i++){ var c=y<4?brick:(Math.floor((y+i*1.6)/5)%2?blk:wht); P(xl+i,yy,c); } }
  var top=base-h; R(x0,top,7,1,blk); R(x0+1,top-4,5,4,blk); R(x0+2,top-3,3,2,night?'#FFE680':shade('#C8D8E0',0.2+dk)); R(x0+2,top-6,3,2,blk); P(x0+3,top-7,blk);
  if(night){ var a=(t*0.9)%(Math.PI*2), cx=x0+3, cy=top-2; for(var r=3;r<46;r++){ var bx=Math.round(cx+Math.cos(a)*r), by=Math.round(cy+Math.sin(a)*r*0.25); if(by<horizonY-1) P(bx,by,'rgba(255,236,150,'+(0.5-r/100).toFixed(2)+')'); } } }
/* low sand dunes with sea oats behind the beach */
function drawDunes(dk){ var de=dockEnd(), c=shade('#D8C080',0.2+dk), o=shade('#9A9A4A',0.2+dk); for(var x=0;x<de+6;x++){ var hy=horizonY-3-Math.round(3+2*Math.sin(x*0.17)+Math.sin(x*0.43)); R(x,hy,1,horizonY-hy,c); if(x%5===2){ P(x,hy-1,o); P(x,hy-2,o); P(x+1,hy-3,o); } } }
function drawIsland(dk){ var x=Math.round(W*0.75), s=shade('#E8D8A0',0.15+dk); for(var i=0;i<24;i++) R(x+i,horizonY-Math.round(3*Math.sin(Math.PI*i/24)),1,Math.round(3*Math.sin(Math.PI*i/24))+1,s); drawTrees('palm',dk,10,horizonY-1); }

/* ---- the frame ---- */
S.draw=function(ms){
  if(!W||!S.hooks.state||!S.hooks.state()) return;
  var t=reduceMotion?0:ms/1000, dt=Math.min(0.1,Math.max(0,(ms-lastT)/1000)); lastT=ms;
  floorY+=(floorTarget-floorY)*Math.min(1,dt*6); var fy=Math.round(floorY);
  var sp=spot(), th=theme(), m=method(), h=S.hooks.hourAt(sp), sky=skyAt(h,th.sky), lt=lightAt(h), dk=(1-lt)*0.55, dkL=dk*0.3, i, x, y, r;
  var storm=th.snow&&hash(Math.floor(Date.now()/3600000)*1.37+11+sp.lat)<0.12, rain=!th.snow&&th.sky==='tropic'&&hash(Math.floor(Date.now()/3600000)*2.11+7+sp.lon)<0.2;
  if(storm||rain) sky=[mixC(sky[0],[96,104,120],0.45),mixC(sky[1],[150,158,172],0.45)];
  if(m==='troll') scroll+=dt*18;
  /* sky */
  var BANDS=7; for(y=0;y<=horizonY;y++){ var k0=y/horizonY, bi=Math.floor(k0*BANDS), frac=k0*BANDS-bi, c0=rgb(mixC(sky[0],sky[1],Math.min(1,bi/BANDS))), c1=rgb(mixC(sky[0],sky[1],Math.min(1,(bi+1)/BANDS)));
    R(0,y,W,1,c0); if(frac>0.55){ ctx.fillStyle=c1; for(x=(y&1);x<W;x+=2) ctx.fillRect(x,y,1,1); } }
  var aur=Math.max(0,(0.35-lt)/0.35), dayIdx=Math.floor(Date.now()/86400000);
  if(aur>0&&!storm&&(th.aurora||Math.abs(sp.lat)>52)&&hash(dayIdx+0.5)<0.75){
    for(x=0;x<W;x+=2){ var ab=horizonY*0.1+Math.sin(x*0.045+t*0.25)*5+Math.sin(x*0.011+t*0.07)*8, al=10+Math.sin(x*0.07+t*0.4)*5+Math.sin(x*0.023)*4, aa=(0.11+0.08*Math.sin(x*0.09+t*0.6))*aur;
      for(r=0;r<al;r++){ var kk=r/al; ctx.fillStyle=(kk<0.65?'rgba(90,240,160,':'rgba(170,110,230,')+(aa*(1-kk*0.75)).toFixed(3)+')'; ctx.fillRect(x,Math.round(ab+r),2,1); } }
  }
  if(lt<0.6){ for(i=0;i<40;i++){ if(hash(i+3)*(1-lt)<0.25) continue; if(Math.sin(t*1.5+i*2)>-.6) P(Math.floor(hash(i*3.1)*W),Math.floor(hash(i*7.7+1)*horizonY*0.75),i%5?'#BFD0F0':'#FFFFFF'); } }
  var day=h>=6&&h<18, p=day?(h-6)/12:(((h<6)?h+24:h)-18)/12, sx=Math.round(W*(0.1+0.8*p)), sy=Math.round(horizonY-14-Math.sin(Math.PI*p)*(horizonY*0.62));
  if(day){ ctx.fillStyle='rgba(255,230,150,0.18)'; for(var gi=9;gi>6;gi--) disc(sx,sy,gi,'rgba(255,230,150,0.12)'); disc(sx,sy,6,'#FFE9A8'); disc(sx,sy,4,'#FFF6D6'); P(sx-2,sy-2,'#FFFFFF'); }
  else { disc(sx,sy,5,'#E4EAF6'); P(sx-2,sy-1,'#C4CCDA'); P(sx+1,sy+2,'#C4CCDA'); P(sx+1,sy-2,'#D4DAE6'); P(sx-1,sy+1,'#C4CCDA'); disc(sx+2,sy-1,4,rgb(mixC(sky[0],sky[1],Math.max(0,sy)/horizonY))); }
  /* clouds: puffy two-tone pixel clouds with a shaded underside */
  var cloudHi=lt>0.5?'#FFFFFF':rgb(mixC([150,160,190],[255,255,255],lt)), cloudLo=lt>0.5?'#C8DCEC':rgb(mixC([70,80,110],[200,220,236],lt));
  if(!storm&&!rain) for(i=0;i<5;i++){ var cx=Math.floor((hash(i*4.3)*W*1.4+t*(1.5+hash(i))+(m==='troll'?scroll*0.3:0))%(W*1.4))-W*0.2, cy=4+Math.round(hash(i*2.7)*horizonY*0.4), cw=12+Math.round(hash(i)*18), ch2=3+Math.round(hash(i*1.3)*3);
    for(var cj=0;cj<4;cj++){ var px2=cx+Math.round(cw*(0.1+0.7*hash(i*9+cj*3))), pr=Math.max(2,Math.round(ch2*(0.6+0.6*hash(i*5+cj)))); disc(px2,cy,pr,cloudHi); }
    R(cx+2,cy+ch2-1,cw-4,1,cloudLo); R(cx+3,cy+ch2,cw-6,1,cloudLo); R(cx,cy,cw,1,cloudHi); }
  /* backdrop */
  var hill=shade(th.snow?'#D5E6F0':th.ground||'#5A7A3A',0.2+dk);
  if(th.back==='mountains') drawMountains(dk,true);
  if(th.back==='hills'||th.back==='skyline'||th.back==='jungle'||th.back==='mangrove'||th.back==='temple') drawHills(hill,th.snow?4:6,dk);
  if(th.back==='flat') R(0,horizonY-3,W,3,hill);
  if(th.back==='skyline') drawSkyline(dk,lt);
  if(th.back==='cliffs') drawCliffs(dk);
  if(th.back==='icebergs') drawIcebergs(dk);
  if(th.back==='shelf') drawShelf(dk);
  if(th.back==='volcano'){ drawVolcano(dk,lt); drawHills(shade('#3A6A3A',0.2+dk),3,dk); }
  if(th.island) drawIsland(dk);
  if(th.beach) drawDunes(dk); if(th.lighthouse) drawLighthouse(dk,t,lt<0.35);
  if(th.barn) drawBarn(dk); if(th.castle) drawCastle(dk); if(th.back==='temple') drawTemple(dk); if(th.torii) drawTorii(dk);
  if(th.trees&&th.trees!=='none'&&th.back!=='open'&&!th.island) drawTrees(th.trees,dk,th.trees==='jungle'?9:th.trees==='acacia'?26:th.trees==='palm'?16:th.back==='skyline'?14:7);
  if(m==='troll'){ for(i=0;i<3;i++){ var bxx=Math.floor((hash(i*5.1)*W*1.6+t*9+scroll*0.6)%(W*1.6))-W*0.3, byy=8+Math.round(hash(i*2.3)*horizonY*0.5+Math.sin(t*2+i)*2), fl=Math.floor(t*4+i)%2; P(bxx,byy,'#1B1F2A'); P(bxx-1,byy+(fl?1:0),'#1B1F2A'); P(bxx+1,byy+(fl?1:0),'#1B1F2A'); } }
  /* water */
  var wt=waterTop(), wtc=hexC(th.water[0]), wbc=hexC(th.water[1]), wbot=m==='troll'?Math.min(H,horizonY+60):fy;
  for(y=wt;y<H;y++){ var k=(y-wt)/Math.max(1,wbot-wt); R(0,y,W,1,rgb(mixC(mixC(wtc,wbc,Math.min(1,k)),DARK,dkL*0.9+(m==='deep'?Math.min(0.85,k*0.9):0)))); }
  if(m==='troll'||m==='deep'||m==='boat'||m==='shore'){ for(x=0;x<W;x++){ var wv=Math.round(Math.sin(x*0.3+t*2.2+(m==='troll'?scroll:0))*1); if(wv>0||((x+Math.floor(t*6))%7===0)) P(x,wt+wv,'rgba(220,240,255,'+(0.35*Math.max(0.3,lt)).toFixed(2)+')'); } }
  if(lt>0.2&&m!=='troll'){ ctx.fillStyle='rgba(220,240,255,'+(0.07*lt).toFixed(3)+')'; var lx=m==='ice'?holeX():m==='shore'?bobberX(0):Math.round(W/2)+10; for(i=0;i<3;i++){ var sw=3+i*2, off=(i-1)*6; ctx.beginPath(); ctx.moveTo(lx-sw+off*0.2,wt); ctx.lineTo(lx+sw+off*0.2,wt); ctx.lineTo(lx+sw*3+off*3,fy); ctx.lineTo(lx-sw*3+off*3,fy); ctx.closePath(); ctx.fill(); } }
  if(m!=='troll'&&m!=='deep'){
    var sed=shade(th.ice?'#2A3A3E':'#4A4030',0.15+dkL), sedHi=shade(th.ice?'#4A5A52':'#6A5A40',0.15+dkL), rock=shade('#56606A',0.1+dkL);
    for(x=0;x<W;x++){ var fl2=fy+Math.round(1.5*Math.sin(x*0.13)+Math.sin(x*0.41)); R(x,fl2,1,1,sedHi); R(x,fl2+1,1,H-fl2,sed); }
    for(i=0;i<W/18;i++){ disc(Math.round(hash(i*5.3)*W),fy+1,1+Math.round(hash(i*2.1)*2),rock); }
    var wn=Math.round(16*(th.ice?0.6:1)), wmax=Math.max(14,(fy-wt)*0.5);
    for(i=0;i<wn;i++){ var wx=Math.round(hash(i*9.7+sp.id.length)*W), wh=Math.round(6+hash(i*4.4)*wmax), col=i%2?shade('#3F8A47',0.2+dkL):shade('#2E6B3A',0.2+dkL); for(r=0;r<wh;r++){ var sway=Math.round(Math.sin(t*1.2+i+r*0.22)*(r/wh)*2.4); P(wx+sway,fy-r,col); if(r%4===2) P(wx+sway+(i%2?1:-1),fy-r,col); } }
  }
  if(m==='deep'){ for(i=0;i<30;i++){ var gx=Math.floor(hash(i*3.3)*W), gy=Math.floor(wt+20+hash(i*7.1)*(H-wt-20)), gl=0.3+0.7*Math.abs(Math.sin(t*0.8+i)); if(gy>H*0.5) P(gx,gy,'rgba(120,200,255,'+(gl*0.5).toFixed(2)+')'); } }
  for(i=0;i<7;i++){ var bp=((t*0.12+hash(i))%1), byy2=Math.round(fy-(fy-wt)*bp), bxx2=Math.round(hash(i*3.7)*W+Math.sin(t*2+i)*1.5); if(byy2>wt+1&&byy2<H) P(bxx2,byy2,'rgba(220,240,255,'+(0.5*(1-bp)+0.1).toFixed(2)+')'); }
  /* fish shadows */
  var want=poolTarget(); if(fishes.length<want&&Math.random()<dt*0.6) spawnFish(false);
  ctx.globalAlpha=lt>0.3?0.5:0.38;
  for(i=fishes.length-1;i>=0;i--){ var f=fishes[i]; f.x+=f.dir*f.v*dt*(0.7+0.3*Math.sin(t*0.9+f.ph))-(m==='troll'?dt*10:0); f.y+=Math.sin(t*0.7+f.ph)*dt*0.8;
    if(f.x<-f.L-8||f.x>W+8){ fishes.splice(i,1); continue; }
    var spr=A.fishCanvas(f.id,f.L,true);
    /* keep the whole fish under the surface and above the bottom, every frame (big fish are tall, and the waterline can move) */
    var half=Math.ceil(spr.height/2), lo=wt+half+2, hi=(m==='troll'?H-4:fy)-half-1;
    if(hi<lo){ fishes.splice(i,1); continue; } if(f.y<lo) f.y=lo; if(f.y>hi) f.y=hi;
    if(m==='deep') ctx.globalAlpha=0.45*Math.max(0.15,1-(f.y-wt)/(H-wt));
    if(f.dir>0) ctx.drawImage(spr,Math.round(f.x),Math.round(f.y-spr.height/2)); else { ctx.save(); ctx.translate(Math.round(f.x)+spr.width,0); ctx.scale(-1,1); ctx.drawImage(spr,0,Math.round(f.y-spr.height/2)); ctx.restore(); } }
  ctx.globalAlpha=1;

  /* catch animation state */
  var F=null, hang=null;
  if(fx){
    var ft=ms-fx.start, cs=A.fishCanvas(fx.sp,fx.L,false,fx.variant,fx.colors), pre=ft<fx.reel||fx.snap, land=landPos(), hp0=fx.hook;
    hang=hangPos(fx.big,fx.L); var hx2, hy2, th2;
    if(fx.snap&&ft>=fx.reel*0.85){ var ks=Math.min(1,(ft-fx.reel*0.85)/1100); hx2=land[0]; hy2=land[1]+1+(fy-land[1])*ks*ks; th2=ks*1.2;
      if(!fx.breached){ fx.breached=true; splash(land[0],wt,false,th.ice); } }
    else if(pre){ var kr=easeIO(Math.min(1,ft/fx.reel)); hx2=hp0[0]+(land[0]-hp0[0])*kr; hy2=hp0[1]+(land[1]+1-hp0[1])*kr; th2=Math.sin(ft/90)*0.08;
      if(m==='troll'){ var jumps=Math.sin(kr*Math.PI*2); if(jumps>0) hy2-=jumps*(10+fx.L*0.3); }
      if(!reduceMotion&&ft>fx.reel-500){ shakeUntil=Math.max(shakeUntil,ms+40); shakeAmp=Math.max(shakeAmp,0.6); } }
    else { var kh=Math.min(1,(ft-fx.reel)/HAUL); hx2=land[0]+(hang[0]-land[0])*kh; hy2=(land[1]+1)+(hang[1]-(land[1]+1))*easeOutBack(kh); var sec=(ft-fx.reel)/1000; th2=(0.5*Math.exp(-sec/1.6)+0.05)*Math.sin(sec*3.2)*(fx.big?0.55:1);
      if(!fx.breached){ fx.breached=true; splash(land[0],wt,fx.big,th.ice); }
      if(fx.legend&&kh>=1&&Math.random()<dt*4) parts.push({k:'spark',x:hang[0]+(Math.random()-0.5)*(fx.L*0.6+10),y:hang[1]+Math.random()*fx.L,vx:(Math.random()-0.5)*6,vy:-4-Math.random()*6,g:0,c:Math.random()<0.5?'#FFC94A':'#FFFFFF',sz:1,life:0.8+Math.random()*0.8});
      if(!fx.sparked&&kh>=1){ fx.sparked=true; if(fx.variant||fx.legend||fx.newBest){ sparkle(hang[0],hang[1],fx.L); } if(fx.legend){ sparkle(hang[0],hang[1],fx.L); sparkle(hang[0],hang[1],fx.L); } } }
    if(fx.out&&!fx.snap){ var ko=Math.min(1,(ms-fx.out)/700); hy2-=(hy2+fx.L+30)*ko*ko; }
    F={ft:ft,cs:cs,x:Math.round(hx2),y:Math.round(hy2),th:th2,pre:pre};
    if(pre){ var al=1; if(fx.snap&&ft>=fx.reel*0.85) al=Math.max(0,1-(ft-fx.reel*0.85)/1100); if(m==='deep') al=Math.min(al,0.25+0.75*Math.min(1,ft/fx.reel)); if(m==='troll'&&F.y<wt) al=1; else if(F.y>wt) al*=0.85; ctx.globalAlpha=al; drawHero(cs,F.x,F.y,F.th); ctx.globalAlpha=1; }
  }

  /* surface: ice, dock, boats */
  var aX=anglerX(), aY=horizonY-18, hop=(F&&!F.pre&&!fx.out&&F.ft<fx.reel+HAUL+3500&&Math.floor(F.ft/170)%2)?1:0;
  if(th.ice){
    var gapL=holeX()-5, gapR=holeX()+5, snow=shade('#F4F9FC',dkL*0.8), ice=shade('#BFE3F2',dkL*0.8), ice2=shade('#A2D0E6',dkL*0.8), iceLo=shade('#6FA6C2',dkL*0.8);
    for(x=0;x<W;x++){ if(x>=gapL&&x<=gapR) continue; R(x,horizonY,1,2,snow); R(x,horizonY+2,1,ICE_H-3,ice); if(hash(x*1.7)<0.12) R(x,horizonY+3,1,ICE_H-4,ice2); R(x,horizonY+ICE_H-1,1,1,iceLo); }
    R(gapL-3,horizonY-1,3,1,snow); R(gapR+1,horizonY-1,3,1,snow); P(gapL-2,horizonY-2,snow); P(gapR+2,horizonY-2,snow);
    R(gapL,horizonY+2,gapR-gapL+1,ICE_H-2,shade(th.water[0],dkL)); R(gapL+1,horizonY+2,gapR-gapL-1,1,'rgba(255,255,255,0.35)');
    ctx.fillStyle=shade('#3E6E8C',dkL*0.7); cracks.forEach(function(c){ ctx.fillRect(holeX()+c[0],horizonY+c[1],1,1); });
    debris.forEach(function(d){ R(holeX()+d.dx,d.y,d.sz,d.sz,shade(d.c,dkL*0.8)); });
    aY=horizonY-18-hop;
  }
  if(m==='shore'){
    var de=dockEnd(), pl=shade('#8A6A3A',0.2+dkL), pd=shade('#5A4020',0.25+dkL), gr=shade(th.ground||'#4E7A3A',0.2+dkL);
    if(th.beach){ // sand running down into the surf, with foam that washes in and out
      var wet=shade('#B8A06A',0.2+dkL); for(x=0;x<de+8;x++){ var gy3=horizonY-3+Math.max(0,Math.round((x-de+4)*0.6)); R(x,gy3,1,wt-gy3+3,x>de-6?wet:gr); }
      var sw=Math.round(Math.sin(t*1.4)*3); for(x=de-4+sw;x<de+14+sw;x++) if((x+Math.floor(t*3))%3) P(x,wt+(x>de+8+sw?1:0),'rgba(250,252,255,'+(0.75*Math.max(0.3,lt)).toFixed(2)+')');
      for(x=de+20;x<W;x+=1){ var f=Math.sin(x*0.21+t*1.8)+Math.sin(x*0.07-t*0.9); if(f>1.3) P(x,wt+2+Math.round(Math.sin(x*0.5)),'rgba(240,248,255,'+(0.45*Math.max(0.3,lt)).toFixed(2)+')'); }
    } else {
      for(x=0;x<de-18;x++){ var gy2=horizonY-3-Math.round(Math.sin(x*0.3)*0.5); R(x,gy2,1,wt-gy2+2,gr); }
      R(de-22,horizonY-4,22,2,pl); R(de-22,horizonY-2,22,1,pd); for(x=de-20;x<de;x+=5) R(x,horizonY-1,1,wt-horizonY+8,pd);
    }
    aY=horizonY-18-hop;
    /* rods for other lines, stuck in a holder on the dock */
    var ls=S.hooks.lines?S.hooks.lines():[]; var selI=S.hooks.sel?S.hooks.sel():0;
    ls.forEach(function(l){ if(l.idx===selI) return; var rx=de-20+l.idx*3, bx=bobberX(l.idx), hooked=Date.parse(l.biteAt)<=root.NET.now(); line(rx,horizonY-4,rx+3,horizonY-14,'#3B2A1E'); ctx.fillStyle='rgba(230,240,250,0.5)'; line(rx+3,horizonY-14,bx,wt-1,'rgba(230,240,250,0.45)'); drawBobber(bx,wt,hooked,t); });
  }
  var boatInfo=null;
  if(m==='boat'||m==='troll'||m==='deep'){ var bob=Math.round(Math.sin(t*(m==='boat'?1.3:1.1))*1); boatInfo=drawBoat(aX,bob,wt,t,m==='troll'); aY=horizonY-20+bob-hop; }
  /* crane for giants */
  var craneTip=null;
  if(fx&&fx.big){ var fromLeft=(m==='boat'||m==='troll'||m==='deep'), tgt=fromLeft?hang[0]-34:hang[0]+10, k1=Math.min(1,F.ft/1100), startX=fromLeft?-30:W+2, cxx=startX+(tgt-startX)*(1-Math.pow(1-k1,3)); if(fx.out){ var ko2=Math.max(0,(ms-fx.out-250)/900); cxx=tgt+((fromLeft?-60:W+40)-tgt)*ko2*ko2; } cxx=Math.round(cxx);
    var baseY=th.ice?horizonY:(m==='shore'?horizonY-3:horizonY-2);
    if(fromLeft){ R(cxx-4,baseY,26,3,shade('#6A4A2A',dkL)); R(cxx-3,baseY+3,24,2,shade('#3A2A1A',dkL)); }
    craneTip=[fromLeft?cxx+22:cxx-10,Math.max(2,hang[1]-7)]; drawCrane(cxx,baseY,craneTip[0],craneTip[1],dkL,ms); }

  /* angler */
  var fX=aX-(fx&&fx.big&&(m==='ice'||m==='shore')?Math.min(12,Math.max(0,Math.round(A.fishCanvas(fx.sp,fx.L,false,fx.variant,fx.colors).height/2)-6)):0), fY=aY;
  drawCrew(m,aX,aY,t,wt,fy,boatInfo);
  ctx.drawImage(A.fisherCanvas(S.hooks.outfit()),fX,fY);
  if(lt<0.5){ var g2=ctx.createRadialGradient(fX-3,fY+15,0,fX-3,fY+15,22); g2.addColorStop(0,'rgba(255,200,110,'+(0.35*(1-lt*2)).toFixed(2)+')'); g2.addColorStop(1,'rgba(255,200,110,0)'); ctx.fillStyle=g2; ctx.fillRect(fX-26,fY-8,48,40); }
  A.drawSprite(ctx,[".k.","yYy","yYy","kkk"],{k:'#2A2A2A',y:'#C98A12',Y:'#FFE08A'},fX-4,fY+14);
  /* rod and line for the selected line */
  var line0=selLine(), onLine=line0&&Date.parse(line0.biteAt)<=root.NET.now(), dip=onLine?3+Math.round(Math.sin(t*24)*1.5):0;
  var handX=fX+11, handY=fY+9, tipX, tipY;
  if(m==='ice'){ tipX=holeX(); tipY=horizonY-15+dip; }
  else if(m==='shore'){ tipX=fX+26; tipY=fY-6+dip; }
  else if(m==='boat'){ tipX=fX+22; tipY=fY-4+dip; }
  else if(m==='troll'){ tipX=fX-14; tipY=fY-2+dip; }
  else { tipX=fX-12; tipY=fY-4+dip; }
  if(F){ if(F.pre) tipY+=Math.round(Math.sin(t*30)); else if(!fx.big) tipY-=Math.round(9*Math.min(1,(F.ft-fx.reel)/HAUL))+hop; else tipY-=hop; }
  line(handX,handY,tipX,tipY,'#3B2A1E'); P(handX-1,handY+1,'#C0392B');
  var castK=castAnim?Math.min(1,(ms-castAnim)/700):1;
  if(F){
    ctx.fillStyle='rgba(230,240,250,0.85)';
    if(fx.snap&&F.ft>=fx.reel*0.85) R(tipX,tipY+1,1,6,'rgba(230,240,250,0.85)');
    else if(F.pre||!fx.big){ line(tipX,tipY+1,F.x,F.y-2,'rgba(230,240,250,0.85)'); }
    else R(tipX,tipY+1,1,4,'rgba(230,240,250,0.85)');
    if(craneTip&&!F.pre){ line(craneTip[0],craneTip[1]+1,F.x,F.y-2,'#2A2E38'); A.drawSprite(ctx,["yYy",".y."],{y:'#C98A12',Y:'#FFE08A'},F.x-1,F.y-3); }
    if(!F.pre) drawHero(F.cs,F.x,F.y,F.th);
    if(!F.pre&&!fx.out&&!fx.snap&&Math.random()<dt*(fx.big?6:3)){ var tw=F.cs.width-2; parts.push({k:'drop',x:F.x-tw*Math.sin(F.th),y:F.y+tw*Math.cos(F.th),vx:0,vy:4,g:75,c:'#8ED0EE',sz:1,life:3}); }
    if(fx.out&&ms-fx.out>(fx.big?1250:fx.snap?100:750)){ fx=null; if(S.hooks.afterCatch) setTimeout(S.hooks.afterCatch,0); }
  } else if(line0){
    var hp=hookPos(line0.idx,line0.bait), curX=Math.round(tipX+(hp[0]-tipX)*(reduceMotion?1:castK)), curY=Math.round(tipY+(hp[1]-tipY)*(reduceMotion?1:(castK<1?Math.sin(castK*Math.PI/2):1)));
    if(m==='shore'){ /* line arcs out to the bobber, hook hangs below it */
      var bx2=Math.round(tipX+(hp[0]-tipX)*castK), by2=wt-1-(castK<1?Math.round(Math.sin(castK*Math.PI)*14):0);
      ctx.fillStyle='rgba(230,240,250,0.6)'; for(i=0;i<=20;i++){ var q=i/20, lx2=Math.round(tipX+(bx2-tipX)*q), ly2=Math.round(tipY+(by2-tipY)*q-Math.sin(q*Math.PI)*6); ctx.fillRect(lx2,ly2,1,1); }
      if(castK>=1){ R(bx2,by2+1,1,hp[1]-by2-1,'rgba(230,240,250,0.5)'); drawBobber(bx2,wt,onLine,t); if(onLine) drawHookedShadow(line0,bx2,hp[1],t); else { hookBait(line0.bait,bx2-2,hp[1]); P(bx2,hp[1],'#C9CED6'); } }
      else drawBobber(bx2,by2,false,t);
    } else if(m==='troll'){
      var lx3=lureX(line0.idx), skip=Math.round(Math.abs(Math.sin(t*5+line0.idx))*2);
      line(tipX,tipY+1,lx3,wt-skip,'rgba(230,240,250,0.6)');
      if(onLine) drawHookedShadow(line0,lx3,wt+6,t); else { hookBait('lure',lx3-3,wt-3-skip); for(i=0;i<3;i++) P(lx3+1+i,wt+(i%2),'rgba(240,250,255,0.6)'); }
    } else {
      R(tipX,tipY+1,1,Math.max(0,curY-tipY-1),'rgba(230,240,250,0.75)');
      if(m==='deep'){ R(curX-1,curY+1,3,2,'#5A6476'); }
      if(onLine) drawHookedShadow(line0,curX,curY,t); else { hookBait(line0.bait,curX-2,curY); P(curX,curY,'#C9CED6'); }
    }
    /* other lines: tip-ups on ice, rod holders on boats */
  } else {
    R(tipX,tipY+1,1,5,'rgba(230,240,250,0.75)'); hookBait(S.hooks.bait?S.hooks.bait():'worm',tipX-2,tipY+6);
  }
  drawOtherLines(m,t,th,dkL,fy,wt);

  /* particles */
  for(i=parts.length-1;i>=0;i--){ var q2=parts[i]; q2.life-=dt; q2.vy+=q2.g*dt; q2.x+=q2.vx*dt; q2.y+=q2.vy*dt; var inHole=Math.abs(q2.x-holeX())<=5;
    if(q2.k==='ice'&&q2.vy>0&&!inHole&&q2.y>=horizonY-q2.sz&&q2.y<horizonY+5){ if(debris.length<220) debris.push({dx:Math.round(q2.x)-holeX(),y:horizonY-q2.sz,c:q2.c,sz:q2.sz}); parts.splice(i,1); continue; }
    if(q2.k==='drop'&&q2.vy>0&&q2.y>=wt-1){ parts.splice(i,1); continue; }
    if(q2.life<=0||q2.y>H||q2.x<-4||q2.x>W+4){ parts.splice(i,1); continue; }
    if(q2.k==='spark'&&q2.life<0.3&&Math.random()<0.5) continue;
    R(Math.round(q2.x),Math.round(q2.y),q2.sz,q2.sz,q2.k==='spark'&&Math.floor(q2.life*10)%2?'#FFFFFF':q2.c); }
  if(ms<shakeUntil){ canvas.style.transform='translate('+Math.round((Math.random()-.5)*2*shakeAmp)*px+'px,'+Math.round((Math.random()-.5)*2*shakeAmp)*px+'px)'; } else if(shakeAmp){ shakeAmp=0; canvas.style.transform=''; }
  /* weather */
  if(storm){ R(0,0,W,wt,'rgba(225,232,240,0.10)'); for(i=0;i<170;i++){ var wx3=Math.floor((hash(i*3.7)*W*1.5+t*(34+hash(i)*20))%(W*1.5))-W*0.25, wy3=Math.floor((hash(i*6.1)*(horizonY+6)+t*(16+hash(i+5)*10))%(horizonY+6)); P(Math.round(wx3+wy3*0.6)%W,wy3,'rgba(255,255,255,'+(0.55+0.4*hash(i+2)).toFixed(2)+')'); } }
  else if(th.snow){ for(i=0;i<36;i++){ var sxx=Math.floor((hash(i*2.3)*W+t*(3+hash(i)*4)+Math.sin(t+i)*3)%W), syy=Math.floor((hash(i*5.1)*horizonY+t*(6+hash(i+2)*6))%horizonY); P((sxx+W)%W,syy,'rgba(255,255,255,'+(0.5+0.4*hash(i+9)).toFixed(2)+')'); } }
  if(rain){ for(i=0;i<90;i++){ var rx2=Math.floor((hash(i*2.9)*W+t*6)%W), ry2=Math.floor((hash(i*4.7)*wt+t*(60+hash(i)*30))%wt); R(rx2,ry2,1,3,'rgba(200,220,255,0.45)'); } }
  if(flash&&ms-flash<900){ ctx.fillStyle='rgba(255,220,120,'+(0.35*(1-(ms-flash)/900)).toFixed(3)+')'; ctx.fillRect(0,0,W,H); }
};
function drawBoat(aX,bob,wt,t,moving){
  var id=S.hooks.boat?S.hooks.boat():'paddle', bb=A.boat(id), x0=aX-bb.stand, top=horizonY-2-bb.deck+bob;
  A.drawSprite(ctx,bb.rows,bb.map,x0,top);
  /* the part below the waterline sits in the water */
  ctx.fillStyle='rgba(20,70,120,0.55)'; for(var y=Math.max(wt,top);y<top+bb.h;y++){ var row=bb.rows[y-top]; for(var x=0;x<row.length;x++) if(row[x]!=='.') ctx.fillRect(x0+x,y,1,1); }
  ctx.fillStyle='rgba(230,245,255,0.55)'; for(x=0;x<bb.w;x+=2) ctx.fillRect(x0+x+((Math.floor(t*4))&1),wt,1,1);
  if(moving){ for(var i=0;i<18;i++){ var wx=x0-1-i*2-Math.floor((t*18)%2), wy=wt+Math.round(Math.sin(i*0.8+t*4)*1); P(wx,wy,'rgba(240,250,255,'+(0.7-i*0.035).toFixed(2)+')'); } for(i=0;i<8;i++) P(x0+bb.w+i-2,wt+1+(i%2),'rgba(240,250,255,0.5)'); }
  if(bb.devboat){ // neon underglow on the water and blinking nav lights
    var gl=0.25+0.15*Math.sin(t*2.4); for(x=4;x<bb.w-8;x++){ var a=gl*(1-Math.abs(x-bb.w/2)/(bb.w/2)); ctx.fillStyle='rgba(60,240,255,'+a.toFixed(3)+')'; ctx.fillRect(x0+x,wt+1+(x%3===0?1:0),1,2); }
    (bb.lights||[]).forEach(function(L,i){ if(Math.floor(t*2+i*0.7)%2===0){ ctx.globalAlpha=0.35; ctx.fillStyle=L[2]; ctx.fillRect(x0+L[0]-1,top+L[1]-1,3,3); ctx.globalAlpha=1; P(x0+L[0],top+L[1],L[2]); } });
  }
  return {x0:x0,top:top,bb:bb};
}
/* friends on your crew: they stand next to you with their own rods */
function drawCrew(m,aX,aY,t,wt,fy,bi){
  var crew=S.hooks.crew?S.hooks.crew():[]; if(!crew.length) return;
  crew.forEach(function(c,k){
    var dir=(m==='shore'||m==='ice')?-1:1, x=aX+dir*16*(k+1); if(x<2||x>W-16) x=aX-dir*16*(k+1);
    var fc=A.fisherCanvas(c.outfit||root.OC.DEFAULT_OUTFIT), seat=bi&&bi.bb.seats&&bi.bb.seats[k];
    if(seat){ x=bi.x0+seat[0]-Math.round(fc.width/2); aY=bi.top+seat[1]-fc.height; } // big boats: everyone gets a spot on one of the decks
    ctx.save(); ctx.translate(x+fc.width,0); ctx.scale(-1,1); ctx.drawImage(fc,0,aY); ctx.restore();
    var hooked=(c.lines||[]).some(function(l){ return Date.parse(l.biteAt)<=root.NET.now(); }), out=(c.lines||[]).length>0;
    var hx=x-2, hy=aY+9, tx=x-10, ty=aY-6+(hooked?3+Math.round(Math.sin(t*24)*1.5):0);
    line(hx,hy,tx,ty,'#3B2A1E');
    if(out){ var depth=m==='troll'?wt:Math.min(fy-6,wt+Math.round((fy-wt)*0.5)); line(tx,ty+1,m==='troll'?tx-18:tx,depth,'rgba(230,240,250,0.55)'); if(hooked){ R(x+2,aY-8+Math.floor(t*6)%2,3,5,'#E5484D'); P(x+3,aY-2,'#E5484D'); } }
    var mx=x+5, my=aY-6+(Math.floor(t*2)%2); A.drawSprite(ctx,["kkkkk","kGGGk",".kGk.","..k.."],{k:'#14294C',G:'#5CF08A'},mx-2,my);
  });
}
function drawOtherLines(m,t,th,dkL,fy,wt){
  var ls=S.hooks.lines?S.hooks.lines():[], selI=S.hooks.sel?S.hooks.sel():0;
  if(m==='ice'){ drawTipups(ls,selI,t,th,dkL); return; }
  if(m==='shore') return;
  ls.forEach(function(l){ if(l.idx===selI) return; var hooked=Date.parse(l.biteAt)<=root.NET.now(), wig=hooked?Math.round(Math.sin(t*20)*2):0;
    if(m==='boat'){ var rx=Math.round(W/2)-18+l.idx*4; line(rx,horizonY-4,rx+3,horizonY-15-wig,'#3B2A1E'); var hp=hookPos(l.idx,l.bait); line(rx+3,horizonY-15-wig,rx+4,Math.min(hp[1],fy-2),'rgba(230,240,255,0.35)'); if(hooked) R(rx+2,horizonY-19,4,3,'#E5484D'); }
    else { var bx=bigX(), hx=bx+3+(l.idx%2)*5, top=horizonY-13+7; line(hx,top,hx-5,top-9-wig,'#3B2A1E'); if(m==='troll') line(hx-5,top-9-wig,lureX(l.idx),wt-1,'rgba(230,240,255,0.35)'); else line(hx-5,top-9-wig,hx-6,fy-6,'rgba(230,240,255,0.35)'); if(hooked) R(hx-7,top-13,4,3,'#E5484D'); }
  });
}
function drawBobber(x,y,hooked,t){ var dipB=hooked?2+Math.round(Math.sin(t*20)):Math.round(Math.sin(t*2+x)*0.5); R(x-1,y-2+dipB,3,2,'#E5484D'); R(x-1,y+dipB,3,1,'#F4F4F4'); P(x,y-3+dipB,'#F4F4F4'); }
function drawTipups(ls,selI,t,th,dkL){ var tj=0; for(var i=0;i<4;i++){ var l=ls.filter(function(q){ return q.idx===i; })[0]; if(i===selI) continue; if(i>=(S.hooks.lineCount?S.hooks.lineCount():1)) continue;
  var tx=holeX()+24+tj*15; if(tx>W-6) tx=holeX()-36-(tj-Math.max(0,Math.floor((W-6-holeX()-24)/15)+1))*15; tj++;
  R(tx-2,horizonY,5,2,shade(th.water[0],dkL)); if(!l) continue; var up=Date.parse(l.biteAt)<=root.NET.now(), wave=Math.floor(t*6)%2;
  R(tx-4,horizonY-1,9,1,'#6A4A2A'); R(tx,horizonY-5,1,5,'#6A4A2A');
  if(up){ R(tx,horizonY-13,1,8,'#3A2A1A'); R(tx+1,horizonY-13+wave,4,3,'#E5484D'); R(tx+1,horizonY-13+wave,4,1,'#FF8A8D'); } else R(tx+1,horizonY-3,2,2,'#E07A2A'); } }
function drawHookedShadow(l,x,y,t){ var sp=l.peekSp||'perch', L=Math.min(40,A.heroLen(l.peekLb||(D.SP_BY_ID[l.peekSp]?D.SP_BY_ID[l.peekSp].max*0.3:3))), hs=A.fishCanvas(sp,L,'#020A16'), fl=Math.floor(t*3)%2;
  ctx.globalAlpha=0.6; ctx.save(); ctx.translate(x+Math.round(Math.sin(t*9)*2),y); if(fl) ctx.scale(-1,1); ctx.drawImage(hs,-(hs.width-2),-(Math.floor(hs.height/2)+1)); ctx.restore(); ctx.globalAlpha=1;
  if(Math.random()<0.08) parts.push({k:'drop',x:x+(Math.random()-0.5)*6,y:waterTop()-1,vx:(Math.random()-0.5)*14,vy:-(8+Math.random()*14),g:75,c:'#8ED0EE',sz:1,life:2}); }
function hookBait(id,x,y){ var art=A.BAIT_ART[id]||A.BAIT_ART.worm; A.drawSprite(ctx,art.rows.slice(1,7).map(function(r){ return r.slice(1,7); }),art.map,x,y); }

/* ---- travel scene: a bus, plane or boat crossing a little landscape ---- */
S.travel=function(cv,by,from,to,ms){
  var c=cv.getContext('2d'), w=cv.width, h=cv.height, k=Math.min(1,ms/2600); c.imageSmoothingEnabled=false;
  var sky=skyAt(12,'temperate'); for(var y=0;y<h;y++){ c.fillStyle=rgb(mixC(sky[0],sky[1],y/h)); c.fillRect(0,y,w,1); }
  c.fillStyle='#4E7A3A'; c.fillRect(0,h-10,w,10); c.fillStyle='#3A5A2A'; for(var x=0;x<w;x+=6) c.fillRect(x,h-12+(x%12?0:1),4,2);
  if(by==='charter'){ c.fillStyle='#1E6AB8'; c.fillRect(0,h-12,w,12); for(x=0;x<w;x+=5) { c.fillStyle='rgba(240,250,255,0.6)'; c.fillRect((x+Math.floor(ms/80))%w,h-12+(x%10?0:1),2,1); } }
  var vx=Math.round(-40+(w+40)*k), vy=by==='plane'?Math.round(h*0.35-Math.sin(k*Math.PI)*10):h-22;
  var old=ctx; ctx=c;
  if(by==='plane') A.drawSprite(c,["......ww........",".....wWw........","wwwwwwWWwwwwwww.","WWWWWWWWWWWWWWWW","wwwwwwWWwwwwwww.",".....wWw........","......ww........"],{w:'#C8D0D8',W:'#EAF5FF'},vx,vy);
  else if(by==='bus') A.drawSprite(c,["..YYYYYYYYYYYYYY..",".YwwYwwYwwYwwYwwY.",".YYYYYYYYYYYYYYYY.",".YYYYYYYYYYYYYYYY.","..kk..........kk.."],{Y:'#F0C030',w:'#BFE3F2',k:'#1B1F2A'},vx,vy-2);
  else A.drawSprite(c,A.BIG_BOAT,A.BIG_BOAT_MAP,vx,h-22);
  ctx=old;
  c.fillStyle='rgba(255,255,255,0.8)'; for(var i=0;i<4;i++) c.fillRect(vx-4-i*4,vy+3+(i%2),2,1);
};
if(typeof module!=='undefined'&&module.exports) module.exports=S; else root.SCENE=S;
})(typeof window!=='undefined'?window:this);

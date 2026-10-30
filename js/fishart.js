/* One Cast fish art, version 2. Every fish is built pixel by pixel from its body shape, fins, tail and pattern,
   then shaded with a four-tone ramp, outlined, and drawn only at whole-pixel sizes so it stays crisp.
   Legends get their own treatment: a glowing aura, battle scars, glowing eyes, crowns, barnacles or shimmer. */
(function(root){
'use strict';
var A=root.ART, D=root.OC;
function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
function hx(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
function toHex(a){ return '#'+a.map(function(v){ v=Math.max(0,Math.min(255,Math.round(v))); return ('0'+v.toString(16)).slice(-2); }).join(''); }
function mix(a,b,t){ var x=hx(a), y=hx(b); return toHex([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t]); }
function light(c,t){ return mix(c,'#FFFFFF',t); }
function dark(c,t){ return mix(c,'#000000',t); }

/* Body plans. tail: fork | deepfork | crescent | round | square | shark | eel | fan
   dorsal: soft | spiny | long | back | sail | tiny | none ; adipose: small fin near tail (salmon, catfish) */
var PLAN={
 longnosegar:{tail:'round',dorsal:'back',beak:2}, spottedgar:{tail:'round',dorsal:'back',beak:1}, pinfish:{tail:'fork',dorsal:'spiny',mouth:0.05},
 sheepshead:{tail:'square',dorsal:'spiny',mouth:0.06,teeth:1}, bullshark:{shark2:1},
 bream:{tail:'deepfork',dorsal:'soft',mouth:0.05}, zander:{tail:'fork',dorsal:'spiny',mouth:0.14,fangs:1}, saithe:{tail:'fork',dorsal:'triple'},
 omul:{tail:'deepfork',dorsal:'soft',adipose:1}, mahseer:{tail:'deepfork',dorsal:'soft',whisk:1}, rohu:{tail:'fork',dorsal:'soft'},
 suzuki:{tail:'fork',dorsal:'spiny',mouth:0.16,jaw:1}, madai:{tail:'fork',dorsal:'spiny',mouth:0.06}, goliathtiger:{tail:'deepfork',dorsal:'soft',adipose:1,fangs:2,jaw:1,teeth:2,mouth:0.2},
 sixgill:{tail:'shark',dorsal:'back',mouth:0.14,slits:2}, grenadier:{tail:'eel',dorsal:'spiny',mouth:0.08},
 megalodon:{shark2:1,teeth:1},
 ghostcarp:{tail:'fork',dorsal:'long',whisk:1}, pumpkinbass:{tail:'square',dorsal:'spiny',mouth:0.2,jaw:1}, phantomdrum:{tail:'square',dorsal:'spiny',ocellus:1},
 brook:{tail:'square',dorsal:'soft',adipose:1}, chub:{tail:'fork',dorsal:'soft'},
 reddrum:{tail:'square',dorsal:'spiny',ocellus:1}, bluefish:{tail:'fork',dorsal:'spiny',mouth:0.15,jaw:1}, spot:{tail:'fork',dorsal:'spiny',mouth:0.05},
 croaker:{tail:'square',dorsal:'spiny',whisk:1}, pompano:{tail:'deepfork',dorsal:'soft'}, flounder:{tail:'fan',dorsal:'flat'}, spanish:{tail:'crescent',dorsal:'spiny',finlets:1},
 bluegill:{tail:'square',dorsal:'spiny',mouth:0.05}, pumpkinseed:{tail:'square',dorsal:'spiny',mouth:0.05}, perch:{tail:'fork',dorsal:'spiny'},
 crappie:{tail:'square',dorsal:'spiny',mouth:0.1}, largemouth:{tail:'square',dorsal:'spiny',mouth:0.2,jaw:1}, smallmouth:{tail:'square',dorsal:'spiny',mouth:0.15,jaw:1},
 spotted:{tail:'square',dorsal:'spiny',mouth:0.16,jaw:1}, striper:{tail:'fork',dorsal:'spiny'}, carp:{tail:'fork',dorsal:'long',whisk:1},
 channel:{tail:'deepfork',dorsal:'tiny',adipose:1,flathead:1}, bluecat:{tail:'deepfork',dorsal:'tiny',adipose:1,flathead:1}, flathead:{tail:'square',dorsal:'tiny',adipose:1,flathead:2,jaw:1},
 walleye:{tail:'fork',dorsal:'spiny',mouth:0.12}, pike:{tail:'fork',dorsal:'back',mouth:0.22,duck:1}, muskie:{tail:'fork',dorsal:'back',mouth:0.22,duck:1},
 cisco:{tail:'deepfork',dorsal:'soft',adipose:1}, whitefish:{tail:'deepfork',dorsal:'soft',adipose:1}, laketrout:{tail:'deepfork',dorsal:'soft',adipose:1},
 burbot:{tail:'round',dorsal:'eel',whisk:1}, chinook:{tail:'fork',dorsal:'soft',adipose:1,hook:1}, coho:{tail:'fork',dorsal:'soft',adipose:1,hook:1},
 steelhead:{tail:'square',dorsal:'soft',adipose:1}, rainbow:{tail:'square',dorsal:'soft',adipose:1}, brown:{tail:'square',dorsal:'soft',adipose:1},
 kokanee:{tail:'fork',dorsal:'soft',adipose:1}, sturgeon:{tail:'shark',dorsal:'back',scutes:1}, gar:{tail:'round',dorsal:'back',beak:1},
 drum:{tail:'round',dorsal:'spiny'}, bowfin:{tail:'round',dorsal:'long'}, floridagar:{tail:'round',dorsal:'back',beak:1},
 peacock:{tail:'round',dorsal:'spiny',mouth:0.16,jaw:1,ocellus:1}, snook:{tail:'fork',dorsal:'spiny',mouth:0.14,jaw:1}, tarpon:{tail:'deepfork',dorsal:'soft',jaw:1,mouth:0.16},
 bonefish:{tail:'deepfork',dorsal:'soft'}, permit:{tail:'crescent',dorsal:'soft'}, barracuda:{tail:'fork',dorsal:'back',mouth:0.2,jaw:1,fangs:1},
 snapper:{tail:'fork',dorsal:'spiny'}, goliath:{tail:'round',dorsal:'spiny',mouth:0.22,jaw:1}, halibut:{tail:'fan',dorsal:'flat'},
 lingcod:{tail:'round',dorsal:'spiny',mouth:0.2,jaw:1}, yellowfin:{tail:'crescent',dorsal:'tuna',finlets:1}, bluefin:{tail:'crescent',dorsal:'tuna',finlets:1},
 marlin:{tail:'crescent',dorsal:'sail',bill:1}, mahi:{tail:'crescent',dorsal:'mahi'}, wahoo:{tail:'crescent',dorsal:'long',finlets:1},
 gt:{tail:'crescent',dorsal:'soft',scutes2:1}, arapaima:{tail:'round',dorsal:'back'}, piranha:{tail:'square',dorsal:'soft',adipose:1,fangs:1,jaw:1},
 redtail:{tail:'fork',dorsal:'tiny',adipose:1,flathead:1}, payara:{tail:'fork',dorsal:'back',fangs:2,jaw:1}, nileperch:{tail:'round',dorsal:'spiny',hump:1},
 tigerfish:{tail:'deepfork',dorsal:'soft',adipose:1,fangs:1}, vundu:{tail:'fork',dorsal:'tiny',adipose:1,flathead:1}, wels:{tail:'round',dorsal:'tiny',anal:1,flathead:2},
 atlanticsalmon:{tail:'square',dorsal:'soft',adipose:1}, eel:{tail:'eel',dorsal:'eel'}, taimen:{tail:'square',dorsal:'soft',adipose:1,mouth:0.12},
 lenok:{tail:'fork',dorsal:'soft',adipose:1}, siamesecarp:{tail:'fork',dorsal:'long'}, mekong:{tail:'fork',dorsal:'tiny',adipose:1,flathead:1},
 biwatrout:{tail:'square',dorsal:'soft',adipose:1}, murraycod:{tail:'round',dorsal:'spiny',mouth:0.2,jaw:1}, goldenperch:{tail:'round',dorsal:'spiny'},
 barramundi:{tail:'round',dorsal:'spiny',jaw:1,mouth:0.14}, coraltrout:{tail:'square',dorsal:'spiny',mouth:0.14}, char:{tail:'square',dorsal:'soft',adipose:1},
 cod:{tail:'square',dorsal:'triple',whisk:1}, ghalibut:{tail:'fan',dorsal:'flat'}, greenlandshark:{tail:'shark',dorsal:'shark'},
 toothfish:{tail:'square',dorsal:'spiny',mouth:0.16,jaw:1}, icefish:{tail:'round',dorsal:'spiny',beak:2}, tilapia:{tail:'square',dorsal:'spiny'},
 sharptooth:{tail:'round',dorsal:'eel',whisk:1,flathead:2}, grayling:{tail:'fork',dorsal:'sail',adipose:1}, dolly:{tail:'square',dorsal:'soft',adipose:1},
 rockfish:{tail:'square',dorsal:'spiny'}, amberjack:{tail:'crescent',dorsal:'soft'}, gag:{tail:'square',dorsal:'spiny',mouth:0.16,jaw:1},
 silverperch:{tail:'fork',dorsal:'spiny'}, notothen:{tail:'round',dorsal:'spiny',mouth:0.14}, snakehead:{tail:'round',dorsal:'eel',mouth:0.14},
 herring:{tail:'deepfork',dorsal:'soft'}, sculpin:{tail:'round',dorsal:'spiny',mouth:0.18,jaw:1}, polarcod:{tail:'square',dorsal:'triple'}, opelu:{tail:'deepfork',dorsal:'spiny',finlets:1}, silverfish:{tail:'fork',dorsal:'long'}
};
A.PLAN=PLAN;

/* Legend traits. Hand-picked for the Season 1 legends, made up from the name for the rest. */
var LEGEND_FX={
 'Old Bucketmouth':['scars','moss'],'Mudbelly':['scars','glow'],'The Texas Hog':['crown','scars'],'The Subway Carp':['shimmer','crown'],
 "Nessie's Shadow":['glow','smoke'],'The Iron Sturgeon':['armor','barnacles'],'The Swamp King':['crown','moss','scars'],'Big Mama':['crown','scars'],
 'Megalodon':['scars','scars2','glow','abyss'], 'Old Scar':['scars','scars2','glow'],'The Silver Ghost':['shimmer','ghost'],'The Wreck Keeper':['barnacles','moss','glow'],'The River Dragon':['armor','crown','glow'],
 'The Kena King':['crown','shimmer'],'The Kenai King':['crown','shimmer'],'The Kona Ghost':['ghost','shimmer'],'The Blue Emperor':['crown','shimmer'],'The Arapaima Queen':['crown','glow'],
 'Grandfather Redtail':['scars','moss'],'Mputa the Giant':['scars','crown'],'The Striped Devil':['glow','fangs'],'El Monstruo':['glow','moss','scars'],
 'The River Wolf':['scars','glow'],'The Golden Buddha':['shimmer','crown'],'The Biwa Record':['crown'],'The Old Man of the Murray':['moss','scars'],
 'The Reef Bull':['scars','armor'],'The Ice Queen':['crown','frost'],'The Leviathan':['barnacles','scars','glow','smoke'],'The Abyss King':['crown','glow','smoke'],
 'The Walleye Mayor':['crown','glow'],'Thunderjaw':['scars','glow'],'Grandmother Sturgeon':['moss','barnacles'],'The Barn Door':['barnacles','scars']
};
var ALL_FX=['scars','crown','glow','shimmer','moss','barnacles','armor','ghost','frost','smoke'];
function legendFx(colors){
  if(!colors) return null;
  var pr=(D&&D.LEGEND_PRESETS||[]).filter(function(p){ return p.colors.b===colors.b&&p.colors.d===colors.d&&p.colors.bel===colors.bel; })[0];
  if(pr&&LEGEND_FX[pr.name]) return LEGEND_FX[pr.name];
  var h=0, s=JSON.stringify(colors); for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  var a=ALL_FX[h%ALL_FX.length], b=ALL_FX[(h>>5)%ALL_FX.length]; return a===b?[a,'glow']:[a,b];
}
A.legendFx=legendFx;

/* ---------- the grid ---------- */
/* A real shark silhouette (used for the Megalodon): torpedo body with a pointed snout, a tall triangular dorsal fin,
   a tail whose top half is longer, long pectoral fins, five gill slits and dark-over-white counter-shading. */
A.sharkGrid=function(lk,plan,L,fx){
  fx=fx||[]; function has(k){ return fx.indexOf(k)>=0; }
  var aura=fx.length?3:0, H=Math.max(3,Math.round(L*0.135)), T=Math.round(L*0.22);
  var padT=Math.round(H*1.35)+2, padB=Math.round(H*1.0)+2, GW=L+4+aura*2, GH=padT+2*H+padB+aura*2, cy=aura+padT+H;
  var g=[]; for(var y=0;y<GH;y++) g.push(new Array(GW).fill(null));
  function set(x,y,c){ if(x>=0&&x<GW&&y>=0&&y<GH) g[y][x]=c; } function get(x,y){ return (x>=0&&x<GW&&y>=0&&y<GH)?g[y][x]:null; }
  var x0=1+aura, xb=x0+T, xn=x0+L-1, span=xn-xb, x, u, tops=[], bots=[], mids=[];
  function U(u){ return xb+Math.round(u*span); }
  function half(u){ return u<0.55?H*(0.3+0.7*Math.sin(Math.PI/2*u/0.55)):H*Math.pow(Math.max(0,Math.cos(Math.PI/2*(u-0.55)/0.45)),0.7); }
  function mid(u){ return cy-(u>0.72?(u-0.72)/0.28*H*0.4:0); }
  function tri(px,py,a,b,c){ function sd(p1,p2,p3){ return (p1[0]-p3[0])*(p2[1]-p3[1])-(p2[0]-p3[0])*(p1[1]-p3[1]); } var d1=sd([px,py],a,b), d2=sd([px,py],b,c), d3=sd([px,py],c,a); return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)); }
  function fillTri(a,b,c,col){ var minx=Math.floor(Math.min(a[0],b[0],c[0])), maxx=Math.ceil(Math.max(a[0],b[0],c[0])), miny=Math.floor(Math.min(a[1],b[1],c[1])), maxy=Math.ceil(Math.max(a[1],b[1],c[1]));
    for(var yy=miny;yy<=maxy;yy++) for(var xx=minx;xx<=maxx;xx++) if(tri(xx+0.5,yy+0.5,a,b,c)&&!get(xx,yy)) set(xx,yy,col); }
  /* tail: long upper lobe sweeping up and back, short lower lobe */
  var pH=half(0);
  fillTri([xb+1,cy-pH],[x0,cy-H*1.3],[xb+1,cy+pH*0.4],'F'); fillTri([x0,cy-H*1.3],[x0+T*0.35,cy-H*1.05],[xb-T*0.25,cy],'F');
  fillTri([xb+1,cy],[x0+T*0.35,cy+H*0.95],[xb+1,cy+pH],'F');
  /* body with counter-shading: dark back, slate sides, white belly with a ragged edge */
  for(x=xb;x<=xn;x++){ u=(x-xb)/span; var h=half(u), m=mid(u), t=Math.round(m-h*1.05), b=Math.round(m+h*0.9); if(b<t) b=t; tops[x]=t; bots[x]=b; mids[x]=m;
    for(y=t;y<=b;y++){ var v=(y-t)/Math.max(1,b-t), edge=0.63+0.05*Math.sin(x*0.7)+0.03*Math.sin(x*0.23), c;
      if(v>edge) c=(y===b)?'belD':'bel'; else if(v<0.22) c='d'; else if(v<0.27&&u>0.15&&u<0.8) c='bL'; else c='b';
      if(u>0.9&&v<0.5) c='d';
      set(x,y,c); } }
  /* tall dorsal fin (straight front edge, curved back edge), a little second dorsal near the tail */
  var dA=U(0.62), dTip=[U(0.5),tops[U(0.53)]-Math.round(H*1.25)], dB=U(0.47);
  fillTri([dA,tops[dA]+1],dTip,[dB,tops[dB]+1],'F'); fillTri(dTip,[U(0.47),tops[U(0.47)]+1],[U(0.49),tops[U(0.49)]-Math.round(H*0.5)],'F');
  fillTri([U(0.14),tops[U(0.14)]+1],[U(0.1),tops[U(0.1)]-Math.round(H*0.35)],[U(0.08),tops[U(0.08)]+1],'F');
  /* long pectoral fin sweeping back, small pelvic and anal fins */
  var pR=U(0.66), pB=U(0.58); fillTri([pR,bots[pR]-1],[pB,bots[pB]-1],[U(0.46),bots[pB]+Math.round(H*0.95)],'F');
  fillTri([U(0.3),bots[U(0.3)]-1],[U(0.25),bots[U(0.25)]-1],[U(0.21),bots[U(0.25)]+Math.round(H*0.4)],'F');
  fillTri([U(0.14),bots[U(0.14)]-1],[U(0.11),bots[U(0.11)]-1],[U(0.08),bots[U(0.11)]+Math.round(H*0.28)],'F');
  /* five gill slits */
  for(var k=0;k<5;k++){ x=U(0.7+k*0.022); var gt=tops[x]+Math.round((bots[x]-tops[x])*0.3), gb=tops[x]+Math.round((bots[x]-tops[x])*0.72); for(y=gt;y<=gb;y++) set(x-Math.round((y-gt)*0.15),y,'dD'); }
  /* mouth with a row of teeth (open a little on big ones) */
  var mx0=U(0.83), mx1=U(0.96), gape=L>70?2:L>40?1:0;
  for(x=mx0;x<=mx1;x++){ u=(x-xb)/span; var my=Math.round(mids[x]+half(u)*0.5);
    if(get(x,my)){ set(x,my,'mouth'); for(var gg=1;gg<=gape;gg++) if(get(x,my+gg)) set(x,my+gg,gg===gape?'mouth':'gum');
      if(plan.teeth&&x%2===0&&x<mx1){ if(get(x,my-1)) set(x,my-1,'tooth'); if(gape&&get(x+1,my+gape+1)) set(x+1,my+gape+1,'tooth'); } } }
  /* eye */
  x=U(0.87); var ey=Math.round(mids[x]-half((x-xb)/span)*0.3), glow=has('glow')||has('smoke')||has('abyss');
  set(x,ey,'eye'); if(L>40){ set(x+1,ey,'eye'); set(x,ey+1,'eye'); set(x+1,ey+1,'eye'); set(x,ey,'hl'); }
  if(glow){ set(x,ey,'glowC'); [[x-1,ey],[x+2,ey],[x,ey-1],[x+1,ey+2]].forEach(function(q){ if(get(q[0],q[1])) set(q[0],q[1],'glowE'); }); }
  /* battle scars */
  if(has('scars')||has('scars2')){ var ns=has('scars2')?4:2; for(var si=0;si<ns;si++){ var sx=U(0.3+0.35*hash(si*7.1+L)), sl=Math.max(3,Math.round(H*0.9)); for(k=0;k<sl;k++){ var yy=tops[sx]+2+k, xx=sx+k-Math.round(sl/2); if(get(xx,yy)==='b'||get(xx,yy)==='bL'||get(xx,yy)==='d') set(xx,yy,'scar'); } } }
  /* fins get a darker edge pattern */
  for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]==='F'&&((x+y)%3===0)) g[y][x]='FD'; }
  /* outline and aura */
  var out=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; if(get(x-1,y)||get(x+1,y)||get(x,y-1)||get(x,y+1)) out.push([x,y]); }
  out.forEach(function(q){ g[q[1]][q[0]]='out'; });
  if(aura){ var ring=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; if(get(x-1,y)==='out'||get(x+1,y)==='out'||get(x,y-1)==='out'||get(x,y+1)==='out') ring.push([x,y]); }
    ring.forEach(function(q){ g[q[1]][q[0]]='aura'; });
    var ring2=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; if(get(x-1,y)==='aura'||get(x+1,y)==='aura'||get(x,y-1)==='aura'||get(x,y+1)==='aura') ring2.push([x,y]); }
    ring2.forEach(function(q){ g[q[1]][q[0]]=hash(q[0]*3.1+q[1]*7.3)<0.06?'auraL':'auraO'; }); }
  return g;
};
A.fishGrid2=function(lk,plan,L,fx){
  plan=plan||{}; fx=fx||[];
  var has=function(k){ return fx.indexOf(k)>=0; };
  var eel=plan.tail==='eel'||lk.eel, flat=plan.dorsal==='flat';
  var Hb=Math.max(3,Math.round(L*lk.ht)); if(Hb%2===0) Hb++;
  var half=(Hb-1)/2;
  var bigDorsal=plan.dorsal==='sail'?1.5:plan.dorsal==='mahi'?0.75:plan.dorsal==='shark'?0.7:plan.dorsal==='tuna'?0.7:0.55;
  if(has('crown')) bigDorsal+=0.35;
  var padT=Math.max(2,Math.round(half*bigDorsal)+1), padB=Math.max(2,Math.round(half*0.55)+1);
  var tl=Math.max(2,Math.round(L*(eel?0.06:plan.tail==='crescent'?0.17:plan.tail==='fan'?0.12:plan.tail==='shark'?0.2:plan.tail==='round'?0.13:0.15)));
  var bill=plan.bill?Math.round(L*0.28):plan.beak===1?Math.round(L*0.12):0;
  var aura=fx.length?3:0;
  var GW=L+3+bill+aura*2, GH=Hb+padT+padB+2+aura*2;
  var g=[]; for(var y=0;y<GH;y++) g.push(new Array(GW).fill(null));
  function set(x,y,c){ if(x>=0&&x<GW&&y>=0&&y<GH) g[y][x]=c; }
  function get(x,y){ return (x>=0&&x<GW&&y>=0&&y<GH)?g[y][x]:null; }
  var cy=aura+padT+half+1, x0=1+aura, bodyStart=x0+tl, nose=x0+L-1, span=Math.max(1,nose-bodyStart);
  var tops=[], bots=[];
  /* body outline */
  for(var x=bodyStart;x<=nose;x++){
    var u=(x-bodyStart)/span, p=eel?0.25:lk.blunt?0.42:flat?0.35:(plan.duck||lk.snout)?0.75:0.55;
    var prof=Math.pow(Math.sin(Math.PI*(0.05+Math.pow(u,lk.blunt?0.75:0.9)*0.93)),p);
    if(u<0.14) prof=Math.max(prof,eel?0.75:0.32+u*1.2);
    if(eel) prof=Math.max(prof,0.7+0.3*Math.sin(Math.PI*u));
    var up=half*prof, lo=half*prof*(flat?1:0.95);
    if(plan.hump||lk.hump) up*=1+0.22*Math.sin(Math.PI*Math.min(1,u*1.4));
    if(u>0.8){ var f=(1-u)/0.2;
      if(plan.duck||plan.beak||lk.snout===2){ up*=0.22+0.78*Math.pow(f,1.1); lo*=0.3+0.7*Math.pow(f,0.9); }
      else if(lk.blunt||plan.flathead){ up*=0.6+0.4*Math.pow(f,0.5); lo*=0.62+0.38*Math.pow(f,0.5); }
      else { up*=0.3+0.7*Math.pow(f,0.6); lo*=(plan.jaw?0.5:0.35)+(plan.jaw?0.5:0.65)*Math.pow(f,0.6); } }
    if(plan.flathead&&u>0.6) up*=1-0.12*plan.flathead*(u-0.6)/0.4;
    var top=Math.round(cy-up), bot=Math.round(cy+lo);
    tops[x]=top; bots[x]=bot;
    for(var yy=top;yy<=bot;yy++) set(x,yy,'B');
  }
  /* beak / bill */
  if(bill){ for(var bx=1;bx<=bill;bx++){ var by=Math.round(cy-half*0.15-bx*0.04); set(nose+bx,by,'d'); if(plan.beak&&bx<bill*0.7) set(nose+bx,by+1,'bel'); } }
  /* tail */
  var tailTopY=tops[bodyStart], tailBotY=bots[bodyStart];
  for(x=x0;x<bodyStart;x++){
    var t=(bodyStart-x)/tl, ph=(tailBotY-tailTopY)/2, mid=(tailTopY+tailBotY)/2, reach;
    var T=plan.tail||'fork';
    if(T==='eel'){ reach=Math.max(1,ph*(1-t*0.5)); for(var dy=-reach;dy<=reach;dy++) set(x,Math.round(mid+dy),'F'); continue; }
    var K={fork:0.78,deepfork:0.9,crescent:1.15,round:0.5,square:0.62,shark:1.4,fan:0.45}[T]||0.7;
    var hr=Math.min(half,L*0.17);
    reach=ph+(T==='round'?Math.sin(Math.PI*Math.min(1,t*1.1))*hr*K:t*hr*K);
    for(dy=-Math.ceil(reach);dy<=Math.ceil(reach);dy++){
      var a=Math.abs(dy)/Math.max(1,reach), keep=true;
      if(T==='fork') keep=!(t>0.5&&a<0.55*(t-0.45)/0.55&&reach>2);
      else if(T==='deepfork') keep=!(t>0.3&&a<0.75*(t-0.25)/0.75&&reach>2);
      else if(T==='crescent'){ var lobe=t<0.35?a<0.55:(a>(t-0.3)*0.9+0.15); keep=lobe; }
      else if(T==='square') keep=!(t>0.85&&a<0.2&&reach>3);
      else if(T==='shark') keep=dy<0?(a<=Math.pow(t,0.55)*1.0+0.15):(a<0.55*(1-t*0.8));
      if(keep&&Math.abs(dy)<=reach) set(x,Math.round(mid+dy),'F');
    }
  }
  /* fins */
  function finCol(x,top,h,lean){ for(var k=1;k<=h;k++){ set(x+Math.round(lean*k),top-k,'F'); } }
  var D2=plan.dorsal||'soft';
  for(x=bodyStart;x<=nose;x++){
    var u2=(x-bodyStart)/span, top2=tops[x], bot2=bots[x];
    if(D2==='spiny'){ if(u2>0.28&&u2<0.5){ var h1=Math.round(padT*0.8*Math.sin(Math.PI*(u2-0.28)/0.22)*(has('crown')?1.4:1)); finCol(x,top2,(x%2?h1:Math.max(1,h1-1)),0); set(x,top2-h1-1,(x%2&&h1>1)?'FD':null); }
      if(u2>=0.5&&u2<0.68){ var h2=Math.round(padT*0.62*Math.sin(Math.PI*(u2-0.47)/0.24)); finCol(x,top2,h2,0); } }
    else if(D2==='soft'||D2==='triple'){ if(u2>0.38&&u2<0.6){ finCol(x,top2,Math.round(padT*0.85*Math.sin(Math.PI*(u2-0.38)/0.22)*(has('crown')?1.3:1)),0.15); }
      if(D2==='triple'&&((u2>0.22&&u2<0.36)||(u2>0.62&&u2<0.75))) finCol(x,top2,Math.max(1,Math.round(padT*0.45)),0); }
    else if(D2==='long'){ if(u2>0.15&&u2<0.78) finCol(x,top2,Math.max(1,Math.round(padT*0.45*(0.6+0.4*Math.sin(Math.PI*(u2-0.15)/0.63)))),0); }
    else if(D2==='back'){ if(u2>0.06&&u2<0.24) finCol(x,top2,Math.round(padT*0.8*Math.sin(Math.PI*(u2-0.06)/0.18)),-0.2); }
    else if(D2==='sail'){ if(u2>0.35&&u2<0.85) finCol(x,top2,Math.round(padT*0.95*Math.pow(Math.sin(Math.PI*(u2-0.35)/0.5),0.6)*(u2<0.6?1:1-(u2-0.6)*1.2)),0); }
    else if(D2==='mahi'){ if(u2>0.12&&u2<0.95) finCol(x,top2,Math.max(1,Math.round(padT*0.75*(0.5+0.5*u2))),0); }
    else if(D2==='tuna'){ if(u2>0.5&&u2<0.68) finCol(x,top2,Math.round(padT*0.9*Math.sin(Math.PI*(u2-0.5)/0.18)),-0.4); if(u2>0.28&&u2<0.42) finCol(x,top2,Math.round(padT*0.5*Math.sin(Math.PI*(u2-0.28)/0.14)),-0.3); }
    else if(D2==='shark'){ if(u2>0.52&&u2<0.68) finCol(x,top2,Math.round(padT*0.85*Math.sin(Math.PI*(u2-0.52)/0.16)),-0.5); if(u2>0.2&&u2<0.3) finCol(x,top2,Math.max(1,Math.round(padT*0.4)),-0.3); }
    else if(D2==='eel'){ if(u2>0.1&&u2<0.92){ set(x,top2-1,'F'); if(x%2===0||L>30) set(x,bot2+1,'F'); } }
    else if(D2==='tiny'){ if(u2>0.55&&u2<0.65) finCol(x,top2,Math.max(1,Math.round(padT*0.6*Math.sin(Math.PI*(u2-0.55)/0.1))),0); }
    else if(D2==='flat'){ if(u2>0.05&&u2<0.85){ set(x,top2-1,'F'); set(x,bot2+1,'F'); } }
    if(plan.adipose&&Math.abs(u2-0.12)<0.035&&L>12) set(x,top2-1,'F');
    if(plan.finlets&&u2>0.04&&u2<0.24&&(x%2===0)){ set(x,top2-1,'Y'); set(x,bot2+1,'Y'); }
    if(!flat&&!eel){ if(u2>0.6&&u2<0.68&&L>10){ set(x,bot2+1,'F'); if(L>24) set(x,bot2+2,'F'); }
      if(u2>(plan.anal?0.08:0.16)&&u2<(plan.anal?0.55:0.3)&&L>10){ set(x,bot2+1,'F'); if(L>28&&u2>0.18) set(x,bot2+2,'F'); } }
  }
  /* shade the body */
  for(x=bodyStart;x<=nose;x++){
    var u3=(x-bodyStart)/span, tp=tops[x], bt=bots[x], hgt=Math.max(1,bt-tp);
    for(y=tp;y<=bt;y++){
      var v=(y-tp)/hgt, c;
      if(flat) c=v<0.5?(v<0.08?'dD':'d'):(v>0.92?'belD':'bel');
      else if(v<0.1) c='dD'; else if(v<0.28) c='d';
      else if(v<0.62) c='b'; else if(y===bt) c='belD'; else c='bel';
      if(L>=28&&(v>=0.26&&v<0.3)&&((x+y)&1)) c='b'; if(L>=28&&(v>=0.6&&v<0.64)&&((x+y)&1)) c='bel'; if(L>=28&&(v>=0.08&&v<0.11)&&((x+y)&1)) c='d';
      if(!flat&&c==='b'&&v>0.32&&v<0.4&&u3>0.25&&u3<0.86) c='bL';
      if(!flat&&c==='d'&&v<0.16&&u3>0.4&&u3<0.8&&L>20) c='dL';
      if(u3<0.08&&c!=='belD') c=c==='bel'?'belD':c==='bL'?'b':c==='b'?'d':'dD';
      /* patterns */
      var inSide=c!=='bel'&&c!=='belD'&&u3>0.08&&u3<0.84, h2=hash(x*31.7+y*17.3+L);
      if(inSide){ var pat=lk.pat;
        if(pat==='bars'){ var per=Math.max(3,Math.round(L/8)); if(((x+Math.round(y*0.25)-bodyStart)%per)<Math.max(1,Math.round(per*0.42))) c=(v<0.3)?'dD':'S'; }
        else if(pat==='stripe'){ if(Math.abs(v-0.48)<0.08+0.04*Math.sin(x*0.9)&&hash(Math.floor(x/2)*3.3)>0.15) c='S'; }
        else if(pat==='stripe2'){ if(Math.round(v*6)%2===0&&v>0.2&&v<0.75) c='S'; }
        else if(pat==='lateral'){ if(Math.abs(v-0.5)<0.5/hgt+0.02) c='S'; }
        else if(pat==='spots'){ var sx=Math.floor(x/(L>30?2:1)), sy=Math.floor(y/(L>30?2:1)); if(hash(sx*13.1+sy*7.7+L*0.1)<0.13) c='S'; }
        else if(pat==='lightspots'){ var sx2=Math.floor(x/(L>30?2:1)), sy2=Math.floor(y/(L>30?2:1)); if(hash(sx2*9.3+sy2*5.1+L*0.2)<0.17) c='SL'; }
        else if(pat==='mottle'){ var m2=hash(Math.floor(x/2)*4.1+Math.floor(y/2)*9.7); if(m2<0.3) c='d'; else if(m2>0.88) c='S'; }
        else if(pat==='scales'){ if(L>16&&((x+(Math.floor(y/2)%2)*2)%4===0)&&(y%2===0)) c=c==='b'||c==='bL'?'bD':c; }
        else if(pat==='scutes'){ if((Math.abs(v-0.12)<0.07&&x%3===0)||(Math.abs(v-0.5)<0.06&&x%4===0)) c='SL'; }
        if(lk.band&&Math.abs(v-0.48)<0.1) c=v<0.48?'band':'bandD';
      }
      if(plan.scutes2&&u3>0.06&&u3<0.3&&Math.abs(v-0.5)<0.06) c='dD';
      /* legend effects on the body */
      if(has('shimmer')&&!flat&&v>0.25&&v<0.75&&((x*2+y*3)%9===0)) c='shim';
      if(has('armor')&&v<0.5&&((x+y)%5===0||(y===tp+1&&x%3===0))) c='arm';
      if(has('ghost')&&((x+y*2)%7===0)&&v<0.7) c='gst';
      if(has('frost')&&v<0.25&&hash(x*3.3+y)<0.35) c='frs';
      set(x,y,c);
    }
  }
  /* scars: light diagonal slashes */
  if(has('scars')||has('scars2')){ var ns=has('scars2')?4:2; for(var si=0;si<ns;si++){ var sxs=bodyStart+Math.round(span*(0.3+0.4*hash(si*7.1+L))), len=Math.max(3,Math.round(Hb*0.5)); for(var k=0;k<len;k++){ var px=sxs+k, py=Math.round(cy-half*0.5+k*0.9); if(get(px,py)&&get(px,py)!=='F') set(px,py,'scar'); } } }
  if(has('moss')){ for(x=bodyStart;x<=nose;x++){ if(hash(x*5.7+L)<0.45) set(x,tops[x],'moss'); if(hash(x*2.3+L)<0.22) set(x,tops[x]-1,'moss'); } }
  if(has('barnacles')){ for(var bi=0;bi<Math.max(4,Math.round(L/6));bi++){ var bxx=bodyStart+Math.round(span*(0.15+0.7*hash(bi*3.7+L))), byy=tops[bxx]+1+Math.round(hash(bi*1.9)*Math.max(1,half*0.5)); set(bxx,byy,'barn'); if(L>28) set(bxx+1,byy,'barnD'); } }
  /* gill cover, pectoral fin, mouth, eye */
  var gx=bodyStart+Math.round(span*(lk.blunt||plan.flathead?0.74:0.77));
  if(L>12&&!flat){ for(y=tops[gx]+1;y<bots[gx];y++){ var vv=(y-tops[gx])/(bots[gx]-tops[gx]); var xg=gx-Math.round(Math.sin(Math.PI*vv)*Math.max(1,span*0.035)); if(get(xg,y)&&get(xg,y)!=='F') set(xg,y,'gill'); } }
  if(L>14&&!eel&&!flat){ var px0=gx-2, py0=Math.round(cy+half*0.3), pl=Math.max(2,Math.round(span*0.1)); for(k=0;k<pl;k++){ set(px0-k,py0+Math.round(k*0.35),'P'); if(L>26) set(px0-k,py0+1+Math.round(k*0.35),'PD'); } }
  var mouthLen=Math.max(1,Math.round(span*(plan.mouth||0.06))), my=Math.round(cy+half*(plan.jaw?0.15:0.25));
  if(!flat&&L>10){ for(k=0;k<mouthLen;k++){ var mx=nose-k; if(get(mx,my)) set(mx,my,'mouth'); } set(nose+1,my,'out'); }
  if(plan.fangs&&L>14){ set(nose-1,my+1,'tooth'); if(plan.fangs>1||L>30) set(nose-3,my+1,'tooth'); }
  /* a row of teeth along the jaw (sheepshead, goliath tigerfish, and the Megalodon's whole mouthful) */
  if(plan.teeth&&L>16){ var tn=Math.max(2,Math.round(mouthLen*(plan.teeth>2?1:0.7))); for(k=1;k<tn;k+=2){ var tx=nose-k; if(get(tx,my-1)) set(tx,my-1,'tooth'); if(plan.teeth>1&&get(tx-1,my+1)) set(tx-1,my+1,'tooth'); }
    if(plan.teeth>2&&L>40){ for(k=2;k<tn;k+=3){ if(get(nose-k,my+2)) set(nose-k,my+2,'tooth'); } } }
  /* an open mouth full of jagged teeth (the Megalodon) */
  if(plan.gape&&L>30){ var gL=Math.max(6,Math.round(span*0.2)), gmy=Math.round(cy+half*0.22);
    for(k=0;k<=gL;k++){ var gxk=nose-k, op=Math.round((1-k/gL)*half*0.55); if(op<1) continue;
      for(y=gmy-op;y<=gmy+op;y++){ if(get(gxk,y)) set(gxk,y,(y===gmy-op||y===gmy+op)?'gumL':'gum'); }
      if(k%3===0){ set(gxk,gmy-op,'tooth'); set(gxk,gmy-op+1,'tooth'); if(op>3) set(gxk,gmy-op+2,'tooth'); set(gxk,gmy+op,'tooth'); set(gxk,gmy+op-1,'tooth'); if(op>3) set(gxk,gmy+op-2,'tooth'); }
      else if(k%3===1){ set(gxk,gmy-op,'tooth'); set(gxk,gmy+op,'tooth'); } }
    for(x=nose+1;x<=nose+2;x++) for(y=gmy-2;y<=gmy+2;y++) if(get(x,y)) set(x,y,'gum'); }
  /* shark gill slits */
  if(plan.slits&&L>18){ var n5=plan.slits>1?6:5, gs=bodyStart+Math.round(span*0.66); for(var gi2=0;gi2<n5;gi2++){ var gxx=gs+gi2*Math.max(1,Math.round(span*0.022)); for(y=Math.round(cy-half*0.35);y<=Math.round(cy+half*0.3);y++){ if(get(gxx,y)&&get(gxx,y)!=='F') set(gxx,y,'dD'); } } }
  var ex=bodyStart+Math.round(span*(lk.blunt?0.84:plan.duck?0.86:0.88)), ey=Math.round(cy-half*(flat?0.55:plan.flathead?0.25:0.32)), glow=has('glow')||has('smoke');
  if(L<16){ set(ex,ey,'eye'); }
  else if(L<34){ set(ex,ey,'eye'); set(ex+1,ey,'eye'); set(ex,ey+1,'eye'); set(ex+1,ey+1,'eye'); set(ex,ey,'hl'); if(lk.bigEye){ set(ex-1,ey,'iris'); set(ex-1,ey+1,'iris'); } }
  else { var EYE=lk.bigEye||L>=56?[".rrr.","rkkkr","rkhkr","rkkkr",".rrr."]:[".rr.","rhkr","rkkr",".rr."], eo=Math.floor(EYE.length/2);
    for(var ey2=0;ey2<EYE.length;ey2++) for(var ex2=0;ex2<EYE[ey2].length;ex2++){ var ch=EYE[ey2][ex2]; if(ch==='.') continue; set(ex-eo+ex2,ey-eo+ey2,ch==='r'?'iris':ch==='h'?'hl':'eye'); } }
  if(flat&&L>12){ set(ex-3,ey-1,'eye'); }
  if(glow){ var gl=L<34?[[ex-1,ey],[ex+2,ey],[ex,ey-1],[ex+1,ey+2]]:[[ex-2,ey],[ex+2,ey],[ex,ey-2],[ex,ey+2]]; gl.forEach(function(q){ if(get(q[0],q[1])) set(q[0],q[1],'glowE'); }); set(ex,ey,'glowC'); }
  if(lk.ear||plan.ocellus){ var ox=gx-Math.max(1,Math.round(span*0.06)), oy=Math.round(cy-half*0.15); set(ox,oy,'S'); if(L>24){ set(ox-1,oy,'S'); } }
  if(plan.ocellus&&L>18){ var tx=bodyStart-1, ty=Math.round(cy); set(tx,ty,'oc'); set(tx-1,ty,'ocD'); }
  if(lk.whisk||plan.whisk){ set(nose,my+1,'out'); set(nose-1,my+2,'out'); if(L>16){ set(nose-2,my+3,'out'); set(nose+1,my+1,'out'); } if(L>30){ set(nose-3,my+4,'out'); set(nose+2,my,'out'); } }
  if(has('crown')){ var cx0=bodyStart+Math.round(span*0.6), cw=Math.max(5,Math.round(span*0.16)), ch=Math.max(2,Math.round(L/16));
    for(x=cx0;x<cx0+cw;x++){ var base=tops[x]-1; set(x,base,'crownD'); var rel=(x-cx0)%Math.max(2,Math.round(cw/3)); var hh=rel===0?ch:Math.max(0,ch-1-rel); for(var k2=1;k2<=hh;k2++) set(x,base-k2,k2===hh?'crownL':'crown'); if(x===cx0+Math.floor(cw/2)&&L>30) set(x,base-1,'gem'); } }
  /* fin ray texture */
  for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]==='F'&&((x+(y>cy?1:0))%2===0)) g[y][x]='FD'; }
  /* outline: dark on the outside, lighter along the top for a little rim light */
  var out=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; var n=get(x-1,y)||get(x+1,y)||get(x,y-1)||get(x,y+1); if(n) out.push([x,y]); }
  out.forEach(function(q){ var below=get(q[0],q[1]+1); g[q[1]][q[0]]=(below&&below!=='F'&&below!=='FD'&&below!=='out'&&!get(q[0],q[1]-1)&&q[0]>bodyStart&&q[0]<nose-1)?'outT':'out'; });
  if(aura){ var ring=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; if(get(x-1,y)==='out'||get(x+1,y)==='out'||get(x,y-1)==='out'||get(x,y+1)==='out') ring.push([x,y]); }
    ring.forEach(function(q){ g[q[1]][q[0]]='aura'; });
    var ring2=[]; for(y=0;y<GH;y++) for(x=0;x<GW;x++){ if(g[y][x]) continue; if(get(x-1,y)==='aura'||get(x+1,y)==='aura'||get(x,y-1)==='aura'||get(x,y+1)==='aura') ring2.push([x,y]); }
    ring2.forEach(function(q){ g[q[1]][q[0]]=hash(q[0]*3.1+q[1]*7.3)<0.06?'auraL':'auraO'; });
    if(has('smoke')) for(var si2=0;si2<GW/3;si2++){ var sx3=Math.floor(hash(si2*7.7)*GW), sy3=Math.floor(hash(si2*3.1)*GH); if(!g[sy3][sx3]) g[sy3][sx3]='smoke'; } }
  return g;
};

/* ---------- palette ---------- */
function palette(lk,variant,colors,fx){
  var vp=A.VARIANT_PAL[variant]||{}, c=Object.assign({b:lk.b,d:lk.d,bel:lk.bel,fin:lk.fin,spot:lk.spot},vp,colors||{});
  var p={
    B:c.b, b:c.b, bL:light(c.b,0.28), bD:dark(c.b,0.18), d:c.d, dL:light(c.d,0.18), dD:dark(c.d,0.3),
    bel:c.bel, belD:mix(c.bel,c.b,0.35), F:c.fin, FD:dark(c.fin,0.22), P:light(c.fin,0.12), PD:dark(c.fin,0.3), Y:'#F0C030',
    S:c.spot, SL:light(c.spot,0.25), band:lk.band||c.spot, bandD:dark(lk.band||c.spot,0.2),
    gill:dark(c.b,0.35), mouth:dark(c.d,0.5), tooth:'#F4F4E8', out:dark(c.d,0.72), outT:mix(c.d,'#FFFFFF',0.22), eye:'#0B0F14', iris:variant==='albino'?'#D04A5A':mix(c.d,'#E8C860',0.55), hl:'#F8F8F0',
    scar:light(c.b,0.55), moss:'#4E7A2E', barn:'#C8C4B0', barnD:'#8A8676', crown:'#FFC94A', crownD:'#C98A12', crownL:'#FFF2B0', gem:'#E5484D', shim:light(c.b,0.6), arm:light(c.d,0.4), gst:'#FFFFFF', frs:'#DFF2FF',
    gum:'#4A0A12', gumL:'#8A1A24', glowE:'#FF5A3A', glowC:'#FFE08A', oc:'#E05A2A', ocD:'#0B0F14', aura:'rgba(255,201,74,0.5)', auraO:'rgba(255,201,74,0.18)', auraL:'rgba(255,248,200,0.95)', smoke:'rgba(160,190,220,0.25)'
  };
  if(variant==='albino'){ p.eye='#B0303A'; p.hl='#FFD0D8'; p.band='#F4C8D0'; p.bandD='#E0B0BA'; p.out=dark(c.d,0.45); }
  if(variant==='golden'){ p.bL='#FFF2B0'; p.out='#5A3A00'; }
  if(fx&&fx.length){ var col=(colors&&colors.spot)||'#FFC94A';
    if(fx.indexOf('ghost')>=0||fx.indexOf('frost')>=0){ p.aura='rgba(190,230,255,0.5)'; p.auraO='rgba(190,230,255,0.18)'; p.auraL='rgba(240,250,255,0.95)'; }
    else if(fx.indexOf('abyss')>=0){ p.aura='rgba(230,40,50,0.5)'; p.auraO='rgba(120,20,60,0.22)'; p.auraL='rgba(255,190,170,0.95)'; p.glowE='#FF2A2A'; p.glowC='#FFE4D8'; p.scar='#C8D0D8'; }
    else if(fx.indexOf('smoke')>=0){ p.aura='rgba(140,100,230,0.5)'; p.auraO='rgba(140,100,230,0.2)'; p.auraL='rgba(220,200,255,0.95)'; p.glowE='#9AF0FF'; p.glowC='#FFFFFF'; }
    else if(fx.indexOf('glow')>=0){ p.aura='rgba(255,120,60,0.45)'; p.auraO='rgba(255,120,60,0.16)'; p.auraL='rgba(255,220,150,0.95)'; } }
  return p;
}
A.paletteFor=palette;

var cache={};
A.fishCanvas=function(spId,L,shadow,variant,colors){
  L=Math.max(5,Math.round(L));
  var key=spId+'|'+L+'|'+(shadow||0)+'|'+(variant||'')+'|'+(colors?JSON.stringify(colors):'');
  if(cache[key]) return cache[key];
  var sp=D&&D.SP_BY_ID[spId], lookId=sp?sp.look:spId, lk=A.LOOK[lookId]||A.LOOK.perch, plan=PLAN[lookId]||PLAN[spId]||{};
  var fx=shadow?null:legendFx(colors), g=plan.shark2?A.sharkGrid(lk,plan,L,fx):A.fishGrid2(lk,plan,L,fx), pal=palette(lk,variant,colors,fx);
  var c=document.createElement('canvas'); c.width=g[0].length; c.height=g.length; var x2=c.getContext('2d');
  for(var y=0;y<g.length;y++) for(var x=0;x<g[0].length;x++){ var k=g[y][x]; if(!k) continue; if(shadow&&(k==='aura'||k==='auraO'||k==='auraL'||k==='smoke')) continue; x2.fillStyle=shadow?(typeof shadow==='string'?shadow:'#020A16'):(pal[k]||'#FF00FF'); x2.fillRect(x,y,1,1); }
  cache[key]=c; return c;
};
/* Always whole-pixel sizes: the fish is redrawn at the integer scale nearest to what was asked. */
A.fishImg=function(spId,L,shadow,scale,variant,colors,label){
  var s=Math.max(1,Math.round(scale||1)); if(scale&&scale<1.5&&scale>1) { L=Math.round(L*scale); s=1; }
  var src=A.fishCanvas(spId,L,shadow,variant,colors), c=document.createElement('canvas');
  c.width=src.width*s; c.height=src.height*s; c.className='px'; var x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(src,0,0,c.width,c.height);
  c.style.width=c.width+'px'; c.style.height=c.height+'px'; c.style.maxWidth='100%'; c.style.height='auto';
  c.setAttribute('role','img'); c.setAttribute('aria-label',label||(shadow?'Unknown fish':spId));
  return c;
};
/* Pixel-perfect rotation: sample the sprite's own pixels at the turned angle, so hanging fish stay crisp. */
var rotCache={};
A.rotated=function(src,ang){
  var q=Math.round(ang/(Math.PI/36)), key=q; var bag=rotCache.get?null:null;
  if(!src._rot) src._rot={}; if(src._rot[key]) return src._rot[key];
  var a=q*Math.PI/36, w=src.width, h=src.height, cs=Math.cos(a), sn=Math.sin(a);
  var nw=Math.ceil(Math.abs(w*cs)+Math.abs(h*sn))+2, nh=Math.ceil(Math.abs(w*sn)+Math.abs(h*cs))+2;
  var sd=src.getContext('2d').getImageData(0,0,w,h).data, out=document.createElement('canvas'); out.width=nw; out.height=nh;
  var oc=out.getContext('2d'), od=oc.createImageData(nw,nh), o=od.data, cx=w/2, cy=h/2, ncx=nw/2, ncy=nh/2;
  for(var y=0;y<nh;y++) for(var x=0;x<nw;x++){ var dx=x+0.5-ncx, dy=y+0.5-ncy, sx=Math.floor(dx*cs+dy*sn+cx), sy=Math.floor(-dx*sn+dy*cs+cy);
    if(sx<0||sy<0||sx>=w||sy>=h) continue; var i=(sy*w+sx)*4, j=(y*nw+x)*4; o[j]=sd[i]; o[j+1]=sd[i+1]; o[j+2]=sd[i+2]; o[j+3]=sd[i+3]; }
  oc.putImageData(od,0,0);
  /* where the sprite's pivot (the tip of its nose, at the left-middle after the -90 degree turn) lands */
  out._pivot=function(px,py){ var dx=px-cx, dy=py-cy; return [ncx+dx*cs-dy*sn,ncy+dx*sn+dy*cs]; };
  src._rot[key]=out; return out;
};
})(typeof window!=='undefined'?window:this);

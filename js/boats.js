/* One Cast boats: eight pixel-art boats, from a paddleboard to a golden mega yacht, plus the one-of-one Dev Flagship.
   Each boat is built from a hull plus its own cabin, tower, rails and gear. deck = the row the angler stands on. */
(function(root){
'use strict';
var A=root.ART;
function grid(w,h){ var g=[]; for(var y=0;y<h;y++) g.push(new Array(w).fill('.')); return g; }
function put(g,x,y,c){ if(y>=0&&y<g.length&&x>=0&&x<g[0].length) g[y][x]=c; }
function rect(g,x,y,w,h,c){ for(var j=0;j<h;j++) for(var i=0;i<w;i++) put(g,x+i,y+j,c); }
function line(g,x0,y0,x1,y1,c){ var n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for(var i=0;i<=n;i++) put(g,Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),c); }
/* A hull: flat stern on the left, bow rising and pointing right. top = deck row. */
function hull(g,L,top,H,o){
  o=o||{};
  for(var x=0;x<L;x++){
    var u=x/(L-1), bowRise=u>0.75?Math.round((u-0.75)/0.25*(o.bow||2)):0, sternCut=x<2&&H>3?1:0;
    var t=top-bowRise, bottom=top+H-1-Math.round(Math.pow(Math.max(0,u-0.55)/0.45,1.6)*(H-1))-sternCut;
    for(var y=t;y<=bottom;y++){ var c='H'; if(y===t) c='R'; else if(y===t+1&&H>3) c='h'; else if(o.stripe&&y===t+Math.round(H*0.45)) c='S'; else if(y>=bottom-Math.max(0,Math.round(H*0.25)-1)&&H>3) c='B'; put(g,x,y,c); }
  }
}
var B={};
B.paddle=function(){ var g=grid(28,4); for(var x=1;x<27;x++){ put(g,x,1,x<3||x>24?'h':'H'); put(g,x,2,'B'); } put(g,0,2,'B'); put(g,27,1,'h'); for(var x2=8;x2<20;x2+=3) put(g,x2,1,'S'); return {g:g,deck:1,stand:9,map:{H:'#3FA7F0',h:'#2A7CC0',B:'#1D4F8C',S:'#F4F4F4'}}; };
B.kayak=function(){ var g=grid(32,7); hull(g,32,2,4,{bow:1}); rect(g,11,1,8,1,'K'); rect(g,12,2,6,1,'k'); line(g,4,0,4,2,'P'); line(g,26,0,26,1,'P'); return {g:g,deck:2,stand:12,map:{R:'#F0A030',h:'#E07A20',H:'#E8862A',B:'#A04E14',S:'#F4F4F4',K:'#2B2F3A',k:'#14161E',P:'#C8A060'}}; };
B.skiff=function(){ var g=grid(38,10); hull(g,36,3,7,{bow:2,stripe:1}); rect(g,0,1,3,4,'M'); put(g,1,0,'M'); put(g,2,5,'m'); put(g,1,6,'m'); rect(g,22,2,3,1,'w'); return {g:g,deck:3,stand:12,map:{R:'#D8E0E8',h:'#B8C4D0',H:'#9AAAB8',B:'#4A5868',S:'#2F7C9A',M:'#2B2F3A',m:'#5A6476',w:'#8ED0EE'}}; };
B.bassboat=function(){ var g=grid(46,10); hull(g,46,3,7,{bow:1,stripe:1}); for(var x=4;x<42;x++) if((x%3)===0) put(g,x,4,'F'); rect(g,0,0,4,5,'M'); rect(g,1,5,2,2,'m'); rect(g,18,1,4,2,'C'); put(g,19,0,'w'); put(g,20,0,'w'); rect(g,34,2,2,1,'k'); return {g:g,deck:3,stand:10,map:{R:'#F4F4F4',h:'#E5484D',H:'#C0303A',B:'#14294C',S:'#FFC94A',F:'#FF8A8D',M:'#1B1F2A',m:'#5A6476',C:'#2B2F3A',w:'#8ED0EE',k:'#5A6476'}}; };
B.console=function(){ var g=grid(54,17); hull(g,54,8,9,{bow:3,stripe:1}); rect(g,22,4,7,4,'C'); rect(g,23,5,5,1,'w'); rect(g,19,1,13,1,'T'); line(g,20,1,20,7,'p'); line(g,30,1,30,7,'p'); rect(g,0,5,4,4,'M'); put(g,2,9,'m'); put(g,2,10,'m'); line(g,8,7,8,3,'r'); line(g,14,7,14,3,'r'); return {g:g,deck:8,stand:10,map:{R:'#F4F8FA',h:'#DCE4EA',H:'#C8D4DE',B:'#2A4A6A',S:'#2F7CD8',C:'#F4F8FA',w:'#5FB2CF',T:'#2F7CD8',p:'#9AA6B6',M:'#1B1F2A',m:'#5A6476',r:'#8A6A3A'}}; };
B.sportfisher=function(){ var g=grid(64,25); hull(g,62,14,11,{bow:3,stripe:1}); rect(g,24,9,22,5,'C'); rect(g,26,10,8,2,'w'); rect(g,36,10,8,2,'w'); rect(g,28,6,12,3,'C'); rect(g,29,7,10,1,'w'); rect(g,27,2,13,1,'T'); line(g,28,2,28,6,'p'); line(g,38,2,38,6,'p'); line(g,30,1,4,0,'o'); line(g,36,1,62,0,'o'); line(g,30,1,30,2,'p'); line(g,36,1,36,2,'p'); rect(g,6,11,3,3,'k'); put(g,7,10,'k'); line(g,13,13,13,8,'r'); line(g,18,13,18,8,'r'); return {g:g,deck:14,stand:10,map:{R:'#F4F8FA',h:'#EAF0F4',H:'#DCE4EA',B:'#14294C',S:'#14294C',C:'#F4F8FA',w:'#2A4A6A',T:'#14294C',p:'#9AA6B6',o:'#C8D0D8',k:'#5A3A20',r:'#8A6A3A'}}; };
B.trawler=function(){ var g=grid(68,27); hull(g,66,15,12,{bow:4,stripe:1}); rect(g,34,8,18,7,'C'); rect(g,36,9,4,2,'w'); rect(g,42,9,4,2,'w'); rect(g,48,9,2,2,'w'); rect(g,38,5,10,3,'C'); rect(g,39,6,8,1,'w'); line(g,44,0,44,5,'p'); rect(g,42,1,5,1,'p'); put(g,44,0,'L'); line(g,8,14,22,3,'Y'); line(g,9,14,23,4,'Y'); line(g,22,3,22,9,'k'); rect(g,6,13,5,2,'Y'); for(var x=2;x<64;x+=6) put(g,x,14,'r'); return {g:g,deck:15,stand:26,map:{R:'#F4F4F4',h:'#C0303A',H:'#A02A30',B:'#2A2A30',S:'#F4F4F4',C:'#F0ECE0',w:'#2A4A6A',p:'#5A6476',L:'#FF5A3A',Y:'#F0C030',k:'#1B1F2A',r:'#5A6476'}}; };
B.yacht=function(){ var g=grid(82,29); hull(g,80,17,12,{bow:5,stripe:1}); rect(g,18,12,48,5,'C'); for(var x=20;x<64;x+=5) rect(g,x,13,3,2,'w'); rect(g,26,8,32,4,'C'); for(var x2=28;x2<56;x2+=4) rect(g,x2,9,3,1,'w'); rect(g,34,5,16,3,'C'); rect(g,36,6,12,1,'w'); rect(g,38,2,8,3,'D'); line(g,42,0,42,2,'p'); put(g,42,0,'L'); rect(g,16,11,52,1,'G'); rect(g,24,7,36,1,'G'); rect(g,32,4,20,1,'G'); for(var x3=1;x3<78;x3+=2) put(g,x3,17,'G'); return {g:g,deck:17,stand:8,map:{R:'#FFC94A',h:'#F8F8F4',H:'#F0F0EA',B:'#14294C',S:'#FFC94A',C:'#FAFAF6',w:'#1E3A5A',D:'#2A4A6A',G:'#FFC94A',p:'#C8D0D8',L:'#FF5A3A'}}; };
/* The Dev Flagship: one of one, only the game's creator owns it. Black hull, neon stripes, gold trim, a sun deck and a
   flybridge with room for a crew of 12. seats = where crew members stand: [x, the row under their feet]. */
B.devboat=function(){ var Wd=152, Hd=67, D=51, g=grid(Wd,Hd); hull(g,148,D,15,{bow:9,stripe:1});
  var deckAt=[]; for(var x=0;x<Wd;x++){ deckAt[x]=-1; for(var yy=0;yy<Hd;yy++) if(g[yy][x]!=='.'){ deckAt[x]=yy; break; } }
  for(x=2;x<132;x++) if(g[D+11][x]!=='.'&&g[D+11][x]!=='B') put(g,x,D+11,'s');          // second, darker neon line
  for(x=12;x<74;x+=7){ rect(g,x,D+4,2,2,'w'); }                                          // portholes
  var F={D:['110','101','101','101','110'],E:['111','100','110','100','111'],V:['101','101','101','101','010']};
  ['D','E','V'].forEach(function(ch,k){ F[ch].forEach(function(r,y){ for(var i=0;i<3;i++) if(r[i]==='1'){ put(g,86+k*5+i*1,D+2+y,'G'); } }); });
  // open back deck: rail
  rect(g,0,D-2,38,1,'G'); for(x=0;x<38;x+=4) put(g,x,D-1,'G');
  // lounge (main deck cabin) with big windows; its roof is the sun deck
  rect(g,40,D-18,74,18,'C'); for(x=43;x<110;x+=7){ rect(g,x,D-15,5,6,'w'); rect(g,x,D-15,5,1,'W'); } rect(g,40,D-6,74,1,'c'); for(x=44;x<112;x+=10) rect(g,x,D-4,6,3,'w');
  rect(g,38,D-19,78,1,'G'); for(x=38;x<96;x+=4) put(g,x,D-20,'G'); rect(g,38,D-21,58,1,'G');   // sun deck rail
  // bridge with a wraparound windscreen; its roof is the flybridge
  rect(g,98,D-30,26,11,'C'); rect(g,101,D-28,21,3,'W'); rect(g,100,D-24,24,1,'c');
  rect(g,96,D-31,30,1,'G'); for(x=96;x<126;x+=4) put(g,x,D-32,'G'); rect(g,96,D-33,30,1,'G');
  // radar mast behind the flybridge, dome on top, flag
  line(g,92,D-20,92,D-46,'p'); rect(g,88,D-40,9,1,'p'); rect(g,89,D-49,6,3,'D'); rect(g,90,D-50,4,1,'D'); put(g,92,D-46,'p');
  rect(g,93,D-45,7,3,'f'); rect(g,93,D-44,7,1,'F');
  // foredeck rail following the bow
  for(x=126;x<150;x++) if(deckAt[x]>0){ put(g,x,deckAt[x]-2,'G'); if(x%3===0) put(g,x,deckAt[x]-1,'G'); }
  // outriggers and a gold crane at the stern
  line(g,40,D-21,10,D-40,'o'); line(g,124,D-33,146,D-48,'o');
  line(g,3,D-2,10,D-14,'Y'); line(g,4,D-2,11,D-13,'Y'); line(g,10,D-14,10,D-9,'k');
  return {g:g,deck:D,stand:62,devboat:true,
    seats:[[18,D],[28,D],[36,D],[46,D-21],[56,D-21],[66,D-21],[76,D-21],[86,D-21],[104,D-33],[116,D-33],[128,deckAt[128]],[141,deckAt[141]]],
    lights:[[92,D-50,'#FF4D5E'],[0,D-2,'#FF4D5E'],[149,deckAt[149]-2,'#5CF08A'],[124,D-31,'#FFC94A']],
    map:{R:'#FFC94A',h:'#1B2234',H:'#0E1322',B:'#05070D',S:'#3CF0FF',s:'#1E8FB0',C:'#EDF2F8',c:'#9AA8BC',w:'#3CC8F0',W:'#B8F6FF',G:'#FFC94A',
      D:'#F4F8FA',p:'#9AA6B8',L:'#FF4D5E',f:'#0E1322',F:'#3CF0FF',o:'#C8CED8',Y:'#FFC94A',k:'#2B2F3A'}}; };
var cache={};
A.boat=function(id){ if(cache[id]) return cache[id]; var f=B[id]||B.paddle, b=f(); var hh=b.g.length-b.deck; b.water=b.deck+Math.max(1,Math.round(hh*0.45)); b.rows=b.g.map(function(r){ return r.join(''); }); b.w=b.rows[0].length; b.h=b.rows.length; cache[id]=b; return b; };
A.boatCanvas=function(id,scale){ var b=A.boat(id), c=A.spriteCanvas(b.rows,b.map); if(scale){ var o=document.createElement('canvas'); o.width=c.width*scale; o.height=c.height*scale; o.className='px'; var x=o.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(c,0,0,o.width,o.height); return o; } return c; };
})(typeof window!=='undefined'?window:this);

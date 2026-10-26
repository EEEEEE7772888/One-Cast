/* One Cast pixel art: fish sprites for every species, the angler, boats, icons. All drawn by code, nothing downloaded. */
(function(root){
'use strict';
var A={};
function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
A.hash=hash;
function pix(v,x,y){ if(typeof v==='string') return v; if(v.chk) return v.chk[(x+y)&1]; return v.cam[Math.floor(hash(x*7.13+y*3.31)*v.cam.length)]; }
A.drawSprite=function(ctx,rows,map,ox,oy){ for(var y=0;y<rows.length;y++) for(var x=0;x<rows[y].length;x++){ var ch=rows[y][x]; if(ch==='.'||!map[ch]) continue; ctx.fillStyle=pix(map[ch],x,y); ctx.fillRect(ox+x,oy+y,1,1); } };
A.spriteCanvas=function(rows,map,cls){ var c=document.createElement('canvas'); c.width=rows[0].length; c.height=rows.length; c.className='px'+(cls?' '+cls:''); A.drawSprite(c.getContext('2d'),rows,map,0,0); return c; };

/* ---- species looks. b body, d back, bel belly, fin, spot pattern color. pat: bars|spots|lightspots|stripe|mottle|scutes|none|saddle|bands.
   ht: height/length. shape flags: snout (pointed), whisk (barbels), bigEye, ear (gill spot), bill (marlin), tuna (crescent tail), flat (halibut), eel, long, blunt (mahi), sail (tall dorsal), shark, spiny. ---- */
var L={
 bluegill:{b:'#3E7F86',d:'#24525A',bel:'#F0A23A',fin:'#2E6168',spot:'#1B2E3A',pat:'bars',ht:.6,ear:1},
 pumpkinseed:{b:'#6A9A5A',d:'#3E6A3A',bel:'#F0B040',fin:'#4E7A48',spot:'#E06A3A',pat:'spots',ht:.6,ear:1},
 perch:{b:'#C9B23A',d:'#8C7A1E',bel:'#F1E7B5',fin:'#E07A2A',spot:'#3E5A2A',pat:'bars',ht:.36},
 crappie:{b:'#A9B8A0',d:'#6E7F68',bel:'#E4EADF',fin:'#8B9C84',spot:'#2E3B2E',pat:'spots',ht:.55},
 largemouth:{b:'#5E7F3A',d:'#3D5626',bel:'#E9E2B8',fin:'#4F6B30',spot:'#24331A',pat:'stripe',ht:.4},
 smallmouth:{b:'#9A7440',d:'#6A4E28',bel:'#E6D9B0',fin:'#8A6838',spot:'#4E3818',pat:'bars',ht:.38},
 spotted:{b:'#6E8A3E',d:'#44582A',bel:'#E8E0B0',fin:'#5A7030',spot:'#2A361A',pat:'spots',ht:.38},
 striper:{b:'#8A9AA8',d:'#56646E',bel:'#F0F4F6',fin:'#6E7E8A',spot:'#2A3238',pat:'stripe',ht:.32},
 carp:{b:'#B08A3A',d:'#7A5E22',bel:'#E8D8A0',fin:'#C06A2A',spot:'#8A6A2A',pat:'scales',ht:.4},
 channel:{b:'#7C8A99',d:'#55606C',bel:'#E8ECEF',fin:'#66727F',spot:'#2E3640',pat:'spots',ht:.28,whisk:1},
 bluecat:{b:'#6A7E96',d:'#44546A',bel:'#E0E8F0',fin:'#56687E',spot:'#2E3A48',pat:'none',ht:.3,whisk:1},
 flathead:{b:'#8A7240',d:'#5E4E2A',bel:'#E8DDB8',fin:'#6E5A30',spot:'#4A3A1E',pat:'mottle',ht:.27,whisk:1},
 walleye:{b:'#B59A4A',d:'#7E6A2E',bel:'#F2EBD0',fin:'#9C8440',spot:'#5E4E22',pat:'mottle',ht:.28,bigEye:1},
 pike:{b:'#4E6A3A',d:'#344A26',bel:'#E8EDC8',fin:'#6E7A30',spot:'#D9E3A8',pat:'lightspots',ht:.2,snout:1,long:1},
 muskie:{b:'#A4A06A',d:'#76734A',bel:'#EEEBD2',fin:'#8C5A30',spot:'#5B5A30',pat:'bars',ht:.2,snout:1,long:1},
 cisco:{b:'#8FA8BC',d:'#5A7488',bel:'#EEF2F4',fin:'#7A90A0',spot:'#5A7488',pat:'none',ht:.27},
 whitefish:{b:'#AEB8C0',d:'#7C8890',bel:'#EEF2F4',fin:'#8C989F',spot:'#7C8890',pat:'none',ht:.3},
 laketrout:{b:'#4A5E66',d:'#33434A',bel:'#F0E8DA',fin:'#C8703A',spot:'#D8E0E0',pat:'lightspots',ht:.27},
 burbot:{b:'#6B5A3A',d:'#4A3E26',bel:'#D9CFA8',fin:'#5A4A2E',spot:'#3A2E1A',pat:'mottle',ht:.17,whisk:1,eel:1},
 chinook:{b:'#6A8A9A',d:'#3E5A6A',bel:'#E8EEF0',fin:'#4E6A78',spot:'#1E2E38',pat:'spots',ht:.28},
 coho:{b:'#7A9AA8',d:'#4A6A7A',bel:'#F0F4F4',fin:'#C85A4A',spot:'#2A3A44',pat:'spots',ht:.28},
 steelhead:{b:'#8AA0A8',d:'#5A7080',bel:'#F2F2EE',fin:'#7A8A90',spot:'#2E3A40',band:'#E08A98',pat:'spots',ht:.27},
 rainbow:{b:'#7E9A5E',d:'#5A7040',bel:'#EEE8E0',fin:'#7E8A60',spot:'#2E3A22',band:'#E07A8A',pat:'spots',ht:.28},
 brown:{b:'#A08A48',d:'#6E5A2A',bel:'#F0E4B8',fin:'#8A7038',spot:'#C83A2A',pat:'spots',ht:.28},
 kokanee:{b:'#7E9AB2',d:'#4E6A82',bel:'#F0F2F4',fin:'#6E8AA2',spot:'#3E5A72',pat:'spots',ht:.29},
 sturgeon:{b:'#6B6E62',d:'#4A4C44',bel:'#CFCFC0',fin:'#5A5C52',spot:'#C9CBB8',pat:'scutes',ht:.19,snout:1,whisk:1,long:1,shark:1},
 gar:{b:'#6E7A4A',d:'#4A5430',bel:'#D8DCB0',fin:'#5A6838',spot:'#2A3018',pat:'spots',ht:.16,snout:2,long:1},
 drum:{b:'#9AA0A8',d:'#66707A',bel:'#E8ECEE',fin:'#7E8890',spot:'#5A6470',pat:'none',ht:.4,hump:1},
 bowfin:{b:'#5A6A3A',d:'#3A4A26',bel:'#C8D0A0',fin:'#4A5A30',spot:'#2A3418',pat:'mottle',ht:.24,eel:1},
 floridagar:{b:'#7A8A4A',d:'#4E5A2E',bel:'#D8DCB0',fin:'#5E6A38',spot:'#2A3018',pat:'spots',ht:.17,snout:2,long:1},
 peacock:{b:'#C8B040',d:'#7A6A20',bel:'#F0E8A0',fin:'#E07A2A',spot:'#1E2A14',pat:'bars',ht:.38,ear:1},
 snook:{b:'#B8C0A8',d:'#7A8468',bel:'#F4F4EC',fin:'#9AA088',spot:'#1E2420',pat:'lateral',ht:.3,snout:1},
 tarpon:{b:'#B8C4D0',d:'#6E7E8E',bel:'#F8FAFC',fin:'#8A98A8',spot:'#D8E0E8',pat:'scales',ht:.33},
 bonefish:{b:'#C0C8C8',d:'#8A9498',bel:'#F8F8F6',fin:'#A8B0B0',spot:'#A0A8A8',pat:'none',ht:.26,snout:1},
 permit:{b:'#B8C0C8',d:'#7E8A94',bel:'#F6F6F4',fin:'#4A5A68',spot:'#E8C040',pat:'none',ht:.62,tall:1},
 barracuda:{b:'#8A9AA0',d:'#5A6A70',bel:'#F0F4F4',fin:'#6E7E84',spot:'#2A3438',pat:'bars',ht:.17,snout:2,long:1},
 snapper:{b:'#D84A3A',d:'#9A2E22',bel:'#F8D0C0',fin:'#C03A2A',spot:'#B03028',pat:'none',ht:.48},
 goliath:{b:'#8A7A50',d:'#5A4E30',bel:'#D8CCA0',fin:'#6E6240',spot:'#3A3220',pat:'mottle',ht:.5,blunt:1},
 halibut:{b:'#5A5A48',d:'#3A3A2C',bel:'#F0F0E8',fin:'#4A4A3A',spot:'#7A7A60',pat:'mottle',ht:.5,flat:1},
 lingcod:{b:'#6A7A5A',d:'#44503A',bel:'#D0D8C0',fin:'#5A6A4A',spot:'#2A3420',pat:'mottle',ht:.2,snout:1,long:1},
 yellowfin:{b:'#2A4A7A',d:'#14284A',bel:'#E8EEF2',fin:'#F0C030',spot:'#F0C030',pat:'none',ht:.3,tuna:1},
 bluefin:{b:'#1E3A6A',d:'#0E1E3E',bel:'#E0E8F0',fin:'#3A5A8A',spot:'#4A6A9A',pat:'none',ht:.33,tuna:1},
 marlin:{b:'#2A4A8A',d:'#142850',bel:'#E8EEF4',fin:'#3A6AB0',spot:'#6A9AD8',pat:'bars',ht:.24,bill:1,sail:1},
 mahi:{b:'#3AB080',d:'#1E7A50',bel:'#F0E060',fin:'#2A6AB0',spot:'#2A8AC8',pat:'spots',ht:.3,blunt:1,sail:2},
 wahoo:{b:'#4A6A8A',d:'#2A4460',bel:'#E8EEF0',fin:'#3A5A78',spot:'#5A88B8',pat:'bars',ht:.17,snout:2,long:1},
 gt:{b:'#A8B0B8',d:'#6A7480',bel:'#F2F4F6',fin:'#4A5460',spot:'#2A3038',pat:'none',ht:.48,tall:1,blunt:1},
 arapaima:{b:'#4A5A4A',d:'#2A382A',bel:'#D84A3A',fin:'#3A4A3A',spot:'#E06A4A',pat:'scales',ht:.22,long:1,eel:1},
 piranha:{b:'#9AA0A8',d:'#5A6068',bel:'#E04A3A',fin:'#7A8088',spot:'#C0C4C8',pat:'none',ht:.6,tall:1,blunt:1},
 redtail:{b:'#4A4A4A',d:'#2A2A2A',bel:'#F0E8D0',fin:'#D83A2A',spot:'#3A3A3A',pat:'none',ht:.3,whisk:1},
 payara:{b:'#B0B8C0',d:'#707880',bel:'#F4F4F4',fin:'#8A9098',spot:'#2A3038',pat:'none',ht:.3,snout:1,fangs:1},
 nileperch:{b:'#7A8A90',d:'#4A585E',bel:'#E0E8EC',fin:'#5A6A70',spot:'#2A3438',pat:'none',ht:.38,spiny:1},
 tigerfish:{b:'#D8C060',d:'#9A8838',bel:'#F8F0C0',fin:'#E05A2A',spot:'#2A2010',pat:'stripe2',ht:.3,fangs:1},
 vundu:{b:'#6A6A5A',d:'#44443A',bel:'#D8D0B0',fin:'#5A5A4A',spot:'#3A3A30',pat:'none',ht:.26,whisk:1},
 wels:{b:'#4A5A4A',d:'#2A3A2A',bel:'#D8D8A8',fin:'#3A4A3A',spot:'#1A2418',pat:'mottle',ht:.22,whisk:1,eel:1},
 atlanticsalmon:{b:'#8AA0B0',d:'#5A7080',bel:'#F4F4F2',fin:'#7A8A98',spot:'#2A3A44',pat:'spots',ht:.27},
 eel:{b:'#4A5A48',d:'#2A3828',bel:'#C8C898',fin:'#3A4A38',spot:'#2A3828',pat:'none',ht:.11,eel:1,long:1},
 taimen:{b:'#8A5A3A',d:'#563622',bel:'#E8D0B0',fin:'#D84A2A',spot:'#2A1A10',pat:'spots',ht:.24,long:1},
 lenok:{b:'#A08A50',d:'#6E5A30',bel:'#F0E0B0',fin:'#C87A4A',spot:'#2A2010',pat:'spots',ht:.27},
 siamesecarp:{b:'#8A8A7A',d:'#5A5A4A',bel:'#E0E0D0',fin:'#6A6A5A',spot:'#4A4A3A',pat:'scales',ht:.45,tall:1},
 mekong:{b:'#8A9AA0',d:'#5A6A70',bel:'#E8ECEE',fin:'#6E7E84',spot:'#4A5A60',pat:'none',ht:.3,blunt:1},
 biwatrout:{b:'#7A9AA8',d:'#4A6A78',bel:'#F0F2F2',fin:'#6A8A98',spot:'#2A3A44',pat:'spots',ht:.27},
 murraycod:{b:'#4A6A3A',d:'#2A4020',bel:'#E8E0A8',fin:'#3A5A2E',spot:'#D8C860',pat:'mottle',ht:.3,blunt:1},
 goldenperch:{b:'#D8B040',d:'#9A7820',bel:'#F8E8A0',fin:'#B08820',spot:'#8A6A18',pat:'none',ht:.42,hump:1},
 barramundi:{b:'#A8B0A0',d:'#6A7468',bel:'#F4F4EE',fin:'#8A9488',spot:'#4A5448',pat:'none',ht:.34,hump:1},
 coraltrout:{b:'#E05A3A',d:'#A03A22',bel:'#F8C8B0',fin:'#C84A2A',spot:'#4AA0E0',pat:'spots',ht:.36},
 char:{b:'#5E6E7A',d:'#3E4C56',bel:'#E06A3A',fin:'#E8E4DC',spot:'#F2D8C8',pat:'lightspots',ht:.28},
 cod:{b:'#8A8A6A',d:'#5A5A44',bel:'#E8E8D8',fin:'#6E6E54',spot:'#B0A880',pat:'mottle',ht:.3,whisk:1},
 ghalibut:{b:'#4A4A4A',d:'#2A2A2A',bel:'#D8D8D8',fin:'#3A3A3A',spot:'#5A5A5A',pat:'none',ht:.42,flat:1},
 greenlandshark:{b:'#5A5E68',d:'#34383E',bel:'#9A9EA8',fin:'#4A4E58',spot:'#6A6E78',pat:'none',ht:.26,shark:1,blunt:1},
 toothfish:{b:'#4A4E5A',d:'#2A2E38',bel:'#B0B4C0',fin:'#3A3E48',spot:'#6A7088',pat:'mottle',ht:.3,blunt:1},
 icefish:{b:'#C8D0D8',d:'#8A98A8',bel:'#F8FAFC',fin:'#A8B4C0',spot:'#6A7A8A',pat:'bars',ht:.22,snout:1,long:1},
 tilapia:{b:'#6A7A7A',d:'#44524E',bel:'#D8E0DC',fin:'#C85A3A',spot:'#2A3634',pat:'bars',ht:.5,tall:1},
 sharptooth:{b:'#5A5A4A',d:'#3A3A2A',bel:'#D0D0B0',fin:'#4A4A3A',spot:'#2A2A1A',pat:'none',ht:.22,whisk:1,eel:1},
 grayling:{b:'#8A98B0',d:'#5A6A80',bel:'#EEF0F4',fin:'#7A5AA8',spot:'#2A3448',pat:'spots',ht:.26,sail:1},
 dolly:{b:'#6A8A7A',d:'#44605A',bel:'#F0D0A0',fin:'#E07A4A',spot:'#F0C8A0',pat:'lightspots',ht:.27},
 rockfish:{b:'#E07A3A',d:'#A04A22',bel:'#F8D0A0',fin:'#C86A2A',spot:'#F0F0E0',pat:'none',ht:.45,spiny:1,bigEye:1},
 amberjack:{b:'#8A9A8A',d:'#56665A',bel:'#F0F0E8',fin:'#D8B040',spot:'#B08A30',pat:'stripe',ht:.32},
 gag:{b:'#7A7A6A',d:'#4A4A3E',bel:'#D8D8C8',fin:'#5A5A4A',spot:'#3A3A30',pat:'mottle',ht:.4,blunt:1},
 silverperch:{b:'#B0B8B8',d:'#7A8484',bel:'#F4F4F2',fin:'#8A9494',spot:'#6A7474',pat:'none',ht:.42,hump:1},
 notothen:{b:'#8A8A7A',d:'#5A5A4A',bel:'#D8D8C8',fin:'#6E6E5E',spot:'#4A4A3A',pat:'bars',ht:.3,bigEye:1},
 herring:{b:'#6E92B0',d:'#3E5E80',bel:'#EEF4F8',fin:'#8AA4B8',spot:'#2A4460',pat:'none',ht:.24},
 sculpin:{b:'#7A6A4A',d:'#4E4230',bel:'#D8C8A0',fin:'#8A5A3A',spot:'#3A2E1E',pat:'mottle',ht:.3,blunt:1},
 polarcod:{b:'#8A9AA8',d:'#56667A',bel:'#EEF0F2',fin:'#7A8A98',spot:'#3A4A5A',pat:'spots',ht:.22},
 opelu:{b:'#4A8AA8',d:'#24506E',bel:'#F0F2F0',fin:'#E0C060',spot:'#F0D070',pat:'lateral',ht:.24},
 silverfish:{b:'#C0CCD8',d:'#8A9AAC',bel:'#F8FAFC',fin:'#A8B6C4',spot:'#6A7A8C',pat:'none',ht:.18},
 snakehead:{b:'#5A5A3A',d:'#3A3A22',bel:'#C8C8A0',fin:'#4A4A30',spot:'#2A2A14',pat:'mottle',ht:.2,long:1,eel:1}
};
A.LOOK=L;
A.VARIANT_PAL={golden:{b:'#E8B830',d:'#B88A18',bel:'#FFE9A0',fin:'#D89A20',spot:'#FFF2C0'},albino:{b:'#F2EEEA',d:'#D8D0CC',bel:'#FFFFFF',fin:'#E8DCD8',spot:'#E0D6D2',eye:'#D04A5A'}};

/* Builds a pixel grid for a fish of length L (pixels). Cells hold palette keys. */
A.fishGrid=function(lk,L){
  var Hh=Math.max(3,Math.round(L*lk.ht)); if(Hh%2===0) Hh++;
  var pad=Math.max(2,Math.round(Hh*(lk.sail===2?0.7:lk.sail?0.6:0.4)));
  var GW=L+2+(lk.bill?Math.round(L*0.25):0), GH=Hh+pad*2+2, cy=Math.floor(GH/2), half=(Hh-1)/2;
  var g=[]; for(var y=0;y<GH;y++) g.push(new Array(GW).fill(null));
  function set(x,y,c){ if(x>=0&&x<GW&&y>=0&&y<GH) g[y][x]=c; }
  var tailLen=Math.max(2,Math.round(L*(lk.eel?0.12:lk.tuna?0.22:0.2))), x0=1, bodyStart=x0+tailLen-1, nose=x0+L-1;
  for(var x=x0;x<=nose;x++){
    if(x<x0+tailLen){
      var tt=(x0+tailLen-x)/tailLen, th;
      if(lk.eel){ th=Math.round(1+(1-tt)*half*0.9); for(var dy=-th;dy<=th;dy++) set(x,cy+dy,'fin'); }
      else if(lk.tuna){ th=Math.round(1+tt*(half*1.3+pad*0.5)); for(dy=-th;dy<=th;dy++){ if(tt>0.3&&Math.abs(dy)<th*0.7&&th>2) continue; if(tt<0.3&&Math.abs(dy)>1) continue; set(x,cy+dy,'fin'); } }
      else if(lk.shark){ th=Math.round(1+tt*(half*1.1+pad*0.4)); for(dy=-th;dy<=th;dy++){ if(dy>0&&dy>th*0.5) continue; if(tt>0.5&&Math.abs(dy)<th*0.4&&th>2) continue; set(x,cy+dy,'fin'); } }
      else { th=Math.round(1+tt*(half*1.05+pad*0.45)); for(dy=-th;dy<=th;dy++){ if(tt>0.55&&Math.abs(dy)<th*0.45&&th>2) continue; set(x,cy+dy,'fin'); } }
    }
    if(x>=bodyStart){
      var span=Math.max(1,nose-bodyStart), u=(x-bodyStart)/span, prof;
      if(lk.blunt) prof=Math.pow(Math.sin(Math.PI*(0.04+Math.pow(u,0.7)*0.9)),0.45);
      else if(lk.flat) prof=Math.pow(Math.sin(Math.PI*(0.06+u*0.9)),0.35);
      else if(lk.hump) prof=Math.pow(Math.sin(Math.PI*(0.06+Math.pow(u,0.85)*0.9)),0.5);
      else prof=Math.pow(Math.sin(Math.PI*(0.06+u*0.9)),(lk.snout||lk.long)?0.85:0.55);
      if(u>0.8) prof*=1-(u-0.8)*(lk.snout===2?3.2:lk.snout?2.4:lk.blunt?0.8:1.4);
      if(u<0.12) prof=Math.max(prof,lk.eel?0.7:0.38);
      if(lk.eel) prof=Math.max(prof,0.6+0.4*Math.sin(Math.PI*u));
      var hh=Math.max(0.6,half*prof);
      var top=Math.round(cy-hh), bot=Math.round(cy+hh*(lk.flat?1:0.95));
      for(var y2=top;y2<=bot;y2++){
        var rel=(y2-top)/Math.max(1,bot-top);
        var c=rel<0.22?'d':rel>0.62?'bel':'b';
        if(lk.flat) c=rel<0.5?'b':'bel';
        if(c!=='bel' && u>0.08 && u<0.86){
          var h2=hash(x*31.7+y2*17.3+L);
          if(lk.pat==='bars'){ var p=Math.max(3,Math.round(L/7)); if(((x-bodyStart)%p)<Math.max(1,Math.round(p*0.4))) c='spot'; }
          else if(lk.pat==='stripe'){ if(Math.abs(y2-cy+1)<=Math.max(0,Math.round(half*0.18)) && hash(x*3.3)>0.2) c='spot'; }
          else if(lk.pat==='stripe2'){ if((y2-top)%Math.max(2,Math.round(half*0.5))===0) c='spot'; }
          else if(lk.pat==='lateral'){ if(y2===cy) c='spot'; }
          else if(lk.pat==='spots'){ if(h2<0.16) c='spot'; }
          else if(lk.pat==='lightspots'){ if(h2<0.2) c='spot'; }
          else if(lk.pat==='mottle'){ if(h2<0.3) c='d'; else if(h2>0.9) c='spot'; }
          else if(lk.pat==='scutes'){ if((y2===top+1 && x%3===0)||(y2===cy && x%4===0)) c='spot'; }
          else if(lk.pat==='scales'){ if(((x+y2)&1)===0 && h2<0.5) c='spot'; }
          if(lk.band&&Math.abs(y2-cy)<=Math.max(0,Math.round(half*0.2))) c='band';
        }
        if(Math.abs(u-0.72)<0.5/span && rel>0.15 && rel<0.85 && L>14 && !lk.flat) c='d';
        set(x,y2,c);
      }
      if(lk.sail===2){ if(u>0.12&&u<0.9){ var fh2=Math.round(pad*0.9*Math.pow(Math.sin(Math.PI*(u-0.12)/0.78),0.6)); for(var k2=1;k2<=fh2;k2++) set(x,top-k2,'fin'); } }
      else if(lk.sail){ if(u>0.35&&u<0.75){ var fh3=Math.round(pad*1.1*Math.sin(Math.PI*(u-0.35)/0.4)); for(var k3=1;k3<=fh3;k3++) set(x,top-k3,'fin'); } }
      else if(lk.eel){ if(u>0.15&&u<0.98&&(x%2===0||L>24)){ var fe=Math.max(1,Math.round(pad*0.5)); for(var ke=1;ke<=fe;ke++){ set(x,top-ke,'fin'); set(x,bot+ke,'fin'); } } }
      else if(lk.spiny){ if(u>0.3&&u<0.62){ var fs=Math.round(pad*0.85*Math.sin(Math.PI*(u-0.3)/0.32)); for(var ks=1;ks<=fs;ks++) if((x+ks)%2===0||ks===1) set(x,top-ks,'fin'); } }
      else if(!lk.flat){ if(u>0.3&&u<0.62){ var fh=Math.round(pad*0.85*Math.sin(Math.PI*(u-0.3)/0.32)); for(var k=1;k<=fh;k++) set(x,top-k,'fin'); } }
      if(lk.tuna&&u>0.68&&u<0.9&&L>14){ if(((x-bodyStart)%3)===0){ set(x,top-1,'fin'); set(x,bot+1,'fin'); } }
      if(!lk.flat&&!lk.eel){ if(u>0.22&&u<0.36 && L>10) set(x,bot+1,'fin'); if(u>0.6&&u<0.68 && L>14) set(x,bot+1,'fin'); }
      if(lk.shark&&u>0.55&&u<0.66&&L>14){ set(x,bot+1,'fin'); set(x,bot+2,'fin'); }
    }
  }
  if(lk.bill){ var bl=Math.round(L*0.25); for(var bx=1;bx<=bl;bx++) set(nose+bx,cy-Math.round(bx*0.15),'d'); }
  var out=[]; for(y=0;y<GH;y++){ for(x=0;x<GW;x++){ if(g[y][x]) continue;
    if((x>0&&g[y][x-1])||(x<GW-1&&g[y][x+1])||(y>0&&g[y-1][x])||(y<GH-1&&g[y+1][x])) out.push([x,y]); } }
  out.forEach(function(p){ g[p[1]][p[0]]='out'; });
  var spanE=nose-bodyStart, ex=bodyStart+Math.round(spanE*(lk.blunt?0.8:0.86)), ey=cy-Math.max(1,Math.round(half*(lk.flat?0.55:0.32)));
  if(lk.ear && L>9) set(ex-Math.max(2,Math.round(spanE*0.12)),cy-1,'spot');
  set(ex,ey,'eye');
  if(lk.flat&&L>12) set(ex-2,ey-1,'eye');
  if(lk.bigEye && L>16){ set(ex-1,ey,'eye'); set(ex,ey-1,'hl'); }
  else if(L>20) set(ex,ey-1,'hl');
  if(!lk.bill) set(nose,cy+1,'out');
  if(lk.fangs&&L>12){ set(nose-1,cy+2,'hl'); set(nose-3,cy+2,'hl'); }
  if(lk.whisk){ set(nose,cy+2,'out'); set(nose-1,cy+3,'out'); if(L>16){ set(nose-2,cy+4,'out'); set(nose+1,cy+2,'out'); } }
  return g;
};
var spriteCache={};
A.fishCanvas=function(spId,L,shadow,variant,colors){
  var key=spId+'|'+L+'|'+(shadow||0)+'|'+(variant||'')+'|'+(colors?JSON.stringify(colors):'');
  if(spriteCache[key]) return spriteCache[key];
  var lk=L_of(spId), g=A.fishGrid(lk,L);
  var pal=Object.assign({b:lk.b,d:lk.d,bel:lk.bel,fin:lk.fin,spot:lk.spot,band:lk.band||lk.spot,out:'#0B1420',eye:'#0B0F14',hl:'#F4F4E8'},A.VARIANT_PAL[variant]||{},colors||{});
  if(variant==='albino') pal.band='#F4C8D0';
  var c=document.createElement('canvas'); c.width=g[0].length; c.height=g.length;
  var x2=c.getContext('2d');
  for(var y=0;y<g.length;y++) for(var x=0;x<g[0].length;x++){ var k=g[y][x]; if(!k) continue; x2.fillStyle=shadow?(typeof shadow==='string'?shadow:'#020A16'):pal[k]; x2.fillRect(x,y,1,1); }
  spriteCache[key]=c; return c;
};
function L_of(spId){ var sp=root.OC&&root.OC.SP_BY_ID[spId]; var lookId=sp?sp.look:spId; return L[lookId]||L.perch; }
A.lookOf=L_of;
A.fishImg=function(spId,L,shadow,scale,variant,colors,label){
  var src=A.fishCanvas(spId,L,shadow,variant,colors), c=document.createElement('canvas');
  c.width=src.width; c.height=src.height; c.className='px'; c.getContext('2d').drawImage(src,0,0);
  c.style.width=(src.width*scale)+'px'; c.style.height=(src.height*scale)+'px';
  c.setAttribute('role','img'); c.setAttribute('aria-label',label||(shadow?'Unknown fish':spId));
  return c;
};
/* How long a species draws on screen, from its top weight. */
A.sceneLen=function(maxLb){ return Math.round(5+22*Math.log(Math.max(2,maxLb))/Math.log(1000)); };
A.heroLen=function(lb){ return Math.max(5,Math.round(11*Math.cbrt(lb))); };

/* ---- bait art ---- */
A.BAIT_ART={
  worm:{rows:["........","......p.",".....pP.","..pp.p..",".pPPp...","pP..Pp..",".....Pp.","......p."],map:{p:'#C2506A',P:'#F08AA0'}},
  minnow:{rows:["........","........","s...sss.","ssssSSse","s.ssSSs.","...sss..","........","........"],map:{s:'#8FA3B0',S:'#E2ECF0',e:'#10161C'}},
  cut:{rows:["........","...rr...","..rRRr..",".rRRRRr.",".rRRRRw.","..rRRww.","...rrw..","........"],map:{r:'#8E2430',R:'#D9465A',w:'#F2D9D2'}},
  sucker:{rows:["........","........","t.oooo..","ttOOOOoo","t.OOOOOe","..oooo..","........","........"],map:{t:'#6E6A3A',o:'#6E6A3A',O:'#C4B878',e:'#10161C'}},
  shrimp:{rows:["........","....pp..","...pPPp.","..pPPPp.","..pPPp..","aa.pp...","..aaa...","........"],map:{p:'#E08A6A',P:'#F8C8A8',a:'#C06A4A'}},
  squid:{rows:["...ww...","..wWWw..","..wWWw..","..wwww..",".e.ww.e.","..tttt..",".t.tt.t.","t..tt..t"],map:{w:'#D8C8D8',W:'#F0E8F0',e:'#10161C',t:'#C0A8C0'}},
  mullet:{rows:["........","........","s..ssss.","sssSSSse","s.sSSSs.","...ssss.","........","........"],map:{s:'#7A8A98',S:'#D8E0E8',e:'#10161C'}},
  crank:{rows:["........","..GGGG..",".GkGkGG.","OOOOOOeL",".OOOOO.L","..h..h..",".hh.hh..","........"],map:{G:'#B8E040',k:'#1B1F2A',O:'#F08A30',e:'#10161C',L:'#CFE6F0',h:'#9AA6B6'}},
  jig:{rows:["........","...hh...","..JJJh..",".JJeJJ..",".JJJJSSS","..JJ.SsS","......SS","....hh.."],map:{h:'#9AA6B6',J:'#E5484D',e:'#10161C',S:'#7A4AC0',s:'#2A1A40'}},
  lure:{rows:["........","..kk....",".kYYk...","kYYYYk..","kYYYYkff","kYYYYkff",".kYYk.f.","..kk...."],map:{k:'#1B1F2A',Y:'#F0C030',f:'#E05A4A'}},
  deepbait:{rows:["..kk....","..kk....",".kkkk...","sskkkss.","sSSSSSse","ssSSSss.","..sss...","........"],map:{k:'#5A6476',s:'#6A8A9A',S:'#B8D0D8',e:'#10161C'}}
};
A.ICONS={
  trophy:{rows:["Y.YYYY.Y","Y.YYYY.Y",".YYYYYY.","..YYYY..","...YY...","...YY...","..yyyy..",".yyyyyy."],map:{Y:'#FFC94A',y:'#C98A12'}},
  pail:{rows:["..kkkk..",".k....k.","gggggggg",".gGgggg.",".gGgggg.",".gGgggg.","..gggg..","........"],map:{k:'#5A6476',g:'#8C97A8',G:'#D8E0EA'}},
  hat:{rows:["........","...WW...","..RRRR..",".RRRRRR.",".RRRRRR.",".CCCCCC.","........","........"],map:{W:'#F4F4F4',R:'#D93A3A',C:'#F0E6D2'}},
  tackle:{rows:["..kkkk..","..k..k..","GGGGGGGG","GgYggYgG","GGGGGGGG","GggggggG","GggggggG","GGGGGGGG"],map:{G:'#2F7C9A',g:'#1D5468',Y:'#FFC94A',k:'#5A6476'}},
  medal:{rows:["..rbbr..","...rb...","..YYYY..",".YyYYyY.",".YYYYYY.",".YyYYyY.","..YYYY..","........"],map:{r:'#E5484D',b:'#3FA7F0',Y:'#FFC94A',y:'#C98A12'}},
  star:{rows:["...Y....","...Y....","YYYYYYY.",".YYYYY..","..YYY...",".YY.YY..","YY...YY.","........"],map:{Y:'#FFC94A'}},
  disk:{rows:["BBBBBBB.","BwwwwwBB","BwwwwwBB","BBBBBBBB","BBkkkkBB","BBkBkkBB","BBkkkkBB","........"],map:{B:'#3A78D8',w:'#EAF5FF',k:'#14294C'}},
  globe:{rows:["..BBBB..",".BGGBBB.","BGGGBBBB","BBGGBBGB","BBBBGGGB","BBBGGGBB",".BBBBBB.","..BBBB.."],map:{B:'#2F84D8',G:'#5CB85C'}},
  spool:{rows:["........",".kkkkkk.","..wwww..","..wwww..","..wwww..",".kkkkkk.","........","........"],map:{k:'#5A6476',w:'#EAF5FF'}},
  heater:{rows:["..kkkk..",".kRRRRk.",".kRYYRk.",".kRYYRk.",".kRRRRk.",".kkkkkk.",".k....k.","........"],map:{k:'#2A2E38',R:'#E5484D',Y:'#FFC94A'}},
  boat:{rows:["........","........","....k...","....kk..","wwwwwwww",".wWWWWw.","..wwww..","........"],map:{k:'#5A6476',w:'#C9A06A',W:'#E8D0A0'}},
  help:{rows:["..WWWW..",".WW..WW.",".....WW.","....WW..","...WW...","...WW...","........","...WW..."],map:{W:'#EAF5FF'}},
  friends:{rows:["..S..S..",".SSS.SS.","..S..S..",".OOO.OO.",".OOO.OO.",".OOO.OO.",".PPP.PP.","........"],map:{S:'#F2C9A0',O:'#2F7CD8',P:'#2C3E66'}},
  trade:{rows:["........","..Y..B..",".YYYYBB.","YYYYYBBB",".YYYYBB.","..Y..B..","........","........"],map:{Y:'#FFC94A',B:'#5CF08A'}},
  news:{rows:["WWWWWWW.","WkkkkkW.","WWWWWWW.","WkkWkkW.","WkkWkkW.","WWWWWWW.","WkkkkkW.","WWWWWWW."],map:{W:'#EAF5FF',k:'#5A6476'}},
  legend:{rows:["...Y....","..YYY...",".YYYYY..","YYYYYYY.","YYYYYYY.",".YYYYY..","..YYY...","...Y...."],map:{Y:'#FFC94A'}},
  plane:{rows:["........","w.......","ww......","wwwwwww.","WWWWWWWW","wwwwwww.","ww......","w......."],map:{w:'#C8D0D8',W:'#EAF5FF'}},
  bus:{rows:["........",".YYYYYY.",".YwwYwY.",".YYYYYY.",".YYYYYY.",".YYYYYY.","..k..k..","........"],map:{Y:'#F0C030',w:'#BFE3F2',k:'#1B1F2A'}},
  book:{rows:[".kkkkkk.",".kwwwwk.",".kwwwwk.",".kwwwwk.",".kwwwwk.",".kwwwwk.",".kkkkkk.","........"],map:{k:'#8E2430',w:'#F0E6D2'}},
  map:{rows:["GGGGBBBB","GGBBBBGG","BBBBGGGG","BBGGGGBB","GGGGBBBB","GBBBBBBG","BBBGGBBB","BBBBBBBB"],map:{G:'#5CB85C',B:'#2F84D8'}}
};
/* ---- the angler ---- */
A.HAT_ROWS={
  beanie:[".....W......","....RRRR....","...RRRRRR...","...CCCCCC..."],
  cap:["............","....RRRR....","...RRRRRR...","...RRRRRRrr."],
  straw:["............","....RRRR....","...RRRRRR...",".rrRRRRRRrr."],
  bucket:["............","....RRRR....","...RRRRRR...","..rrRRRRrr.."],
  trapper:["....RRRR....","...RRRRRR...","..RRRRRRRR..","..CCCCCCCC.."],
  captain:["............","....RRRR....","...RRRRRR...","...CCYYCCrr."],
  crown:["............","...Y.Y.Y.Y..","...YYYYYYY..","...yJyUyJy.."],
  champ:["............","....BBBB....","...BBYYBB...","...BBBBBBbb."]
};
A.BODY=["...SSSSSE...","...SSSSSS...","....SSSS....","..OOOOOOO...",".OOOOOOOOO..",".OOOOOOOOOGG",".oOOOOOOO...",".oOOOOOOO...","..PPPPPPP...","..PPPPPPPPP.","..BBBB..PPP.","..bBBB..PPP.","..bBBB..KKK.","..bBBB..KKKK"];
function setCh(s,i,c){ return s.slice(0,i)+c+s.slice(i+1); }
var fisherCache={};
A.fisherCanvas=function(of){
  var D=root.OC, key=[of.hat,of.coat,of.pants,of.boots,of.skin].join('|');
  if(fisherCache[key]) return fisherCache[key];
  var hat=D.ITEM_BY_ID[of.hat]||D.ITEM_BY_ID.hat_red;
  var rows=(A.HAT_ROWS[hat.hat]||A.HAT_ROWS.beanie).concat(A.BODY);
  if(hat.hat==='trapper'){ for(var y=4;y<=6;y++) rows[y]=setCh(rows[y],2,'C'); rows[4]=setCh(rows[4],9,'C'); rows[5]=setCh(rows[5],9,'C'); }
  var m={E:'#1B1B24',G:'#2B2F3A',B:'#9AA6B6',b:'#6E7A8C'};
  ['skin','coat','pants','boots','hat'].forEach(function(s){ var it=D.ITEM_BY_ID[of[s]]||D.ITEM_BY_ID[D.DEFAULT_OUTFIT[s]]; Object.assign(m,it.c); });
  fisherCache[key]=A.spriteCanvas(rows,m); return fisherCache[key];
};
/* ---- boats ---- */
A.SMALL_BOAT=[
".....................................kk.",
".....................................kk.",
"hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.",
".HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHh..",
".HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHh..",
"..hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh...",
"...ddddddddddddddddddddddddddddddddd....",
".....ddddddddddddddddddddddddddddd......"];
A.SMALL_BOAT_MAP={k:'#5A6476',h:'#C9A06A',H:'#E8D0A0',d:'#7A5A3A'};
A.BIG_BOAT=[
"..........................kk............................",
"..........................kk............................",
"......................wwwwwwwwwwwwww....................",
"......................wWWWWWWWWWWWWw....................",
"......................wWbbbbbbbbbbWw....................",
"..................wwwwwwwwwwwwwwwwwwwwww................",
"..................wWWWWWWWWWWWWWWWWWWWWw................",
"...r....r.........wWbbbbbWWWWWbbbbbWWWWw................",
"...r....r.........wWWWWWWWWWWWWWWWWWWWWw..............h.",
"hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
".HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHh.",
".HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHh..",
"..hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh...",
"....ddddddddddddddddddddddddddddddddddddddddddddddd.....",
"......ddddddddddddddddddddddddddddddddddddddddddd......."];
A.BIG_BOAT_MAP={k:'#5A6476',w:'#D8E0E8',W:'#F4F8FA',b:'#5FB2CF',r:'#8A6A3A',h:'#EAF0F4',H:'#FFFFFF',d:'#2A4A6A'};
A.CRANE_CAB=["......RRRRRR....","......RwwwwR....","......RwwwwR....","..RRRRRRRRRRRRR.",".RRRRRRRRRRRRRRR",".rrrrrrrrrrrrrrr",".kkkkkkkkkkkkkk.","kKkKkKkKkKkKkKkk",".kkkkkkkkkkkkkk."];

if(typeof module!=='undefined'&&module.exports) module.exports=A; else root.ART=A;
})(typeof window!=='undefined'?window:this);

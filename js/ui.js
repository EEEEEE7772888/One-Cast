/* One Cast overlays: menu, shops, inventory, journal, legends, boards, friends, trading, profiles, news, the world map, save codes. */
(function(){
'use strict';
var D=window.OC, A=window.ART, N=window.NET, M=window.WMAP, SC=window.SCENE, G=window.G=window.G||{}, UI=window.UI={};
function $(id){ return document.getElementById(id); }
function el(tag,cls,html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var OVERLAYS=['dockOv','menuOv','tackleOv','baitOv','gearOv','shopOv','bucketOv','fishOv','cardOv','journalOv','legendOv','achOv','boardOv','friendsOv','tradeOv','profileOv','newsOv','mapOv','saveOv','helpOv','awayOv','reportOv','suggestOv'];
var RENDER={dockOv:renderDock,menuOv:renderMenu,tackleOv:renderTackle,baitOv:renderBaitShop,gearOv:renderGear,shopOv:renderShop,bucketOv:renderBucket,journalOv:renderJournal,legendOv:renderLegends,achOv:renderAch,boardOv:renderBoard,friendsOv:renderFriends,newsOv:renderNews,mapOv:renderMap,saveOv:renderSave};
UI.open=function(id){ OVERLAYS.forEach(function(o){ if(o!==id&&o!=='cardOv') $(o).hidden=true; }); $(id).hidden=false; if(RENDER[id]) RENDER[id](); var f=$(id).querySelector('.x,button,select,input'); if(f&&id!=='mapOv') try{ f.focus({preventScroll:true}); }catch(e){} if(id==='mapOv') G.coachEvent&&G.coachEvent('map'); };
UI.closeAll=function(){ OVERLAYS.forEach(function(o){ $(o).hidden=true; }); $('resetAsk').hidden=true; $('reset').hidden=false; if(G.tradeId){ stopTradePoll(); } if(G.s){ G.renderAll(); G.checkAch(); } };
UI.anyOpen=function(){ return OVERLAYS.some(function(o){ return !$(o).hidden; }); };
UI.afterRefresh=function(){ UI.crewTick(); if(!$('menuOv').hidden) renderMenu(); if(!$('friendsOv').hidden) renderFriends(); if(!$('bucketOv').hidden) renderBucket(); };
document.querySelectorAll('[data-close]').forEach(function(b){ b.addEventListener('click',UI.closeAll); });
document.querySelectorAll('.overlay').forEach(function(o){ o.addEventListener('click',function(e){ if(e.target===o&&o.id!=='nameOv'&&o.id!=='bootOv'&&o.id!=='confirmOv'&&o.id!=='travelOv'&&o.id!=='cardOv') UI.closeAll(); }); });
$('menuBtn').onclick=function(){ UI.open('menuOv'); }; $('mapBtn').onclick=function(){ UI.open('mapOv'); }; $('whereChip').onclick=function(){ UI.open('mapOv'); }; $('tackleBtn').onclick=function(){ UI.open('tackleOv'); };
$('alertBtn').onclick=function(){ G.openAlert().then(function(){ G.renderAlertBtn(); }); };
$('hudAlert').onclick=function(){ G.openAlert().then(function(){ G.renderAlertBtn(); }); };

/* ---------- confirm ---------- */
var cfResolve=null;
UI.confirm=function(o){ $('cfTitle').textContent=o.title||'ARE YOU SURE?'; var body=$('cfBody'); body.innerHTML=''; if(o.body) body.appendChild(o.body); $('cfNote').textContent=o.note||''; $('cfYes').textContent=o.yes||'YES'; $('cfNo').textContent=o.no||'NO'; $('cfYes').className='go '+(o.danger===false?'':'reel'); $('confirmOv').hidden=false; return new Promise(function(r){ cfResolve=r; }); };
function cfDone(v){ $('confirmOv').hidden=true; var r=cfResolve; cfResolve=null; if(r) r(v); }
$('cfYes').onclick=function(){ cfDone(true); }; $('cfNo').onclick=function(){ cfDone(false); };

/* ---------- menu ---------- */
function icon(name){ var i=A.ICONS[name]; return A.spriteCanvas(i.rows,i.map); }
function renderMenu(){
  $('menuCoins').textContent=D.money(G.s.coins);
  renderDaily();
  var list=$('menuList'); list.innerHTML='';
  var unread=newsUnread();
  var items=[
    ['pail','YOUR FISH',G.s.fish.length+' fish, worth '+D.money(bucketValue()),'bucketOv'],
    ['map','WORLD MAP',G.spot().name+' · '+G.s.regions.length+' of 14 regions','mapOv'],
    ['legend','LEGENDS',legendBlurb(),'legendOv'],
    ['tackle','BAIT SHOP',G.s.baits.length+' of '+D.BAITS.length+' baits','baitOv'],
    ['boat','THE DOCK',(D.GEAR_BY_ID[G.s.gear.boat||'paddle']||{}).name+' · '+(G.s.gear.boats||['paddle']).length+' of '+D.BOATS.length+' boats','dockOv'],
    ['spool','GEAR SHOP',gearBlurb(),'gearOv'],
    ['hat','CLOTHES','Dress your angler','shopOv'],
    ['book','FISH JOURNAL',Object.keys(G.s.journal).filter(function(k){ return k.indexOf('legend:')!==0; }).length+' of '+D.SPECIES.length+' species','journalOv'],
    ['trophy','LEADERBOARD','World, region and species boards','boardOv'],
    ['friends','FRIENDS AND TRADING',G.s.friends.filter(function(f){ return f.status==='accepted'; }).length+' friends'+(G.s.trades.length?' · '+G.s.trades.length+' open trade'+(G.s.trades.length>1?'s':''):'')+pendingTxt(),'friendsOv'],
    ['news','WORLD NEWS',unread?unread+' new':'Legends, records and rare fish','newsOv'],
    ['star','ACHIEVEMENTS',(G.s.prefs.ach||[]).length+' of '+G.ACH.length,'achOv'],
    ['disk','SAVE CODE','Play on another device','saveOv'],
    ['help','HOW TO PLAY','The rules in one minute','helpOv']
  ];
  items.forEach(function(it){ var b=el('button','mbtn'); b.type='button'; b.appendChild(icon(it[0])); var t=el('span',null,'<span class="t">'+it[1]+'</span><span class="s">'+esc(it[2])+'</span>'); b.appendChild(t); b.appendChild(el('span','arrow','>')); b.onclick=function(){ UI.open(it[3]); }; list.appendChild(b); });
  $('menuFoot').innerHTML='You are <b>'+esc(G.s.name)+'#'+G.s.tag+'</b>'+(G.s.founder?' <span class="tag gold">FOUNDER</span>':'')+(G.s.champ?' <span class="tag gold">CHAMPION x'+G.s.champ+'</span>':'')+'. Season '+seasonName(G.s.season.key)+' ends in '+D.fmtDuration((Date.parse(G.s.season.endsAt)-N.now())/60000)+'. <button class="pbtn" id="suggestBtn" type="button" style="font-size:7px;padding:6px">SUGGEST A LAKE</button>';
  $('suggestBtn').onclick=function(){ UI.open('suggestOv'); };
  G.renderAlertBtn();
}
function pendingTxt(){ var n=G.s.friends.filter(function(f){ return f.status==='pending'&&!f.mine; }).length; return n?' · '+n+' request'+(n>1?'s':''):''; }
function seasonName(k){ var M=['January','February','March','April','May','June','July','August','September','October','November','December']; return M[+k.slice(6,8)-1]+' '+k.slice(1,5); }
function legendBlurb(){ var l=G.s.legendsHere&&G.s.legendsHere[0]; return l?'Here: '+l.name+' (still out there)':'The legend here has been caught'; }
function gearBlurb(){ return G.lineTest()+' lb line · '+(G.s.gear.lines||1)+' line'+((G.s.gear.lines||1)>1?'s':'')+(G.s.gear.finder?' · finder':''); }
function bucketValue(){ var t=0; G.s.fish.forEach(function(f){ if(!f.legend&&!f.released) t+=f.value||0; }); return t; }
UI.renderMenuBadge=function(){ var n=newsUnread()+G.s.friends.filter(function(f){ return f.status==='pending'&&!f.mine; }).length+G.s.trades.length; $('menuBadge').hidden=!n; $('menuBadge').textContent=n>9?'9+':n; };
function newsUnread(){ var seen=G.s.prefs.newsSeen||0; return Math.max(0,(G.s.newsId||0)-seen>60?60:(G.s.newsId||0)-seen); }
function renderDaily(){
  var d=G.s.daily||{}, box=$('dailyBox'); if(!d.type){ box.innerHTML='<span class="t">Daily challenge: catch a fish to get today\'s.</span>'; return; }
  var txt={count:'Catch '+d.goal+' fish today',weight:'Catch a fish of '+D.fmtWeight(+d.lb||1)+' or more',prime:'Catch '+d.goal+' fish at dawn or dusk',species:'Catch '+d.goal+' different species today'}[d.type];
  box.className='daily'+(d.done?' done':''); box.innerHTML='<span class="t">DAILY: '+txt+'</span><span class="r"><span>'+(d.done?'Done! +'+D.money(d.reward):Math.min(d.progress,d.goal)+' / '+d.goal)+'</span><b>'+(d.done?'':'Reward '+D.money(d.reward))+'</b></span>';
}

/* ---------- tackle box and bait shop ---------- */
function renderTackle(){
  var box=$('baitPick'); box.innerHTML=''; var sp=G.spot();
  $('tackleNote').textContent=D.METHOD_NAME[sp.method]+' at '+sp.name+'. '+(sp.method==='troll'?'Trolling uses big-game lures.':sp.method==='deep'?'Deep drop uses squid or a deep-drop rig.':'Pick what to put on the hook.');
  D.BAITS.forEach(function(b){ if(D.METHOD_BAITS[sp.method].indexOf(b.id)<0) return; var own=G.s.baits.indexOf(b.id)>=0, works=G.baitWorksHere(b.id);
    var btn=el('button','bait'+(own?'':' locked')+(works?'':' dead')); btn.type='button'; btn.setAttribute('aria-pressed',String(b.id===G.bait)); var art=A.BAIT_ART[b.id]; btn.appendChild(A.spriteCanvas(art.rows,art.map)); btn.appendChild(el('span',null,own?esc(b.name):D.money(b.price)));
    btn.onclick=function(){ if(!own){ UI.open('baitOv'); return; } if(!works){ G.toast('Nothing at '+sp.name+' takes '+b.name.toLowerCase()+'.'); return; } G.setBait(b.id); renderTackle(); }; box.appendChild(btn); });
  var b=D.BAIT_BY_ID[G.bait], fishHere=D.spotSpecies(sp.id).filter(function(s){ return s.baits[G.bait]; }).map(function(s){ return s.name; });
  $('baitInfo').innerHTML='<b style="color:#EAF5FF">'+esc(b.name.toUpperCase())+'</b> · bites: '+b.rate+'<br>'+esc(b.timing)+(fishHere.length?'<br>Here it catches: '+esc(fishHere.join(', '))+'.':'<br>Nothing here takes it.');
}
$('toBaitShop').onclick=function(){ UI.open('baitOv'); };
function renderBaitShop(){
  var ul=$('baitRows'); ul.innerHTML='';
  D.BAITS.forEach(function(b){ var own=G.s.baits.indexOf(b.id)>=0, li=el('li','row'+(own?' selected':'')), art=A.BAIT_ART[b.id];
    li.appendChild(el('div','ic')).appendChild(A.spriteCanvas(art.rows,art.map)); li.lastChild.firstChild.style.width='32px'; li.lastChild.firstChild.style.height='32px';
    var where=b.water==='fresh'?'Freshwater':b.water==='salt'?'Saltwater':b.water==='troll'?'Ocean trolling':'Deep drop';
    li.appendChild(el('div',null,'<div class="nm">'+esc(b.name)+'</div><div class="sub">'+esc(b.desc)+' · <b>'+where+'</b> · bites '+b.rate.toLowerCase()+'</div>'));
    var act=el('div'); if(own) act.innerHTML='<span class="own">OWNED</span>'; else { var btn=el('button','pbtn'+(G.s.coins>=b.price?' gold':''),D.money(b.price)); btn.type='button'; btn.disabled=G.s.coins<b.price; btn.onclick=function(){ buy('bait',b.id,b.name); }; act.appendChild(btn); }
    li.appendChild(act); ul.appendChild(li); });
}
function buy(kind,id,name){
  return N.me('buy',{p_kind:kind,p_id:id}).then(function(r){ G.s.coins=r.coins; G.s.baits=r.baits; G.s.gear=r.gear; G.s.items=r.items; G.s.regions=r.regions; G.bump(); G.toast('Bought '+name+'.',2000,'good'); G.renderAll();
    if(kind==='bait'){ renderBaitShop(); if(G.baitWorksHere(id)) G.setBait(id); } if(kind==='gear'){ renderGear(); } if(kind==='item'){ renderShop(); } return r; }).catch(G.fail);
}
function renderGear(){
  var box=$('gearRows'); box.innerHTML='';
  var groups=[['LINES','lines','Fish more than one line at once. All your lines are at the spot you are visiting.'],['LINE STRENGTH','line','A fish heavier than your line can snap it. Stronger line holds bigger fish.'],['REEL','reel','A better reel gives overweight fish fewer chances to get away.'],['FISH FINDER','finder','See what is on your hook before you reel.'],['DEEP DROP','method','For the deep-drop spots. Without it you only catch small fish near the surface.'],['COMFORT','comfort','Faster bites everywhere.']];
  groups.forEach(function(g){ box.appendChild(el('div','gear-group',g[0])); box.appendChild(el('p','note',g[2]));
    D.GEAR.filter(function(x){ return x.kind===g[1]; }).forEach(function(x){
      var own=x.kind==='method'?(G.s.gear.methods||[]).indexOf(x.id)>=0:x.kind==='comfort'?!!G.s.gear.comfort:(G.s.gear[x.kind]||(x.kind==='lines'?1:0))>=x.lvl;
      var next=x.kind==='method'||x.kind==='comfort'||(G.s.gear[x.kind]||(x.kind==='lines'?1:0))===x.lvl-1;
      var li=el('div','row'+(own?' selected':'')+(!own&&!next?' dim':'')); li.appendChild(el('div','ic')).appendChild(icon(x.kind==='lines'?'spool':x.kind==='line'?'spool':x.kind==='reel'?'tackle':x.kind==='finder'?'news':x.kind==='method'?'boat':'heater'));
      li.appendChild(el('div',null,'<div class="nm">'+esc(x.name)+'</div><div class="sub">'+esc(x.desc)+'</div>'));
      var act=el('div'); if(own) act.innerHTML='<span class="own">OWNED</span>'; else if(!next) act.innerHTML='<span class="sub">'+D.money(x.price)+'</span>'; else { var btn=el('button','pbtn'+(G.s.coins>=x.price?' gold':''),D.money(x.price)); btn.type='button'; btn.disabled=G.s.coins<x.price; btn.onclick=function(){ buy('gear',x.id,x.name); }; act.appendChild(btn); }
      li.appendChild(act); box.appendChild(li); }); });
}


/* ---------- the dock: boats ---------- */
function perkText(b){ var p=b.perk||{}, out=[]; if(p.all) out.push('bites '+Math.round((1-p.all)*100)+'% sooner everywhere'); ['fresh','salt','troll','deep','polar'].forEach(function(k){ if(p[k]) out.push(Math.round((1-p[k])*100)+'% sooner on '+{fresh:'freshwater',salt:'salt water',troll:'trolling',deep:'deep drops',polar:'polar water'}[k]); }); return out.join(', '); }
function waterText(b){ return b.lvl===0?'Shore and ice spots':b.lvl===1?'+ freshwater boat spots':b.lvl===2?'+ salt flats, swamps and reefs':b.lvl<5?'+ everything a skiff can do':b.lvl===5?'+ ocean trolling for tuna and marlin':'everywhere'; }
function renderDock(){
  var box=$('dockRows'); box.innerHTML=''; var own=G.s.gear.boats||['paddle'], cur=G.s.gear.boat||'paddle';
  D.BOATS.forEach(function(b){ var has=own.indexOf(b.id)>=0, prevOwned=b.lvl===0||D.BOATS.some(function(x){ return x.lvl===b.lvl-1&&own.indexOf(x.id)>=0; });
    var row=el('div','dock-row'+(b.id===cur?' out':'')+(has?'':' locked')); var pic=el('div','dock-pic'); var cv=A.boatCanvas(b.id,b.lvl>=5?2:3); cv.style.maxWidth='100%'; cv.style.height='auto'; if(!has){ cv.style.filter='brightness(0.35) saturate(0.2)'; } pic.appendChild(cv); row.appendChild(pic);
    var t=el('div','dock-info','<div class="nm">'+esc(b.name.toUpperCase())+(b.id===cur?' <span class="tag green">TAKEN OUT</span>':'')+'</div><div class="sub">'+esc(b.desc)+'</div><div class="sub"><b>Water:</b> '+waterText(b)+(perkText(b)?' · <b>Bonus:</b> '+perkText(b):'')+'</div>'); row.appendChild(t);
    var act=el('div','dock-act');
    if(has){ if(b.id!==cur){ var go=el('button','pbtn gold','TAKE OUT'); go.type='button'; go.onclick=function(){ N.me('set_boat',{p_boat:b.id}).then(function(r){ G.s.gear=r.gear; G.toast('Took out the '+b.name+'.',2200,'good'); renderDock(); G.renderAll(); }).catch(G.fail); }; act.appendChild(go); } }
    else if(prevOwned){ var buyb=el('button','pbtn'+(G.s.coins>=b.price?' gold':''),D.money(b.price)); buyb.type='button'; buyb.disabled=G.s.coins<b.price; buyb.onclick=function(){ UI.confirm({title:'BUY THE '+b.name.toUpperCase()+'?',note:D.money(b.price)+'. You will take it out right away. '+waterText(b)+'.',yes:'BUY IT',no:'NOT YET',danger:false}).then(function(v){ if(v) buy('gear',b.id,b.name).then(function(){ renderDock(); }); }); }; act.appendChild(buyb); }
    else act.appendChild(el('span','sub',D.money(b.price)));
    row.appendChild(act); box.appendChild(row); });
}

/* ---------- clothes ---------- */
var shopTab='hat', shopPreview=null;
function previewOutfit(){ var of=Object.assign({},G.s.outfit); if(shopPreview) of[D.ITEM_BY_ID[shopPreview].slot]=shopPreview; return of; }
function renderShop(){
  var tabs=$('shopTabs'); tabs.innerHTML=''; D.SLOTS.forEach(function(s){ var b=el('button',null,s.name); b.type='button'; b.setAttribute('aria-pressed',String(s.id===shopTab)); b.onclick=function(){ shopTab=s.id; shopPreview=null; renderShop(); }; tabs.appendChild(b); });
  var grid=$('shopItems'); grid.innerHTML='';
  D.ITEMS.filter(function(i){ return i.slot===shopTab&&(!i.prize||G.s.items.indexOf(i.id)>=0); }).forEach(function(it){ var own=G.s.items.indexOf(it.id)>=0, worn=G.s.outfit[it.slot]===it.id, b=el('button','item'); b.type='button'; b.setAttribute('aria-pressed',String(shopPreview?shopPreview===it.id:worn));
    var of=Object.assign({},G.s.outfit); of[it.slot]=it.id; var c=A.fisherCanvas(of), cc=document.createElement('canvas'); cc.width=c.width; cc.height=c.height; cc.className='px'; cc.getContext('2d').drawImage(c,0,0); b.appendChild(cc);
    b.appendChild(el('span','in',esc(it.name))); b.appendChild(el('span','ip'+(worn?' worn':own?' own':''),worn?'WEARING':own?'OWNED':D.money(it.price))); b.onclick=function(){ shopPreview=it.id; renderShop(); }; grid.appendChild(b); });
  var pv=$('dressPreview'), src=A.fisherCanvas(previewOutfit()); pv.width=src.width; pv.height=src.height; pv.getContext('2d').drawImage(src,0,0);
  var it=shopPreview?D.ITEM_BY_ID[shopPreview]:null, own=it&&G.s.items.indexOf(it.id)>=0, worn=it&&G.s.outfit[it.slot]===it.id;
  $('dressTry').textContent=it?(worn?'WEARING':own?'OWNED':'TRYING ON'):'YOUR ANGLER'; $('dressName').textContent=it?it.name:G.s.name; $('dressPrice').textContent=it&&!own?D.money(it.price):'';
  var act=$('shopAct'); act.disabled=!it||worn; act.textContent=!it?'PICK SOMETHING':worn?'WEARING IT':own?'WEAR':G.s.coins>=it.price?'BUY FOR '+D.money(it.price):'NOT ENOUGH COINS'; act.className='go'+(own?' alt':''); if(it&&!own&&G.s.coins<it.price) act.disabled=true;
}
$('shopAct').onclick=function(){ var it=D.ITEM_BY_ID[shopPreview]; if(!it) return; var own=G.s.items.indexOf(it.id)>=0; var p=own?Promise.resolve():buy('item',it.id,it.name); p.then(function(){ var o={}; o[it.slot]=it.id; return N.me('set_outfit',{p_outfit:o}); }).then(function(of){ if(of){ G.s.outfit=of; shopPreview=null; renderShop(); } }).catch(G.fail); };

/* ---------- inventory ---------- */
var invShow=60;
function sortedFish(){ var f=G.s.fish.slice(), m=$('bucketSort').value; if(m==='big') f.sort(function(a,b){ return b.lb-a.lb; }); else if(m==='value') f.sort(function(a,b){ return (b.value||0)-(a.value||0); }); else if(m==='sp') f.sort(function(a,b){ return a.sp<b.sp?-1:a.sp>b.sp?1:b.lb-a.lb; }); return f; }
function renderBucket(){
  var grid=$('bucketGrid'); grid.innerHTML=''; var f=sortedFish();
  $('bucketSum').innerHTML=f.length+' fish · worth <b>'+D.money(bucketValue())+'</b>';
  $('sellAll').disabled=!f.some(sellable); $('sellSmall').disabled=!f.some(function(x){ return sellable(x)&&!isBest(x); });
  if(!f.length) grid.appendChild(el('div','empty','No fish yet. Cast a line!'));
  f.slice(0,invShow).forEach(function(x){ grid.appendChild(fishCard(x,function(){ openFish(x.id); })); });
  $('bucketMore').hidden=f.length<=invShow; $('bucketMore').onclick=function(){ invShow+=60; renderBucket(); };
}
$('bucketSort').onchange=renderBucket;
function sellable(f){ return !f.legend&&!f.released&&(f.value||0)>0; }
function isBest(f){ var b=G.bestOf(f.sp); return b&&b.id===f.id; }
function fishCard(f,onclick){
  var sp=D.SP_BY_ID[f.sp], c=el('button','card fish'+(f.variant?' '+f.variant:'')+(f.legend?' legend':'')); c.type='button';
  var pic=el('div','pic'); pic.appendChild(A.fishImg(f.sp,Math.min(44,A.heroLen(f.lb)+8),false,2,f.variant,f.colors,sp.name)); c.appendChild(pic);
  c.appendChild(el('span','nm',esc(f.legendName||sp.name))); c.appendChild(el('span','v',D.fmtWeight(f.lb)));
  c.appendChild(el('span','sub',f.legend?(f.released?'Photo trophy':'LEGEND'):sp.protected?'Catch and release':D.money(f.value||0)));
  if(isBest(f)&&!f.legend){ var m=A.spriteCanvas(A.ICONS.medal.rows,A.ICONS.medal.map,'medal'); m.title='Your best '+sp.name; c.appendChild(m); }
  if(f.locked&&Date.parse(f.locked)>N.now()) c.appendChild(el('span','lock','TRADED'));
  if(onclick) c.onclick=onclick; return c;
}
UI.fishCard=fishCard;
function openFish(id){
  var f=G.s.fish.filter(function(x){ return x.id===id; })[0]; if(!f) return; var sp=D.SP_BY_ID[f.sp], body=$('fishBody'); body.innerHTML='';
  $('fishTitle').textContent=(f.legendName||sp.name).toUpperCase();
  var stand=el('div','stand'+(f.legend?' legend':'')); stand.appendChild(A.fishImg(f.sp,Math.min(70,A.heroLen(f.lb)*2),false,3,f.variant,f.colors,sp.name)); body.appendChild(stand);
  var rib=el('div','ribbons'); if(f.legend) rib.appendChild(el('span','ribbon gold',f.released?'PHOTO TROPHY':'ONE OF A KIND')); if(f.variant) rib.appendChild(el('span','ribbon '+(f.variant==='golden'?'gold':'white'),f.variant.toUpperCase())); if(isBest(f)&&!f.legend) rib.appendChild(el('span','ribbon b','YOUR BEST '+sp.name.toUpperCase())); if(sp.protected) rib.appendChild(el('span','ribbon g','CATCH AND RELEASE')); if(!f.mine) rib.appendChild(el('span','ribbon p','FROM A TRADE')); if(rib.children.length) body.appendChild(rib);
  body.appendChild(el('div','c-weight',D.fmtWeight(f.lb))); body.appendChild(el('div','c-len',f.inches+' inches'));
  var spot=D.SPOT_BY_ID[f.spot];
  body.appendChild(facts([['WHERE',spot?spot.name:'?'],['WHEN',new Date(f.at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})],['BAIT',f.bait?D.BAIT_BY_ID[f.bait].name:'?'],['TIME OF DAY',D.PERIOD_NAME[f.period]||'?'],['WORTH',f.legend?'Priceless':sp.protected?'Not for sale':D.money(f.value||0)],['RECORD',sp.max+' lb max in the game']]));
  if(f.legend&&f.legendName) body.appendChild(el('p','note','Legends can be traded with friends, never sold. Release it and it goes back in the water for everyone; you keep a photo.'));
  var btns=el('div','two');
  if(f.legend&&!f.released){ var rel=el('button','go alt','RELEASE'); rel.type='button'; rel.onclick=function(){ UI.confirm({title:'RELEASE '+f.legendName.toUpperCase()+'?',note:'It goes back into the water for everyone to chase. You keep a photo trophy and your name in its history.',yes:'RELEASE',no:'KEEP'}).then(function(v){ if(!v) return; N.me('release_legend',{p_fish:f.id}).then(function(){ G.toast(f.legendName+' swims free. Your name stays in its story.',4000,'good'); UI.closeAll(); G.refresh(true); }).catch(G.fail); }); }; btns.appendChild(rel); }
  else if(sellable(f)){ var sell=el('button','go','SELL FOR '+D.money(f.value)); sell.type='button'; sell.onclick=function(){ sellFish([f.id]).then(function(ok){ if(ok) UI.open('bucketOv'); }); }; btns.appendChild(sell); }
  var back=el('button','go alt','BACK'); back.type='button'; back.onclick=function(){ UI.open('bucketOv'); }; btns.appendChild(back); body.appendChild(btns);
  UI.open('fishOv');
}
function facts(list){ var g=el('div','facts'+(list.length%3?' two-col':'')); list.forEach(function(p){ g.appendChild(el('div','fact','<span class="k">'+p[0]+'</span><span class="v">'+esc(p[1])+'</span>')); }); return g; }
function sellFish(ids){
  var fish=G.s.fish.filter(function(f){ return ids.indexOf(f.id)>=0&&sellable(f); }), bests=fish.filter(function(f){ return isBest(f)&&((f.value||0)>=1000||f.variant); }), total=0; /* only warn for bests worth keeping, not every first bluegill */ fish.forEach(function(f){ total+=f.value||0; });
  if(!fish.length) return Promise.resolve(false);
  var p=Promise.resolve(true);
  if(bests.length){ var body=el('div','stand'); body.appendChild(A.fishImg(bests[0].sp,40,false,2,bests[0].variant,null,'')); p=UI.confirm({title:'SELL YOUR BEST?',body:body,note:(bests.length===1?'That '+D.fmtWeight(bests[0].lb)+' '+D.SP_BY_ID[bests[0].sp].name.toLowerCase()+' is your biggest of its kind':bests.length+' of these are your biggest of their kind')+'. Sold fish leave the leaderboard.',yes:'SELL ANYWAY',no:'KEEP'}); }
  return p.then(function(v){ if(!v) return false; return N.me('sell_fish',{p_ids:fish.map(function(f){ return f.id; })}).then(function(r){ G.s.fish=G.s.fish.filter(function(f){ return ids.indexOf(f.id)<0||!sellable(f); }); G.s.coins=r.coins; G.bump(); flyCoins(); G.toast('Sold '+r.sold+' fish for '+D.money(r.total)+'.',2600,'good'); G.coachEvent('sell'); renderBucket(); G.renderHUD(); return true; }).catch(function(e){ G.fail(e); return false; }); });
}
$('sellAll').onclick=function(){ sellFish(G.s.fish.map(function(f){ return f.id; })); };
$('sellSmall').onclick=function(){ sellFish(G.s.fish.filter(function(f){ return !isBest(f); }).map(function(f){ return f.id; })); };
function flyCoins(){ var tgt=$('coinChip').getBoundingClientRect(); for(var i=0;i<8;i++){ var c=el('span','coin flycoin'); c.style.left=(innerWidth/2+(Math.random()-0.5)*80)+'px'; c.style.top=(innerHeight*0.6)+'px'; document.body.appendChild(c); (function(c,i){ setTimeout(function(){ c.style.transform='translate('+(tgt.left+8-parseFloat(c.style.left))+'px,'+(tgt.top+8-parseFloat(c.style.top))+'px)'; c.style.opacity='0'; },30+i*40); setTimeout(function(){ c.remove(); },900+i*40); })(c,i); } }

/* ---------- catch card ---------- */
UI.showCard=function(last){
  var sp=D.SP_BY_ID[last.sp], body=$('cardBody'); body.innerHTML='';
  var legend=!!last.legend;
  body.appendChild(el('div','fish-on'+(legend?' legend':''),legend?'LEGEND!':last.newSpecies?'NEW SPECIES!':last.worldRecord?'WORLD RECORD!':last.newBest?'NEW BEST!':'FISH ON!'));
  var rib=el('div','ribbons'); if(legend) rib.appendChild(el('span','ribbon gold','ONE OF A KIND')); if(last.variant) rib.appendChild(el('span','ribbon '+(last.variant==='golden'?'gold':'white'),last.variant.toUpperCase()+' · '+(D.VARIANT_MULT[last.variant])+'x VALUE')); if(last.worldRecord) rib.appendChild(el('span','ribbon','WORLD RECORD')); if(last.newBest&&!legend) rib.appendChild(el('span','ribbon b','PERSONAL BEST')); if(last.newSpecies) rib.appendChild(el('span','ribbon g','FIRST '+sp.name.toUpperCase())); if(sp.protected&&!legend) rib.appendChild(el('span','ribbon p','CATCH AND RELEASE')); if(rib.children.length) body.appendChild(rib);
  var stand=el('div','stand'+(legend?' legend':'')); stand.appendChild(A.fishImg(last.sp,Math.min(70,A.heroLen(last.lb)*2),false,3,last.variant,last.colors,sp.name)); body.appendChild(stand);
  body.appendChild(el('div','c-name'+(legend?' legend':''),esc(last.legendName||sp.name))); body.appendChild(el('div','c-weight',D.fmtWeight(last.lb))); body.appendChild(el('div','c-len',last.inches+' inches'+(last.minutes?' · after '+D.fmtDuration(last.minutes):'')));
  if(legend&&last.legendInfo) body.appendChild(el('p','note gold','"'+esc(last.legendInfo.clue)+'" Nobody else on Earth can catch it now. The whole world just heard.'));
  if(last.reward) body.appendChild(el('p','note gold','Daily challenge done: +'+D.money(last.reward)+'!'));
  body.appendChild(facts([['WORTH',legend?'Priceless':sp.protected?'Not for sale':D.money(last.value||0)],['BAIT',D.BAIT_BY_ID[last.bait].name],['TIME',D.PERIOD_NAME[last.period]||'']]));
  var btns=el('div','two');
  if(!legend&&!sp.protected){ var sell=el('button','go','SELL '+D.money(last.value||0)); sell.type='button'; sell.onclick=function(){ sellFish([last.id]).then(function(){ closeCard(); }); }; btns.appendChild(sell); }
  var keep=el('button','go '+(legend?'':'alt'),legend?'AMAZING!':'KEEP'); keep.type='button'; keep.onclick=closeCard; btns.appendChild(keep); if(btns.children.length===1) btns.style.gridTemplateColumns='1fr'; body.appendChild(btns);
  var sparks=$('sparks'); sparks.innerHTML=''; if(legend||last.variant||last.newBest){ for(var i=0;i<(legend?30:14);i++){ var s=el('i'); s.style.setProperty('--dx',(Math.random()-0.5)*300+'px'); s.style.setProperty('--dy',(Math.random()-0.5)*300+'px'); s.style.animationDelay=(Math.random()*0.4)+'s'; sparks.appendChild(s); } }
  $('cardOv').hidden=false;
};
function closeCard(){ $('cardOv').hidden=true; SC.endCatch(); G.checkAch(); }

/* ---------- journal ---------- */
var jRegion='home';
function renderJournal(){
  var sel=$('journalRegion'); if(!sel.options.length){ D.REGIONS.forEach(function(r){ var o=document.createElement('option'); o.value=r.id; o.textContent=r.name; sel.appendChild(o); }); sel.value=G.spot().region; sel.onchange=function(){ jRegion=sel.value; renderJournal(); }; jRegion=sel.value; }
  var body=$('journalBody'); body.innerHTML=''; var spots=D.SPOTS.filter(function(s){ return s.region===jRegion; }), seen={}, list=[];
  spots.forEach(function(s){ D.spotSpecies(s.id).forEach(function(sp){ if(!seen[sp.id]){ seen[sp.id]=1; list.push(sp); } }); });
  list.sort(function(a,b){ return a.max-b.max; });
  var caught=list.filter(function(s){ return G.s.journal[s.id]; }).length;
  $('journalNote').innerHTML=D.REGION_BY_ID[jRegion].name+': <b>'+caught+' of '+list.length+'</b> species across '+spots.map(function(s){ return '<b>'+esc(s.name)+'</b>'; }).join(', ')+'. Tap a fish for where and how to catch it.';
  list.forEach(function(sp){ var j=G.s.journal[sp.id], c=el('button','card'+(j?'':' no')); c.type='button'; var pic=el('div','pic'); pic.appendChild(A.fishImg(sp.id,Math.min(44,A.sceneLen(sp.max)+16),j?false:'#2C5088',2,null,null,j?sp.name:'Unknown fish')); c.appendChild(pic);
    c.appendChild(el('span','nm',j?esc(sp.name):'???')); c.appendChild(el('span','v',j?'best '+D.fmtWeight(+j.best):'not yet'));
    if(j&&(j.golden||j.albino)) c.appendChild(el('span','sub',(j.golden?'golden ':'')+(j.albino?'albino':'')));
    c.onclick=function(){ journalDetail(sp,j); }; body.appendChild(c); });
}
function journalDetail(sp,j){
  var body=$('fishBody'); body.innerHTML=''; $('fishTitle').textContent=j?sp.name.toUpperCase():'UNKNOWN FISH';
  var stand=el('div','stand'); stand.appendChild(A.fishImg(sp.id,56,j?false:'#2C5088',3,null,null,sp.name)); body.appendChild(stand);
  var where=D.SPOTS.filter(function(s){ return sp.spots[s.id]>0; }).sort(function(a,b){ return sp.spots[b.id]-sp.spots[a.id]; }).map(function(s){ return s.name; });
  var baits=Object.keys(sp.baits).sort(function(a,b){ return sp.baits[b]-sp.baits[a]; }).map(function(b){ return D.BAIT_BY_ID[b].name; });
  var act=D.ACT_PROFILES[sp.act], best=Object.keys(act).sort(function(a,b){ return act[b]-act[a]; })[0];
  body.appendChild(facts([['SIZE',sp.min+' to '+sp.max+' lb'],['WORTH',sp.protected?'Catch and release':D.money(sp.rate)+' per lb'],['BEST TIME',D.PERIOD_NAME[best]],['MIN WAIT',sp.minWait?D.fmtDuration(sp.minWait):'none'],['WHERE',where.slice(0,3).join(', ')+(where.length>3?' +'+(where.length-3):'')],['BAIT',baits.join(', ')]]));
  if(j) body.appendChild(el('p','journal-fact','Caught '+j.n+' time'+(j.n>1?'s':'')+'. Your best: '+D.fmtWeight(+j.best)+'. First one on '+new Date(j.first).toLocaleDateString()+'.'));
  else body.appendChild(el('p','journal-fact','Nobody in your journal yet. Fish where it lives, with bait it likes, at its best time of day.'));
  var back=el('button','go alt','BACK'); back.type='button'; back.onclick=function(){ UI.open('journalOv'); }; body.appendChild(back); UI.open('fishOv');
}

/* ---------- legends ---------- */
var legendsAt=0;
function loadLegends(){ if(G.legends&&Date.now()-legendsAt<45000) return Promise.resolve(G.legends); return N.rpc('get_legends',{}).then(function(r){ G.legends=r.legends; legendsAt=Date.now(); return r.legends; }); }
function renderLegends(){
  var body=$('legendBody'); body.innerHTML='<div class="empty">Loading the legends...</div>';
  loadLegends().then(function(list){ body.innerHTML=''; var f=$('legendFilter').value;
    var mine=G.s.fish.filter(function(x){ return x.legend&&!x.released; }).map(function(x){ return x.legend; });
    list=list.filter(function(l){ return f==='all'||(f==='free'&&!l.owner)||(f==='owned'&&l.owner)||(f==='mine'&&mine.indexOf(l.id)>=0); });
    list.sort(function(a,b){ return D.REGION_BY_ID[D.SPOT_BY_ID[a.spot].region].tier-D.REGION_BY_ID[D.SPOT_BY_ID[b.spot].region].tier; });
    if(!list.length) body.appendChild(el('div','empty','None here.'));
    list.forEach(function(l){ body.appendChild(legendCard(l,mine.indexOf(l.id)>=0)); }); }).catch(function(e){ body.innerHTML='<div class="empty">'+esc(e.message)+'</div>'; });
  $('legendFilter').onchange=renderLegends;
}
function legendCard(l,mine){
  var sp=D.SP_BY_ID[l.sp], spot=D.SPOT_BY_ID[l.spot], c=el('div','legend-card'+(l.owner?'':' free'));
  var pic=el('div','pic'); pic.appendChild(A.fishImg(l.sp,52,false,2,null,l.colors,l.name)); c.appendChild(pic);
  var t=el('div'); t.innerHTML='<div class="ln">'+esc(l.name)+'<span class="tier '+l.tier+'">'+l.tier.toUpperCase()+'</span></div><div class="ls">A '+esc(sp.name.toLowerCase())+' of about '+Math.round(l.lb)+' lb · '+esc(spot.name)+', '+esc(D.REGION_BY_ID[spot.region].name)+'</div><div class="lc">'+esc(l.clue)+'</div>'+
    (l.owner?'<div class="lo taken">OWNED BY '+esc(l.ownerName||'someone')+(l.caughtAt?' · since '+new Date(l.caughtAt).toLocaleDateString():'')+(mine?' (THAT IS YOU)':'')+'</div>':'<div class="lo">STILL OUT THERE · 1 in '+Number(l.odds).toLocaleString()+' per qualifying bite'+(l.tier==='mythic'?' · never gets easier':'')+(l.history.length?' · released before':'')+'</div>');
  if(l.owner&&!mine&&l.ownerName){ var b=el('button','pbtn','SEE OWNER'); b.type='button'; b.style.cssText='font-size:7px;padding:6px;margin-top:6px'; b.onclick=function(){ UI.profile(l.owner); }; t.appendChild(b); }
  if(l.history&&l.history.length>1) t.appendChild(el('div','ls','History: '+l.history.map(function(h){ return esc(h.name)+' ('+h.how+')'; }).join(' → ')));
  c.appendChild(t); return c;
}

/* ---------- achievements ---------- */
function renderAch(){ var ul=$('achList'); ul.innerHTML=''; var have=G.s.prefs.ach||[]; $('achNote').textContent=have.length+' of '+G.ACH.length+' unlocked. They show as badges on your profile.';
  G.ACH.forEach(function(a){ var v=a.n(G.s), got=have.indexOf(a.id)>=0||v[0]>=v[1], li=el('li',got?'got':'locked'); li.appendChild(icon(got?'star':'medal')); li.appendChild(el('div',null,'<div class="nm">'+esc(a.name)+'</div><div class="ds">'+esc(a.desc)+'</div>'+(got?'':'<span class="bar"><i style="width:'+Math.min(100,Math.round(100*v[0]/v[1]))+'%"></i></span>'))); li.appendChild(el('span','rw',got?'DONE':Math.floor(v[0]).toLocaleString()+'/'+v[1].toLocaleString())); ul.appendChild(li); }); }

/* ---------- leaderboard ---------- */
function renderBoard(){
  var rs=$('lbRegion'), ss=$('lbSpecies');
  if(!rs.options.length){ rs.appendChild(new Option('Whole world','')); D.REGIONS.forEach(function(r){ rs.appendChild(new Option(r.name,r.id)); }); ss.appendChild(new Option('All species','')); D.SPECIES.slice().sort(function(a,b){ return a.name<b.name?-1:1; }).forEach(function(s){ ss.appendChild(new Option(s.name,s.id)); }); [rs,ss,$('lbPeriod')].forEach(function(x){ x.onchange=renderBoard; }); }
  var per=$('lbPeriod').value; $('seasonNote').textContent=per==='season'?'Season '+seasonName(G.s.season.key)+' ends in '+D.fmtDuration((Date.parse(G.s.season.endsAt)-N.now())/60000)+'. Top 3 win '+D.SEASON_PRIZES.map(D.money).join(', ')+' and the Champion cap; 4th to 10th win '+D.money(D.SEASON_PRIZE_TOP10)+'.':per==='week'?'Biggest fish caught this week.':'Biggest fish still kept by each angler. Sold fish leave the board; legends have their own screen.';
  var ol=$('lbList'); ol.innerHTML='<li class="gap">Loading...</li>'; $('lbMe').textContent='';
  N.rpc('get_board',{p_period:per,p_species:ss.value||null,p_region:rs.value||null}).then(function(rows){ ol.innerHTML=''; if(!rows.length){ ol.innerHTML='<li class="gap">Nobody yet. Be first.</li>'; }
    var myRank=-1; rows.forEach(function(r,i){ var li=el('li','clickable'+(r.pid===G.s.pid?' me':'')); if(r.pid===G.s.pid&&myRank<0) myRank=i+1; li.innerHTML='<span class="rk">'+(i+1)+'</span>'; var ic=el('span','ic'); ic.appendChild(A.fishImg(r.sp,22,false,1.5,r.variant,null,D.SP_BY_ID[r.sp].name)); li.appendChild(ic);
      li.appendChild(el('span','who','<div class="nm">'+esc(r.name)+'<small>#'+r.tag+'</small>'+(r.founder?'<span class="tag gold">FOUNDER</span>':'')+(r.champ?'<span class="tag gold">CHAMP</span>':'')+(r.variant?'<span class="var">'+r.variant+'</span>':'')+'</div><div class="sp"><b>'+D.fmtWeight(+r.lb)+'</b> '+esc(D.SP_BY_ID[r.sp].name)+' · '+esc(D.SPOT_BY_ID[r.spot]?D.SPOT_BY_ID[r.spot].name:'')+'</div>'));
      li.onclick=function(){ UI.profile(r.pid); }; ol.appendChild(li); });
    $('lbMe').innerHTML=myRank>0?'You are <b>#'+myRank+'</b> on this board.':'You are not on this board yet.'; }).catch(function(e){ ol.innerHTML='<li class="gap">'+esc(e.message)+'</li>'; });
  $('hallBox').hidden=true; $('hallBtn').onclick=function(){ var hb=$('hallBox'); hb.hidden=!hb.hidden; if(!hb.hidden){ hb.innerHTML='<p class="note">Loading...</p>'; N.rpc('get_season',{}).then(function(s){ hb.innerHTML=''; if(!s.hall.length){ hb.innerHTML='<p class="note">No seasons finished yet. '+s.players+' anglers are playing.</p>'; return; } var cur=''; s.hall.forEach(function(h){ if(h.season!==cur){ cur=h.season; hb.appendChild(el('div','gear-group',seasonName(h.season).toUpperCase())); } hb.appendChild(el('div','me-line','<span>#'+h.rank+' <b>'+esc(h.name)+'#'+h.tag+'</b></span><span>'+D.fmtWeight(+h.lb)+' '+esc(D.SP_BY_ID[h.sp]?D.SP_BY_ID[h.sp].name:h.sp)+' · '+D.money(h.prize)+'</span>')); }); }).catch(G.fail); } };
}

/* ---------- profiles ---------- */
UI.profile=function(pid){
  var body=$('profileBody'); body.innerHTML='<div class="empty">Loading...</div>'; UI.open('profileOv');
  N.rpc('get_profile',{p_pid:pid}).then(function(p){ body.innerHTML=''; if(!p){ body.innerHTML='<div class="empty">This angler is not available.</div>'; return; }
    var head=el('div','profile-head'); var c=A.fisherCanvas(p.outfit||D.DEFAULT_OUTFIT), cc=document.createElement('canvas'); cc.width=c.width; cc.height=c.height; cc.className='px'; cc.getContext('2d').drawImage(c,0,0); head.appendChild(cc);
    head.appendChild(el('div',null,'<div class="pn">'+esc(p.name)+'<small style="color:#93B2D2">#'+p.tag+'</small>'+(p.founder?'<span class="tag gold">FOUNDER</span>':'')+(p.champ?'<span class="tag gold">CHAMPION x'+p.champ+'</span>':'')+'</div><div class="ps"><span class="dot'+(p.online?' on':'')+'"></span>'+(p.online?'Fishing right now':'Last seen a while ago')+' · '+esc(D.SPOT_BY_ID[p.spot]?D.SPOT_BY_ID[p.spot].name:'')+' · playing since '+new Date(p.since).toLocaleDateString()+'</div>')); body.appendChild(head);
    body.appendChild(facts([['CATCHES',String(p.stats.catches||0)],['SPECIES',String(p.stats.species||0)],['BIGGEST',D.fmtWeight(+p.stats.bestlb||0)],['LEGENDS',String(p.stats.legends||0)],['REGIONS',String(p.stats.regions||0)],['RARE',(p.stats.golden||0)+' gold · '+(p.stats.albino||0)+' albino']]));
    if(p.legends.length){ body.appendChild(el('div','gear-group','LEGENDS OWNED')); p.legends.forEach(function(l){ body.appendChild(legendCard(l,l.owner===G.s.pid)); }); }
    if(p.pastLegends.length) body.appendChild(el('p','note','Once owned: '+p.pastLegends.map(function(l){ return esc(l.name); }).join(', ')+'.'));
    if(p.badges.length) body.appendChild(el('p','note','Badges: '+p.badges.map(function(b){ var a=G.ACH.filter(function(x){ return x.id===b; })[0]; return a?esc(a.name):''; }).filter(Boolean).join(' · ')));
    body.appendChild(el('div','gear-group','TROPHY WALL'));
    var grid=el('div','grid'); p.best.slice(0,9).forEach(function(f){ var card=fishCard(f,null); card.onclick=function(){ reactTo(f,p); }; grid.appendChild(card); }); if(!p.best.length) grid.appendChild(el('div','empty','No fish kept yet.')); body.appendChild(grid);
    if(pid!==G.s.pid){ var row=el('div','reset-row'); var isFriend=G.s.friends.some(function(f){ return f.pid===pid&&f.status==='accepted'; }), pending=G.s.friends.some(function(f){ return f.pid===pid; });
      if(!pending){ var add=el('button','pbtn gold','ADD FRIEND'); add.type='button'; add.onclick=function(){ N.me('friend_request',{p_name:p.name,p_tag:p.tag}).then(function(r){ G.toast(r.status==='accepted'?'You are now friends!':'Friend request sent.',2600,'good'); G.refresh(true); }).catch(G.fail); }; row.appendChild(add); }
      if(isFriend){ var tr=el('button','pbtn gold','TRADE'); tr.type='button'; tr.onclick=function(){ openTrade(pid); }; row.appendChild(tr); }
      var rep=el('button','pbtn danger','REPORT'); rep.type='button'; rep.onclick=function(){ report(p); }; row.appendChild(rep); body.appendChild(row); body.appendChild(el('p','note',isFriend?'Tap a fish on the wall to send a sticker.':'Friends can react to each other\'s catches with stickers.')); }
  }).catch(function(e){ body.innerHTML='<div class="empty">'+esc(e.message)+'</div>'; });
};
function reactTo(f,p){ if(p.pid===G.s.pid) return; var body=el('div','stickers'); D.STICKERS.forEach(function(s){ var b=el('button','sticker',s.text); b.type='button'; b.onclick=function(){ N.me('react',{p_fish:f.id,p_sticker:s.id}).then(function(){ cfDone(false); G.toast('Sent "'+s.text+'" to '+p.name+'.',2200,'good'); }).catch(function(e){ cfDone(false); G.fail(e); }); }; body.appendChild(b); }); UI.confirm({title:'REACT TO '+D.SP_BY_ID[f.sp].name.toUpperCase(),body:body,note:'Stickers are the only chat in One Cast. Pick one.',yes:'CLOSE',no:'CANCEL',danger:false}); }
function report(p){ $('reportWho').textContent='Report '+p.name+'#'+p.tag+'. The admin will take a look.'; var box=$('reportReasons'); box.innerHTML=''; D.REPORT_REASONS.forEach(function(r){ var b=el('button','pbtn',r.text.toUpperCase()); b.type='button'; b.onclick=function(){ N.me('report_player',{p_target:p.pid,p_reason:r.id}).then(function(){ G.toast('Thanks. Report sent.',2400,'good'); UI.closeAll(); }).catch(G.fail); }; box.appendChild(b); }); UI.open('reportOv'); }

/* ---------- friends and trading ---------- */
function renderFriends(){
  $('myTag').textContent=G.s.name+'#'+G.s.tag; renderCrewBox(); var list=$('friendList'); list.innerHTML='';
  if(!G.s.friends.length) list.appendChild(el('div','empty','No friends yet. Ask a friend for their name and #tag.'));
  G.s.friends.forEach(function(f){ var row=el('div','friend'); row.appendChild(el('div',null,'<div class="fn"><span class="dot'+(f.online?' on':'')+'"></span>'+esc(f.name)+'<small style="color:#93B2D2">#'+f.tag+'</small></div><div class="fs">'+(f.status==='accepted'?(f.online?'Online now':'Friend'):f.mine?'Request sent, waiting':'Wants to be your friend')+'</div>'));
    var btns=el('div','fb');
    if(f.status==='pending'&&!f.mine){ var ok=el('button','pbtn gold','ACCEPT'); ok.type='button'; ok.onclick=function(){ N.me('friend_respond',{p_other:f.pid,p_accept:true}).then(function(){ G.refresh(true).then(renderFriends); }).catch(G.fail); }; btns.appendChild(ok); }
    if(f.status==='accepted'){ var inv=el('button','pbtn','INVITE ABOARD'); inv.type='button'; inv.title='Invite '+f.name+' onto your boat to fish together'; inv.onclick=function(){ N.me('crew_invite',{p_friend:f.pid}).then(function(c){ G.s.crew=c; G.toast('Invited '+f.name+' aboard your '+(D.GEAR_BY_ID[G.s.gear.boat]||{name:'boat'}).name+'.',2600,'good'); renderFriends(); }).catch(G.fail); }; btns.appendChild(inv);
      var tr=el('button','pbtn gold','TRADE'); tr.type='button'; tr.onclick=function(){ openTrade(f.pid); }; btns.appendChild(tr); }
    var pr=el('button','pbtn','PROFILE'); pr.type='button'; pr.onclick=function(){ UI.profile(f.pid); }; btns.appendChild(pr);
    var rm=el('button','pbtn danger','X'); rm.type='button'; rm.title='Remove'; rm.onclick=function(){ N.me('friend_respond',{p_other:f.pid,p_accept:false}).then(function(){ G.refresh(true).then(renderFriends); }).catch(G.fail); }; btns.appendChild(rm);
    row.appendChild(btns); list.appendChild(row); });
  var ot=$('openTrades'); ot.innerHTML=''; if(G.s.trades.length){ ot.appendChild(el('div','gear-group','OPEN TRADES')); G.s.trades.forEach(function(t){ var b=el('button','spot-row','<span class="sn">Trade with '+esc(t.other)+'</span><span class="ss">OPEN</span>'); b.type='button'; b.onclick=function(){ showTrade(t.id); }; ot.appendChild(b); }); }
  $('tradeHist').hidden=true; $('tradeHistBtn').onclick=function(){ var h=$('tradeHist'); h.hidden=!h.hidden; if(!h.hidden){ h.innerHTML='<p class="note">Loading...</p>'; N.me('get_trade_history').then(function(rows){ h.innerHTML=''; if(!rows.length) h.innerHTML='<p class="note">No trades yet.</p>'; rows.forEach(function(r){ h.appendChild(el('div','me-line','<span>'+new Date(r.at).toLocaleDateString()+' with <b>'+esc(r.other)+'</b></span><span>gave '+sumGave(r.gave)+' · got '+sumGave(r.got)+'</span>')); }); }).catch(G.fail); } };
}
function sumGave(g){ var n=(g.fish||[]).length; return (n?n+' fish':'')+(n&&g.coins?' + ':'')+(g.coins?D.money(g.coins):'')||'nothing'; }
$('frAdd').onclick=function(){ var n=$('frName').value.trim(), t=$('frTag').value.trim().replace('#',''); $('frErr').textContent=''; N.me('friend_request',{p_name:n,p_tag:t}).then(function(r){ $('frName').value=''; $('frTag').value=''; G.toast(r.status==='accepted'?'You and '+r.name+' are now friends!':'Request sent to '+r.name+'#'+r.tag+'.',2600,'good'); G.refresh(true).then(renderFriends); }).catch(function(e){ $('frErr').textContent=e.message; }); };
var tradePoll=0, trade=null;
function openTrade(pid){ N.me('trade_open',{p_other:pid}).then(function(t){ showTradeData(t); }).catch(G.fail); }
function showTrade(id){ N.me('get_trade',{p_id:id}).then(showTradeData).catch(G.fail); }
function showTradeData(t){ trade=t; G.tradeId=t.id; $('tradePick').hidden=true; renderTrade(); UI.open('tradeOv'); stopTradePoll(); tradePoll=setInterval(function(){ if($('tradeOv').hidden){ stopTradePoll(); return; } N.me('get_trade',{p_id:t.id}).then(function(x){ var was=trade&&trade.status; trade=x; renderTrade(); if(x.status==='done'&&was!=='done'){ G.toast('Trade complete!',3000,'good'); G.refresh(true); } }).catch(function(){}); },3000); }
function stopTradePoll(){ clearInterval(tradePoll); tradePoll=0; G.tradeId=null; }
$('tradeClose').onclick=function(){ stopTradePoll(); UI.open('friendsOv'); };
function renderTrade(){
  var t=trade; $('tradeTitle').textContent='TRADE WITH '+t.other.toUpperCase();
  var done=t.status!=='open';
  $('tradeNote').textContent=done?(t.status==='done'?'Done! Everything swapped at once. Traded fish rest for 24 hours before they can be traded again.':'This trade was '+t.status+'.'):(!t.myReady||!t.theirReady?'Build your offers, then both press READY. Changing an offer resets READY for both.':!t.myConfirm||!t.theirConfirm?'Both ready. Press CONFIRM to swap. The server checks everyone still owns what they offered.':'');
  function side(box,title,fish,coins,ready,confirm){ box.className='side'+(confirm?' confirmed':ready?' ready':''); box.innerHTML='<h3>'+title+'</h3><div class="st">'+(confirm?'CONFIRMED':ready?'READY':'building offer')+'</div>'; var of=el('div','offer'); if(!fish.length&&!coins) of.appendChild(el('span','st','nothing yet')); fish.forEach(function(f){ var r=el('div','ofish'); r.appendChild(A.fishImg(f.sp,18,false,1.5,f.variant,f.colors,'')); r.appendChild(el('span',null,esc(f.legendName||D.SP_BY_ID[f.sp].name)+' '+D.fmtWeight(f.lb)+(f.legend?' <span class="tag gold">LEGEND</span>':''))); of.appendChild(r); }); if(coins) of.appendChild(el('div','coins','+ '+D.money(coins))); box.appendChild(of); }
  side($('sideMe'),'YOU GIVE',t.myFish,t.myCoins,t.myReady,t.myConfirm); side($('sideThem'),'THEY GIVE',t.theirFish,t.theirCoins,t.theirReady,t.theirConfirm);
  $('tradeEdit').disabled=done; $('tradeReady').disabled=done; $('tradeReady').textContent=t.myReady?'NOT READY':'READY'; $('tradeConfirm').disabled=done||!(t.myReady&&t.theirReady)||t.myConfirm; $('tradeConfirm').textContent=t.myConfirm?'WAITING...':'CONFIRM'; $('tradeCancel').hidden=done; if(done) $('tradePick').hidden=true;
}
$('tradeEdit').onclick=function(){ var pk=$('tradePick'); pk.hidden=false; $('tradeCoins').value=trade.myCoins||0; var grid=$('tradeFishGrid'); grid.innerHTML=''; var picked=trade.myFish.map(function(f){ return f.id; });
  G.s.fish.filter(function(f){ return !f.released&&!(f.locked&&Date.parse(f.locked)>N.now()); }).slice(0,120).forEach(function(f){ var c=fishCard(f,null); if(picked.indexOf(f.id)>=0) c.classList.add('picked'); c.onclick=function(){ var i=picked.indexOf(f.id); if(i>=0){ picked.splice(i,1); c.classList.remove('picked'); } else if(picked.length<20){ picked.push(f.id); c.classList.add('picked'); } }; grid.appendChild(c); });
  $('tradePickDone').onclick=function(){ N.me('trade_set',{p_id:trade.id,p_fish:picked,p_coins:Math.max(0,Math.floor(+$('tradeCoins').value||0))}).then(function(t){ trade=t; $('tradePick').hidden=true; renderTrade(); }).catch(G.fail); }; };
$('tradeReady').onclick=function(){ N.me('trade_ready',{p_id:trade.id,p_ready:!trade.myReady}).then(function(t){ trade=t; renderTrade(); }).catch(G.fail); };
$('tradeConfirm').onclick=function(){ var legends=trade.myFish.filter(function(f){ return f.legend; }); var p=legends.length?UI.confirm({title:'TRADE A LEGEND?',note:'You are giving away '+legends.map(function(f){ return f.legendName; }).join(' and ')+'. Only one exists. Sure?',yes:'TRADE IT',no:'WAIT'}):Promise.resolve(true); p.then(function(v){ if(!v) return; N.me('trade_confirm',{p_id:trade.id}).then(function(t){ trade=t; renderTrade(); if(t.status==='done'){ G.toast('Trade complete!',3000,'good'); G.refresh(true); } }).catch(function(e){ G.fail(e); showTrade(trade.id); }); }); };
$('tradeCancel').onclick=function(){ N.me('trade_cancel',{p_id:trade.id}).then(function(){ stopTradePoll(); G.refresh(true); UI.open('friendsOv'); }).catch(G.fail); };


/* ---------- crews: fishing together ---------- */
function renderCrewBox(){
  var box=$('crewBox'); box.innerHTML=''; var c=G.s.crew; if(!c) return;
  (c.invites||[]).forEach(function(iv){ var r=el('div','friend crew-invite','<div><div class="fn">'+esc(iv.name)+' invited you aboard</div><div class="fs">Their '+esc((D.GEAR_BY_ID[iv.boat]||{name:'boat'}).name)+' at '+esc((D.SPOT_BY_ID[iv.spot]||{name:''}).name)+'. You ride for free.</div></div>'); var b=el('div','fb'); var ok=el('button','pbtn gold','HOP ABOARD'); ok.type='button'; ok.onclick=function(){ UI.joinCrew(iv); }; var no=el('button','pbtn','NO THANKS'); no.type='button'; no.onclick=function(){ N.me('crew_respond',{p_host:iv.host,p_accept:false}).then(function(cc){ G.s.crew=cc; renderFriends(); }).catch(G.fail); }; b.appendChild(ok); b.appendChild(no); r.appendChild(b); box.appendChild(r); });
  var others=(c.members||[]).filter(function(m){ return m.pid!==G.s.pid; });
  if(others.length||c.guest){ var head=el('div','gear-group',c.guest?'ABOARD '+esc((c.hostName||'').toUpperCase())+'\'S '+esc(((D.GEAR_BY_ID[c.boat]||{}).name||'BOAT').toUpperCase()):'YOUR CREW'); box.appendChild(head);
    (c.members||[]).forEach(function(m){ var lines=(m.lines||[]), hooked=lines.filter(function(l){ return Date.parse(l.biteAt)<=N.now(); }).length; box.appendChild(el('div','friend','<div><div class="fn"><span class="dot'+(m.online?' on':'')+'"></span>'+esc(m.name)+(m.host?' <span class="tag gold">CAPTAIN</span>':'')+(m.pid===G.s.pid?' <span class="tag">YOU</span>':'')+'</div><div class="fs">'+(lines.length?lines.length+' line'+(lines.length>1?'s':'')+' out'+(hooked?' · <b style="color:#FF8A8D">FISH ON!</b>':''):'no lines out')+'</div></div>')); });
    var lv=el('button','pbtn danger',c.guest?'HOP OFF':'END THE TRIP'); lv.type='button'; lv.onclick=function(){ N.me('crew_leave').then(function(cc){ G.s.crew=cc; G.toast(c.guest?'You hopped off.':'Trip over. Everyone heads home.',2400,'info'); renderFriends(); G.renderAll(); }).catch(G.fail); }; box.appendChild(lv);
    box.appendChild(el('p','note','Fishing together: everyone on the boat gets bites 10% sooner. Guests use the captain\'s boat and rig, and sail along when the captain travels.')); }
}
UI.joinCrew=function(iv){ if(G.lines().length){ G.toast('Reel in your lines before you hop aboard.'); return; }
  N.me('crew_respond',{p_host:iv.host,p_accept:true}).then(function(c){ G.s.crew=c; var sp=D.SPOT_BY_ID[c.spot]; UI.closeAll(); UI.travelScene('bus',G.spot(),sp); setTimeout(function(){ $('travelOv').hidden=true; G.refresh(true).then(function(){ SC.layout(); G.toast('Welcome aboard! Fishing with '+c.hostName+' at '+sp.name+'.',3600,'good'); }); },1800); }).catch(G.fail); };
var crewSeen={}, crewFishSeen={}, crewPoll=0;
UI.crewTick=function(){
  var c=G.s&&G.s.crew; if(!c) return;
  (c.invites||[]).forEach(function(iv){ var k=iv.host+'|'+iv.spot; if(crewSeen[k]) return; crewSeen[k]=1; UI.confirm({title:'INVITE ABOARD!',note:iv.name+' wants you on their '+((D.GEAR_BY_ID[iv.boat]||{}).name||'boat')+' at '+((D.SPOT_BY_ID[iv.spot]||{}).name||'')+'. You ride for free and fish together.',yes:'HOP ABOARD',no:'LATER',danger:false}).then(function(v){ if(v) UI.joinCrew(iv); }); });
  (c.members||[]).forEach(function(m){ if(m.pid===G.s.pid) return; (m.recent||[]).forEach(function(f){ if(crewFishSeen[f.id]) return; var fresh=Date.now()-Date.parse(f.at)<60000; crewFishSeen[f.id]=1; if(fresh) G.queueToast(m.name+' caught '+(f.legend?'A LEGEND':'a '+D.fmtWeight(+f.lb)+' '+(D.SP_BY_ID[f.sp]||{name:'fish'}).name.toLowerCase())+'!'); }); });
  var others=(c.members||[]).filter(function(m){ return m.pid!==G.s.pid; }); var chip=$('crewChip'); chip.hidden=!others.length&&!(c.invites||[]).length; $('crewTxt').textContent=others.length?others.map(function(m){ return m.name; }).join(', '):(c.invites||[]).length?'INVITE!':'';
};
UI.startCrewPoll=function(){ clearInterval(crewPoll); crewPoll=setInterval(function(){ if(!G.s||document.hidden) return; var c=G.s.crew, active=c&&((c.members||[]).length>1||(c.invites||[]).length); if(!active&&Math.random()>0.25) return; N.me('get_crew').then(function(cc){ G.s.crew=cc; UI.crewTick(); if(!$('friendsOv').hidden) renderCrewBox(); }).catch(function(){}); },8000); };
$('crewChip').onclick=function(){ UI.open('friendsOv'); };

/* ---------- news ---------- */
function renderNews(){ var ul=$('newsList'); ul.innerHTML='<li>Loading...</li>'; N.rpc('get_news',{p_after:0}).then(function(rows){ ul.innerHTML=''; if(!rows.length) ul.innerHTML='<li class="empty">Nothing yet. Go make news.</li>'; rows.forEach(function(n){ var li=el('li',n.kind); var ic=el('span','ic'); if(n.data&&n.data.sp) ic.appendChild(A.fishImg(n.data.sp,22,false,1.5,n.data.variant,n.data.colors,'')); else ic.appendChild(icon(n.kind==='season'?'trophy':'news')); li.appendChild(ic); li.appendChild(el('div',null,'<div class="nt">'+esc(n.text)+'</div><div class="nw">'+timeAgo(n.at)+(n.pid?' · <a href="#" data-pid="'+n.pid+'">profile</a>':'')+'</div>')); ul.appendChild(li); }); ul.querySelectorAll('a[data-pid]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); UI.profile(a.getAttribute('data-pid')); }; }); if(rows.length){ G.prefs({newsSeen:rows[0].id}); UI.renderMenuBadge(); } }).catch(function(e){ ul.innerHTML='<li class="empty">'+esc(e.message)+'</li>'; }); }
function timeAgo(t){ var m=(N.now()-Date.parse(t))/60000; return m<1?'just now':m<60?Math.floor(m)+' min ago':m<1440?Math.floor(m/60)+' h ago':Math.floor(m/1440)+' d ago'; }

/* ---------- world map ---------- */
/* The map is a pixel-art terrain picture (built from Natural Earth data by tools/build-map.py) in three sizes.
   Each view picks the size that keeps pixels crisp, then adds night, city lights, pins and labels on top. */
var view=null, mapList=false, pickedSpot=null, worldAt=0, mapImgs={}, mapTimer=0, footOpen=true, suppressClick=false;
var MIPS=[1024,2048,4096];
function mapImg(w){ if(!mapImgs[w]){ var im=new Image(); im.onload=function(){ if(!$('mapOv').hidden) drawMap(); }; im.src='img/map-'+w+'.png'; mapImgs[w]=im; } return mapImgs[w]; }
function mapPx(){ var r=$('mapWrap').getBoundingClientRect(); return r.width<700?2:3; }
function clampView(v){ var span=Math.min(360,Math.max(6,v.lon1-v.lon0)), r=$('mapWrap').getBoundingClientRect(), asp=r.width/Math.max(1,r.height), lspan=Math.min(170,span/asp);
  var cx=(v.lon0+v.lon1)/2, cy=(v.lat0+v.lat1)/2; cx=Math.max(-180+span/2,Math.min(180-span/2,cx)); cy=Math.max(-85+lspan/2,Math.min(88-lspan/2,cy));
  return {lon0:cx-span/2,lon1:cx+span/2,lat0:cy+lspan/2,lat1:cy-lspan/2}; }
function worldView(){ var r=$('mapWrap').getBoundingClientRect(), asp=r.width/Math.max(1,r.height), lspan=150, span=Math.min(360,lspan*asp), cx=span>=360?0:G.spot().lon; return clampView({lon0:cx-span/2,lon1:cx+span/2,lat0:83,lat1:83-span/asp}); }
function regionView(rid){ var sp=D.SPOTS.filter(function(s){ return s.region===rid; }); var lons=sp.map(function(s){ return s.lon; }), lats=sp.map(function(s){ return s.lat; }); var pad=Math.max(6,(Math.max.apply(null,lons)-Math.min.apply(null,lons))*0.25), lon0=Math.min.apply(null,lons)-pad, lon1=Math.max.apply(null,lons)+pad, lat0=Math.max.apply(null,lats)+pad*0.8, lat1=Math.min.apply(null,lats)-pad*0.8;
  var r=$('mapWrap').getBoundingClientRect(), asp=r.width/Math.max(1,r.height), w=lon1-lon0, h=lat0-lat1; if(w/h<asp) w=h*asp; var c=(lon0+lon1)/2, cy=(lat0+lat1)/2-(footOpen?h*0.12:0);
  if(r.width/w<11){ var focus=D.SPOT_BY_ID[pickedSpot]&&D.SPOT_BY_ID[pickedSpot].region===rid?D.SPOT_BY_ID[pickedSpot]:sp[0]; w=r.width/13; c=focus.lon; cy=focus.lat-w/asp*0.18; } return clampView({lon0:c-w/2,lon1:c+w/2,lat0:cy+w/asp/2,lat1:cy-w/asp/2}); }
function loadWorld(){ if(G.world&&Date.now()-worldAt<30000) return Promise.resolve(G.world); return N.rpc('get_world',{}).then(function(w){ G.world=w; worldAt=Date.now(); return w; }); }
function renderMap(){ view=view?clampView(view):worldView(); mapList=false; pickedSpot=pickedSpot||G.s.spot; footOpen=isZoomed(); drawMap(); renderMapFoot(); clearInterval(mapTimer); mapTimer=setInterval(function(){ if($('mapOv').hidden){ clearInterval(mapTimer); return; } drawMap(); },60000);
  loadWorld().then(function(){ drawPins(); renderMapFoot(); }).catch(function(){}); }
function isZoomed(){ var r=$('mapWrap').getBoundingClientRect(); return r.width/(view.lon1-view.lon0)>9; }
function toXY(lon,lat,w,h){ return [(lon-view.lon0)/(view.lon1-view.lon0)*w,(view.lat0-lat)/(view.lat0-view.lat1)*h]; }
function drawMap(){
  var wrap=$('mapWrap'), cv=$('mapCanvas'), r=wrap.getBoundingClientRect(); if(!r.width) return;
  var ps=mapPx(), w=Math.ceil(r.width/ps), h=Math.ceil(r.height/ps); cv.width=w; cv.height=h; var c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  var need=w/(view.lon1-view.lon0)*360, mip=MIPS[MIPS.length-1]; for(var i=0;i<MIPS.length;i++){ if(MIPS[i]>=need*0.85){ mip=MIPS[i]; break; } }
  var im=mapImg(mip); if(!im.complete||!im.naturalWidth){ var lo=mapImg(1024); im=lo.complete&&lo.naturalWidth?lo:null; }
  c.fillStyle='#163468'; c.fillRect(0,0,w,h);
  if(im){ var IW=im.naturalWidth, IH=im.naturalHeight, sx=(view.lon0+180)/360*IW, sy=(90-view.lat0)/180*IH, sw=(view.lon1-view.lon0)/360*IW, sh=(view.lat0-view.lat1)/180*IH; c.drawImage(im,sx,sy,sw,sh,0,0,w,h); }
  /* night side, a warm twilight band, and city lights */
  var ss=M.subsolar(new Date()), d=c.getImageData(0,0,w,h), px=d.data, step=2;
  for(var y=0;y<h;y+=step){ var lat=view.lat0+(view.lat1-view.lat0)*((y+1)/h); for(var x=0;x<w;x+=step){ var lon=view.lon0+(view.lon1-view.lon0)*((x+1)/w), su=M.sunUp(lon,lat,ss);
      if(su>0.08) continue; var k=su<-0.1?1:(0.08-su)/0.18, tw=su>-0.1&&su<0.08?1-Math.abs(su+0.01)/0.09:0;
      for(var yy=y;yy<Math.min(h,y+step);yy++) for(var xx=x;xx<Math.min(w,x+step);xx++){ var j=(yy*w+xx)*4; px[j]=px[j]*(1-0.42*k)+tw*26; px[j+1]=px[j+1]*(1-0.38*k)+tw*8; px[j+2]=px[j+2]*(1-0.16*k)+tw*12; } } }
  c.putImageData(d,0,0);
  if(window.MAP_LIGHTS){ var zoom=360/(view.lon1-view.lon0); window.MAP_LIGHTS.forEach(function(L){ if(L[2]<(zoom<1.6?2:1)) return; var su=M.sunUp(L[0],L[1],ss); if(su>-0.02) return; var p=toXY(L[0],L[1],w,h); if(p[0]<0||p[0]>=w||p[1]<0||p[1]>=h) return; var x0=Math.round(p[0]), y0=Math.round(p[1]), a=Math.min(1,(-0.02-su)/0.08);
    c.fillStyle='rgba(255,214,107,'+(0.95*a).toFixed(2)+')'; c.fillRect(x0,y0,1,1); if(L[2]>=2&&zoom>=1.6){ c.fillStyle='rgba(255,200,90,'+(0.45*a).toFixed(2)+')'; c.fillRect(x0-1,y0,1,1); c.fillRect(x0+1,y0,1,1); c.fillRect(x0,y0-1,1,1); c.fillRect(x0,y0+1,1,1); } }); }
  /* soft frame */
  c.fillStyle='rgba(5,11,28,0.35)'; c.fillRect(0,0,w,1); c.fillRect(0,h-1,w,1); c.fillRect(0,0,1,h); c.fillRect(w-1,0,1,h);
  drawPins();
}
/* tiny pixel sprites for pins */
var pinCache={};
function pinSprite(kind,color){ var key=kind+color; if(pinCache[key]) return pinCache[key];
  var rows, map={k:'#0B1420',F:color,f:shadeHex(color,0.6),w:'#FFFFFF',Y:'#FFC94A',y:'#C98A12',S:'#F2C9A0',R:'#D93A3A',g:'#5A7598'};
  if(kind==='here') rows=["..kRRRk...",".kRRRRRk..",".kSSSSSk..","..kSSSk...","...kkk....","...kFk....","..kFFFk...","...kFk....","....k.....","....k....."];
  else if(kind==='locked') rows=["..kkkk..","..kgggk.","..kggggk","..kgggk.","..kk....","..k.....","..k.....","..k....."];
  else rows=["..kkkk..","..kFFFk.","..kFFFFk","..kfffk.","..kk....","..k.....","..k.....","..k....."];
  var c=A.spriteCanvas(rows,map); pinCache[key]=c.toDataURL(); return pinCache[key]; }
function starSprite(owned){ var key='star'+owned; if(pinCache[key]) return pinCache[key]; var c=A.spriteCanvas(["..k..",".kYk.","kYYYk",".kYk.","..k.."],{k:'#3A2200',Y:owned?'#8A7A5A':'#FFC94A'}); pinCache[key]=c.toDataURL(); return pinCache[key]; }
function shadeHex(h,k){ var n=parseInt(h.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255; return 'rgb('+Math.round(r*k)+','+Math.round(g*k)+','+Math.round(b*k)+')'; }
function drawPins(){
  var pins=$('pins'); pins.innerHTML=''; var wrap=$('mapWrap'), r=wrap.getBoundingClientRect(), W2=r.width, H2=r.height, span=view.lon1-view.lon0, zoomed=isZoomed();
  wrap.classList.toggle('zoomed',zoomed); var ps=mapPx(), placed=[];
  function free(x,y,w,h){ for(var i=0;i<placed.length;i++){ var q=placed[i]; if(x<q[0]+q[2]&&x+w>q[0]&&y<q[1]+q[3]&&y+h>q[1]) return false; } return true; }
  var list=D.SPOTS.map(function(s){ var x=(s.lon-view.lon0)/span*W2, y=(view.lat0-s.lat)/(view.lat0-view.lat1)*H2; var own=G.s.regions.indexOf(s.region)>=0, w=G.world&&G.world.spots[s.id];
    return {s:s,x:x,y:y,own:own,leg:w&&w.legend,prio:(s.id===G.s.spot?0:s.id===pickedSpot?1:own?2:3)+(s.famous?0.5:0)}; }).filter(function(o){ return o.x>=-10&&o.x<=W2+10&&o.y>=-10&&o.y<=H2+10; });
  list.sort(function(a,b){ return a.prio-b.prio; });
  if(zoomed) list.forEach(function(o){ placed.push([o.x-6,o.y-16,12,16]); });
  list.slice().reverse().forEach(function(o){ var s=o.s, here=s.id===G.s.spot;
    var b=el('button','pin'+(here?' here':'')+(o.own?'':' locked')+(s.id===pickedSpot?' picked':'')); b.type='button'; b.style.left=o.x+'px'; b.style.top=o.y+'px'; b.title=s.name+(o.own?'':' (needs a ticket)'); b.setAttribute('aria-label',b.title);
    var img=document.createElement('img'); img.className='px'; img.alt=''; img.src=pinSprite(here?'here':o.own?'flag':'locked',D.REGION_BY_ID[s.region].color); img.style.width=(here?10:8)*ps+'px'; b.appendChild(img);
    if(o.leg&&(zoomed||here)){ var st=document.createElement('img'); st.className='px star'+(o.leg.owner?' owned':''); st.alt=''; st.src=starSprite(!!o.leg.owner); st.style.width=5*ps+'px'; b.appendChild(st); }
    b.onclick=function(e){ e.stopPropagation(); if(suppressClick){ suppressClick=false; return; } pickedSpot=s.id; footOpen=true; if(!zoomed){ view=regionView(s.region); drawMap(); } else drawPins(); renderMapFoot(); };
    pins.appendChild(b); });
  /* labels: most important first, skipped when they would overlap */
  var labels=[];
  if(zoomed){ list.forEach(function(o){ var name=o.s.name.replace(/ \(.*\)/,''), lw=name.length*7+8, lx=o.x-lw/2, ly=o.y+4; if(!free(lx,ly,lw,14)&&o.prio>1) return; placed.push([lx,ly,lw,14]); labels.push({x:o.x,y:ly,t:name,cls:'map-label'+(o.s.id===G.s.spot?' here':'')+(o.own?'':' dim'),onclick:null}); }); }
  else { D.REGIONS.forEach(function(rg){ var sp=D.SPOTS.filter(function(s){ return s.region===rg.id; }), lon=0, lat=0; sp.forEach(function(s){ lon+=s.lon; lat+=s.lat; }); lon/=sp.length; lat/=sp.length;
      var x=(lon-view.lon0)/span*W2, y=(view.lat0-lat)/(view.lat0-view.lat1)*H2+14; if(x<0||x>W2||y<0||y>H2) return; var t=rg.name.replace(' and ',' & ').toUpperCase(), lw=t.length*7+10, lx=x-lw/2;
      if(!free(lx,y,lw,16)) return; placed.push([lx,y,lw,16]); labels.push({x:x,y:y,t:t,cls:'map-region'+(G.s.regions.indexOf(rg.id)>=0?'':' dim'),onclick:function(){ view=regionView(rg.id); pickedSpot=sp[0].id; drawMap(); renderMapFoot(); }}); }); }
  labels.forEach(function(L){ var e=el(L.onclick?'button':'span',L.cls,esc(L.t)); if(L.onclick){ e.type='button'; e.onclick=function(ev){ ev.stopPropagation(); if(suppressClick){ suppressClick=false; return; } L.onclick(); }; } e.style.left=L.x+'px'; e.style.top=L.y+'px'; pins.appendChild(e); });
}
function zoomBy(f,cx,cy){ var r=$('mapWrap').getBoundingClientRect(); cx=cx==null?0.5:cx; cy=cy==null?0.5:cy; var span=view.lon1-view.lon0, lspan=view.lat0-view.lat1, lon=view.lon0+span*cx, lat=view.lat0-lspan*cy, ns=Math.min(360,Math.max(6,span*f)), nl=lspan*(ns/span);
  view=clampView({lon0:lon-ns*cx,lon1:lon-ns*cx+ns,lat0:lat+nl*cy,lat1:lat+nl*cy-nl}); drawMap(); }
$('mapWorld').onclick=function(){ view=worldView(); mapList=false; footOpen=false; drawMap(); renderMapFoot(); };
$('mapList').onclick=function(){ mapList=!mapList; footOpen=true; renderMapFoot(); };
$('mapZoomIn').onclick=function(){ zoomBy(0.6); }; $('mapZoomOut').onclick=function(){ zoomBy(1/0.6); };
$('mapHere').onclick=function(){ pickedSpot=G.s.spot; footOpen=true; view=regionView(G.spot().region); drawMap(); renderMapFoot(); };
$('mapWrap').addEventListener('wheel',function(e){ if(e.target.closest('.map-foot')) return; e.preventDefault(); var r=$('mapWrap').getBoundingClientRect(); zoomBy(e.deltaY>0?1.2:1/1.2,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height); },{passive:false});
window.addEventListener('resize',function(){ if(!$('mapOv').hidden){ view=clampView(view); drawMap(); } });
(function(){ var pts={}, drag=null, pinch=null, wrap=$('mapWrap');
  wrap.addEventListener('pointerdown',function(e){ if(e.target.closest('.pin,.map-region,.map-tools,.map-foot')) return; pts[e.pointerId]={x:e.clientX,y:e.clientY}; var ids=Object.keys(pts);
    if(ids.length===2){ var a=pts[ids[0]], b=pts[ids[1]]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),v:Object.assign({},view)}; drag=null; } else drag={x:e.clientX,y:e.clientY,v:Object.assign({},view),moved:false}; });
  wrap.addEventListener('pointermove',function(e){ if(!pts[e.pointerId]) return; pts[e.pointerId]={x:e.clientX,y:e.clientY}; var r=wrap.getBoundingClientRect(), ids=Object.keys(pts);
    if(pinch&&ids.length===2){ var a=pts[ids[0]], b=pts[ids[1]], d=Math.hypot(a.x-b.x,a.y-b.y); if(d>10){ view=pinch.v; var cx=((a.x+b.x)/2-r.left)/r.width, cy=((a.y+b.y)/2-r.top)/r.height; zoomBy(pinch.d/d,cx,cy); view=Object.assign({},view); pinch.v=Object.assign({},view); pinch.d=d; suppressClick=true; } return; }
    if(!drag) return; if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>6) drag.moved=true; if(!drag.moved) return;
    var span=drag.v.lon1-drag.v.lon0, lspan=drag.v.lat0-drag.v.lat1, dx=(e.clientX-drag.x)/r.width*span, dy=(e.clientY-drag.y)/r.height*lspan;
    view=clampView({lon0:drag.v.lon0-dx,lon1:drag.v.lon1-dx,lat0:drag.v.lat0+dy,lat1:drag.v.lat1+dy}); drawMap(); });
  function up(e){ delete pts[e.pointerId]; if(drag&&drag.moved) suppressClick=true; if(Object.keys(pts).length<2) pinch=null; drag=null; }
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){ wrap.addEventListener(t,up); }); })();
$('mapCanvas').addEventListener('click',function(e){ if(suppressClick){ suppressClick=false; return; } var r=$('mapCanvas').getBoundingClientRect(), lon=view.lon0+(view.lon1-view.lon0)*((e.clientX-r.left)/r.width), lat=view.lat0+(view.lat1-view.lat0)*((e.clientY-r.top)/r.height); var best=null,bd=1e9; D.SPOTS.forEach(function(s){ var d=Math.pow(s.lon-lon,2)+Math.pow((s.lat-lat)*1.3,2); if(d<bd){ bd=d; best=s; } }); var span=view.lon1-view.lon0; if(best&&bd<Math.pow(span*0.06,2)){ pickedSpot=best.id; footOpen=true; if(!isZoomed()) view=regionView(best.region); drawMap(); renderMapFoot(); } });
function renderMapFoot(){
  var foot=$('mapFoot'); foot.innerHTML=''; foot.classList.toggle('closed',!footOpen); var tg=el('button','foot-toggle',footOpen?'HIDE':'SHOW'); tg.type='button'; tg.onclick=function(){ footOpen=!footOpen; renderMapFoot(); }; foot.appendChild(tg); if(!footOpen){ foot.appendChild(el('span','foot-mini',esc((D.SPOT_BY_ID[pickedSpot]||G.spot()).name))); return; }
  if(mapList){ var rl=el('div','region-list'); D.REGIONS.forEach(function(r){ var own=G.s.regions.indexOf(r.id)>=0, spots=D.SPOTS.filter(function(s){ return s.region===r.id; }); var head=el('div','region-row','<div><div class="rn" style="color:'+r.color+'">'+esc(r.name.toUpperCase())+'</div><div class="rs">'+esc(r.blurb)+'</div></div><div>'+(own?'<span class="own" style="font:9px var(--pixel);color:var(--sonar)">TICKET OWNED</span>':'<span class="legend-chip">'+D.money(r.ticket)+'</span>')+'</div>'); rl.appendChild(head);
      spots.forEach(function(s){ var w=G.world&&G.world.spots[s.id], b=el('button','spot-row'+(s.id===G.s.spot?' here':''),'<div><div class="sn">'+esc(s.name)+(s.famous?' <span class="tag">FAMOUS</span>':'')+'</div><div class="ss">'+D.METHOD_NAME[s.method]+' · '+D.spotSpecies(s.id).length+' species · '+G.clockAt(s)+' local'+(w&&w.anglers?' · '+w.anglers+' fishing':'')+'</div></div><div>'+(w&&w.legend?'<span class="legend-chip'+(w.legend.owner?' owned':'')+'">'+(w.legend.owner?'OWNED':'LEGEND')+'</span>':'')+'</div>'); b.type='button'; b.onclick=function(){ pickedSpot=s.id; mapList=false; view=regionView(s.region); drawMap(); renderMapFoot(); }; rl.appendChild(b); }); }); foot.appendChild(rl); return; }
  var s=D.SPOT_BY_ID[pickedSpot]||G.spot(), r=D.REGION_BY_ID[s.region], own=G.s.regions.indexOf(s.region)>=0, w=G.world&&G.world.spots[s.id], card=el('div','spot-card');
  var pic=el('div','pic'); var biggest=D.spotSpecies(s.id).sort(function(a,b){ return b.max-a.max; })[0]; if(biggest) pic.appendChild(A.fishImg(biggest.id,30,G.s.journal[biggest.id]?false:'#2C5088',2,null,null,biggest.name)); card.appendChild(pic);
  var t=el('div'); t.innerHTML='<h3>'+esc(s.name)+(s.famous?' <span class="tag">FAMOUS</span>':'')+'</h3><div class="where">'+esc(r.name)+(s.where?' · '+esc(s.where):'')+' · '+D.METHOD_NAME[s.method]+' · '+G.clockAt(s)+' local ('+D.PERIOD_NAME[G.period(s)].toLowerCase()+')'+(w&&w.anglers?' · '+w.anglers+' angler'+(w.anglers>1?'s':'')+' here':'')+'</div>';
  var acts=el('div','acts'); var ac=G.access(s), need=ac.blocked, hasGear=!need;
  if(s.id===G.s.spot) acts.appendChild(el('span','legend-chip','YOU ARE HERE'));
  else { var go=el('button','pbtn gold',own?'TRAVEL HERE (FREE)':'BUY TICKET '+D.money(r.ticket)+' AND GO'); go.type='button'; go.onclick=function(){ G.travelTo(s.id); }; acts.appendChild(go); if(!own) acts.appendChild(el('span','where','Pay once, then every trip to '+esc(r.name)+' is free. Travel by '+r.by+'.')); }
  if(!hasGear) acts.appendChild(el('span','where','Needs a '+(need==='kayak'?'kayak':'skiff')+' or bigger boat (Dock).')); else if(ac.small) acts.appendChild(el('span','where',esc(ac.why)));
  t.appendChild(acts);
  if(w&&w.legend){ var lg=el('div','leg'); lg.appendChild(A.fishImg(w.legend.sp,26,false,1.5,null,w.legend.colors,w.legend.name)); lg.appendChild(el('div',null,'<div class="ln">'+esc(w.legend.name)+'</div><div class="ls">'+(w.legend.owner?'Owned by '+esc(w.legend.ownerName||'someone'):'Still out there · 1 in '+Number(w.legend.odds).toLocaleString())+'</div>')); t.appendChild(lg); }
  t.appendChild(el('p',null,esc(s.desc)+(s.known?' Known for: '+esc(s.known)+'.':''))); t.appendChild(el('p','where','Fish: '+D.spotSpecies(s.id).map(function(x){ return esc(x.name); }).join(', ')));
  card.appendChild(t); foot.appendChild(card);
}
UI.travelScene=function(by,from,to){ var ov=$('travelOv'), cv=$('travelCanvas'); ov.hidden=false; cv.width=160; cv.height=40; $('travelTxt').textContent=(by==='plane'?'Flying':by==='charter'?'Sailing':'Driving')+' to '+to.name+'...'; var t0=performance.now(); (function f(){ if(ov.hidden) return; SC.travel(cv,by,from,to,performance.now()-t0); requestAnimationFrame(f); })(); };

/* ---------- save and misc ---------- */
function renderSave(){ $('saveOut').value=N.code(); $('saveIn').value=''; $('saveErr').textContent=''; }
$('copySave').onclick=function(){ var ta=$('saveOut'); ta.select(); try{ navigator.clipboard.writeText(ta.value).then(function(){ G.toast('Copied.',1800,'good'); }); }catch(e){ document.execCommand('copy'); G.toast('Copied.',1800,'good'); } };
$('loadSave').onclick=function(){ var v=$('saveIn').value.trim(); if(/^BZ1\./.test(v)){ try{ var s=JSON.parse(decodeURIComponent(escape(atob(v.slice(4))))); if(s&&(s.total>0||(s.bucket&&s.bucket.length))){ N.me('claim_founder').then(function(){ G.toast('Founder cap unlocked! A thank-you for playing Below Zero first.',4000,'good'); G.refresh(true); }).catch(G.fail); return; } }catch(e){} $('saveErr').textContent='That Below Zero code did not have any catches in it.'; return; } G.loadCode(v,$('saveErr')); };
$('reset').onclick=function(){ $('resetAsk').hidden=false; $('reset').hidden=true; };
$('resetYes').onclick=function(){ N.clearId(); location.reload(); };
$('sgGo').onclick=function(){ N.me('suggest_lake',{p_lake:$('sgLake').value.trim(),p_place:$('sgPlace').value.trim()}).then(function(){ G.toast('Thanks! The admin will take a look.',3000,'good'); UI.closeAll(); }).catch(function(e){ $('sgErr').textContent=e.message; }); };
UI.welcomeBack=function(cached){ var away=Date.now()-cached.at, bites=G.lines().filter(G.hooked).length, body=$('awayBody'); body.innerHTML='<div class="away-big">AWAY '+D.fmtDuration(away/60000).toUpperCase()+'</div><div class="t">'+(bites?bites+' line'+(bites>1?'s have':' has')+' a fish on! Go reel.':G.lines().length?'Your lines are still soaking. Nothing yet.':'No lines in the water. Cast one before you go next time.')+'</div>'+(G.s.coins!==cached.state.coins?'<div class="t">Coins: '+D.money(cached.state.coins)+' → '+D.money(G.s.coins)+'</div>':'')+'<div class="t">'+G.spot().name+', '+D.PERIOD_NAME[G.period()].toLowerCase()+' there.</div>'; $('awayOv').hidden=false; };
})();

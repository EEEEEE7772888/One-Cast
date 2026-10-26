/* One Cast inside the iPhone/Android app (Capacitor). On the website only NATIVE.share does anything.
   - schedules a phone notification for the exact moment each line will bite, even with the app closed
   - buzzes on bites and catches
   - native share sheet for catches; refreshes the game when the app comes back to the front */
(function(root){
'use strict';
var C=root.Capacitor, on=!!(C&&C.isNativePlatform&&C.isNativePlatform()), P=on&&C.Plugins||{};
var NT={on:on}, lastSig=null;
function plug(n){ return P[n]; }
NT.init=function(){
  if(!on) return;
  document.documentElement.classList.add('native');
  var App=plug('App'); if(App&&App.addListener) App.addListener('appStateChange',function(s){ if(s.isActive&&root.G&&root.G.s) root.G.refresh(true); });
  var LN=plug('LocalNotifications'); if(LN&&LN.addListener) LN.addListener('localNotificationActionPerformed',function(){ if(root.G&&root.G.s) root.G.refresh(true); });
};
NT.askNotify=function(){
  var LN=plug('LocalNotifications'); if(!LN) return Promise.resolve(false);
  return LN.checkPermissions().then(function(p){ if(p.display==='granted') return true; if(p.display==='denied') return false; return LN.requestPermissions().then(function(r){ return r.display==='granted'; }); }).catch(function(){ return false; });
};
/* one notification per line, at its bite time; rescheduled whenever the lines change */
NT.sync=function(){
  if(!on||!root.G||!root.G.s) return; var LN=plug('LocalNotifications'); if(!LN) return;
  var all=root.G.s.lines||[], sig=all.map(function(l){ return l.idx+':'+l.biteAt; }).join('|'); if(sig===lastSig) return; lastSig=sig;
  var now=Date.now(), soon=all.filter(function(l){ return l.biteAt&&new Date(l.biteAt).getTime()>now+3000&&!(root.OC&&root.OC.isLure&&root.OC.isLure(l.bait)); });
  LN.cancel({notifications:[0,1,2,3].map(function(i){ return {id:1000+i}; })}).catch(function(){}).then(function(){
    if(!soon.length) return;
    return NT.askNotify().then(function(ok){ if(!ok) return;
      var D=root.OC;
      return LN.schedule({notifications:soon.map(function(l){ var sp=D&&D.SPOT_BY_ID[l.spot];
        return {id:1000+l.idx,title:'Something is biting!',body:'Line '+(l.idx+1)+(sp?' at '+sp.name:'')+' has a fish on. Tap to reel it in.',schedule:{at:new Date(l.biteAt),allowWhileIdle:true}}; })});
    });
  }).catch(function(){});
};
NT.buzz=function(kind){ if(!on) return; var H=plug('Haptics'); if(!H) return; try{ if(kind==='bite') H.notification({type:'WARNING'}); else H.impact({style:kind==='big'?'HEAVY':'MEDIUM'}); }catch(e){} };
NT.share=function(text){
  var url='https://onecast.github.io', S=plug('Share');
  if(on&&S) return S.share({title:'One Cast',text:text,url:url,dialogTitle:'Share your catch'}).catch(function(){});
  if(navigator.share) return navigator.share({title:'One Cast',text:text,url:url}).catch(function(){});
  try{ navigator.clipboard.writeText(text+' '+url); if(root.G) root.G.toast('Copied! Paste it anywhere to share.',2500,'good'); }catch(e){}
};
root.NATIVE=NT;
})(typeof window!=='undefined'?window:this);

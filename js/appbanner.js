/* "Now on the App Store" notice for computers and other phones (iPhone Safari shows Apple's own banner instead,
   and the iPhone app itself never shows it). No link: it just tells people to look for the app. Closing it is remembered. */
(function(root){
'use strict';
var KEY='onecast.appBannerClosed';
function show(){
  try{ if(localStorage.getItem(KEY)) return; }catch(e){}
  var C=root.Capacitor; if(C&&C.isNativePlatform&&C.isNativePlatform()) return; // inside the app itself
  var ua=navigator.userAgent||'', iosSafari=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(iosSafari) return;
  var b=document.createElement('div'); b.className='app-banner'; b.setAttribute('role','status');
  b.innerHTML='<span class="ab-ic">📱</span><span class="ab-t"><b>One Cast is now on the App Store!</b> Search <b>"One Cast - Fishing"</b> on your iPhone or iPad.</span>';
  var x=document.createElement('button'); x.type='button'; x.className='ab-x'; x.setAttribute('aria-label','Close'); x.textContent='X';
  x.onclick=function(){ try{ localStorage.setItem(KEY,'1'); }catch(e){} b.remove(); };
  b.appendChild(x); document.body.appendChild(b);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(show,1500); }); else setTimeout(show,1500);
})(typeof window!=='undefined'?window:this);

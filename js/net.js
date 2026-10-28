/* One Cast networking: talks to the Supabase referee. The page never trusts itself; every move is a function call the server checks. */
(function(root){
'use strict';
var N={};
/* The project address and publishable key. The publishable key is meant to live in a web page; the server functions check everything else. */
N.SERVER={url:'https://jazbtozmvlwmplzmtdwh.supabase.co',key:'sb_publishable_X9WO2pob30RIyUqfrEMAxA_a--ig4F_'};
try{ if(root.OC_SERVER_OVERRIDE) N.SERVER=root.OC_SERVER_OVERRIDE; var q=new URLSearchParams(location.search); if(q.get('server')) N.SERVER={url:q.get('server'),key:q.get('key')||'test'}; }catch(e){}
/* a test copy (onecast.github.io/beta/) keeps its own save, so testing never touches your real one */
var STORE=(root.OC_SERVER_OVERRIDE&&root.OC_SERVER_OVERRIDE.store)||'', ID_KEY='onecast.'+(STORE?STORE+'.':'')+'id', CACHE_KEY='onecast.'+(STORE?STORE+'.':'')+'cache';
N.offset=0; N.online=true; N.listeners=[];
N.now=function(){ return Date.now()+N.offset; };
function randHex(n){ var a=new Uint8Array(n/2); try{ crypto.getRandomValues(a); }catch(e){ for(var i=0;i<a.length;i++) a[i]=Math.floor(Math.random()*256); } return Array.from(a,function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); }
function uuid(){ try{ return crypto.randomUUID(); }catch(e){} var h=randHex(32); return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32); }
N.loadId=function(){ try{ var v=JSON.parse(localStorage.getItem(ID_KEY)||'null'); if(v&&v.pid&&v.secret) return v; }catch(e){} return null; };
N.newId=function(){ return {pid:uuid(),secret:randHex(40)}; };
N.saveId=function(id){ try{ localStorage.setItem(ID_KEY,JSON.stringify(id)); }catch(e){} N.id=id; };
N.clearId=function(){ try{ localStorage.removeItem(ID_KEY); localStorage.removeItem(CACHE_KEY); }catch(e){} N.id=null; };
N.code=function(){ return N.id?'OC1.'+N.id.pid+'.'+N.id.secret:''; };
N.parseCode=function(c){ c=(c||'').trim(); var m=/^OC1\.([0-9a-f-]{36})\.([0-9a-f]{20,80})$/i.exec(c); return m?{pid:m[1].toLowerCase(),secret:m[2]}:null; };
/* Moving house: the old address sends its player here as #move=OC1.<pid>.<secret>. Take it, keep any other save on this device aside, and wipe the code from the address bar. */
N.takeMove=function(){ try{ var m=/^#move=(.+)$/.exec(location.hash||''); if(!m) return false; history.replaceState(null,'',location.pathname+location.search);
  var id=N.parseCode(decodeURIComponent(m[1])); if(!id) return false; var had=N.loadId();
  if(had&&had.pid!==id.pid) localStorage.setItem(ID_KEY+'.before-move',JSON.stringify(had));
  if(!had||had.pid!==id.pid){ localStorage.removeItem(CACHE_KEY); N.saveId(id); } return true; }catch(e){ return false; } };
N.moved=N.takeMove();
N.cache=function(state){ try{ localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),state:state})); }catch(e){} };
N.cached=function(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); }catch(e){ return null; } };
function headers(){ var h={'Content-Type':'application/json',apikey:N.SERVER.key}; if(/^eyJ/.test(N.SERVER.key)) h.Authorization='Bearer '+N.SERVER.key; return h; }
function setOnline(v){ if(N.online!==v){ N.online=v; N.listeners.forEach(function(f){ try{ f(v); }catch(e){} }); } }
/* Calls one server function. Resolves with its JSON, or rejects with {message, offline}. */
N.rpc=function(fn,args,opts){
  opts=opts||{};
  var ctl=('AbortController' in root)?new AbortController():null, timer=ctl?setTimeout(function(){ ctl.abort(); },opts.timeout||15000):null;
  return fetch(N.SERVER.url.replace(/\/$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:headers(),body:JSON.stringify(args||{}),signal:ctl?ctl.signal:undefined})
    .then(function(r){ if(timer) clearTimeout(timer); return r.text().then(function(t){ var j=null; try{ j=t?JSON.parse(t):null; }catch(e){}
      if(!r.ok){ var msg=(j&&(j.message||j.hint||j.error))||('Server error '+r.status); if(r.status>=500) setOnline(false); var err=new Error(msg); err.status=r.status; err.offline=r.status>=500; throw err; }
      setOnline(true); if(j&&j.now){ var srv=Date.parse(j.now); if(!isNaN(srv)) N.offset=srv-Date.now(); } return j; }); })
    .catch(function(e){ if(timer) clearTimeout(timer); if(!e.status){ setOnline(false); var err=new Error("Can't reach the server"); err.offline=true; throw err; } throw e; });
};
/* Game calls, all with the player's id and secret. */
N.me=function(fn,extra){ var a={p_pid:N.id.pid,p_secret:N.id.secret}; Object.keys(extra||{}).forEach(function(k){ a[k]=extra[k]; }); return N.rpc(fn,a); };
if(typeof module!=='undefined'&&module.exports) module.exports=N; else root.NET=N;
})(typeof window!=='undefined'?window:this);

const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[];
 for(const [w,h,n] of [[1200,820,'d'],[390,780,'p']]){ const c=await b.newContext({viewport:{width:w,height:h},hasTouch:n==='p'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|fonts/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(700); await p.fill('#nameIn','Mappy'+n); await p.click('#nameGo'); await p.waitForTimeout(1300);
  await p.evaluate(()=>UI.open('mapOv')); await p.waitForTimeout(1500); await p.screenshot({path:'tests/out/map-'+n+'-world.png'});
  await p.click('#mapHere'); await p.waitForTimeout(1200); await p.screenshot({path:'tests/out/map-'+n+'-home.png'});
  await p.evaluate(()=>{ document.querySelector('.map-region')||0; }); await p.click('#mapWorld'); await p.waitForTimeout(500);
  const reg=await p.$$('.map-region'); console.log(n,'regions labels',reg.length);
  for(const r of reg){ const t=await r.textContent(); if(/EUROPE/.test(t)){ await r.click(); break; } } await p.waitForTimeout(1200); await p.screenshot({path:'tests/out/map-'+n+'-europe.png'});
 }
 console.log(errs.join('\n')||'no errors'); await b.close(); })();

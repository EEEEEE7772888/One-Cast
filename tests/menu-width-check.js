const {chromium}=require('playwright');
const B='http://localhost:8810',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); for(const [w,h] of [[390,844],[360,740],[320,568]]){ const p=await br.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); if(await p.isVisible('#nameIn')){ await p.fill('#nameIn','Menu'+w); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(()=>{ G.s.coins=99999997541; G.prefs({tut:99}); G.renderAll(); UI.open('menuOv'); }); await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{ const d=document.querySelector('#menuOv .dialog'); return {sw:d.scrollWidth,cw:d.clientWidth,doc:document.documentElement.scrollWidth,vw:innerWidth}; });
  console.log(w,JSON.stringify(m)); await p.screenshot({path:'/tmp/claude-0/menu-'+w+'.png'}); await p.close(); } await br.close(); })();

const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1100,height:800}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push('CONSOLE '+m.text()); });
  await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(1200);
  await p.screenshot({path:'tests/out/e1-name.png'});
  await p.fill('#nameIn','ReelDeal'); await p.click('#nameGo'); await p.waitForTimeout(1500);
  await p.screenshot({path:'tests/out/e1-game.png'});
  console.log(errs.join('\n')||'no errors'); await b.close();
})();

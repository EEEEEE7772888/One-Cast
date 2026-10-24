const { chromium, devices } = require('playwright');
const {execFileSync}=require('child_process');
function sql(q){ return execFileSync('su',['postgres','-c','psql -X -At -d onecast'],{input:q,encoding:'utf8'}).trim(); }
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext(Object.assign({},devices['iPhone 13'],{viewport:{width:390,height:780}})); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text())) errs.push('CONSOLE '+m.text()); });
  await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(800);
  await p.fill('#nameIn','PhoneKid'); await p.click('#nameGo'); await p.waitForTimeout(1500);
  await p.screenshot({path:'tests/out/p-game.png'});
  await p.click('#coachNext'); await p.click('#goBtn'); await p.waitForTimeout(1000); await p.screenshot({path:'tests/out/p-cast.png'});
  const pid=await p.evaluate(()=>G.s.pid); sql(`update lines set cast_at=now()-interval '3 minutes', bite_at=now()-interval '5 seconds' where pid='${pid}'`);
  await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.click('#goBtn'); await p.waitForTimeout(3600); await p.screenshot({path:'tests/out/p-card.png'});
  await p.click('#cardOv .go.alt'); await p.waitForTimeout(500);
  await p.click('#mapBtn'); await p.waitForTimeout(900); await p.screenshot({path:'tests/out/p-map.png'});
  await p.click('.pin.here',{force:true}); await p.waitForTimeout(600); await p.screenshot({path:'tests/out/p-map-zoom.png'});
  await p.evaluate(()=>UI.open('menuOv')); await p.waitForTimeout(400); await p.screenshot({path:'tests/out/p-menu.png'});
  await p.evaluate(()=>UI.open('tackleOv')); await p.waitForTimeout(400); await p.screenshot({path:'tests/out/p-tackle.png'});
  await p.evaluate(()=>UI.open('gearOv')); await p.waitForTimeout(400); await p.screenshot({path:'tests/out/p-gear.png'});
  console.log(errs.join('\n')||'no errors'); await b.close();
})();

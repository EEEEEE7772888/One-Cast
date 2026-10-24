const { chromium } = require('playwright');
const {execFileSync}=require('child_process');
function sql(q){ return execFileSync('su',['postgres','-c','psql -X -At -d onecast'],{input:q,encoding:'utf8'}).trim(); }
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:+(process.env.VW||1100),height:+(process.env.VH||800)}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text())) errs.push('CONSOLE '+m.text()); });
  await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(800);
  if(await p.isVisible('#nameIn')){ await p.fill('#nameIn','ReelDeal'); await p.click('#nameGo'); await p.waitForTimeout(1500); }
  await p.click('#coachSkip').catch(()=>{});
  await p.screenshot({path:'tests/out/e2-shore.png'});
  // cast
  await p.click('#goBtn'); await p.waitForTimeout(1200); await p.screenshot({path:'tests/out/e2-cast.png'});
  // make the bite happen now
  const pid=await p.evaluate(()=>G.s.pid); sql(`update lines set cast_at=now()-interval '3 minutes', bite_at=now()-interval '5 seconds' where pid='${pid}'`);
  await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1500); await p.screenshot({path:'tests/out/e2-bite.png'});
  await p.click('#goBtn'); await p.waitForTimeout(1900); await p.screenshot({path:'tests/out/e2-hang.png'}); await p.waitForTimeout(1800); await p.screenshot({path:'tests/out/e2-card.png'});
  console.log(errs.join('\n')||'no errors'); await b.close();
})();

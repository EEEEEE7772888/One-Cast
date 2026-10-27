/* Browser check: the crankbait fight. A bot reels in the green, sets the hook, then keeps the fish in the box.
   Then it ignores a fight to check a lost fish gives nothing. Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
async function workAndStrike(p,pid,fightFn){
  await p.evaluate(()=>{ G.bait='crank'; G.renderPanel(); }); await p.click('#goBtn'); await p.waitForTimeout(400);
  sql(`update lines set bite_at=now()+interval '3 seconds' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true).then(function(){ var l=G.s.lines.filter(function(x){ return x.bait==='crank'; })[0]; if(l) LURE.start(l); })); // strike soon (test only)
  let holding=false, phase='', d=null; const t0=Date.now();
  const set=async want=>{ if(want!==holding){ holding=want; if(want) await p.keyboard.down('Space'); else await p.keyboard.up('Space'); } };
  while(Date.now()-t0<60000){
    const s=await p.evaluate(()=>LURE.active?LURE._state():null); if(!s) break; phase=s.phase;
    if(s.phase==='work') await set(s.speed<0.55);
    else if(s.phase==='strike'){ await set(false); await p.keyboard.down('Space'); await p.keyboard.up('Space'); }
    else if(s.phase==='fight'){ d=s.fight.d; await set(fightFn?await fightFn(s):false); }
    await p.waitForTimeout(30);
  }
  await set(false); return {phase,d};
}
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['phone',{width:390,height:844},true],['pc',{width:1366,height:768},false]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Fight'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set baits='{worm,crank}', prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.evaluate(()=>UI.closeAll()); await p.waitForTimeout(3500);
    const count=()=>+sql(`select count(*) from fish where pid='${pid}'`);
    for(let round=0;round<(process.env.R?+process.env.R:3);round++){
      const f0=count(); let shot=false;
      const r=await workAndStrike(p,pid,async s=>{ if(!shot&&s.fight.meter>0.5){ shot=true; await p.screenshot({path:OUT+dev+'-fight.png'}); } return s.fight.fx>s.fight.zx+s.fight.zw/2; });
      let card=false; for(let i=0;i<40;i++){ await p.waitForTimeout(300); if(await p.isVisible('#cardOv')){ card=true; if(round===0) await p.screenshot({path:OUT+dev+'-fight-card.png'}); await p.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('#cardOv button')).filter(function(x){ return /KEEP|AMAZING/.test(x.textContent); })[0]; if(b) b.click(); }); await p.waitForTimeout(600); }
        if(await p.isEnabled('#goBtn')&&!(await p.isVisible('#cardOv'))&&i>4) break; await p.evaluate(()=>{ if(!document.getElementById('cardOv').hidden) return; ['menuOv','achOv'].forEach(function(o){ var e=document.getElementById(o); if(e&&!e.hidden) UI.closeAll(); }); }); }
      log('state: '+JSON.stringify(await p.evaluate(()=>({busy:G.busy,scBusy:SCENE.busy(),card:!document.getElementById('cardOv').hidden,go:document.getElementById('goBtn').textContent,lines:G.s.lines.length,lure:LURE.active}))));
      log('round '+round+': difficulty '+r.d+', last phase '+r.phase+', fish in bucket +'+(count()-f0)+', catch card shown '+card);
    }
    const f0=count(); await p.waitForFunction(()=>!document.getElementById('goBtn').disabled,null,{timeout:20000}); const r=await workAndStrike(p,pid,null); await p.waitForTimeout(2500);
    log('ignored the fight (difficulty '+r.d+'): fish in bucket +'+(count()-f0)+', lines left '+sql(`select count(*) from lines where pid='${pid}'`));
    await ctx.close(); } await br.close(); })();

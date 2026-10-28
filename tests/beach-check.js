/* Browser check: Cape Hatteras Point is free, worms work, and the beach scene draws (day and night). Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob,time] of [['phone-day',{width:390,height:844},true,'2026-10-27T17:00:00Z'],['pc-day',{width:1366,height:768},false,'2026-10-27T17:00:00Z'],['phone-night',{width:390,height:844},true,'2026-10-28T03:00:00Z']]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.clock.install({time:new Date(time)});
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Beach'+dev.replace('-','')); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    const sec=sql(`select secret from players where pid='${pid}'`); const t=JSON.parse(sql(`set role anon; select travel('${pid}','${sec}','hatteras');`).replace(/^SET\n?/,''));
    log('free travel to Hatteras: '+(t.spot==='hatteras'));
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800); await p.evaluate(()=>{ UI.closeAll(); SCENE.layout(); }); await p.waitForTimeout(1500);
    await p.click('#goBtn'); await p.waitForTimeout(1500); log('cast with worms: '+(await p.evaluate(()=>G.s.lines.length)));
    await p.screenshot({path:OUT+dev+'-beach.png'});
    await ctx.close(); } await br.close(); })();

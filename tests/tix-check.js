/* Browser check: closable lure instructions, and the MY TICKETS panel on the map. Needs mock-server on 8799 (OC_DB=devb). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devb'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Tix'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set baits='{worm,crank,jig}', regions='{home,northwoods,keys}', prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.evaluate(()=>UI.closeAll()); await p.waitForTimeout(3500);
    // lure help X
    await p.evaluate(()=>{ G.bait='crank'; G.renderPanel(); }); await p.click('#goBtn'); await p.waitForTimeout(1200);
    await p.click('#lureHowX'); await p.waitForTimeout(300); log('after X: help hidden '+!(await p.isVisible('#lureHow'))+', HOW TO PLAY shown '+await p.isVisible('#lureHowShow'));
    await p.screenshot({path:OUT+dev+'-how-closed.png'});
    await p.click('#lureQuit'); await p.waitForTimeout(1500);
    await p.click('#goBtn'); await p.waitForTimeout(1200); log('next cast: still hidden '+!(await p.isVisible('#lureHow')));
    await p.click('#lureHowShow'); await p.waitForTimeout(300); log('HOW TO PLAY brings it back: '+await p.isVisible('#lureHow'));
    await p.click('#lureQuit'); await p.waitForTimeout(1500);
    // tickets
    await p.click('#mapBtn'); await p.waitForTimeout(1500); log('tickets chip: '+(await p.textContent('.mt-toggle')).trim());
    if(dev==='phone'&&await p.isVisible('#mapKey')) await p.click('#mapKeyBtn');
    await p.click('.mt-toggle'); await p.waitForTimeout(400); log('waters listed: '+await p.locator('.mt-spot').count());
    await p.screenshot({path:OUT+dev+'-tix.png'});
    await p.locator('.mt-spot:has-text("Keys flats")').click(); await p.waitForTimeout(1200); log('picked Keys flats: '+(await p.textContent('#mapFoot')).includes('Keys flats'));
    await ctx.close(); } await br.close(); })();

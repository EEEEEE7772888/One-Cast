/* Browser check: index rewards panel, claiming the freshwater reward, wearing the prize hat. Needs mock-server on 8799 (OC_DB=devt2). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt2'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Idx'+dev+Date.now()%100); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const pid=await p.evaluate(()=>G.s.pid);
    sql(`update players set prefs=prefs||'{"tut":99,"pwTip2":1}', journal=(select jsonb_object_agg(x,'{"n":1,"best":2}'::jsonb) from (select x from oc_index_species('fresh') x union select x from (select x from oc_index_species('salt') x limit 30) q) z) where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800); await p.evaluate(()=>UI.closeAll());
    await p.click('#indexBtn'); await p.waitForTimeout(700);
    log('rewards: '+(await p.locator('.idx-r .idx-t').allTextContents()).join(' | '));
    await p.screenshot({path:OUT+dev+'-index-rewards.png'});
    await p.click('.idx-r.ready button:has-text("CLAIM")'); await p.waitForTimeout(1200);
    log('after claim: coins '+await p.evaluate(()=>G.s.coins)+', has hat '+await p.evaluate(()=>G.s.items.includes('hat_river'))+', panel says '+(await p.locator('.idx-r').first().textContent()).slice(-12));
    await p.evaluate(()=>{ UI.open('shopOv'); }); await p.waitForTimeout(400); await p.click('#shopTabs button:has-text("HATS")'); await p.waitForTimeout(400);
    log('River Master cap in clothes shop: '+await p.isVisible('#shopItems >> text=River Master cap'));
    await ctx.close(); } await br.close(); })();

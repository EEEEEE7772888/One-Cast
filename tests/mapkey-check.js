/* Browser check: the map key (fish level colours, green = you have it). Needs mock-server on 8799 (OC_DB=devb). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devb'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Key'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set regions='{home,northwoods,everglades,keys}', prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.evaluate(()=>UI.closeAll());
    await p.click('#mapBtn'); await p.waitForTimeout(1500);
    log('key open by default: '+await p.isVisible('#mapKey'));
    if(!await p.isVisible('#mapKey')){ await p.click('#mapKeyBtn'); await p.waitForTimeout(500); }
    log('rows: '+await p.locator('.mk-row').count()+', green (have): '+await p.locator('.mk-row.have').count());
    await p.screenshot({path:OUT+dev+'-mapkey.png'});
    await p.click('#mapWorld'); await p.waitForTimeout(1200); await p.screenshot({path:OUT+dev+'-mapkey-world.png'});
    await p.locator('.mk-row:has-text("Kona")').click(); await p.waitForTimeout(1200); log('picked Kona, key still open: '+await p.isVisible('#mapKey')); await p.screenshot({path:OUT+dev+'-mapkey-pick.png'});
    await ctx.close(); } await br.close(); })();

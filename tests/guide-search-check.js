/* Browser check: map search (by water, place and fish) and the guidebooks (cover, buy, legends chapter). Needs mock-server on 8799 (OC_DB=devt2). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt2'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Guide'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set prefs=prefs||'{"tut":99,"pwTip2":1}', coins=30000, regions='{home,northwoods}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800); await p.evaluate(()=>UI.closeAll());
    // map search
    await p.click('#mapBtn'); await p.waitForTimeout(1200);
    for(const q of ['hatt','north carolina','red drum','muskie','zzz']){ await p.fill('#mapSearch',q); await p.waitForTimeout(250); log('search "'+q+'": '+(await p.locator('#mapSearchRes .ms-row .ms-n').allTextContents()).map(t=>t.trim()).slice(0,4).join(' | ')+((await p.isVisible('.ms-none'))?'(nothing found msg)':'')); }
    await p.fill('#mapSearch','davidson'); await p.waitForTimeout(250); await p.screenshot({path:OUT+dev+'-mapsearch.png'});
    await p.click('#mapSearchRes .ms-row'); await p.waitForTimeout(900); log('picked → foot shows Davidson: '+(await p.textContent('#mapFoot')).includes('Davidson'));
    await p.evaluate(()=>UI.closeAll());
    // guidebooks
    await p.evaluate(()=>UI.open('guideOv')); await p.waitForTimeout(500); await p.screenshot({path:OUT+dev+'-guide-cover.png'});
    await p.click('#guideBody button:has-text("BUY")'); await p.waitForTimeout(1800);
    log('legends listed: '+await p.locator('.g-legend').count()+', fish listed: '+await p.locator('.g-fish').count()+', coins '+await p.evaluate(()=>G.s.coins));
    await p.screenshot({path:OUT+dev+'-guide.png'});
    await p.fill('.g-search','bucket'); await p.waitForTimeout(300); log('search "bucket": '+(await p.locator('.g-legend .g-n').allTextContents()).join(' | '));
    await ctx.close(); } await br.close(); })();

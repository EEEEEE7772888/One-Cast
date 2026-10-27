/* Browser check: bait stat bars in the bait shop and tackle box. Needs mock-server on 8799 (OC_DB=devb). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devb'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Bait'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set baits='{worm,minnow,crank}', coins=5000, prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.evaluate(()=>UI.closeAll());
    await p.evaluate(()=>UI.open('baitOv')); await p.waitForTimeout(800); log('bar rows in shop: '+await p.locator('#baitRows .bbars').count());
    await p.screenshot({path:OUT+dev+'-baitshop.png'});
    await p.evaluate(()=>UI.open('tackleOv')); await p.waitForTimeout(800); log('bars in tackle box: '+await p.locator('#baitInfo .bbars').count());
    await p.screenshot({path:OUT+dev+'-tackle.png'});
    await ctx.close(); } await br.close(); })();

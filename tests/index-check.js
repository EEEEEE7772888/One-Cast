/* Browser check: the INDEX button opens every fish, caught in colour, the rest blacked out. Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['phone',{width:390,height:844},true],['pc',{width:1366,height:768},false]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Idx'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    const pid=await p.evaluate(()=>G.s.pid);
    sql(`update players set journal='{"bluegill":{"n":3,"best":0.6},"largemouth":{"n":1,"best":4.2},"walleye":{"n":2,"best":5.1,"golden":true},"kingsalmon":{"n":1,"best":30}}', prefs=prefs||'{"tut":99,"pwTip2":1}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1200); await p.evaluate(()=>UI.closeAll());
    const hb=await p.locator('.hud-btns').boundingBox(); log('top-right buttons fit on screen: '+(hb.x>=0&&hb.x+hb.width<=vp.width+1)+' (right edge '+Math.round(hb.x+hb.width)+')');
    await p.screenshot({path:OUT+dev+'-index-hud.png',clip:{x:0,y:0,width:vp.width,height:130}});
    await p.click('#indexBtn'); await p.waitForTimeout(800);
    log('title: '+await p.textContent('#journalTitle')+' | '+(await p.textContent('#journalNote')).slice(0,40)+' | cards '+await p.locator('#journalBody .card').count()+', blacked out '+await p.locator('#journalBody .card.no').count());
    await p.screenshot({path:OUT+dev+'-index.png'});
    await p.selectOption('#journalRegion','home'); await p.waitForTimeout(400); log('switch to Home waters: '+await p.textContent('#journalTitle')+', cards '+await p.locator('#journalBody .card').count());
    await ctx.close(); } await br.close(); })();

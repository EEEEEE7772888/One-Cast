const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d qa'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/qa/';
async function player(br,dev,vp,mob,name){ const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('['+dev+'] PAGE ERROR '+e.message));
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn',name); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set stats=stats||'{"catches":3}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(2200); return p; }
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    let p=await player(br,dev,vp,mob,'Tip'+dev);
    log('tip shows after 3 catches: '+await p.isVisible('#tipBox')); await p.screenshot({path:OUT+dev+'-tip.png'});
    await p.waitForTimeout(8000); log('still there 8s later: '+await p.isVisible('#tipBox'));
    await p.reload(); await p.waitForTimeout(2500); log('still there after reload: '+await p.isVisible('#tipBox'));
    await p.click('#tipX'); await p.waitForTimeout(500); log('gone after X: '+!(await p.isVisible('#tipBox')));
    await p.reload(); await p.waitForTimeout(2500); log('stays gone after reload: '+!(await p.isVisible('#tipBox')));
    p=await player(br,dev,vp,mob,'Tap'+dev);
    await p.click('#tipGo'); await p.waitForTimeout(500); log('SET PASSWORD opens save screen: '+await p.isVisible('#saveOv'));
    await p.fill('#pwNew','fishing123'); await p.fill('#pwNew2','fishing123'); await p.click('#pwSet'); await p.waitForTimeout(1200);
    log('tip gone once password set: '+!(await p.isVisible('#tipBox')));
  } await br.close(); })();

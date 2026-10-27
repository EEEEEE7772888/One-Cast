/* Browser check: PROFILE button next to MAP, and changing your name from your profile. Needs mock-server on 8799 (OC_DB=devb). */
const {chromium}=require('playwright');
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const log=m=>console.log('['+dev+'] '+m);
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>log('PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Prof'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ try{ UI.closeAll(); }catch(e){} document.querySelectorAll('.coach,#coach').forEach(x=>x.hidden=true); });
    const bb=await p.locator('#profBtn').boundingBox(), mb=await p.locator('#mapBtn').boundingBox(); log('profile button visible: '+await p.isVisible('#profBtn')+', right next to MAP: '+(Math.abs(bb.y-mb.y)<4&&mb.x-(bb.x+bb.width)<20));
    await p.screenshot({path:OUT+dev+'-header.png',clip:{x:0,y:0,width:vp.width,height:140}});
    await p.click('#profBtn'); await p.waitForTimeout(1200); log('profile open: '+await p.isVisible('#profileOv')+', rename box: '+await p.isVisible('#renameIn'));
    await p.fill('#renameIn','bad name!'); await p.click('text=SAVE NAME'); await p.waitForTimeout(400); log('bad input: '+await p.textContent('#renameErr'));
    await p.fill('#renameIn','shithead'); await p.click('text=SAVE NAME'); await p.waitForTimeout(1200); log('bad word: '+await p.textContent('#renameErr'));
    await p.fill('#renameIn','Captain_'+dev); await p.click('text=SAVE NAME'); await p.waitForTimeout(1800);
    log('renamed: '+await p.evaluate(()=>G.s.name+'#'+G.s.tag)+' / profile shows: '+(await p.textContent('#profileBody .pn')).slice(0,30));
    await p.screenshot({path:OUT+dev+'-profile.png'});
    await p.fill('#renameIn','Again_'+dev); await p.click('text=SAVE NAME'); await p.waitForTimeout(1200); log('second change: '+await p.textContent('#renameErr'));
    await p.reload(); await p.waitForTimeout(2500); log('after reload: '+await p.evaluate(()=>G.s.name));
    await ctx.close(); } await br.close(); })();

// Password flow in a real browser: set a password, wipe browser storage, log back in with name#tag + password.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d qa'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8798', Q='/?server='+B+'&key=test', OUT='/home/claude/one-cast/tests/out/qa/';
(async()=>{for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
  const br=await chromium.launch(), ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}), p=await ctx.newPage(); const log=m=>console.log('['+dev+'] '+m);
  p.on('pageerror',e=>log('PAGE ERROR '+e.message)); p.on('dialog',d=>d.accept());
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  const toasts=[]; await p.exposeFunction('__t',t=>toasts.push(t)); await p.addInitScript(()=>{ new MutationObserver(()=>{ const t=document.getElementById('toast'); if(t&&!t.hidden) window.__t(t.textContent); }).observe(document,{subtree:true,childList:true,characterData:true,attributes:true}); });
  await p.goto(B+Q); await p.waitForTimeout(1000); await p.fill('#nameIn','Pw'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const me=await p.evaluate(()=>({pid:G.s.pid,name:G.s.name,tag:G.s.tag}));
  sql(`update players set coins=7777, stats=stats||'{"catches":3}' where pid='${me.pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(2500);
  log('tip shown: '+toasts.some(t=>/set a password/i.test(t)));
  await p.evaluate(()=>UI.open('saveOv')); await p.waitForTimeout(400); await p.screenshot({path:OUT+dev+'-pw-1-save.png'});
  await p.fill('#pwNew','abc'); await p.fill('#pwNew2','abc'); await p.click('#pwSet'); log('short pw: '+await p.textContent('#pwErr'));
  await p.fill('#pwNew','fishing123'); await p.fill('#pwNew2','fishing124'); await p.click('#pwSet'); log('mismatch: '+await p.textContent('#pwErr'));
  await p.fill('#pwNew2','fishing123'); await p.click('#pwSet'); await p.waitForTimeout(1200); log('after set: '+(await p.textContent('#pwStatus')).slice(0,40)+' | button: '+await p.textContent('#pwSet'));
  await p.screenshot({path:OUT+dev+'-pw-2-set.png'});
  // the player clears their browser data
  await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  log('after wipe, name screen shows: '+await p.isVisible('#nameOv'));
  await p.click('#nameHavePw'); await p.fill('#pwName',me.name.toLowerCase()+' # '+me.tag); await p.fill('#pwIn','wrongpass'); await p.click('#pwGo'); await p.waitForTimeout(800);
  log('wrong pw: '+await p.textContent('#pwLoginErr')); await p.screenshot({path:OUT+dev+'-pw-3-login.png'});
  await p.fill('#pwIn','fishing123'); await p.click('#pwGo'); await p.waitForTimeout(2500);
  const back=await p.evaluate(()=>G.s&&({pid:G.s.pid,coins:G.s.coins,hasPw:G.s.hasPw}));
  log('logged back in as same player: '+(back&&back.pid===me.pid)+', coins '+(back&&back.coins)+', hasPw '+(back&&back.hasPw));
  await p.screenshot({path:OUT+dev+'-pw-4-back.png'}); await br.close(); }
  // admin page loads cleanly with the new buttons
  const br=await chromium.launch(), p=await br.newPage(); p.on('pageerror',e=>console.log('[admin] PAGE ERROR '+e.message));
  await p.goto(B+'/admin.html?server='+B+'&key=test'); await p.waitForTimeout(800); console.log('[admin] page loaded'); await br.close();
})();

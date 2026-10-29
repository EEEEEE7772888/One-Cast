const {chromium}=require('playwright');
const B='http://localhost:8817',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:900,height:700}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Mapper'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ try{ localStorage.setItem('onecast.seenHalloween2026','1'); }catch(e){} UI.closeAll(); UI.open('mapOv'); }); await p.waitForTimeout(1500);
  await p.screenshot({path:'/tmp/claude-0/map-tiers.png'}); console.log('errors:',errs.length?errs:'none'); await br.close(); })();

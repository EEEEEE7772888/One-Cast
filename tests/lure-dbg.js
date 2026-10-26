const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d qa'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8803',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844}}); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Dbg'+Date.now()%1000); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set baits=baits||'{crank,jig}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800);
  await p.evaluate(()=>{ G.bait='crank'; G.renderPanel(); }); await p.click('#goBtn'); await p.waitForTimeout(500);
  for(let i=0;i<8;i++){ await p.dispatchEvent('#lureBtn','pointerdown'); await p.waitForTimeout(500); console.log(JSON.stringify(await p.evaluate(()=>LURE._state())), await p.evaluate(()=>document.getElementById('lureMsg').textContent)); }
  await br.close(); })();

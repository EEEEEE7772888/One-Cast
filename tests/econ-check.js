// The big lure update in a real browser: buy lures one at a time, a jerkbait played well (twitch-twitch-pause + fight), a forced snag, and the rod and reel shop.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_fresh', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8810),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/econ-';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','LureTester'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set coins=5000, prefs=prefs||'{"tut":99}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800);
  // bait shop
  await p.evaluate(()=>UI.open('baitOv')); await p.waitForTimeout(400);
  const rows=await p.$$('#baitRows li'); for(const r of rows){ const t=await r.textContent(); if(/Jerkbaits/.test(t)) await r.scrollIntoViewIfNeeded(); }
  await p.screenshot({path:SH+'baitshop.png'});
  await p.evaluate(()=>{ const li=[...document.querySelectorAll('#baitRows li')].find(l=>/Jerkbaits/.test(l.textContent)); [...li.querySelectorAll('button')].find(b=>/BUY 5/.test(b.textContent)).click(); }); await p.waitForTimeout(900);
  await p.evaluate(()=>{ const li=[...document.querySelectorAll('#baitRows li')].find(l=>/Crankbaits/.test(l.textContent)); [...li.querySelectorAll('button')].find(b=>/BUY 1/.test(b.textContent)).click(); }); await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({coins:G.s.coins,jerk:G.lureCount('jerk'),crank:G.lureCount('crank'),baits:G.s.baits}));
  console.log('bought:',JSON.stringify(after),after.coins===5000-58&&after.jerk===5&&after.crank===1?'OK':'WRONG');
  await p.screenshot({path:SH+'baitshop-after.png'});
  await p.evaluate(()=>UI.closeAll()); await p.evaluate(()=>UI.open('tackleOv')); await p.waitForTimeout(400); await p.screenshot({path:SH+'tackle.png'}); await p.evaluate(()=>UI.closeAll());
  // a jerkbait, played well
  sql(`update baits set snag=0 where id in ('jerk','crank')`);
  async function play(bait){ await p.evaluate(b=>{ G.bait=b; G.renderPanel(); },bait); await p.waitForFunction(()=>!document.getElementById('goBtn').disabled,null,{timeout:20000}); await p.click('#goBtn'); await p.waitForTimeout(600);
    if(!(await p.isVisible('#lureBox'))) return 'lure box did not open'; let shot=false, fshot=false; const t0=Date.now(); let hold=false, lastTwitch=0;
    while(Date.now()-t0<60000){ const s=await p.evaluate(()=>({open:!document.getElementById('lureBox').hidden,btn:document.getElementById('lureBtn').textContent,st:LURE._state()})); if(!s.open) break;
      if(/STRIKE/.test(s.btn)){ await p.dispatchEvent('#lureBtn','pointerdown'); await p.dispatchEvent('#lureBtn','pointerup'); await p.waitForTimeout(700); continue; }
      if(s.st&&s.st.phase==='fight'){ if(!fshot&&s.st.t>1){ fshot=true; await p.screenshot({path:SH+bait+'-fight.png'}); } const f=s.st.fight, want=f.fx>f.zx+f.zw/2; if(want!==hold){ hold=want; await p.dispatchEvent('#lureBtn',hold?'pointerdown':'pointerup'); } await p.waitForTimeout(40); continue; }
      if(bait==='jerk'&&s.st&&s.st.phase==='work'){ if(Date.now()-lastTwitch>2000){ lastTwitch=Date.now(); for(let k=0;k<2;k++){ await p.dispatchEvent('#lureBtn','pointerdown'); await p.dispatchEvent('#lureBtn','pointerup'); await p.waitForTimeout(250); } if(!shot){ shot=true; await p.screenshot({path:SH+'jerk-work.png'}); } } await p.waitForTimeout(60); continue; }
      await p.waitForTimeout(100); }
    for(let k=0;k<40;k++){ await p.waitForTimeout(250); if(await p.evaluate(()=>!document.getElementById('cardOv').hidden)) break; if(k>8&&await p.evaluate(()=>!G.busy&&!document.getElementById('goBtn').disabled)) break; }
    if(await p.evaluate(()=>!document.getElementById('cardOv').hidden)) await p.screenshot({path:SH+bait+'-card.png'});
    return await p.evaluate(()=>(document.getElementById('cardOv').hidden?'':'CATCH CARD: '+(G.last&&G.last.sp+' '+G.last.lb+' lb'))||document.getElementById('toast').textContent); }
  for(let i=0;i<2;i++){ console.log('jerkbait, played well:', await play('jerk')); await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(1500); }
  console.log('jerkbaits left:', await p.evaluate(()=>JSON.stringify(G.s.gear.lures.jerk)));
  // a snag on the only crankbait: pull it free or lose it
  await p.evaluate(()=>{ G.bait='crank'; G.renderPanel(); }); console.log('go:',await p.evaluate(()=>({busy:G.busy,lines:G.s.lines.length,active:LURE.active,txt:document.getElementById('goBtn').textContent,bait:G.bait,baits:G.s.baits}))); await p.click('#goBtn'); await p.waitForTimeout(500);
  sql(`update lines set snag_at=now()+interval '1 second', bite_at=now()+interval '30 seconds' where pid='${pid}'`);
  await p.evaluate(()=>{ const l=G.s.lines[0]; LURE.stop(true); l.snagAt=new Date(NET.now()+1200).toISOString(); l.biteAt=new Date(NET.now()+30000).toISOString(); LURE.start(l); });
  await p.waitForTimeout(2000); const ph=await p.evaluate(()=>LURE._state().phase); await p.screenshot({path:SH+'snag.png'}); console.log('snag phase:',ph, await p.textContent('#lureBtn'));
  await p.dispatchEvent('#lureBtn','pointerdown'); await p.dispatchEvent('#lureBtn','pointerup'); await p.waitForTimeout(1500);
  console.log('after pulling:', await p.textContent('#toast'), '| crankbaits:', await p.evaluate(()=>G.lureCount('crank')), '| line gone:', sql(`select count(*) from lines where pid='${pid}'`)==='0');
  // rods and reels
  await p.evaluate(()=>UI.open('rodOv')); await p.waitForTimeout(400); await p.screenshot({path:SH+'rods.png'});
  await p.evaluate(()=>{ const li=[...document.querySelectorAll('#rodRows .row')].find(l=>/Bass casting rod/.test(l.textContent)); li.querySelector('button').click(); }); await p.waitForTimeout(900);
  await p.evaluate(()=>{ const li=[...document.querySelectorAll('#rodRows .row')].find(l=>/Spinning reel/.test(l.textContent)&&!/Saltwater/.test(l.textContent)); li.querySelector('button').click(); }); await p.waitForTimeout(900);
  await p.screenshot({path:SH+'rods-after.png'}); console.log('rod/reel:', await p.evaluate(()=>G.s.gear.rod+'/'+G.s.gear.reel), await p.evaluate(()=>document.querySelector('#rodRows .note').textContent));
  await p.evaluate(()=>{ UI.closeAll(); document.getElementById('cardOv').hidden=true; UI.open('menuOv'); }); await p.waitForTimeout(300); await p.screenshot({path:SH+'menu.png'});
  sql(`update baits set snag=0.07 where id='jerk'; update baits set snag=0.08 where id='crank'`);
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

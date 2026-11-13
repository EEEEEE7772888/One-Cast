// The topwater update in a real browser: buy a popper, walker and buzzbait, play each the right way (blow-up, WAIT, set, fight),
// set the hook too early once, and look at the new lures in the shop, the Dilbar superyacht in the dock and on the water.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_t9', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8810),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/top-';
const tap=async p=>{ await p.dispatchEvent('#lureBtn','pointerdown'); await p.dispatchEvent('#lureBtn','pointerup'); };
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.addInitScript(()=>{ try{ localStorage.setItem('onecast.appBannerClosed','1'); }catch(e){} });
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','TopwaterTester'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set coins=5000, lure_check_at=100000, prefs=prefs||'{"tut":99,"pwTip2":true}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800);
  await p.evaluate(()=>UI.open('baitOv')); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const li=[...document.querySelectorAll('#baitRows li')].find(l=>/Poppers/.test(l.textContent)); li.scrollIntoView(); }); await p.screenshot({path:SH+'shop.png'});
  for(const [nm,q] of [['Poppers',5],['Walking stickbaits',1],['Buzzbaits',1]]) { await p.evaluate(([nm,q])=>{ const li=[...document.querySelectorAll('#baitRows li')].find(l=>l.querySelector('.nm').textContent===nm); [...li.querySelectorAll('button')].find(b=>new RegExp('BUY '+q).test(b.textContent)).click(); },[nm,q]); await p.waitForTimeout(900); }
  console.log('bought:', await p.evaluate(()=>JSON.stringify({coins:G.s.coins,popper:G.lureCount('popper'),walker:G.lureCount('walker'),buzz:G.lureCount('buzz')})), '(want 5000-45-12-7=4936)');
  await p.evaluate(()=>UI.closeAll()); await p.evaluate(()=>UI.open('tackleOv')); await p.waitForTimeout(400); await p.screenshot({path:SH+'tackle.png'}); await p.evaluate(()=>UI.closeAll());
  sql(`update baits set snag=0 where id in ('popper','walker','buzz')`);
  async function play(bait,early){ await p.evaluate(b=>{ G.bait=b; G.renderPanel(); },bait); await p.waitForFunction(()=>!document.getElementById('goBtn').disabled,null,{timeout:20000}); await p.click('#goBtn'); await p.waitForTimeout(600);
    if(!(await p.isVisible('#lureBox'))) return 'lure box did not open'; let shot=false, bshot=false, fshot=false, hold=false, last=0; const t0=Date.now(), log=[];
    while(Date.now()-t0<60000){ const s=await p.evaluate(()=>({open:!document.getElementById('lureBox').hidden,btn:document.getElementById('lureBtn').textContent,msg:document.getElementById('lureMsg').textContent,st:LURE._state()})); if(!s.open) break;
      if(s.st&&s.st.phase==='blowup'){ if(!bshot){ bshot=true; log.push('blow-up: "'+s.btn+'"'); await p.screenshot({path:SH+bait+'-blowup.png'}); } if(early){ await p.waitForTimeout(300); await tap(p); early=false; log.push('tapped too early'); } if(hold){ hold=false; await p.dispatchEvent('#lureBtn','pointerup'); } await p.waitForTimeout(50); continue; }
      if(/SET IT|STRIKE/.test(s.btn)){ log.push('set on "'+s.btn+'"'); await tap(p); await p.waitForTimeout(700); continue; }
      if(s.st&&s.st.phase==='fight'){ if(!fshot&&s.st.t>1){ fshot=true; await p.screenshot({path:SH+bait+'-fight.png'}); } const f=s.st.fight, want=f.fx>f.zx+f.zw/2; if(want!==hold){ hold=want; await p.dispatchEvent('#lureBtn',hold?'pointerdown':'pointerup'); } await p.waitForTimeout(40); continue; }
      if(s.st&&s.st.phase==='work'){
        if(bait==='popper'&&Date.now()-last>1800){ last=Date.now(); await tap(p); }
        if(bait==='walker'&&Date.now()-last>500){ last=Date.now(); await tap(p); }
        if(bait==='buzz'){ const want=s.st.speed<0.8; if(want!==hold){ hold=want; await p.dispatchEvent('#lureBtn',hold?'pointerdown':'pointerup'); } }
        if(!shot&&s.st.t>(bait==='popper'?2.1:3)){ shot=true; await p.screenshot({path:SH+bait+'-work.png'}); log.push('working: "'+s.msg+'"'); }
        await p.waitForTimeout(40); continue; }
      await p.waitForTimeout(80); }
    if(hold) await p.dispatchEvent('#lureBtn','pointerup');
    for(let k=0;k<40;k++){ await p.waitForTimeout(250); if(await p.evaluate(()=>!document.getElementById('cardOv').hidden)) break; if(k>8&&await p.evaluate(()=>!G.busy&&!document.getElementById('goBtn').disabled)) break; }
    const out=await p.evaluate(()=>(document.getElementById('cardOv').hidden?'':'CATCH CARD: '+(G.last&&G.last.sp+' '+G.last.lb+' lb'))||document.getElementById('toast').textContent);
    await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(1200);
    return log.join(' | ')+' => '+out; }
  console.log('popper:', await play('popper'));
  console.log('popper, set too early:', await play('popper',true));
  console.log('walker:', await play('walker'));
  console.log('buzzbait:', await play('buzz'));
  sql(`update baits set snag=0.02 where id in ('popper','walker'); update baits set snag=0.03 where id='buzz'`);
  // the superyacht
  sql(`update players set coins=800000000 where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(700);
  await p.evaluate(()=>UI.open('dockOv')); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const r=[...document.querySelectorAll('.dock-row')].find(l=>/DILBAR/.test(l.textContent)); r.scrollIntoView(); }); await p.screenshot({path:SH+'dock.png'});
  await p.evaluate(()=>{ const r=[...document.querySelectorAll('.dock-row')].find(l=>/DILBAR/.test(l.textContent)); r.querySelector('button').click(); }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='BUY IT'&&b.offsetParent); b.click(); }); await p.waitForTimeout(1200);
  console.log('superyacht:', await p.evaluate(()=>JSON.stringify({boat:G.s.gear.boat,coins:G.s.coins})));
  await p.evaluate(()=>UI.closeAll()); sql(`update players set regions=array_append(regions,'australia'), spot='gbr' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1500);
  await p.screenshot({path:SH+'yacht-water.png'});
  await p.evaluate(()=>UI.open('mapOv')); await p.waitForTimeout(800); await p.screenshot({path:SH+'map.png'});
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

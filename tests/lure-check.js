// Plays the crankbait well (keeps speed in the green, taps on the strike), then badly; then the jig well.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d qa'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8803',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Lurer'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set coins=0, baits=baits||'{crank,jig}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800);
  async function play(bait,good){
    await p.evaluate(b=>{ G.bait=b; G.renderPanel(); },bait); await p.click('#goBtn'); await p.waitForTimeout(600);
    if(!(await p.isVisible('#lureBox'))) return 'lure box did not open';
    if(bait==='crank') await p.screenshot({path:'/tmp/lure-crank.png'});
    const t0=Date.now(); let hold=false;
    while(Date.now()-t0<35000){
      const s=await p.evaluate(()=>({open:!document.getElementById('lureBox').hidden,btn:document.getElementById('lureBtn').textContent,v:LURE.active?document.getElementById('lureBtn').className:''}));
      if(!s.open) break;
      if(/STRIKE/.test(s.btn)){ if(bait==='crank') await p.screenshot({path:'/tmp/lure-strike.png'}); if(good){ await p.dispatchEvent('#lureBtn','pointerdown'); await p.waitForTimeout(3200); } else await p.waitForTimeout(1500); continue; }
      if(bait==='crank'){ const v=await p.evaluate(()=>{ const c=document.getElementById('lureCanvas'); return window.__v||0; });
        // keep speed near 0.55 for the good run by pulsing; mash the button (too fast) for the bad run
        if(good){ const sp=(await p.evaluate(()=>LURE._state()))||{speed:0}; const want=sp.speed<0.55; if(want!==hold){ hold=want; await p.dispatchEvent('#lureBtn',hold?'pointerdown':'pointerup'); } await p.waitForTimeout(80); }
        else { await p.dispatchEvent('#lureBtn','pointerdown'); await p.waitForTimeout(300); }
      } else { if(good){ await p.dispatchEvent('#lureBtn','pointerdown'); await p.dispatchEvent('#lureBtn','pointerup'); await p.waitForTimeout(1300); } else { await p.waitForTimeout(500); } }
    }
    await p.waitForTimeout(800);
    return await p.evaluate(()=>({toastOrCard:(document.getElementById('cardOv').hidden?'':'CATCH CARD: '+(G.last&&G.last.sp+' '+G.last.lb+' lb'))||document.getElementById('toast').textContent, coins:G.s.coins}));
  }
  console.log('crank, played well:', JSON.stringify(await play('crank',true)));
  await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(1500);
  console.log('crank, reeled way too fast:', JSON.stringify(await play('crank',false)));
  await p.waitForTimeout(1500);
  console.log('jig, hopped well:', JSON.stringify(await play('jig',true)));
  console.log('lines left on server:', sql(`select count(*) from lines where pid='${pid}'`), '| errors:', errs.length?errs:'none'); await br.close(); })();

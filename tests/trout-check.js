/* Browser check: the Davidson River scene at four times of day, then a dry-fly drift (mend, rise, set). Needs mock-server on 8799 (OC_DB=devt2). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt2'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch(); const mode=process.argv[2]||'scenes';
  async function open(dev,vp,mob,time){ const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('['+dev+'] PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    if(time) await p.clock.install({time:new Date(time)});
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Trout'+Math.floor(Math.random()*999)); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set prefs=prefs||'{"tut":99,"pwTip2":1}', spot='davidson', baits='{worm,fly}' where pid='${pid}'`);
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800); await p.evaluate(()=>{ UI.closeAll(); SCENE.layout(); }); await p.waitForTimeout(1200); return {ctx,p,pid}; }
  if(mode==='scenes'){
    for(const [dev,vp,mob,time] of [['pc-day',{width:1366,height:768},false,'2026-10-27T15:00:00Z'],['pc-dawn',{width:1366,height:768},false,'2026-10-27T10:50:00Z'],['pc-dusk',{width:1366,height:768},false,'2026-10-27T22:20:00Z'],['phone-night',{width:390,height:844},true,'2026-10-28T02:00:00Z']]){
      const {ctx,p}=await open(dev,vp,mob,time); await p.evaluate(()=>{ document.body.classList.add('cine'); }); await p.addStyleTag({content:'body.cine .hud,body.cine .panel,body.cine .center,#tipBox,#coach,.toast{visibility:hidden!important}'}); await p.waitForTimeout(600);
      await p.screenshot({path:OUT+dev+'-trout.png'}); await ctx.close(); }
  } else {
    const {ctx,p,pid}=await open('fly',{width:390,height:844},true,null);
    await p.evaluate(()=>{ G.bait='fly'; G.renderPanel(); document.getElementById('goBtn').click(); }); await p.waitForTimeout(1500);
    console.log('fly box open: '+await p.isVisible('#lureBox')+', button: '+await p.textContent('#lureBtn'));
    await p.waitForTimeout(6000); console.log('drag after 6s: '+(await p.evaluate(()=>LURE._state().drag)));
    await p.screenshot({path:OUT+'phone-fly-drift.png'});
    await p.click('#lureBtn'); await p.waitForTimeout(300); console.log('after MEND: '+(await p.evaluate(()=>LURE._state().drag)));
    const f0=+sql(`select count(*) from fish where pid='${pid}'`); let shot=false;
    for(let i=0;i<300;i++){ const s=await p.evaluate(()=>LURE.active?LURE._state():null); if(!s) break;
      if(s.phase==='work'&&s.drag>0.55) await p.click('#lureBtn');
      if(s.phase==='strike'){ if(!shot){ shot=true; await p.screenshot({path:OUT+'phone-fly-rise.png'}); } await p.waitForTimeout(400); await p.click('#lureBtn'); }
      await p.waitForTimeout(100); }
    await p.waitForTimeout(3000); console.log('trout caught: '+(+sql(`select count(*) from fish where pid='${pid}'`)-f0)+' ('+sql(`select species||' '||lb from fish where pid='${pid}' order by id desc limit 1`)+')');
    await p.screenshot({path:OUT+'phone-fly-catch.png'}); await ctx.close(); }
  await br.close(); })();

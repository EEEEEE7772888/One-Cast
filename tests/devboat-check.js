/* Browser check: the Dev Flagship with a full crew in the Arctic, on PC and phone. Needs mock-server on 8799 with OC_DB=devb. */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');const crypto=require('crypto');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devb'],{input:q,encoding:'utf8'}).trim();
const rpc=(fn,a)=>sql(`set role anon; select ${fn}(${a});`);
const B='http://localhost:8799',Q='/?server='+B+'&key=test',OUT='/home/claude/one-cast/tests/out/dev/';
(async()=>{ const br=await chromium.launch();
  for(const [dev,vp,mob] of [['pc',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
    const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('['+dev+'] PAGE ERROR '+e.message));
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','EliDev'+dev); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const pid=await p.evaluate(()=>G.s.pid), sec=sql(`select secret from players where pid='${pid}'`);
    sql(`update players set stats=stats||'{"catches":30}', prefs=prefs||'{"tut":99,"pwTip2":1}', regions=regions||'{arctic}'::text[], spot='arcticdeep' where pid='${pid}'`);
    rpc('admin_player',`'oc-admin-testkey','${pid}','giveboat','devboat'`);
    const outfits=['hat_captain','hat_straw','hat_cap','hat_bucket','hat_trapper','hat_red'];
    for(let i=0;i<12;i++){ const g=crypto.randomUUID(), s=crypto.randomBytes(15).toString('hex'); rpc('login',`'${g}','${s}','Mate${i+1}'`);
      const [x,y]=[pid,g].sort(); sql(`insert into friends (a,b,status,requested_by) values ('${x}','${y}','accepted','${x}'); update players set outfit=outfit||'{"hat":"${outfits[i%6]}"}' where pid='${g}'`);
      rpc('crew_invite',`'${pid}','${sec}','${g}'`); rpc('crew_respond',`'${g}','${s}','${pid}',true`);
      if(i%3===0){ sql(`update players set baits=baits||'{deepbait}'::text[] where pid='${g}'`); rpc('cast_line',`'${g}','${s}',0,'deepbait'`); } }
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(500); await p.evaluate(()=>{ SCENE.layout(); }); await p.waitForTimeout(2500);
    await p.screenshot({path:OUT+dev+'-arctic.png'});
    console.log('['+dev+'] boat: '+await p.evaluate(()=>G.boatId())+', crew: '+await p.evaluate(()=>G.s.crew.members.length-1)+'/'+await p.evaluate(()=>G.s.crew.cap));
    await p.evaluate(()=>UI.open('dockOv')); await p.waitForTimeout(800); await p.screenshot({path:OUT+dev+'-dock.png'}); await p.evaluate(()=>UI.closeAll());
    await p.evaluate(()=>UI.open('friendsOv')); await p.waitForTimeout(800); await p.screenshot({path:OUT+dev+'-crew.png'}); await p.evaluate(()=>UI.closeAll());
    rpc('crew_leave',`'${pid}','${sec}'`);
    await ctx.close();
  } await br.close(); })();

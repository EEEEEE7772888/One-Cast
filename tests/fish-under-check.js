/* Browser check: background fish never poke above the surface (big fish, every method, after a resize). Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('PAGE ERROR '+e.message));
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Flyfish'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid);
  sql(`update players set regions='{home,northwoods,greatlakes,mississippi,everglades,keys,pnw,pacific,amazon,africa,eurasia,australia,arctic,southern}', prefs=prefs||'{"tut":99,"pwTip2":1}', gear=jsonb_set(gear,'{boats}','["paddle","kayak","skiff","bassboat","console","sportfisher","trawler","yacht"]') where pid='${pid}'`);
  let bad=0, seen=0;
  for(const [spot,boat] of [['arcticdeep','trawler'],['kona','sportfisher'],['mississippi','kayak'],['hatteras','paddle'],['greenland','paddle']]){
    sql(`update players set spot='${spot}', gear=jsonb_set(gear,'{boat}','"${boat}"') where pid='${pid}'`); await p.evaluate(()=>G.refresh(true).then(()=>{ UI.closeAll(); SCENE.layout(); }));
    for(const vp of [{width:390,height:844},{width:844,height:390},{width:1366,height:768}]){
      await p.setViewportSize(vp); await p.waitForTimeout(250);
      for(let k=0;k<20;k++){ const fs=await p.evaluate(()=>SCENE._fishCheck()); fs.forEach(f=>{ seen++; if(f.top<=f.wt) bad++; }); await p.waitForTimeout(150); }
    }
  }
  console.log('fish checked: '+seen+', above the water: '+bad);
  await br.close(); })();

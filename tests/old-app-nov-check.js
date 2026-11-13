// The iPhone app 1.1 (an older copy of the game, served from OC_ROOT) against the November update's server:
// a player who owns the new lures and the superyacht, standing at a new spot, with new-lure fish in the bucket.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_t9', SPOT=process.env.SPOT||'erie', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8841),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','OldApp'+Date.now()%1000); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const pid=await p.evaluate(()=>G.s.pid); console.log('logged in:', !!pid);
  sql(`update players set coins=100000, regions=array_append(regions,'greatlakes'), spot='${SPOT}', baits=baits||'{minnow,popper,walker}',
         gear=jsonb_set(jsonb_set(jsonb_set(gear,'{lures}','{"popper":{"n":3,"left":20},"walker":{"n":1,"left":5}}'),'{boats}','["paddle","kayak","superyacht"]'),'{boat}','"superyacht"'),
         prefs=prefs||'{"tut":99}' where pid='${pid}';
       insert into fish (pid,species,lb,inches,bait,spot,period,caught_by) values ('${pid}','walleye',6,24,'popper','erie','day','${pid}'),('${pid}','largemouth',5,20,'walker','toledobend','dusk','${pid}');`);
  await p.evaluate(()=>G.refresh(true)).catch(e=>console.log('refresh error',e.message)); await p.waitForTimeout(2000);
  console.log('errors after loading at a new spot on the superyacht:', errs.length?errs:'none');
  for(const ov of ['tackleOv','baitOv','bucketOv','dockOv','mapOv','menuOv','profileOv','rodOv']){ const n=errs.length; await p.evaluate(o=>{ try{ UI.closeAll(); UI.open(o); }catch(e){ throw e; } },ov).catch(e=>errs.push(ov+': '+e.message)); await p.waitForTimeout(600); console.log(ov, errs.length>n?'ERROR '+errs.slice(n).join(' / '):'ok'); }
  await p.evaluate(()=>UI.closeAll()).catch(e=>errs.push('closeAll: '+e.message));
  // fish with a bait the old app knows, at the new spot
  await p.evaluate(()=>{ G.bait='minnow'; G.renderPanel(); }); await p.click('#goBtn').catch(()=>{}); await p.waitForTimeout(800);
  sql(`update lines set bite_at=now()-interval '1 second', species='walleye', lb=3, inches=18, snap=false, legend_roll=0.99, wait_mins=null where pid='${pid}'`);
  await p.evaluate(()=>G.reel()).catch(e=>console.log('reel error',e.message)); await p.waitForTimeout(5000);
  console.log('catch at a new spot works in the old app:', await p.evaluate(()=>!document.getElementById('cardOv').hidden));
  // a popper line cast from the website, seen by the old app
  await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(800);
  sql(`insert into lines (pid,idx,spot,bait,cast_at,bite_at,species,lb,inches,snap,legend_roll) values ('${pid}',0,'erie','popper',now()-interval '10 minutes',now()+interval '20 seconds','walleye',2,15,false,0.99) on conflict do nothing`);
  await p.evaluate(()=>G.refresh(true)).catch(e=>errs.push('refresh: '+e.message)); await p.waitForTimeout(1500);
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

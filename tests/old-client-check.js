// Plays an older copy of the game (served from OC_ROOT) against today's server: login, catch new fish, open every window, buy lures.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_a1', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8840),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','OldApp'+Date.now()%1000); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const pid=await p.evaluate(()=>G.s.pid); console.log('logged in:', !!pid);
  sql(`update players set coins=100000, spot='basslake', baits=baits||'{minnow,cut}', prefs=prefs||'{"tut":99}' where pid='${pid}'`);
  // a new fish the old app has never heard of, kept in the bucket, plus some in the world news
  sql(`insert into fish (pid,species,lb,inches,bait,spot,period,caught_by) values ('${pid}','pinfish',0.8,7,'shrimp','hatteras','day','${pid}'),('${pid}','sheepshead',6,15,'shrimp','hatteras','day','${pid}'),('${pid}','megalodon',62000,590,'deepbait','mariana','night','${pid}');
       update players set journal = journal || '{"pinfish":{"n":1,"best":0.8},"sheepshead":{"n":1,"best":6}}' where pid='${pid}'`);
  await p.evaluate(()=>G.refresh(true)).catch(e=>console.log('refresh error',e.message)); await p.waitForTimeout(1500);
  const errsBefore=errs.length;
  // catch a fish the old app does not know
  await p.evaluate(()=>{ G.bait='minnow'; G.renderPanel(); }); await p.click('#goBtn').catch(()=>{}); await p.waitForTimeout(800);
  sql(`update lines set bite_at=now()-interval '1 second', species='pinfish', lb=1, inches=8, snap=false, legend_roll=0.99, wait_mins=null where pid='${pid}'`);
  await p.evaluate(()=>G.reel()).catch(e=>console.log('reel error',e.message)); await p.waitForTimeout(6000);
  console.log('catch card for a new fish shows:', await p.evaluate(()=>!document.getElementById('cardOv').hidden), '| toast:', await p.textContent('#toast').catch(()=>''));
  await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(800);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('.overlay')].map(o=>o.id).filter(Boolean));
  const broke=[]; for(const id of ids){ const n=errs.length; await p.evaluate(id=>{ try{ UI.closeAll(); UI.open(id); }catch(e){ throw e; } },id).catch(e=>broke.push(id+': '+e.message)); await p.waitForTimeout(500); if(errs.length>n) broke.push(id+': '+errs.slice(n).join(' / ')); }
  console.log('windows opened:', ids.length, '| broken:', broke.length?broke:'none');
  // buying a crankbait the old way
  const b=await p.evaluate(()=>NET.me('buy',{p_kind:'bait',p_id:'crank'}).then(r=>'ok '+JSON.stringify(r.gear&&r.gear.lures)).catch(e=>'error: '+e.message)); console.log('old crankbait button:', b);
  console.log('page errors:', errs.length?[...new Set(errs)].slice(0,8):'none'); await br.close(); })();

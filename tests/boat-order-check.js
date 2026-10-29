// Every boat in the dock can be bought straight away, without the cheaper ones first.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_b1', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8816),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Jumper'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const pid=await p.evaluate(()=>G.s.pid); sql(`update players set coins=100000 where pid='${pid}'`); await p.evaluate(()=>{ try{ localStorage.setItem('onecast.seenHalloween2026','1'); }catch(e){} UI.closeAll(); return G.refresh(true); }); await p.waitForTimeout(600);
  await p.evaluate(()=>UI.open('dockOv')); await p.waitForTimeout(400);
  console.log('boats with a BUY button:', await p.$$eval('.dock-row.locked',r=>r.filter(x=>x.querySelector('button')).length), 'of', await p.$$eval('.dock-row.locked',r=>r.length));
  await p.evaluate(()=>{ const row=[...document.querySelectorAll('.dock-row')].find(r=>/CENTER CONSOLE/.test(r.textContent)); row.querySelector('button').click(); }); await p.waitForTimeout(400); await p.click('#cfYes'); await p.waitForTimeout(1200);
  console.log('bought the center console first:', await p.evaluate(()=>G.s.gear.boats.join(',')+' | out: '+G.s.gear.boat));
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

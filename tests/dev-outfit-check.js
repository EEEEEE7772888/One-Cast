// The Dev outfit: the admin gives it, it shows in the clothes shop marked 1 OF 1, and the angler glows in the scene.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_v1', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8815),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/dev-';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','TheDev'); await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
  const pid=await p.evaluate(()=>G.s.pid); try{ await p.evaluate(()=>{ localStorage.setItem('onecast.seenHalloween2026','1'); UI.closeAll(); G.prefs({tut:99}); }); }catch(e){}
  for(const id of ['hat_dev','coat_dev','pants_dev','boots_dev']) sql(`select admin_player('oc-admin-testkey','${pid}','giveitem','${id}')`);
  await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(700);
  await p.evaluate(()=>UI.open('shopOv')); await p.waitForTimeout(400);
  console.log('dev items in shop:', await p.$$eval('#shopItems .item',b=>b.filter(x=>/1 OF 1/.test(x.textContent)).map(x=>x.textContent).join(' | ')));
  sql(`update players set outfit='{"hat":"hat_dev","coat":"coat_dev","pants":"pants_dev","boots":"boots_dev","skin":"skin_1"}' where pid='${pid}'`);
  await p.evaluate(()=>{ UI.closeAll(); return G.refresh(true); }); await p.waitForTimeout(700); await p.evaluate(()=>UI.open('shopOv')); await p.waitForTimeout(400); await p.screenshot({path:SH+'shop.png'});
  await p.evaluate(()=>UI.closeAll()); await p.evaluate(()=>{ G.hourAt=function(){ return 21; }; }); await p.waitForTimeout(1200); await p.screenshot({path:SH+'scene.png'});
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

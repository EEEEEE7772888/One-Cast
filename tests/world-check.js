// New spots: map pins, their scenes, and the Megalodon on the legends page.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_w1', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8819),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/world-';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Globetrot'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const pid=await p.evaluate(()=>G.s.pid); await p.evaluate(()=>{ window.__hourAt=G.hourAt; });
  sql(`update players set regions='{home,northwoods,greatlakes,mississippi,everglades,keys,pnw,pacific,amazon,africa,eurasia,australia,arctic,southern}', coins=10000000, prefs=prefs||'{"tut":99}', gear=jsonb_set(jsonb_set(jsonb_set(gear,'{boats}','["paddle","kayak","skiff","bassboat","console","sportfisher","trawler"]'),'{boat}','"trawler"'),'{methods}','["deeprig"]') where pid='${pid}'`);
  await p.evaluate(()=>{ try{ localStorage.setItem('onecast.seenHalloween2026','1'); }catch(e){} UI.closeAll(); return G.refresh(true); }); await p.waitForTimeout(800);
  for(const id of ['mariana','baikal','kaveri','tokyobay','lofoten','congo','nasser','danube']){
    await p.evaluate(id=>{ G.s.spot=id; G.apply(G.s); window.SCENE.layout(); G.hourAt=function(){ return id==='mariana'?23:id==='nasser'?18.3:12; }; },id); await p.waitForTimeout(900);
    await p.screenshot({path:SH+id+'.png'}); }
  await p.evaluate(()=>{ G.hourAt=window.__hourAt; });
  await p.evaluate(()=>UI.open('legendOv')); await p.waitForTimeout(1500); 
  console.log('megalodon card:', await p.evaluate(()=>{ const cards=[...document.querySelectorAll('#legendBody > *, #legendOv .legend, #legendOv [class*=leg]')]; const c=cards.find(x=>/Megalodon/.test(x.textContent)&&x.textContent.length<900); if(!c) return 'missing ('+cards.length+' cards)'; c.scrollIntoView({block:'start'}); return c.textContent.slice(0,160); })); await p.waitForTimeout(400); await p.screenshot({path:SH+'legend.png'});
  await p.setViewportSize({width:1100,height:700}); await p.evaluate(()=>{ UI.closeAll(); UI.open('mapOv'); }); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#mapOv button')].find(x=>/WORLD/.test(x.textContent)); if(b) b.click(); }); await p.waitForTimeout(1200); await p.screenshot({path:SH+'map.png'});
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

// Halloween, boat paint, fish tank and admin numbers in a browser.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_h2', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8813),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/hw-';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Spooky'); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
  console.log('event page opened by itself:', await p.isVisible('#eventOv'), '| halloween theme:', await p.evaluate(()=>document.body.classList.contains('halloween')));
  await p.screenshot({path:SH+'event.png'});
  const pid=await p.evaluate(()=>G.s.pid);
  // give fish for the tank (one of each kind), coins and a boat
  sql(`update players set coins=50000, gear=jsonb_set(jsonb_set(gear,'{boats}','["paddle","kayak","skiff","bassboat"]'),'{boat}','"bassboat"'), prefs=prefs||'{"tut":99}' where pid='${pid}';
       insert into fish (pid,species,lb,inches,bait,spot,period,caught_by) values ('${pid}','largemouth',9.5,22,'minnow','basslake','day','${pid}'),('${pid}','bluegill',1.2,8,'worm','basslake','day','${pid}'),('${pid}','ghostcarp',30,38,'worm','basslake','night','${pid}'),('${pid}','pumpkinbass',8,20,'jerk','basslake','dusk','${pid}'),('${pid}','rainbow',6,22,'fly','davidson','day','${pid}'),('${pid}','channel',20,34,'cut','basslake','night','${pid}'),('${pid}','crappie',2,12,'minnow','basslake','dusk','${pid}');
       update players set journal = journal || '{"ghostcarp":{"n":1,"best":30}}' where pid='${pid}'`);
  await p.evaluate(()=>{ UI.closeAll(); return G.refresh(true); }); await p.waitForTimeout(800);
  // night at the spot for the spooky scene
  await p.evaluate(()=>{ G.hourAt=function(){ return 22; }; }); await p.waitForTimeout(1200); await p.screenshot({path:SH+'night.png'});
  await p.evaluate(()=>{ G.hourAt=function(){ return 18.2; }; }); await p.waitForTimeout(900); await p.screenshot({path:SH+'dusk.png'});
  // costumes
  await p.evaluate(()=>UI.open('shopOv')); await p.waitForTimeout(500); await p.screenshot({path:SH+'shop.png'});
  console.log('event hats in shop:', await p.$$eval('#shopItems .item.event',b=>b.map(x=>x.textContent).join(' | ')));
  // paint: pick haunted purple and buy
  await p.evaluate(()=>UI.open('dockOv')); await p.waitForTimeout(400);
  await p.evaluate(()=>[...document.querySelectorAll('.paint-sw .sw')].find(b=>/Haunted/.test(b.textContent)).click()); await p.waitForTimeout(300);
  await p.screenshot({path:SH+'paint-preview.png'});
  await p.evaluate(()=>[...document.querySelectorAll('.paint-box button')].find(b=>/BUY AND PAINT/.test(b.textContent)).click()); await p.waitForTimeout(1200);
  console.log('paint now:', await p.evaluate(()=>G.s.outfit.paint), '| toast:', await p.textContent('#toast'));
  await p.evaluate(()=>UI.closeAll()); await p.waitForTimeout(900); await p.screenshot({path:SH+'boat-painted.png'});
  // fish tank on own profile
  await p.click('#profBtn'); await p.waitForTimeout(1200);
  await p.evaluate(()=>document.querySelector('.tank').scrollIntoView()); await p.waitForTimeout(1500); await p.screenshot({path:SH+'tank.png'});
  const box=await p.$('.tank-cv'); const bb=await box.boundingBox();
  console.log('tank fish:', JSON.stringify(await p.evaluate(()=>UI._tank())));
  // menu entry
  await p.evaluate(()=>{ UI.closeAll(); UI.open('menuOv'); }); await p.waitForTimeout(300); console.log('menu first item:', await p.$eval('#menuList .mbtn',b=>b.textContent));
  // derby name
  await p.evaluate(()=>UI.open('derbyOv')); await p.waitForTimeout(1200); console.log('derby title:', await p.textContent('.derby-sp'));
  // admin page numbers
  const a=await br.newPage({viewport:{width:900,height:1300}}); a.on('pageerror',e=>errs.push('admin: '+e.message)); await a.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await a.goto(B+'/admin.html?server='+B+'&key=test'); await a.fill('#key','oc-admin-testkey'); await a.click('#go'); await a.waitForTimeout(2000); await a.locator('#numbers').screenshot({path:SH+'admin.png'});
  console.log('admin numbers:', (await a.textContent('#numbers')).slice(0,160));
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

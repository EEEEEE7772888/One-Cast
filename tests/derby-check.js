// The weekend derby in a browser: the page (rules, how to catch, board), the HUD chip, and a catch that enters.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_d2', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:'+(process.env.PORT||8812),Q='/?server='+B+'&key=test', SH='/tmp/claude-0/derby-';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  // upcoming first
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','DerbyFan'); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
  const pid=await p.evaluate(()=>G.s.pid); await p.evaluate(()=>G.prefs({tut:99}));
  await p.evaluate(()=>UI.open('derbyOv')); await p.waitForTimeout(1200); await p.screenshot({path:SH+'upcoming.png',fullPage:false});
  console.log('upcoming:', (await p.textContent('.derby-when')), '| chip:', await p.isVisible('#derbyChip'));
  // make it live with largemouth and two rivals
  const key=JSON.parse(sql(`select get_derby(null)`)).key;
  sql(`update derbies set species='largemouth', starts_at=now()-interval '2 hours', ends_at=now()+interval '20 hours' where key='${key}'`);
  for(const [n,lb] of [['BassBoss',9.25],['LunkerLuke',6.5]]){ const id=require('crypto').randomUUID(); sql(`select login('${id}','${'h'.repeat(30)}','${n}'); insert into derby_entries (derby,pid,lb) values ('${key}','${id}',${lb})`); }
  await p.evaluate(()=>{ UI.closeAll(); return UI.loadDerby(true); }); await p.waitForTimeout(500);
  console.log('live chip:', await p.isVisible('#derbyChip'), await p.textContent('#derbyChip'));
  await p.screenshot({path:SH+'hud.png'});
  // catch a 7 lb largemouth
  sql(`update players set baits=baits||'{minnow}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(600);
  await p.evaluate(()=>{ G.bait='minnow'; G.renderPanel(); }); await p.click('#goBtn'); await p.waitForTimeout(700);
  sql(`update lines set bite_at=now()-interval '1 second', species='largemouth', lb=7, inches=19, snap=false, legend_roll=0.99 where pid='${pid}'`);
  await p.evaluate(()=>G.reel()); await p.waitForTimeout(6000);
  console.log('toast:', await p.textContent('#toast'));
  await p.evaluate(()=>{ const k=[...document.querySelectorAll('#cardOv button')].find(b=>/KEEP/.test(b.textContent)); if(k) k.click(); }); await p.waitForTimeout(800);
  await p.evaluate(()=>UI.open('derbyOv')); await p.waitForTimeout(1200); await p.screenshot({path:SH+'live.png'});
  console.log('me:', await p.textContent('.derby-me'), '| board:', await p.$$eval('.derby-board li',l=>l.map(x=>x.textContent).join(' / ')));
  await p.evaluate(()=>document.querySelector('#derbyOv .dialog').scrollTop=99999); await p.waitForTimeout(300); await p.screenshot({path:SH+'rules.png'});
  const w=await p.evaluate(()=>{ const d=document.querySelector('#derbyOv .dialog'); return d.scrollWidth<=d.clientWidth; }); console.log('fits the phone:', w);
  await p.evaluate(()=>{ UI.closeAll(); UI.open('menuOv'); }); await p.waitForTimeout(300); console.log('menu item:', await p.$$eval('#menuList .mbtn',b=>b.map(x=>x.textContent).filter(t=>/DERBY/.test(t)).join('')));
  await p.evaluate(()=>document.querySelector('#menuOv [data-close]').click()); await p.evaluate(()=>UI.open('derbyOv')); await p.evaluate(()=>document.querySelector('#derbyOv [data-close]').click()); console.log('X closes derby:', await p.evaluate(()=>document.getElementById('derbyOv').hidden));
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

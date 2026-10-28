/* Browser check: two players trade end to end through the real screens (fish one way, coins the other). Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt2'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8799',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch();
  async function player(name,vp,mob){ const ctx=await br.newContext({viewport:vp,isMobile:mob,hasTouch:mob}); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('['+name+'] PAGE ERROR '+e.message)); p.on('dialog',d=>d.accept());
    await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn',name); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const pid=await p.evaluate(()=>G.s.pid); sql(`update players set prefs=prefs||'{"tut":99,"pwTip2":1}', coins=5000 where pid='${pid}'`); return {p,pid,name}; }
  const A=await player('Trader'+Date.now()%1000,{width:1366,height:768},false), Bp=await player('Swapper'+Date.now()%1000,{width:390,height:844},true);
  const [x,y]=[A.pid,Bp.pid].sort(); sql(`insert into friends (a,b,status,requested_by) values ('${x}','${y}','accepted','${x}')`);
  sql(`insert into fish (pid,species,lb,inches,spot,bait,caught_at) values ('${Bp.pid}','largemouth',6.5,20,'basslake','minnow',now()-interval '2 days')`);
  const fishId=sql(`select id from fish where pid='${Bp.pid}'`);
  for(const P of [A,Bp]){ await P.p.evaluate(()=>G.refresh(true)); await P.p.waitForTimeout(800); await P.p.evaluate(()=>UI.closeAll()); }
  const step=async(msg,fn)=>{ try{ await fn(); console.log('ok   '+msg); }catch(e){ console.log('FAIL '+msg+': '+e.message.split('\n')[0]); } };
  // A opens the trade from Friends and offers 1,000 coins
  await step('A opens a trade from Friends',async()=>{ await A.p.evaluate(()=>UI.open('friendsOv')); await A.p.waitForTimeout(500); await A.p.click('#friendList button:has-text("TRADE")'); await A.p.waitForSelector('#tradeOv:not([hidden])',{timeout:4000}); });
  await step('A offers 1,000 coins',async()=>{ await A.p.click('#tradeEdit'); await A.p.fill('#tradeCoins','1000'); await A.p.click('#tradePickDone'); await A.p.waitForTimeout(800); if(!(await A.p.textContent('#sideMe')).includes('1,000')) throw new Error('offer not shown: '+await A.p.textContent('#sideMe')); });
  // B finds the trade and offers the bass
  await step('B sees the open trade in Friends',async()=>{ await Bp.p.evaluate(()=>G.refresh(true)); await Bp.p.waitForTimeout(800); await Bp.p.evaluate(()=>UI.open('friendsOv')); await Bp.p.waitForTimeout(500); await Bp.p.click('#openTrades .spot-row',{timeout:4000}); await Bp.p.waitForSelector('#tradeOv:not([hidden])',{timeout:4000}); });
  await step('B sees A\'s coins',async()=>{ if(!(await Bp.p.textContent('#sideThem')).includes('1,000')) throw new Error(await Bp.p.textContent('#sideThem')); });
  await step('B offers the bass',async()=>{ await Bp.p.click('#tradeEdit'); await Bp.p.waitForTimeout(300); await Bp.p.click('#tradeFishGrid .card'); await Bp.p.click('#tradePickDone'); await Bp.p.waitForTimeout(800); if(!(await Bp.p.textContent('#sideMe')).toLowerCase().includes('bass')) throw new Error(await Bp.p.textContent('#sideMe')); });
  await step('A sees the bass (poll)',async()=>{ await A.p.waitForFunction(()=>document.getElementById('sideThem').textContent.toLowerCase().includes('bass'),null,{timeout:8000}); });
  await step('both press READY',async()=>{ await A.p.click('#tradeReady'); await A.p.waitForTimeout(500); await Bp.p.click('#tradeReady'); await Bp.p.waitForTimeout(500); });
  await step('A can CONFIRM once both ready',async()=>{ await A.p.waitForFunction(()=>!document.getElementById('tradeConfirm').disabled,null,{timeout:8000}); await A.p.click('#tradeConfirm'); await A.p.waitForTimeout(800); });
  await step('B can CONFIRM',async()=>{ await Bp.p.waitForFunction(()=>!document.getElementById('tradeConfirm').disabled,null,{timeout:8000}); await Bp.p.click('#tradeConfirm'); await Bp.p.waitForTimeout(1500); });
  console.log('server: fish owner is A: '+(sql(`select pid from fish where id=${fishId}`)===A.pid)+', A coins '+sql(`select coins from players where pid='${A.pid}'`)+', B coins '+sql(`select coins from players where pid='${Bp.pid}'`)+', trade '+sql(`select status from trades order by id desc limit 1`));
  await step('A sees "Trade complete" and the fish in the bucket',async()=>{ await A.p.waitForFunction(()=>G.s.fish.some(f=>f.sp==='largemouth'),null,{timeout:8000}); });
  await br.close(); })();

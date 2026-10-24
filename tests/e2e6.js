const { chromium } = require('playwright');
const {execFileSync}=require('child_process');
function sql(q){ return execFileSync('su',['postgres','-c','psql -X -At -d onecast'],{input:q,encoding:'utf8'}).trim(); }
(async()=>{
  const b=await chromium.launch(); const errs=[];
  async function mk(name){ const c=await b.newContext({viewport:{width:1000,height:820}}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(name+': '+e.message)); await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(600); await p.fill('#nameIn',name); await p.click('#nameGo'); await p.waitForTimeout(1200); await p.evaluate(()=>G.prefs({tut:9})); return p; }
  const A=await mk('Alice'), B=await mk('Bobby');
  const tagB=await B.evaluate(()=>G.s.tag), pidA=await A.evaluate(()=>G.s.pid), pidB=await B.evaluate(()=>G.s.pid);
  // give both a fish
  for(const [p,pid] of [[A,pidA],[B,pidB]]){ await p.click('#goBtn'); await p.waitForTimeout(500); sql(`update lines set cast_at=now()-interval '3 minutes', bite_at=now()-interval '5 seconds' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800); await p.click('#goBtn'); await p.waitForTimeout(3600); await p.click('#cardOv .go.alt'); await p.waitForTimeout(400); }
  sql(`update players set coins=5000 where pid in ('${pidA}','${pidB}')`);
  // friend request from A
  await A.evaluate(()=>UI.open('friendsOv')); await A.fill('#frName','Bobby'); await A.fill('#frTag',tagB); await A.click('#frAdd'); await A.waitForTimeout(900);
  await B.evaluate(()=>G.refresh(true)); await B.waitForTimeout(600); await B.evaluate(()=>UI.open('friendsOv')); await B.waitForTimeout(400); await B.screenshot({path:'tests/out/t-friends.png'});
  await B.click('.friend .pbtn.gold'); await B.waitForTimeout(900); // ACCEPT
  await B.evaluate(()=>UI.open('friendsOv')); await B.waitForTimeout(300);
  await B.click('.friend .pbtn.gold'); await B.waitForTimeout(900); // TRADE
  await A.evaluate(()=>G.refresh(true)); await A.waitForTimeout(600); await A.evaluate(()=>UI.open('friendsOv')); await A.waitForTimeout(300); await A.click('#openTrades .spot-row'); await A.waitForTimeout(800);
  // B offers fish + coins
  await B.click('#tradeEdit'); await B.waitForTimeout(300); await B.click('#tradeFishGrid .card'); await B.fill('#tradeCoins','250'); await B.click('#tradePickDone'); await B.waitForTimeout(800);
  await A.click('#tradeEdit'); await A.waitForTimeout(300); await A.click('#tradeFishGrid .card'); await A.click('#tradePickDone'); await A.waitForTimeout(800);
  await A.click('#tradeReady'); await B.waitForTimeout(600); await B.click('#tradeReady'); await A.waitForTimeout(3500); await A.screenshot({path:'tests/out/t-ready.png'});
  await A.click('#tradeConfirm'); await A.waitForTimeout(800); await B.waitForTimeout(3500); await B.click('#tradeConfirm'); await B.waitForTimeout(1200); await B.screenshot({path:'tests/out/t-done.png'});
  const coinsA=await A.evaluate(()=>G.refresh(true).then(()=>G.s.coins)), coinsB=await B.evaluate(()=>G.s.coins);
  console.log('coins',coinsA,coinsB, errs.join('\n')||'no errors'); await b.close();
})();

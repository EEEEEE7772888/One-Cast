/* Browser check: admin page shows each player's baits and can take one away. Needs mock-server on 8799 (OC_DB=devt). */
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d devt'],{input:q,encoding:'utf8'}).trim();
(async()=>{ const br=await chromium.launch(); const p=await (await br.newContext({viewport:{width:1100,height:800}})).newPage();
  p.on('pageerror',e=>console.log('PAGE ERROR',e.message)); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8799/admin.html?server=http://localhost:8799&key=test'); await p.fill('#key','oc-admin-testkey'); await p.click('#go'); await p.waitForTimeout(1500);
  const row=p.locator('#recent .line:has-text("Guest1")').first(); await row.scrollIntoViewIfNeeded();
  console.log('chips shown: '+(await row.locator('.baits .chip').allTextContents()).join(', '));
  await row.screenshot({path:'/home/claude/one-cast/tests/out/dev/admin-baits.png'});
  await row.locator('.chip:has-text("Crankbaits") button').click(); await p.waitForTimeout(1200);
  console.log('after X: '+(await row.locator('.baits .chip').allTextContents()).join(', ')+' | db: '+sql(`select baits from players where name='Guest1'`));
  await br.close(); })();

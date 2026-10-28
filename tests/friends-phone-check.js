// Friends list on a phone: rows stack (name on top, buttons underneath) instead of squashing the name.
const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const DB=process.env.OC_DB||'econ_t3', sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d '+DB],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8811',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','EEE'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const me=await p.evaluate(()=>G.s.pid);
  for(const n of ['DevBuddy','EliFriend','EmmaFish','ffisher']){ const pid=require('crypto').randomUUID(); sql(`insert into players (pid,secret,name,tag) values ('${pid}','${'x'.repeat(30)}','${n}','${1000+Math.floor(Math.random()*8999)}'); insert into friends (a,b,status,requested_by) values ('${me}','${pid}','accepted','${me}')`); }
  await p.evaluate(()=>{ G.refresh(true); }); await p.waitForTimeout(800); await p.evaluate(()=>UI.open('friendsOv')); await p.waitForTimeout(700);
  const r=await p.evaluate(()=>[...document.querySelectorAll('.friend')].map(f=>{ const n=f.querySelector('.fn'); return n?n.getBoundingClientRect().width:0; }));
  console.log('name widths:',r.map(Math.round).join(', ')); await p.screenshot({path:'/tmp/claude-0/friends-phone.png'}); await br.close(); })();

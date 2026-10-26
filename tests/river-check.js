const {chromium}=require('playwright');const {execFileSync}=require('child_process');
const sql=q=>execFileSync('su',['postgres','-c','psql -X -At -d qa'],{input:q,encoding:'utf8'}).trim();
const B='http://localhost:8804',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:1280,height:720}}); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','RiverRat'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const pid=await p.evaluate(()=>G.s.pid);
  for(const sp of ['neuse','newriver']){ sql(`update players set spot='${sp}' where pid='${pid}'`); await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(1500); await p.screenshot({path:'/tmp/'+sp+'.png'}); }
  await p.evaluate(()=>UI.open('mapOv')); await p.waitForTimeout(800); await p.screenshot({path:'/tmp/rivermap.png'}); await br.close(); })();

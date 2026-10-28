const {chromium}=require('playwright');
const B='http://localhost:'+(process.env.PORT||8810),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const p=await br.newPage({viewport:{width:360,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Dlg'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('.overlay')].map(o=>o.id).filter(Boolean));
  for(const id of ids){ const r=await p.evaluate(id=>{ try{ UI.closeAll(); UI.open(id); }catch(e){ return 'skip'; } const o=document.getElementById(id); if(o.hidden) return 'hidden'; const d=o.querySelector('.dialog')||o; return d.scrollWidth>d.clientWidth+1||document.documentElement.scrollWidth>innerWidth?'OVERFLOW '+d.scrollWidth+'>'+d.clientWidth:'ok'; },id); if(r!=='ok') console.log(id,r); }
  console.log('checked',ids.length,'windows'); await p.evaluate(()=>{ UI.closeAll(); UI.open('baitOv'); }); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/claude-0/dlg-bait.png'}); await br.close(); })();

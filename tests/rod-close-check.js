// The X on RODS AND REELS (and every other window) closes it.
const {chromium}=require('playwright');
const B='http://localhost:'+(process.env.PORT||8811),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const p=await br.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Closer'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('.overlay')].filter(o=>o.querySelector('[data-close]')).map(o=>o.id)); const stuck=[];
  for(const id of ids){ await p.evaluate(id=>{ UI.closeAll(); UI.open(id); },id); await p.waitForTimeout(150); await p.evaluate(id=>document.querySelector('#'+id+' [data-close]').click(),id); await p.waitForTimeout(150); if(await p.evaluate(id=>!document.getElementById(id).hidden,id)) stuck.push(id); }
  console.log('windows checked:',ids.length,'| X does not close:',stuck.length?stuck:'none','| errors:',errs.length?errs:'none'); await br.close(); })();

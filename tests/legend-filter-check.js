// Legends page: the Epic and Mythic filter shows the three rarest legends, Megalodon included.
const {chromium}=require('playwright');
const B='http://localhost:'+(process.env.PORT||8821),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','LegendSeeker'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ try{ localStorage.setItem('onecast.seenHalloween2026','1'); }catch(e){} UI.closeAll(); UI.open('legendOv'); }); await p.waitForTimeout(1500);
  const all=await p.evaluate(()=>[...document.querySelectorAll('#legendOv .ln')].map(x=>x.textContent)); console.log('all spots:', all.length, 'legends | Megalodon at position', all.findIndex(t=>/Megalodon/.test(t))+1);
  await p.selectOption('#legendFilter','epic'); await p.waitForTimeout(800);
  console.log('Epic and Mythic:', await p.evaluate(()=>[...document.querySelectorAll('#legendOv .ln')].map(x=>x.textContent).join(' | ')));
  await p.screenshot({path:'/tmp/claude-0/legend-epic.png'}); console.log('errors:', errs.length?errs:'none'); await br.close(); })();

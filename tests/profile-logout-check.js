// Your own profile: name change sits at the top, and LOG OUT signs you out of this device (warning first if there is no password).
const {chromium}=require('playwright');
const B='http://localhost:8810',Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto(B+Q); await p.waitForTimeout(900); await p.fill('#nameIn','Leaver'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  await p.evaluate(()=>G.prefs({tut:99})); await p.click('#profBtn'); await p.waitForTimeout(900);
  await p.screenshot({path:'/tmp/claude-0/profile-top.png'});
  console.log('rename box visible without scrolling:', await p.isVisible('#renameIn'), '| logout:', await p.isVisible('#logoutBtn'));
  await p.click('#logoutBtn'); await p.waitForTimeout(300); console.log('warning:', await p.textContent('#cfNote')); await p.screenshot({path:'/tmp/claude-0/profile-logout.png'});
  await p.click('#cfYes'); await p.waitForTimeout(2000);
  console.log('after logout, name screen shows:', await p.isVisible('#nameIn'), '| save on device:', await p.evaluate(()=>localStorage.getItem('onecast.id')));
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

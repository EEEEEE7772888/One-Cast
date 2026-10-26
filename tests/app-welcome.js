// Pretends to be the app (a fake Capacitor) and checks the first screen leads with the log-in for website players.
const {chromium}=require('playwright');
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.addInitScript(()=>{ window.Capacitor={isNativePlatform:()=>true,Plugins:{}}; });
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto('http://localhost:8805/?server=http://localhost:8805&key=test'); await p.waitForTimeout(1200);
  console.log('app welcome shown:', await p.isVisible('#appWelcome'), '| log-in box open:', await p.isVisible('#pwBox'), '| alert button hidden:', !(await p.isVisible('#alertBtn')));
  await p.screenshot({path:'/tmp/appwelcome.png'}); await br.close(); })();

const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:900,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8787/admin.html?server=http://localhost:8787&key=test'); await p.fill('#key','oc-admin-testkey'); await p.click('#go'); await p.waitForTimeout(1200); await p.screenshot({path:'tests/out/admin.png'}); console.log(errs.join('\n')||'no errors'); await b.close(); })();

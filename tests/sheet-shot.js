const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1200,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
 for(const m of (process.argv[2]||'all,leg,var,size').split(',')){ await p.goto('file:///home/claude/one-cast/tests/sheet.html?m='+m); await p.waitForTimeout(500); await p.screenshot({path:'tests/out/sheet-'+m+'.png',fullPage:true}); }
 console.log(errs.join('\n')||'no errors'); await b.close(); })();

// "Now on the App Store" notice: shows on a computer, not on iPhone Safari, and stays closed after X.
const {chromium}=require('playwright');
const B='http://localhost:'+(process.env.PORT||8834),Q='/?server='+B+'&key=test';
(async()=>{ const br=await chromium.launch(); const errs=[];
  const pc=await br.newPage({viewport:{width:1280,height:800}}); pc.on('pageerror',e=>errs.push(e.message)); await pc.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await pc.goto(B+Q); await pc.waitForTimeout(2500); console.log('computer shows it:', await pc.isVisible('.app-banner'), '| text:', await pc.textContent('.app-banner').catch(()=>'')); await pc.screenshot({path:'/tmp/claude-0/appbanner-pc.png'});
  await pc.click('.ab-x'); await pc.reload(); await pc.waitForTimeout(2500); console.log('after closing and reloading:', await pc.isVisible('.app-banner'));
  const ip=await br.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true});
  await ip.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''})); await ip.goto(B+Q); await ip.waitForTimeout(2500); console.log('iPhone Safari shows it:', await ip.isVisible('.app-banner'));
  console.log('errors:', errs.length?errs:'none'); await br.close(); })();

// Old address (localhost) holds a save; the hand-off page sends it to the new address (127.0.0.1), which logs in as the same player.
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch(), ctx=await b.newContext(), p=await ctx.newPage();
  const S='?server=http://localhost:8792&key=test';
  await p.goto('http://localhost:8792/index.html'+S); await p.waitForTimeout(800);
  await p.fill('#nameIn','Mover'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const old=await p.evaluate(()=>localStorage.getItem('onecast.id'));
  await p.goto('http://localhost:8792/moved/index.html');
  await p.evaluate(()=>{}).catch(()=>{});
  // point the hand-off at the test "new" address
  await p.route('**/moved/index.html',async r=>{ const res=await r.fetch(); let t=await res.text(); t=t.replace("https://onecast.github.io/","http://127.0.0.1:8792/index.html"); r.fulfill({response:res,body:t}); });
  await p.goto('http://localhost:8792/moved/index.html'); await p.waitForURL(/127\.0\.0\.1/); 
  // the hand-off goes to index.html#move=...; add the test server params after
  const u=new URL(p.url()); await p.goto('http://127.0.0.1:8792/index.html'+S+u.hash); await p.waitForTimeout(1800);
  const now=await p.evaluate(()=>localStorage.getItem('onecast.id')), hash=await p.evaluate(()=>location.hash);
  const name=await p.evaluate(()=>window.G&&G.s&&G.s.name);
  console.log('same id:',JSON.parse(old).pid===JSON.parse(now).pid,'| hash cleared:',hash==='','| logged in as:',name);
  await b.close();
})();

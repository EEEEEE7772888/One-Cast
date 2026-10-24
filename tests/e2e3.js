const { chromium } = require('playwright');
const {execFileSync}=require('child_process');
function sql(q){ return execFileSync('su',['postgres','-c','psql -X -At -d onecast'],{input:q,encoding:'utf8'}).trim(); }
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:+(process.env.VW||1100),height:+(process.env.VH||800)}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text())) errs.push('CONSOLE '+m.text()); });
  await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(800);
  if(await p.isVisible('#nameIn')){ await p.fill('#nameIn','Tester'); await p.click('#nameGo'); await p.waitForTimeout(1500); }
  const pid=await p.evaluate(()=>G.s.pid);
  sql(`update players set coins=coins+5000000 where pid='${pid}'`);
  await p.evaluate(()=>G.prefs({tut:9}));
  await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(800);
  // buy everything through the real buy function
  const buys=[['bait','minnow'],['bait','cut'],['bait','sucker'],['bait','shrimp'],['bait','squid'],['bait','mullet'],['bait','lure'],['bait','deepbait'],['gear','hole2'],['gear','hole3'],['gear','hole4'],['gear','line1'],['gear','line2'],['gear','line3'],['gear','line4'],['gear','line5'],['gear','finder1'],['gear','finder2'],['gear','finder3'],['gear','boat'],['gear','offshore'],['gear','deeprig'],['gear','comfort'],['region','northwoods'],['region','everglades'],['region','keys'],['region','pacific'],['region','arctic'],['region','southern'],['region','greatlakes']];
  for(const [k,id] of buys){ await p.evaluate(([k,id])=>NET.me('buy',{p_kind:k,p_id:id}).catch(e=>console.log('buy fail',k,id,e.message)),[k,id]); }
  await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(600);
  async function shotSpot(spot,bait,name){
    await p.evaluate((spot)=>NET.me('travel',{p_spot:spot}).then(()=>G.refresh(true)),spot); await p.waitForTimeout(700);
    await p.evaluate(()=>SCENE.layout());
    for(let i=0;i<3;i++){ await p.evaluate(([i,bait])=>{ G.sel=i; return NET.me('cast_line',{p_idx:i,p_bait:bait}).catch(e=>console.log('cast fail',e.message)); },[i,bait]); }
    sql(`update lines set cast_at=now()-interval '90 minutes', bite_at=now()-interval '5 seconds' where pid='${pid}' and idx=1`);
    await p.evaluate(()=>{ G.sel=0; return G.refresh(true); }); await p.waitForTimeout(900);
    await p.screenshot({path:'tests/out/e3-'+name+'.png'});
    // reel line 1 (hooked) and catch
    await p.evaluate(()=>{ G.sel=1; G.renderAll(); }); await p.click('#goBtn'); await p.waitForTimeout(name==='deep'?4600:name==='troll'?3400:2400); await p.screenshot({path:'tests/out/e3-'+name+'-catch.png'});
    await p.click('#cardOv .go.alt').catch(()=>{}); await p.waitForTimeout(800);
    // pull the rest
    for(const i of [0,2]){ await p.evaluate((i)=>NET.me('reel_line',{p_idx:i}).catch(()=>{}),i); }
    await p.evaluate(()=>G.refresh(true)); await p.waitForTimeout(300);
  }
  await shotSpot('millelacs','sucker','ice');
  await shotSpot('everglades','mullet','boat');
  await shotSpot('kona','lure','troll');
  await shotSpot('arcticdeep','deepbait','deep');
  await shotSpot('harlemmeer','cut','city');
  // overlays
  await p.click('#mapBtn'); await p.waitForTimeout(900); await p.screenshot({path:'tests/out/e3-map.png'});
  await p.click('.pin.here'); await p.waitForTimeout(600); await p.screenshot({path:'tests/out/e3-map-zoom.png'});
  await p.click('#mapList'); await p.waitForTimeout(300); await p.screenshot({path:'tests/out/e3-map-list.png'});
  for(const ov of ['menuOv','bucketOv','journalOv','legendOv','boardOv','friendsOv','gearOv','shopOv','achOv','newsOv','tackleOv']){ await p.evaluate((ov)=>UI.open(ov),ov); await p.waitForTimeout(ov==='legendOv'||ov==='boardOv'||ov==='newsOv'?1000:400); await p.screenshot({path:'tests/out/e3-'+ov+'.png'}); }
  console.log(errs.join('\n')||'no errors'); await b.close();
})();

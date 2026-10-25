const { chromium } = require('playwright');
const {execFileSync}=require('child_process');
function sql(q){ return execFileSync('su',['postgres','-c','psql -X -At -d onecast'],{input:q,encoding:'utf8'}).trim(); }
(async()=>{
  const b=await chromium.launch(); const errs=[];
  async function mk(name,w,h){ const c=await b.newContext({viewport:{width:w||1100,height:h||800}}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(name+': '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|fonts|400/.test(m.text())) errs.push(name+' console: '+m.text()); });
    await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(600); await p.fill('#nameIn',name); await p.click('#nameGo'); await p.waitForTimeout(1200); await p.evaluate(()=>G.prefs({tut:9})); await p.evaluate(()=>G.updateCoach()); return p; }
  const A=await mk('Captain'), B=await mk('Deckhand');
  const pidA=await A.evaluate(()=>G.s.pid), pidB=await B.evaluate(()=>G.s.pid), tagB=await B.evaluate(()=>G.s.tag);
  sql(`update players set coins=9000000, regions='{home,northwoods,greatlakes,mississippi,everglades,keys,pnw,pacific,amazon,africa,eurasia,australia,arctic,southern}' where pid in ('${pidA}','${pidB}')`);
  await A.evaluate(()=>G.refresh(true)); await A.waitForTimeout(500);
  await A.evaluate(()=>UI.open('dockOv')); await A.waitForTimeout(400); await A.screenshot({path:'tests/out/bc-dock0.png'});
  for(const x of ['kayak','skiff','bassboat','console','sportfisher','trawler','yacht']) await A.evaluate(x=>NET.me('buy',{p_kind:'gear',p_id:x}),x);
  for(const x of ['shrimp','squid','mullet','lure']) await A.evaluate(x=>NET.me('buy',{p_kind:'bait',p_id:x}),x);
  await A.evaluate(()=>G.refresh(true)); await A.evaluate(()=>UI.open('dockOv')); await A.waitForTimeout(400); await A.screenshot({path:'tests/out/bc-dock.png',fullPage:true});
  async function at(p,spot,boat,file){ await p.evaluate(([s,bt])=>NET.me('set_boat',{p_boat:bt}).then(()=>NET.me('travel',{p_spot:s})).catch(()=>{}).then(()=>G.refresh(true)).then(()=>{ UI.closeAll(); SCENE.layout(); }),[spot,boat]); await p.waitForTimeout(900); if(file) await p.screenshot({path:'tests/out/'+file}); }
  await at(A,'everglades','skiff','bc-skiff.png');
  await at(A,'michigan','bassboat','bc-bass.png');
  await at(A,'kona','sportfisher','bc-sport.png');
  await at(A,'arcticdeep','trawler','bc-trawler.png');
  await at(A,'kona','yacht','bc-yacht.png');
  await at(A,'arcticdeep','paddle','bc-paddle-arctic.png');
  console.log('arctic on paddle: small?',await A.evaluate(()=>G.access().small),'status:',await A.evaluate(()=>document.getElementById('status').textContent.slice(0,80)));
  await A.evaluate(()=>{ G.bait='worm'; G.cast(); }); await A.waitForTimeout(800); console.log('cast worms in the Arctic:',await A.evaluate(()=>G.lines().length));
  await A.evaluate(()=>NET.me('reel_line',{p_idx:0}).then(()=>G.refresh(true)));
  // crew: A at Kona on sportfisher, invites B
  await at(A,'kona','sportfisher');
  await A.evaluate(t=>NET.me('friend_request',{p_name:'Deckhand',p_tag:t}),tagB); await B.evaluate(p=>NET.me('friend_respond',{p_other:p,p_accept:true}),pidA);
  await A.evaluate(()=>G.refresh(true)); await A.evaluate(()=>UI.open('friendsOv')); await A.waitForTimeout(400); await A.click('text=INVITE ABOARD'); await A.waitForTimeout(800);
  await B.evaluate(()=>NET.me('get_crew').then(c=>{ G.s.crew=c; UI.crewTick(); })); await B.waitForTimeout(600); await B.screenshot({path:'tests/out/bc-invite.png'});
  await B.click('#cfYes'); await B.waitForTimeout(3200); await B.screenshot({path:'tests/out/bc-aboard.png'});
  console.log('B spot:',await B.evaluate(()=>G.s.spot),'crew guest:',await B.evaluate(()=>G.s.crew.guest));
  await B.evaluate(()=>NET.me('buy',{p_kind:'bait',p_id:'shrimp'}).then(()=>G.refresh(true))); await B.evaluate(()=>{ G.bait='shrimp'; G.cast(); }); await B.waitForTimeout(700);
  await A.evaluate(()=>{ G.bait='lure'; G.cast(); }); await A.waitForTimeout(700);
  sql(`update lines set cast_at=now()-interval '40 minutes', bite_at=now()-interval '3 seconds' where pid='${pidB}'`);
  await A.evaluate(()=>{ UI.closeAll(); return NET.me('get_crew').then(c=>{ G.s.crew=c; }); }); await A.waitForTimeout(1200); await A.screenshot({path:'tests/out/bc-crew-scene.png'});
  await B.evaluate(()=>G.refresh(true)); await B.waitForTimeout(500); await B.evaluate(()=>{ G.sel=0; G.reel(); }); await B.waitForTimeout(4000);
  await A.evaluate(()=>NET.me('get_crew').then(c=>{ G.s.crew=c; UI.crewTick(); })); await A.waitForTimeout(500); await A.screenshot({path:'tests/out/bc-crew-toast.png'});
  console.log('last toast on captain screen:',await A.evaluate(()=>document.getElementById('toast').textContent)); await A.evaluate(()=>UI.open('friendsOv')); await A.waitForTimeout(400); await A.screenshot({path:'tests/out/bc-crew-panel.png'});
  console.log(errs.join('\n')||'no errors'); await b.close();
})();

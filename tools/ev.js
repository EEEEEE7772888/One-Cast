const D=require('../js/data.js');
let seed=3; function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
const interval=+(process.argv[2]||240);
const rows=[];
D.SPOTS.forEach(s=>{ D.METHOD_BAITS[s.method].forEach(b=>{ let tot=0,n=1500,cnt=0; for(let i=0;i<n;i++){ const bm=D.biteMinutes(rnd,s.id,b,false); if(bm>interval) continue; const r=D.rollCatch(rnd,s.id,b,bm,['dawn','day','dusk','night'][i%4]); if(!r) continue; cnt++; tot+=D.fishValue(r.id,r.lb,r.variant);} if(cnt) rows.push({spot:s.id,region:s.region,bait:b,ev:tot/n,avg:tot/cnt,hit:cnt/n}); }); });
let last='';
rows.sort((a,b)=>D.REGION_BY_ID[a.region].tier-D.REGION_BY_ID[b.region].tier||a.spot.localeCompare(b.spot)||a.ev-b.ev).forEach(r=>{ if(r.region!==last){ console.log('== '+r.region+' ticket '+D.REGION_BY_ID[r.region].ticket); last=r.region; } console.log('  '+r.spot.padEnd(16)+r.bait.padEnd(9)+' $/check '+r.ev.toFixed(0).padStart(6)+'  $/fish '+r.avg.toFixed(0).padStart(6)+'  bite% '+(r.hit*100).toFixed(0)); });

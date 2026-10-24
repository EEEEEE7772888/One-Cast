const fs=require('fs'); const path='./js/data.js';
delete require.cache[require.resolve('../js/data.js')];
const D=require('../js/data.js');
const TARGET={home:60,northwoods:120,greatlakes:200,mississippi:320,everglades:480,keys:800,pnw:1400,pacific:2000,amazon:2400,africa:2400,eurasia:2800,australia:4800,arctic:8000,southern:12000};
const INT=+(process.argv[2]||360);
let seed=5; function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
function ev(spot,bait,interval){ let tot=0,n=1200; for(let i=0;i<n;i++){ const bm=D.biteMinutes(rnd,spot,bait,false); if(bm>interval) continue; const r=D.rollCatch(rnd,spot,bait,bm,['dawn','day','dusk','night'][i%4]); if(!r) continue; tot+=D.fishValue(r.id,r.lb,r.variant);} return tot/n; }
const homeOf={}; D.SPECIES.forEach(s=>{ let best=null,bw=-1; Object.keys(s.spots).forEach(k=>{ const w=s.spots[k]; const r=D.REGION_BY_ID[D.SPOT_BY_ID[k].region]; if(w>bw||(w===bw&&r.tier<best.tier)){bw=w;best=r;} }); homeOf[s.id]=best.id; });
D.SPECIES.forEach(s=>{ if(!s.protected) s.rate=s.rate; });
for(let it=0;it<6;it++){
  const actual={}; D.REGIONS.forEach(r=>{ let b=0; D.SPOTS.filter(s=>s.region===r.id).forEach(s=>D.METHOD_BAITS[s.method].forEach(bt=>{ b=Math.max(b,ev(s.id,bt,INT)); })); actual[r.id]=b; });
  D.REGIONS.forEach(r=>{ const k=TARGET[r.id]/Math.max(1,actual[r.id]); D.SPECIES.forEach(s=>{ if(homeOf[s.id]===r.id&&!s.protected) s.rate=s.rate*(s.max<15?Math.pow(k,0.6):k); }); });
  console.log('iter',it,D.REGIONS.map(r=>r.id.slice(0,6)+':'+actual[r.id].toFixed(0)).join(' '));
}
D.SPECIES.forEach(s=>{ let r=s.rate; r=r<10?Math.round(r*2)/2:r<100?Math.round(r):Math.round(r/5)*5; s.rate=s.protected?0:Math.max(0.5,r); });
let src=fs.readFileSync(path,'utf8');
D.SPECIES.forEach(s=>{ src=src.replace(new RegExp("(id:'"+s.id+"',[^\\n]*?rate:)[\\d.]+"),'$1'+s.rate); });
fs.writeFileSync(path,src);
console.log(D.SPECIES.map(s=>s.id+':'+s.rate).join(' '));

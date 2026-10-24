/* Economy simulator: a casual player who checks the game a few times a day, always fishes the best thing they own,
   sells everything and buys the cheapest useful upgrade. Prints when each milestone is reached. */
const D=require('../js/data.js');
const args=process.argv.slice(2); const CHECKS=+(args[0]||4); const DAYS=+(args[1]||120); const SEED=+(args[2]||1);
let seed=SEED; function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
function periodAt(spot,tMin){ const h=((tMin/60)+D.SPOT_BY_ID[spot].lon/15+24*100)%24; return D.periodOf(h); }
// expected $ per check-in interval for (spot,bait), with current line test & reel level
const evCache={};
function ev(spot,bait,interval,test,reel){
  const key=spot+'|'+bait+'|'+interval+'|'+test+'|'+reel; if(evCache[key]!=null) return evCache[key];
  let tot=0,n=400,snapP=D.REEL_SNAP[reel];
  for(let i=0;i<n;i++){ const bm=D.biteMinutes(rnd,spot,bait,false); if(bm>interval){ continue; }
    const r=D.rollCatch(rnd,spot,bait,bm,['dawn','day','dusk','night'][i%4]); if(!r) continue;
    if(r.lb>test && rnd()<snapP) continue; tot+=D.fishValue(r.id,r.lb,r.variant); }
  return evCache[key]=tot/n;
}
const P={coins:0,baits:['worm'],gear:{line:0,reel:0,lines:1,finder:0,comfort:false,methods:{}},regions:['home'],spot:'basslake',lines:[]};
const interval=24*60/CHECKS; const log=[]; let t=0; const milestones={};
function mark(k){ if(!milestones[k]){ milestones[k]=t; } }
function owned(g){ const G=D.GEAR_BY_ID[g]; if(G.kind==='line') return P.gear.line>=G.lvl; if(G.kind==='reel') return P.gear.reel>=G.lvl; if(G.kind==='lines') return P.gear.lines>=G.lvl; if(G.kind==='finder') return P.gear.finder>=G.lvl; if(G.kind==='comfort') return P.gear.comfort; return !!P.gear.methods[g]; }
function canFish(spot){ const s=D.SPOT_BY_ID[spot]; if(!P.regions.includes(s.region)) return false; const g=D.METHOD_GEAR[s.method]; return !g||P.gear.methods[g]; }
function bestPlan(){ let best=null; D.SPOTS.forEach(s=>{ if(!canFish(s.id)) return; D.METHOD_BAITS[s.method].forEach(b=>{ if(!P.baits.includes(b)) return; const v=ev(s.id,b,interval,D.LINE_TESTS[P.gear.line],P.gear.reel); if(!best||v>best.v) best={spot:s.id,bait:b,v}; }); }); return best; }
function shop(){
  // candidate purchases with a rough usefulness test
  let bought=true;
  while(bought){ bought=false; const cands=[];
    D.BAITS.forEach(b=>{ if(P.baits.includes(b.id)||b.price>P.coins) return; const useful=D.SPOTS.some(s=>canFish(s.id)&&D.METHOD_BAITS[s.method].includes(b.id)&&D.speciesWeights(s.id,b.id,9999,'day').some(x=>x.w>0)); if(useful) cands.push({price:b.price,do:()=>{P.baits.push(b.id); mark('bait:'+b.id);}}); });
    D.GEAR.forEach(g=>{ if(owned(g.id)||g.price>P.coins) return; if(g.kind==='line'&&P.gear.line!==g.lvl-1) return; if(g.kind==='reel'&&P.gear.reel!==g.lvl-1) return; if(g.kind==='lines'&&P.gear.lines!==g.lvl-1) return; if(g.kind==='finder') return;
      if(g.kind==='method'){ const useful=D.SPOTS.some(s=>P.regions.includes(s.region)&&D.METHOD_GEAR[s.method]===g.id); if(!useful) return; }
      if(g.kind==='line'){ const bp=bestPlan(); if(!bp) return; const sp=D.spotSpecies(bp.spot).filter(s=>s.baits[bp.bait]); const biggest=Math.max(...sp.map(s=>s.max)); if(biggest<=D.LINE_TESTS[P.gear.line]) return; }
      cands.push({price:g.price,do:()=>{ if(g.kind==='method') P.gear.methods[g.id]=true; else if(g.kind==='comfort') P.gear.comfort=true; else P.gear[g.kind]=g.lvl; mark('gear:'+g.id);}}); });
    const nextR=D.REGIONS.find(r=>!P.regions.includes(r.id)); if(nextR&&nextR.ticket<=P.coins) cands.push({price:nextR.ticket,do:()=>{P.regions.push(nextR.id); mark('region:'+nextR.id);}});
    if(cands.length){ cands.sort((a,b)=>a.price-b.price); const c=cands[0]; P.coins-=c.price; c.do(); bought=true; }
  }
}
let catches=0, income=0;
for(t=0;t<DAYS*1440;t+=interval){
  // resolve lines
  P.lines.forEach(L=>{ const bm=L.bite; if(bm<=t-L.cast){ const r=D.rollCatch(rnd,L.spot,L.bait,bm,periodAt(L.spot,L.cast+bm)); if(r){ if(r.lb>D.LINE_TESTS[P.gear.line]&&rnd()<D.REEL_SNAP[P.gear.reel]) return; const v=D.fishValue(r.id,r.lb,r.variant); P.coins+=v; income+=v; catches++; } } });
  P.lines=[];
  shop();
  const plan=bestPlan(); if(!plan) break;
  P.spot=plan.spot;
  for(let i=0;i<P.gear.lines;i++) P.lines.push({spot:plan.spot,bait:plan.bait,cast:t,bite:D.biteMinutes(rnd,plan.spot,plan.bait,P.gear.comfort)});
  if(t%(1440*10)===0) log.push(`day ${t/1440}: $${P.coins} at ${plan.spot}/${plan.bait} regions=${P.regions.length} lines=${P.gear.lines} line=${D.LINE_TESTS[P.gear.line]} catches=${catches}`);
}
// the first 10 minutes with worms, finer grain
(function(){ let c=0,s2=7; const r2=()=>{s2=(s2*1664525+1013904223)>>>0; return s2/4294967296;}; let tt=0; while(tt<10){ const bm=D.biteMinutes(r2,'basslake','worm',false); tt+=bm; const r=D.rollCatch(r2,'basslake','worm',bm,'day'); if(r) c+=D.fishValue(r.id,r.lb,r.variant); } console.log('worms, first 10 minutes at the lake: $'+c); })();
console.log(log.join('\n'));
console.log('milestones (days):'); Object.keys(milestones).forEach(k=>console.log('  '+k.padEnd(24)+(milestones[k]/1440).toFixed(1)));
console.log('total catches',catches,'income',income);

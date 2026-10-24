/* Builds setup.sql = schema + game data (from js/data.js) + functions. Run: node tools/gen-sql.js [adminKey] */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const D=require('../js/data.js');
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const j=o=>q(JSON.stringify(o))+'::jsonb';
let out=['-- One Cast server, part 2: game data. Generated from js/data.js; edit that file and rerun tools/gen-sql.js.',''];
out.push('delete from spot_species; delete from species_baits; delete from method_baits;');
out.push('insert into regions (id,name,ticket,tier) values '+D.REGIONS.map(r=>`(${q(r.id)},${q(r.name)},${r.ticket},${r.tier})`).join(',')+' on conflict (id) do update set name=excluded.name, ticket=excluded.ticket, tier=excluded.tier;');
out.push('insert into spots (id,region,name,method,tz) values '+D.SPOTS.map(s=>`(${q(s.id)},${q(s.region)},${q(s.name)},${q(s.method)},${q(s.tz)})`).join(',')+' on conflict (id) do update set region=excluded.region, name=excluded.name, method=excluded.method, tz=excluded.tz;');
out.push('insert into baits (id,name,price,tau,cap_max,min_bite,bite_mean,water) values '+D.BAITS.map(b=>`(${q(b.id)},${q(b.name)},${b.price},${b.tau},${b.capMax},${b.minBite},${b.biteMean},${q(b.water)})`).join(',')+' on conflict (id) do update set name=excluded.name, price=excluded.price, tau=excluded.tau, cap_max=excluded.cap_max, min_bite=excluded.min_bite, bite_mean=excluded.bite_mean, water=excluded.water;');
const mb=[]; Object.keys(D.METHOD_BAITS).forEach(m=>D.METHOD_BAITS[m].forEach(b=>mb.push(`(${q(m)},${q(b)})`)));
out.push('insert into method_baits (method,bait) values '+mb.join(',')+';');
out.push('insert into gear (id,name,price,kind,lvl) values '+D.GEAR.map(g=>`(${q(g.id)},${q(g.name)},${g.price},${q(g.kind)},${g.lvl})`).join(',')+' on conflict (id) do update set name=excluded.name, price=excluded.price, kind=excluded.kind, lvl=excluded.lvl;');
out.push('insert into items (id,slot,price,prize) values '+D.ITEMS.map(i=>`(${q(i.id)},${q(i.slot)},${i.price},${!!i.prize})`).join(',')+' on conflict (id) do update set slot=excluded.slot, price=excluded.price, prize=excluded.prize;');
out.push('insert into species (id,name,min_lb,max_lb,k,rate,protected,act,min_wait,max_wait) values '+D.SPECIES.map(s=>`(${q(s.id)},${q(s.name)},${s.min},${s.max},${s.k},${s.rate},${!!s.protected},${j(D.ACT_PROFILES[s.act])},${s.minWait},${s.maxWait||0})`).join(',')+' on conflict (id) do update set name=excluded.name, min_lb=excluded.min_lb, max_lb=excluded.max_lb, k=excluded.k, rate=excluded.rate, protected=excluded.protected, act=excluded.act, min_wait=excluded.min_wait, max_wait=excluded.max_wait;');
const sb=[], ss=[];
D.SPECIES.forEach(s=>{ Object.keys(s.baits).forEach(b=>{ if(s.baits[b]>0) sb.push(`(${q(s.id)},${q(b)},${s.baits[b]})`); }); Object.keys(s.spots).forEach(sp=>{ if(s.spots[sp]>0) ss.push(`(${q(sp)},${q(s.id)},${s.spots[sp]})`); }); });
out.push('insert into species_baits (species,bait,w) values '+sb.join(',')+';');
out.push('insert into spot_species (spot,species,w) values '+ss.join(',')+';');
out.push('insert into legend_presets (spot,name,species,tier,lb,bait,period,min_wait,min_line,clue,colors) values '+D.LEGEND_PRESETS.map(p=>`(${q(p.spot)},${q(p.name)},${q(p.species)},${q(p.tier)},${p.lb},${q(p.bait)},${q(p.period)},${p.minWait},${p.line},${q(p.clue)},${j(p.colors)})`).join(',')+' on conflict (spot) do nothing;');
const key=process.argv[2]||null;
out.push(key?`insert into admin (k) select ${q(key)} where not exists (select 1 from admin);`:"-- insert into admin (k) select 'pick-a-long-secret' where not exists (select 1 from admin);");
out.push('');
fs.writeFileSync(path.join(__dirname,'../sql/data.sql'),out.join('\n'));
const full=['-- ONE CAST: full server setup. Paste the whole file into Supabase: SQL Editor > New query > Run. Safe to run again later.',key?'-- Your admin key (keep it secret, it is for the admin page only): '+key:"-- Admin key: set your own with   insert into admin (k) values ('pick-a-long-secret');   (a private copy of this file may already do it)",'',
 fs.readFileSync(path.join(__dirname,'../sql/schema.sql'),'utf8'), out.join('\n'), fs.readFileSync(path.join(__dirname,'../sql/functions.sql'),'utf8')].join('\n');
const outPath=process.argv[3]||path.join(__dirname,'../setup.sql'); fs.writeFileSync(outPath,full);
console.log(outPath,'written,',full.length,'chars.',key?'admin key: '+key:'(no admin key; public copy)');

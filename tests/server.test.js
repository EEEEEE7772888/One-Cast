/* Server tests against the local practice database (createdb onecast && psql -f setup.sql first). Run: node tests/server.test.js */
const {execFileSync}=require('child_process');
const D=require('../js/data.js');
const DB=process.env.OC_DB||'onecast';
function sql(q,asRole){ const full=(asRole?`set role ${asRole}; `:'')+q; return execFileSync('su',['postgres','-c',`psql -X -At -v ON_ERROR_STOP=1 -d ${DB}`],{input:full,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(); }
function lit(v){ if(v===null||v===undefined) return 'null'; if(typeof v==='number'||typeof v==='boolean') return String(v); if(Array.isArray(v)) return "array["+v.map(lit).join(',')+"]::bigint[]"; if(typeof v==='object') return "'"+JSON.stringify(v).replace(/'/g,"''")+"'::jsonb"; return "'"+String(v).replace(/'/g,"''")+"'"; }
function rpc(fn,args){ // as anon, like PostgREST
  try{ const r=sql(`select ${fn}(${args.map(lit).join(',')});`,'anon').replace(/^SET\n?/,'').trim(); return r===''?null:JSON.parse(r); }
  catch(e){ const m=/ERROR:\s+([^\n]+)/.exec(e.stderr||e.message); return {error:(m?m[1]:String(e.message)).trim()}; }
}
let pass=0, fail=0;
function ok(cond,msg){ if(cond){pass++;} else {fail++; console.log('  FAIL:',msg);} }
function uuid(){ return require('crypto').randomUUID(); }
const A={pid:uuid(),secret:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}, B={pid:uuid(),secret:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'};

console.log('login');
let sA=rpc('login',[A.pid,A.secret,'ReelDeal']);
ok(sA&&sA.name==='ReelDeal'&&/^\d{4}$/.test(sA.tag),'new player created with a tag');
ok(sA.coins===0&&sA.baits.length===1&&sA.spot==='basslake','starts with worms at Bass Lake');
ok(rpc('login',[uuid(),'cccccccccccccccccccccccccccccc','fuckface']).error==='bad name','bad word rejected');
ok(rpc('login',[uuid(),'short','Nice']).error==='bad secret','short secret rejected');
ok(rpc('get_state',[A.pid,'wrongwrongwrongwrongwrongwrong']).error==='not your game','wrong secret rejected');
let sB=rpc('login',[B.pid,B.secret,'IceQueen']);
ok(sB.name==='IceQueen','second player');
ok(sA.legendsHere.length===1&&sA.legendsHere[0].name==='Old Bucketmouth','Bass Lake legend is Old Bucketmouth');
const nLeg=+sql('select count(*) from legends where active');
ok(nLeg===D.SPOTS.length,'every spot has a legend ('+nLeg+')');
ok(+sql('select count(distinct name) from legends')===nLeg,'legend names are unique');
console.log('  sample invented legends:'); console.log('   '+sql("select name||' | '||species||' | '||tier||' | '||lb||' lb | '||bait||' | '||period||' | '||min_wait||'m | '||min_line||'lb' from legends where spot in ('walden','michigan','simcoe','clearlake') order by spot").split('\n').join('\n   '));

console.log('casting and reeling');
ok(rpc('cast_line',[A.pid,A.secret,0,'minnow']).error==='you do not own that bait','cannot cast bait you do not own');
ok(rpc('cast_line',[A.pid,A.secret,1,'worm']).error==='you do not have that line','cannot use a line you have not bought');
let c=rpc('cast_line',[A.pid,A.secret,0,'worm']);
ok(c.line&&c.line.idx===0&&c.line.bait==='worm'&&!c.line.peekSp,'cast worm, no finder so no peek');
ok(rpc('cast_line',[A.pid,A.secret,0,'worm']).error==='that line is already in the water','no double cast');
ok(rpc('travel',[A.pid,A.secret,'farmpond']).error==='reel in all your lines before you travel','no travel with a line out');
// reel too early
sql(`update lines set bite_at = now() + interval '1 hour' where pid='${A.pid}'`);
let r=rpc('reel_line',[A.pid,A.secret,0]);
ok(r.result==='early','reeling early loses the cast');
ok(rpc('reel_line',[A.pid,A.secret,0]).error==='no line there','line is gone after early reel');
// a real catch: cast, then pretend the bite happened
rpc('cast_line',[A.pid,A.secret,0,'worm']);
sql(`update lines set cast_at = now() - interval '5 minutes', bite_at = now() - interval '1 minute' where pid='${A.pid}'`);
r=rpc('reel_line',[A.pid,A.secret,0]);
ok(r.result==='catch'&&r.fish&&r.fish.lb>0&&r.newSpecies===true,'caught a fish: '+(r.fish&&(r.fish.sp+' '+r.fish.lb+' lb')));
sA=rpc('get_state',[A.pid,A.secret]);
ok(sA.fish.length===1&&sA.stats.catches===1&&sA.journal[r.fish.sp].n===1,'fish in inventory, stats and journal updated');
ok(sA.daily&&sA.daily.type&&sA.daily.progress>=0,'daily challenge exists: '+sA.daily.type);
// catch many for money
for(let i=0;i<30;i++){ rpc('cast_line',[A.pid,A.secret,0,'worm']); sql(`update lines set cast_at = now() - interval '5 minutes', bite_at = now() - interval '1 minute' where pid='${A.pid}'`); rpc('reel_line',[A.pid,A.secret,0]); }
sA=rpc('get_state',[A.pid,A.secret]);
ok(sA.fish.length>=25,'caught a bunch: '+sA.fish.length);

console.log('selling');
let ids=sA.fish.map(f=>f.id);
let fake=rpc('sell_fish',[B.pid,B.secret,ids]);
ok(fake.sold===0&&fake.total===0,'cannot sell someone else\'s fish');
let s=rpc('sell_fish',[A.pid,A.secret,ids]);
ok(s.sold===ids.length&&s.coins>0,'sold all for $'+s.total);
ok(rpc('get_state',[A.pid,A.secret]).fish.length===0,'inventory empty after sale');

console.log('buying');
ok(rpc('buy',[A.pid,A.secret,'bait','sucker']).error==='not enough coins','cannot afford suckers yet');
ok(rpc('buy',[A.pid,A.secret,'gear','line2']).error==='buy the cheaper one first','gear must be bought in order');
ok(rpc('buy',[A.pid,A.secret,'item','hat_champ']).error==='no such item','prize hats are not for sale');
rpc('admin_player',['oc-admin-testkey',A.pid,'coins','500000']);
ok(rpc('admin_player',['wrongkey',A.pid,'coins','500000']).error==='not the admin key','admin key checked');
let b=rpc('buy',[A.pid,A.secret,'bait','minnow']); ok(b.baits.includes('minnow'),'bought minnows');
ok(rpc('buy',[A.pid,A.secret,'bait','minnow']).error==='you already own that','no double buy');
b=rpc('buy',[A.pid,A.secret,'gear','hole2']); ok(b.gear.lines===2,'second line');
b=rpc('buy',[A.pid,A.secret,'gear','line1']); b=rpc('buy',[A.pid,A.secret,'gear','line2']); ok(b.gear.line===2,'line upgrades in order');
b=rpc('buy',[A.pid,A.secret,'gear','boat']); ok(b.gear.methods.includes('boat'),'bought a boat');
b=rpc('buy',[A.pid,A.secret,'item','hat_cap']); ok(b.items.includes('hat_cap'),'bought a hat');
ok(rpc('set_outfit',[A.pid,A.secret,{hat:'hat_crown'}]).error==='you do not own that','cannot wear unowned hat');
ok(rpc('set_outfit',[A.pid,A.secret,{hat:'hat_cap'}]).hat==='hat_cap','wears the cap');
ok(rpc('travel',[A.pid,A.secret,'everglades']).error==='you need a ticket to that region first','no travel without ticket');
b=rpc('buy',[A.pid,A.secret,'region','everglades']); ok(b.regions.includes('everglades'),'bought Everglades ticket');
ok(rpc('buy',[A.pid,A.secret,'region','everglades']).error==='you already have that ticket','ticket is one-time');
let t=rpc('travel',[A.pid,A.secret,'everglades']); ok(t.spot==='everglades'&&t.legendsHere[0].name==='The Swamp King','traveled to the Everglades, Swamp King waiting');
ok(rpc('travel',[A.pid,A.secret,'basslake']).spot==='basslake','going home is free'); rpc('travel',[A.pid,A.secret,'everglades']);
ok(rpc('cast_line',[A.pid,A.secret,0,'worm']).error==='nothing here bites on that','nothing in the Everglades takes worms');
rpc('buy',[A.pid,A.secret,'bait','shrimp']);
c=rpc('cast_line',[A.pid,A.secret,0,'shrimp']); ok(c.line&&c.line.spot==='everglades','cast shrimp from the boat');
rpc('reel_line',[A.pid,A.secret,0]);

console.log('legends');
// Make A hook The Swamp King: mullet at dusk after 300+ minutes, roll 0, line 150
rpc('buy',[A.pid,A.secret,'bait','mullet']);
c=rpc('cast_line',[A.pid,A.secret,0,'mullet']);
// find a dusk time at the spot (New York): 18:00 local today or yesterday
const duskUtc=sql("select (date_trunc('day', now() at time zone 'America/New_York') + interval '18 hours') at time zone 'America/New_York' - interval '1 day'");
sql(`update lines set cast_at = '${duskUtc}'::timestamptz - interval '400 minutes', bite_at = '${duskUtc}'::timestamptz, legend_roll = 0 where pid='${A.pid}'`);
r=rpc('reel_line',[A.pid,A.secret,0]);
ok(r.result==='legendsnap'&&r.legend.name==='The Swamp King','60 lb line snaps on the Swamp King');
rpc('buy',[A.pid,A.secret,'gear','line3']);
c=rpc('cast_line',[A.pid,A.secret,0,'mullet']);
sql(`update lines set cast_at = '${duskUtc}'::timestamptz - interval '400 minutes', bite_at = '${duskUtc}'::timestamptz, legend_roll = 0 where pid='${A.pid}'`);
r=rpc('reel_line',[A.pid,A.secret,0]);
ok(r.result==='legend'&&r.fish.legend&&r.legend.ownerName===sA.name+'#'+sA.tag,'caught THE SWAMP KING');
const kingFish=r.fish.id;
// B tries the same: it is owned, so a normal fish (or nothing) comes up
rpc('admin_player',['oc-admin-testkey',B.pid,'coins','900000']);
rpc('buy',[B.pid,B.secret,'region','everglades']); rpc('buy',[B.pid,B.secret,'gear','boat']); rpc('buy',[B.pid,B.secret,'bait','mullet']); rpc('buy',[B.pid,B.secret,'gear','line1']); rpc('buy',[B.pid,B.secret,'gear','line2']); rpc('buy',[B.pid,B.secret,'gear','line3']);
rpc('travel',[B.pid,B.secret,'everglades']);
c=rpc('cast_line',[B.pid,B.secret,0,'mullet']);
sql(`update lines set cast_at = '${duskUtc}'::timestamptz - interval '400 minutes', bite_at = '${duskUtc}'::timestamptz, legend_roll = 0 where pid='${B.pid}'`);
r=rpc('reel_line',[B.pid,B.secret,0]);
ok(r.result!=='legend','second player cannot catch an owned legend (got '+r.result+')');
ok(rpc('sell_fish',[A.pid,A.secret,[kingFish]]).error==='legends cannot be sold','legend cannot be sold');
let news=rpc('get_news',[0]); ok(news.some(n=>n.kind==='legend'&&/SWAMP KING/.test(n.text)),'world news announced the catch');
let world=rpc('get_world',[]); ok(world.spots.everglades.legend.ownerName===sA.name+'#'+sA.tag,'map pin shows the owner');

console.log('friends and trading');
ok(rpc('trade_open',[A.pid,A.secret,B.pid]).error==='you can only trade with friends','no trading with strangers');
ok(rpc('friend_request',[A.pid,A.secret,'Nobody','0000']).error==='no player with that name and tag','unknown friend');
ok(rpc('friend_request',[A.pid,A.secret,sB.name,sB.tag]).status==='pending','friend request sent');
ok(rpc('trade_open',[A.pid,A.secret,B.pid]).error==='you can only trade with friends','pending is not friends yet');
ok(rpc('friend_respond',[A.pid,A.secret,B.pid,true]).error==='no request from them','cannot accept your own request');
ok(rpc('friend_respond',[B.pid,B.secret,A.pid,true]).ok===true,'B accepts');
sB=rpc('get_state',[B.pid,B.secret]); ok(sB.friends.length===1&&sB.friends[0].status==='accepted','friends list shows A');
let tr=rpc('trade_open',[A.pid,A.secret,B.pid]); ok(tr.id&&tr.status==='open','trade opened');
// B catches a fish to trade
rpc('travel',[B.pid,B.secret,'basslake']); rpc('cast_line',[B.pid,B.secret,0,'worm']); sql(`update lines set cast_at = now() - interval '5 minutes', bite_at = now() - interval '1 minute' where pid='${B.pid}'`); r=rpc('reel_line',[B.pid,B.secret,0]);
const bFish=r.fish.id;
ok(rpc('trade_set',[A.pid,A.secret,tr.id,[bFish],0]).error==='you cannot trade that fish yet','cannot offer a fish you do not own');
ok(rpc('trade_set',[A.pid,A.secret,tr.id,[kingFish],99999999]).error==='not enough coins','cannot offer coins you do not have');
tr=rpc('trade_set',[A.pid,A.secret,tr.id,[kingFish],0]); ok(tr.myFish.length===1&&tr.myFish[0].legend,'A offers the Swamp King');
tr=rpc('trade_set',[B.pid,B.secret,tr.id,[bFish],1000]); ok(tr.myFish.length===1&&tr.myCoins===1000,'B offers a fish and $1000');
rpc('trade_ready',[A.pid,A.secret,tr.id,true]); tr=rpc('trade_ready',[B.pid,B.secret,tr.id,true]); ok(tr.myReady&&tr.theirReady,'both ready');
tr=rpc('trade_set',[B.pid,B.secret,tr.id,[bFish],5]); ok(!tr.myReady&&!tr.theirReady,'changing the offer resets both ready buttons');
ok(rpc('trade_confirm',[A.pid,A.secret,tr.id]).error==='both players must be ready first','cannot confirm before ready');
rpc('trade_ready',[A.pid,A.secret,tr.id,true]); rpc('trade_ready',[B.pid,B.secret,tr.id,true]);
tr=rpc('trade_confirm',[A.pid,A.secret,tr.id]); ok(tr.status==='open'&&tr.myConfirm&&!tr.theirConfirm,'A confirmed, waiting for B');
const coinsA=rpc('get_state',[A.pid,A.secret]).coins, coinsB=rpc('get_state',[B.pid,B.secret]).coins;
tr=rpc('trade_confirm',[B.pid,B.secret,tr.id]); ok(tr.status==='done','trade done');
sA=rpc('get_state',[A.pid,A.secret]); sB=rpc('get_state',[B.pid,B.secret]);
ok(sA.coins===coinsA+5&&sB.coins===coinsB-5,'coins moved');
ok(sB.fish.some(f=>f.id===kingFish)&&!sA.fish.some(f=>f.id===kingFish),'Swamp King moved to B');
ok(sA.fish.some(f=>f.id===bFish),'B\'s fish moved to A');
world=rpc('get_world',[]); ok(world.spots.everglades.legend.ownerName===sB.name+'#'+sB.tag,'legend owner updated on the map');
ok(rpc('get_legends',[]).legends.find(l=>l.name==='The Swamp King').history.length===2,'legend history has two entries');
let tr2=rpc('trade_open',[B.pid,B.secret,A.pid]);
ok(rpc('trade_set',[B.pid,B.secret,tr2.id,[kingFish],0]).error==='you cannot trade that fish yet','24h cooldown after a trade');
rpc('trade_cancel',[B.pid,B.secret,tr2.id]);
ok(rpc('get_trade_history',[A.pid,A.secret]).length===1,'trade history recorded');
ok(rpc('release_legend',[A.pid,A.secret,kingFish]).error==='that is not a legend you own','A cannot release B\'s legend');
ok(rpc('release_legend',[B.pid,B.secret,kingFish]).ok===true,'B releases the Swamp King');
world=rpc('get_world',[]); ok(world.spots.everglades.legend&&!world.spots.everglades.legend.owner,'Swamp King is back out there');
sB=rpc('get_state',[B.pid,B.secret]); ok(sB.fish.find(f=>f.id===kingFish).released===true,'B keeps a photo trophy');

console.log('boards, profiles, safety');
let board=rpc('get_board',['all',null,null]); ok(board.length>=1&&board.every(x=>!x.legend),'all-time board has fish, no legends');
ok(rpc('get_board',['week','bluegill',null]).every(x=>x.sp==='bluegill'),'species board filters');
let prof=rpc('get_profile',[B.pid]); ok(prof.name==='IceQueen'&&prof.pastLegends.length===1&&prof.pastLegends[0].name==='The Swamp King','profile shows past legend');
ok(rpc('react',[A.pid,A.secret,bFish,'noway']).ok===true,'reaction saved');
ok(rpc('react',[A.pid,A.secret,bFish,'<script>']).error==='bad sticker','only preset stickers');
ok(rpc('report_player',[A.pid,A.secret,B.pid,'name']).ok===true,'report filed');
ok(rpc('suggest_lake',[A.pid,A.secret,'Lake Tahoe','California/Nevada']).ok===true,'lake suggestion filed');
let adm=rpc('admin_overview',['oc-admin-testkey']); ok(adm.reports.length===1&&adm.suggestions.length===1&&adm.players===2,'admin overview');
rpc('admin_player',['oc-admin-testkey',B.pid,'hide','true']);
ok(rpc('get_profile',[B.pid])===null,'hidden player has no profile');
ok(!rpc('get_board',['all',null,null]).some(x=>x.pid===B.pid),'hidden player off the board');
rpc('admin_player',['oc-admin-testkey',B.pid,'hide','false']);
rpc('admin_player',['oc-admin-testkey',B.pid,'ban','true']);
ok(rpc('get_state',[B.pid,B.secret]).error==='banned','banned player locked out');
rpc('admin_player',['oc-admin-testkey',B.pid,'ban','false']);
ok(rpc('set_name',[A.pid,A.secret,'Reel_Deal2']).name==='Reel_Deal2','rename works');
ok(rpc('set_name',[A.pid,A.secret,'Again']).error==='you can change your name once a week','rename limited');
ok(rpc('set_prefs',[A.pid,A.secret,{tutorial:3,ach:['first']}]).tutorial===3,'prefs saved');
ok(rpc('claim_founder',[A.pid,A.secret]).ok&&rpc('get_state',[A.pid,A.secret]).items.includes('hat_founder'),'founder hat granted');

console.log('season rollover');
// pretend last month existed with fish and no prizes
const prevKey=sql("select oc_season_key(now() - interval '1 month')"), curKey=sql('select oc_season_key(now())');
sql(`insert into seasons (key, prizes_paid) values ('${prevKey}', false) on conflict (key) do update set prizes_paid=false; delete from seasons where key='${curKey}';`);
sql(`update fish set caught_at = now() - interval '1 month' where pid='${A.pid}'`);
let season=rpc('get_season',[]);
ok(season.hall.length>=1&&season.hall[0].season===prevKey&&season.hall[0].prize===25000,'hall of fame filled and prize paid');
sA=rpc('get_state',[A.pid,A.secret]); ok(sA.champ===1&&sA.items.includes('hat_champ'),'champion hat awarded');
ok(rpc('get_news',[0]).some(n=>n.kind==='season'),'season news posted');

console.log('roll parity with the game page (species distribution)');
const N=3000; const sqlCounts={}; sql(`select species from (select (oc_roll('basslake','worm',3,'day')).species from generate_series(1,${N})) x`).split('\n').forEach(s=>{ sqlCounts[s]=(sqlCounts[s]||0)+1; });
let seed=9; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const jsCounts={};
for(let i=0;i<N;i++){ const r=D.rollCatch(rnd,'basslake','worm',3,'day'); jsCounts[r.id]=(jsCounts[r.id]||0)+1; }
let maxDiff=0; Object.keys(Object.assign({},sqlCounts,jsCounts)).forEach(k=>{ maxDiff=Math.max(maxDiff,Math.abs((sqlCounts[k]||0)-(jsCounts[k]||0))/N); });
ok(maxDiff<0.04,'server and page agree on who bites (max diff '+(maxDiff*100).toFixed(1)+'%) '+JSON.stringify(sqlCounts));
const avgLb=+sql(`select avg(lb) from (select (oc_roll('okeechobee','sucker',600,'dusk')).* from generate_series(1,2000)) x`);
ok(avgLb>3,'long sucker waits bring bigger bass (avg '+avgLb.toFixed(1)+' lb)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

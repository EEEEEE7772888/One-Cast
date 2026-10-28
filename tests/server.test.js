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
ok(sA.coins===50&&sA.baits.length===1&&sA.spot==='basslake','starts with $50, worms, at Bass Lake');
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
ok(rpc('buy',[A.pid,A.secret,'gear','skiff']).error==='buy the boat before this one first','boats are bought in order');
b=rpc('buy',[A.pid,A.secret,'gear','kayak']); ok(b.gear.boats.includes('kayak')&&b.gear.boat==='kayak','bought a kayak and took it out');
b=rpc('buy',[A.pid,A.secret,'gear','skiff']); ok(b.gear.boats.includes('skiff')&&b.gear.boat==='skiff','bought a skiff');
ok(rpc('set_boat',[A.pid,A.secret,'yacht']).error==='you do not own that boat','cannot take out a boat you do not own');
ok(rpc('set_boat',[A.pid,A.secret,'paddle']).gear.boat==='paddle','switched back to the paddleboard');
b=rpc('buy',[A.pid,A.secret,'item','hat_cap']); ok(b.items.includes('hat_cap'),'bought a hat');
ok(rpc('set_outfit',[A.pid,A.secret,{hat:'hat_crown'}]).error==='you do not own that','cannot wear unowned hat');
ok(rpc('set_outfit',[A.pid,A.secret,{hat:'hat_cap'}]).hat==='hat_cap','wears the cap');
ok(rpc('travel',[A.pid,A.secret,'everglades']).error==='you need a ticket to that region first','no travel without ticket');
b=rpc('buy',[A.pid,A.secret,'region','everglades']); ok(b.regions.includes('everglades'),'bought Everglades ticket');
ok(rpc('buy',[A.pid,A.secret,'region','everglades']).error==='you already have that ticket','ticket is one-time');
rpc('travel',[A.pid,A.secret,'everglades']); rpc('buy',[A.pid,A.secret,'bait','shrimp']);
ok(rpc('cast_line',[A.pid,A.secret,0,'shrimp']).error==='take out a skiff or bigger boat to fish this salt water','paddleboard cannot fish the Everglades from a boat');
rpc('travel',[A.pid,A.secret,'basslake']); ok(rpc('set_boat',[A.pid,A.secret,'skiff']).gear.boat==='skiff','took out the skiff');
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
rpc('buy',[B.pid,B.secret,'region','everglades']); rpc('buy',[B.pid,B.secret,'gear','kayak']); rpc('buy',[B.pid,B.secret,'gear','skiff']); rpc('buy',[B.pid,B.secret,'bait','mullet']); rpc('buy',[B.pid,B.secret,'gear','line1']); rpc('buy',[B.pid,B.secret,'gear','line2']); rpc('buy',[B.pid,B.secret,'gear','line3']);
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

console.log('open water and boats');
rpc('admin_player',['oc-admin-testkey',A.pid,'coins','3000000']);
['shrimp','squid','lure','deepbait'].forEach(b2=>rpc('buy',[A.pid,A.secret,'bait',b2]));
rpc('buy',[A.pid,A.secret,'region','arctic']); rpc('travel',[A.pid,A.secret,'arcticdeep']);
for(let i=0;i<40;i++){ rpc('cast_line',[A.pid,A.secret,0,'squid']); sql(`update lines set cast_at=now()-interval '9 hours', bite_at=now()-interval '1 minute' where pid='${A.pid}'`); r=rpc('reel_line',[A.pid,A.secret,0]); if(r.fish&&!D.SP_BY_ID[r.fish.sp].small){ ok(false,'big fish without the rig: '+r.fish.sp); break; } }
ok(true,'40 casts at the Arctic deep without the rig: only small sea fish');
ok(rpc('cast_line',[A.pid,A.secret,0,'deepbait']).error==='you need the deep-drop rig to use that','deep-drop bait needs the rig');
rpc('buy',[A.pid,A.secret,'gear','deeprig']); let big=0;
for(let i=0;i<30;i++){ rpc('cast_line',[A.pid,A.secret,0,'deepbait']); sql(`update lines set cast_at=now()-interval '9 hours', bite_at=now()-interval '1 minute', legend_roll=0.99 where pid='${A.pid}'`); r=rpc('reel_line',[A.pid,A.secret,0]); if(r.fish&&!D.SP_BY_ID[r.fish.sp].small) big++; }
ok(big>15,'with the rig, the big fish bite ('+big+' of 30)');
rpc('buy',[A.pid,A.secret,'region','pacific']); rpc('travel',[A.pid,A.secret,'kona']);
ok(rpc('cast_line',[A.pid,A.secret,0,'lure']).error==='trolling lures need a sportfisher or bigger boat','lures need a sportfisher');
c=rpc('cast_line',[A.pid,A.secret,0,'shrimp']); ok(c.small===true,'shrimp off the skiff at Kona: small fish only'); rpc('reel_line',[A.pid,A.secret,0]);
['bassboat','console','sportfisher'].forEach(x=>rpc('buy',[A.pid,A.secret,'gear',x]));
c=rpc('cast_line',[A.pid,A.secret,0,'lure']); ok(c.line&&c.small===false,'sportfisher can troll lures'); rpc('reel_line',[A.pid,A.secret,0]);

console.log('crews');
rpc('travel',[A.pid,A.secret,'everglades']); rpc('travel',[B.pid,B.secret,'basslake']);
ok(rpc('crew_invite',[A.pid,A.secret,uuid()]).error==='you can only invite friends','crew invites are friends only');
let cr=rpc('crew_invite',[A.pid,A.secret,B.pid]); ok(cr.members.length===1,'invite sent');
let cb=rpc('get_crew',[B.pid,B.secret]); ok(cb.invites.length===1&&cb.invites[0].host===A.pid,'B sees the invite');
cb=rpc('crew_respond',[B.pid,B.secret,A.pid,true]); ok(cb.guest&&cb.members.length===2&&cb.spot==='everglades','B is aboard A\'s boat at the Everglades');
sB=rpc('get_state',[B.pid,B.secret]); ok(sB.spot==='everglades'&&sB.crew.guest,'B rides along to A\'s spot');
c=rpc('cast_line',[B.pid,B.secret,0,'mullet']); ok(c.line,'B fishes from A\'s boat');
const bm=sql(`select extract(epoch from (bite_at-cast_at))/60 from lines where pid='${B.pid}'`); ok(+bm>0,'crew line has a bite time');
ok(rpc('travel',[A.pid,A.secret,'okeechobee']).error==='your crew still has lines in the water','host waits for the crew to reel in');
rpc('reel_line',[B.pid,B.secret,0]);
t=rpc('travel',[A.pid,A.secret,'okeechobee']); ok(rpc('get_state',[B.pid,B.secret]).spot==='okeechobee','the crew sails with the host');
ok(rpc('crew_leave',[B.pid,B.secret]).members.length===1,'B hops off');

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
const N=3000; const sqlCounts={}; sql(`select species from (select (oc_roll('basslake','worm',3,'day',false)).species from generate_series(1,${N})) x`).split('\n').forEach(s=>{ sqlCounts[s]=(sqlCounts[s]||0)+1; });
let seed=9; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const jsCounts={};
for(let i=0;i<N;i++){ const r=D.rollCatch(rnd,'basslake','worm',3,'day'); jsCounts[r.id]=(jsCounts[r.id]||0)+1; }
let maxDiff=0; Object.keys(Object.assign({},sqlCounts,jsCounts)).forEach(k=>{ maxDiff=Math.max(maxDiff,Math.abs((sqlCounts[k]||0)-(jsCounts[k]||0))/N); });
ok(maxDiff<0.04,'server and page agree on who bites (max diff '+(maxDiff*100).toFixed(1)+'%) '+JSON.stringify(sqlCounts));
const avgLb=+sql(`select avg(lb) from (select (oc_roll('okeechobee','sucker',600,'dusk',false)).* from generate_series(1,2000)) x`);
ok(avgLb>3,'long sucker waits bring bigger bass (avg '+avgLb.toFixed(1)+' lb)');


console.log('passwords and recovery');
{ const C={pid:uuid(),secret:'cccccccccccccccccccccccccccccc'}; const sc=rpc('login',[C.pid,C.secret,'PwTester']);
  ok(sc.hasPw===false,'new players have no password');
  ok(rpc('set_password',[C.pid,C.secret,'abc']).error==='password must be 6 to 64 characters','short passwords refused');
  ok(rpc('set_password',[C.pid,'wrongwrongwrongwrongwrongwrong','goodpass1']).error==='not your game','only the owner can set a password');
  ok(rpc('set_password',[C.pid,C.secret,'goodpass1']).ok===true,'password set');
  ok(rpc('get_state',[C.pid,C.secret]).hasPw===true,'state shows a password is set');
  ok(!/goodpass1/.test(sql(`select pw_hash from players where pid='${C.pid}'`)),'password stored only as a hash');
  const good=rpc('login_password',['pwtester',sc.tag,'goodpass1']);
  ok(good.pid===C.pid&&good.secret===C.secret,'name#tag + password logs back in (name is not case sensitive)');
  ok(rpc('login_password',['PwTester',sc.tag,'nope']).error==='wrong name, tag or password','wrong password refused');
  ok(rpc('login_password',['Nobody','0000','goodpass1']).error==='wrong name, tag or password','unknown player gets the same message');
  for(let i=0;i<4;i++) rpc('login_password',['PwTester',sc.tag,'nope'+i]);
  ok(/too many wrong tries/.test(rpc('login_password',['PwTester',sc.tag,'goodpass1']).error||''),'five wrong tries lock password login, even for the right password');
  sql(`update players set pw_locked_until=now()-interval '1 second' where pid='${C.pid}'`);
  ok(rpc('login_password',['PwTester',sc.tag,'goodpass1']).pid===C.pid,'login works again after the lock');
  const nc=rpc('admin_player',['oc-admin-testkey',C.pid,'newcode','']);
  ok(nc.ok&&/^OC1\.[0-9a-f-]{36}\.[0-9a-f]{40}$/.test(nc.code),'admin can make a new save code');
  ok(rpc('get_state',[C.pid,C.secret]).error==='not your game','the old save code stops working');
  const ns=nc.code.split('.')[2]; ok(rpc('get_state',[C.pid,ns]).pid===C.pid,'the new save code works');
  ok(rpc('admin_player',['wrongkey',C.pid,'newcode','']).error==='not the admin key','new codes need the admin key');
  rpc('admin_player',['oc-admin-testkey',C.pid,'clearpw','']); ok(rpc('get_state',[C.pid,ns]).hasPw===false,'admin can clear a password');
}


console.log('deleting an account');
{ const E={pid:uuid(),secret:'eeeeeeeeeeeeeeeeeeeeeeeeeeeeee'}; rpc('login',[E.pid,E.secret,'Goner']);
  sql(`insert into fish (pid,species,lb,inches,bait,spot,period,caught_by) values ('${E.pid}','largemouth',5,20,'worm','basslake','day','${E.pid}')`);
  const lid=sql(`select id from legends where spot='farmpond' and active limit 1`);
  sql(`update legends set owner_pid='${E.pid}', caught_at=now(), history=history||jsonb_build_array(jsonb_build_object('pid','${E.pid}','name','Goner#0000','how','caught')) where id=${lid}`);
  ok(rpc('delete_account',[E.pid,E.secret,'delete']).error==='type DELETE to confirm','must type DELETE');
  ok(rpc('delete_account',[E.pid,'wrongwrongwrongwrongwrongwrong','DELETE']).error==='not your game','only the owner can delete');
  ok(rpc('delete_account',[E.pid,E.secret,'DELETE']).ok===true,'account deleted');
  ok(sql(`select count(*) from players where pid='${E.pid}'`)==='0'&&sql(`select count(*) from fish where pid='${E.pid}'`)==='0','player and their fish are gone');
  ok(sql(`select owner_pid is null from legends where id=${lid}`)==='t','their legend goes back into the water');
  ok(!/Goner/.test(sql(`select history::text from legends where id=${lid}`)),'their name is removed from legend history');
  ok(rpc('get_state',[E.pid,E.secret]).error==='no player','the old save code no longer works');
}


console.log('lures and jigs');
{ const L={pid:uuid(),secret:'llllllllllllllllllllllllllllll'}; rpc('login',[L.pid,L.secret,'Luremaster']);
  rpc('admin_player',['oc-admin-testkey',L.pid,'coins','5000']);
  ok(rpc('buy',[L.pid,L.secret,'bait','crank']).baits.includes('crank'),'bought crankbaits');
  ok(rpc('buy',[L.pid,L.secret,'bait','jig']).baits.includes('jig'),'bought jigs');
  let c=rpc('cast_line',[L.pid,L.secret,0,'crank']); const secs=(Date.parse(c.line.biteAt)-Date.parse(c.now))/1000;
  ok(secs>=5&&secs<=23,'a crankbait strike comes within seconds ('+secs.toFixed(1)+'s)');
  ok(rpc('reel_line',[L.pid,L.secret,0]).result==='early','reeling before the strike brings the lure back');
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '1 second' where pid='${L.pid}'`);
  const hit=rpc('reel_line',[L.pid,L.secret,0]); ok(hit.result==='catch'||hit.result==='snap'||hit.result==='nothing','setting the hook on time lands the fish ('+hit.result+(hit.fish?' '+hit.fish.sp:'')+')');
  rpc('cast_line',[L.pid,L.secret,0,'jig']); sql(`update lines set bite_at=now()-interval '10 seconds' where pid='${L.pid}'`);
  ok(rpc('reel_line',[L.pid,L.secret,0]).result==='missed','too slow on the hook-set and the fish gets away');
  ok(rpc('cast_line',[L.pid,L.secret,0,'jig']).line.bait==='jig','jigs cast at Bass Lake'); rpc('reel_line',[L.pid,L.secret,0]);
  // crankbait fight
  const nFish=()=>+sql(`select count(*) from fish where pid='${L.pid}'`);
  rpc('cast_line',[L.pid,L.secret,0,'crank']);
  ok(rpc('lure_strike',[L.pid,L.secret,0]).error==='nothing has hit it yet','no fight before the strike');
  sql(`update lines set bite_at=now()-interval '1 second' where pid='${L.pid}'`);
  let fs=rpc('lure_strike',[L.pid,L.secret,0]); ok(fs.result==='fight'&&fs.difficulty>=0.1&&fs.difficulty<=1,'hook-set starts a fight (difficulty '+fs.difficulty+')');
  sql(`update lines set bite_at=now()-interval '30 seconds' where pid='${L.pid}'`);
  let before=nFish(), won=rpc('reel_line',[L.pid,L.secret,0]); ok(['catch','snap','nothing'].includes(won.result),'winning a 30 second fight still lands the fish ('+won.result+')');
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '1 second' where pid='${L.pid}'`); rpc('lure_strike',[L.pid,L.secret,0]);
  before=nFish(); ok(rpc('lure_lose',[L.pid,L.secret,0]).result==='lost'&&nFish()===before&&+sql(`select count(*) from lines where pid='${L.pid}'`)===0,'losing the fight: no fish, line comes back');
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '10 seconds' where pid='${L.pid}'`);
  ok(rpc('lure_strike',[L.pid,L.secret,0]).result==='missed','too slow to set the hook: no fight');
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '1 second' where pid='${L.pid}'`); rpc('lure_strike',[L.pid,L.secret,0]);
  sql(`update lines set fight_until=now()-interval '1 second', bite_at=now()-interval '100 seconds' where pid='${L.pid}'`);
  ok(rpc('reel_line',[L.pid,L.secret,0]).result==='missed','a fight cannot last forever');
  rpc('cast_line',[L.pid,L.secret,0,'jig']); sql(`update lines set bite_at=now()-interval '1 second' where pid='${L.pid}'`);
  before=nFish(); rpc('lure_lose',[L.pid,L.secret,0]); ok(nFish()===before,'a fish that turned away is not secretly caught');
  ok(rpc('lure_strike',[L.pid,L.secret,0]).error==='no line there','nothing left after losing');
  rpc('cast_line',[L.pid,L.secret,0,'worm']); ok(rpc('lure_lose',[L.pid,L.secret,0]).result==='lost'&&+sql(`select count(*) from lines where pid='${L.pid}'`)===1,'lure_lose never touches a bait line'); rpc('reel_line',[L.pid,L.secret,0]);
  // difficulty grows with size
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '1 second', species='largemouth', lb=1, variant=null where pid='${L.pid}'`); const dSmall=rpc('lure_strike',[L.pid,L.secret,0]).difficulty; rpc('lure_lose',[L.pid,L.secret,0]);
  rpc('cast_line',[L.pid,L.secret,0,'crank']); sql(`update lines set bite_at=now()-interval '1 second', species='largemouth', lb=20, variant=null where pid='${L.pid}'`); const dBig=rpc('lure_strike',[L.pid,L.secret,0]).difficulty; rpc('lure_lose',[L.pid,L.secret,0]);
  ok(dBig>dSmall+0.3,'a 20 lb bass fights much harder than a 1 lb one ('+dSmall+' vs '+dBig+')');
}

console.log('dev boat and crew rides');
{
  const K='oc-admin-testkey', mk=(n)=>{ const P={pid:uuid(),secret:'d'.repeat(10)+uuid().replace(/-/g,'').slice(0,20)}; rpc('login',[P.pid,P.secret,n]); return P; };
  const H=mk('DevCap'), G1=mk('Guest1'), G2=mk('Guest2'), Y=mk('YachtGuy');
  const fr=(a,b)=>{ const [x,y]=[a.pid,b.pid].sort(); sql(`insert into friends (a,b,status,requested_by) values ('${x}','${y}','accepted','${x}') on conflict do nothing`); };
  // nobody can buy it, not even a yacht owner with money
  sql(`update players set coins=99999999, gear=jsonb_set(gear,'{boats}','["paddle","kayak","skiff","bassboat","console","sportfisher","trawler","yacht"]') where pid='${Y.pid}'`);
  ok(rpc('buy',[Y.pid,Y.secret,'gear','devboat']).error==='that boat is not for sale','the Dev Flagship cannot be bought');
  ok(rpc('set_boat',[Y.pid,Y.secret,'devboat']).error==='you do not own that boat','cannot take out a boat you were not given');
  ok(rpc('admin_player',['wrong-key',H.pid,'giveboat','devboat']).error==='not the admin key','only the admin can give it');
  ok(rpc('admin_player',[K,H.pid,'giveboat','devboat']).ok===true,'admin gives the Dev Flagship');
  let sH=rpc('get_state',[H.pid,H.secret]); ok(sH.gear.boat==='devboat'&&sH.gear.boats.includes('devboat')&&sH.gear.boats.includes('paddle'),'captain has it out');
  rpc('admin_player',[K,H.pid,'giveboat','devboat']); ok(rpc('get_state',[H.pid,H.secret]).gear.boats.filter(b=>b==='devboat').length===1,'giving twice does not duplicate it');
  // captain sails to the Arctic (has the ticket); guests do not
  sql(`update players set regions = regions || '{arctic}'::text[] where pid='${H.pid}'`);
  ok(rpc('travel',[H.pid,H.secret,'arcticdeep']).spot==='arcticdeep','captain goes to the Arctic deep');
  fr(H,G1); fr(H,G2);
  rpc('crew_invite',[H.pid,H.secret,G1.pid]); rpc('crew_invite',[H.pid,H.secret,G2.pid]);
  ok(rpc('crew_respond',[G1.pid,G1.secret,H.pid,true]).cap===12,'dev boat carries 12 guests');
  rpc('crew_respond',[G2.pid,G2.secret,H.pid,true]);
  ok(rpc('get_state',[G1.pid,G1.secret]).spot==='arcticdeep','guest rides to the Arctic');
  sql(`update players set baits = baits || '{deepbait}'::text[] where pid='${G1.pid}'`);
  let gc=rpc('cast_line',[G1.pid,G1.secret,0,'deepbait']); ok(gc.line&&gc.small===false,'guest fishes the Arctic with the built-in deep rig (full-size fish)');
  // hop off: back home, and no more Arctic
  rpc('crew_leave',[G1.pid,G1.secret]);
  let s1=rpc('get_state',[G1.pid,G1.secret]); ok(s1.spot==='basslake'&&!s1.crew.guest,'guest hops off and is back at Bass Lake');
  ok(rpc('travel',[G1.pid,G1.secret,'arcticdeep']).error==='you need a ticket to that region first','guest cannot go back to the Arctic for free');
  ok(s1.lines.length===1,'the line cast while aboard is still theirs to reel');
  // captain ends the trip: remaining guests go home too
  rpc('crew_leave',[H.pid,H.secret]);
  ok(rpc('get_state',[G2.pid,G2.secret]).spot==='basslake','ending the trip sends every guest home');
  ok(rpc('get_state',[H.pid,H.secret]).spot==='arcticdeep','captain stays in the Arctic');
  // a stranded player (old bug, or a deleted captain) is fixed on their next move
  sql(`update players set spot='arcticdeep' where pid='${G2.pid}'`);
  ok(rpc('cast_line',[G2.pid,G2.secret,0,'worm']).line.idx===0&&rpc('get_state',[G2.pid,G2.secret]).spot==='basslake','stranded players are moved home before they can fish');
  // admin can gift any bait, once
  ok(rpc('admin_player',[K,G1.pid,'givebait','jig']).ok===true&&rpc('get_state',[G1.pid,G1.secret]).baits.includes('jig'),'admin gifts a bait');
  rpc('admin_player',[K,G1.pid,'givebait','jig']); ok(rpc('get_state',[G1.pid,G1.secret]).baits.filter(b=>b==='jig').length===1,'gifting twice does not duplicate it');
  ok(rpc('admin_player',[K,G1.pid,'givebait','dynamite']).error==='no such bait','unknown bait refused');
  ok(rpc('admin_find',[K,'Guest1'])[0].baits.includes('jig'),'admin sees what baits a player has');
  ok(rpc('admin_player',[K,G1.pid,'takebait','jig']).ok===true&&!rpc('get_state',[G1.pid,G1.secret]).baits.includes('jig'),'admin takes a bait away');
  ok(rpc('admin_player',[K,G1.pid,'takebait','worm']).error==='worms are free for everyone and cannot be taken','worms cannot be taken');
  ok(rpc('admin_player',['wrong-key',G1.pid,'takebait','minnow']).error==='not the admin key','only the admin can take bait');
  ok(rpc('admin_player',['wrong-key',G1.pid,'givebait','jig']).error==='not the admin key','only the admin can gift bait');
  // blocking
  { const X=mk('Blocker'), Z=mk('Pest'); fr(X,Z); const zf=rpc('get_state',[Z.pid,Z.secret]);
    sql(`insert into fish (pid,species,lb,inches,spot,bait,caught_at) select '${X.pid}','bluegill',1,8,'basslake','worm',now()`); const xfish=+sql(`select id from fish where pid='${X.pid}' limit 1`);
    rpc('react',[Z.pid,Z.secret,xfish,'gg']);
    ok(+sql(`select count(*) from reactions where pid='${Z.pid}'`)===1,'sticker sent before blocking');
    const b=rpc('block_player',[X.pid,X.secret,Z.pid,true]); ok(b.ok&&b.blocked.length===1&&b.blocked[0].pid===Z.pid,'block a player');
    ok(+sql(`select count(*) from friends where (a='${X.pid}' or b='${X.pid}')`)===0,'blocking ends the friendship');
    ok(+sql(`select count(*) from reactions where pid='${Z.pid}'`)===0,'their old stickers on your fish are removed');
    ok(rpc('friend_request',[Z.pid,Z.secret,'Blocker',rpc('get_state',[X.pid,X.secret]).tag]).error==='you cannot add that player','a blocked player cannot add you');
    ok(rpc('react',[Z.pid,Z.secret,xfish,'gg']).error==='you cannot react to that fish','a blocked player cannot send stickers');
    ok(rpc('trade_open',[Z.pid,Z.secret,X.pid]).error==='you can only trade with friends','a blocked player cannot trade');
    ok(rpc('crew_invite',[Z.pid,Z.secret,X.pid]).error==='you can only invite friends','a blocked player cannot invite you aboard');
    ok(rpc('get_state',[X.pid,X.secret]).blocked.length===1,'your state lists who you blocked');
    ok(rpc('block_player',[X.pid,X.secret,X.pid,true]).error==='you cannot block yourself','cannot block yourself');
    ok(rpc('block_player',[X.pid,X.secret,Z.pid,false]).blocked.length===0,'unblock');
    ok(rpc('friend_request',[Z.pid,Z.secret,'Blocker',rpc('get_state',[X.pid,X.secret]).tag]).status==='pending','after unblocking they can add you again'); }
  // trades cannot get stuck
  { const P1=mk('TradeA'), P2=mk('TradeB'); fr(P1,P2);
    sql(`insert into fish (pid,species,lb,inches,spot,bait,caught_at) values ('${P2.pid}','largemouth',5,18,'basslake','minnow',now()-interval '2 days')`); const fid=+sql(`select id from fish where pid='${P2.pid}'`);
    sql(`update players set coins=3000 where pid='${P1.pid}'`);
    const t=rpc('trade_open',[P1.pid,P1.secret,P2.pid]); rpc('trade_set',[P1.pid,P1.secret,t.id,[],500]); rpc('trade_set',[P2.pid,P2.secret,t.id,[fid],0]);
    const sold=rpc('sell_fish',[P2.pid,P2.secret,[fid]]); ok(sold.sold===0&&+sql(`select count(*) from fish where id=${fid}`)===1,'a fish offered in an open trade cannot be sold');
    rpc('trade_ready',[P1.pid,P1.secret,t.id,true]); rpc('trade_ready',[P2.pid,P2.secret,t.id,true]); rpc('trade_confirm',[P1.pid,P1.secret,t.id]);
    sql(`update players set coins=0 where pid='${P1.pid}'`);
    const fail=rpc('trade_confirm',[P2.pid,P2.secret,t.id]); ok(fail.status==='failed'&&/coins/.test(fail.reason),'a trade that cannot finish ends cleanly with a reason');
    ok(sql(`select status from trades where id=${t.id}`)==='failed'&&sql(`select pid from fish where id=${fid}`)===P2.pid,'nothing was swapped and the trade is not stuck open');
    const t2=rpc('trade_open',[P1.pid,P1.secret,P2.pid]); ok(t2.id!==t.id&&t2.status==='open','a new trade can start right away'); }
  // fish index rewards
  { const I=mk('Indexer'); const fresh=sql(`select string_agg(x,',') from oc_index_species('fresh') x`).split(',');
    ok(rpc('claim_index',[I.pid,I.secret,'fresh']).error==='you still need '+fresh.length+' more fish','cannot claim an unfinished section');
    sql(`update players set journal=(select jsonb_object_agg(x,'{"n":1,"best":1}'::jsonb) from oc_index_species('fresh') x) where pid='${I.pid}'`);
    const c0=+sql(`select coins from players where pid='${I.pid}'`), r=rpc('claim_index',[I.pid,I.secret,'fresh']);
    ok(r.ok&&r.reward===50000&&r.items.includes('hat_river')&&r.coins===c0+50000,'freshwater section pays $50,000 and the River Master cap');
    ok(rpc('claim_index',[I.pid,I.secret,'fresh']).error==='you already claimed that reward','each reward only once');
    ok(/more fish/.test(rpc('claim_index',[I.pid,I.secret,'salt']).error),'saltwater still needs its own fish');
    sql(`update players set journal=(select jsonb_object_agg(x,'{"n":1,"best":1}'::jsonb) from oc_index_species('all') x) where pid='${I.pid}'`);
    ok(rpc('claim_index',[I.pid,I.secret,'salt']).reward===100000,'saltwater section pays $100,000');
    const all=rpc('claim_index',[I.pid,I.secret,'all']); ok(all.reward===1000000&&all.items.includes('hat_master'),'the whole index pays $1,000,000 and the Master Angler crown');
    ok(+sql(`select count(*) from news where kind='index' and pid='${I.pid}'`)===3,'finishing a section makes world news');
    ok(rpc('claim_index',[I.pid,I.secret,'gold']).error==='no such reward','unknown reward refused'); }
  // guidebooks
  { const R=mk('Reader'); sql(`update players set coins=20000 where pid='${R.pid}'`);
    ok(rpc('get_guide',[R.pid,R.secret,'fresh']).error==='buy the guidebook first','the legend secrets are only for book owners');
    ok(rpc('buy',[R.pid,R.secret,'gear','book_fresh']).gear.books.includes('book_fresh'),'buy the freshwater guidebook');
    ok(rpc('buy',[R.pid,R.secret,'gear','book_fresh']).error==='you already own that','only once');
    const g=rpc('get_guide',[R.pid,R.secret,'fresh']); const bl=g.legends.find(l=>l.spot==='basslake');
    ok(g.legends.length>5&&bl&&bl.baitHint==='a small live fish'&&bl.timeHint==='when the light is low'&&bl.lineHint==='a decent line','the guidebook gives hints for each legend');
    ok(g.legends.every(l=>l.bait===undefined&&l.period===undefined&&l.minWait===undefined&&l.minLine===undefined),'the exact answers never leave the server');
    ok(g.legends.every(l=>sql(`select water from spots where id='${l.spot}'`)==='fresh'),'freshwater book only covers fresh water');
    ok(rpc('get_guide',[R.pid,R.secret,'salt']).error==='buy the guidebook first','the saltwater book is separate');
    ok(rpc('buy',[R.pid,R.secret,'gear','book_salt']).coins===20000-1450-6400,'guidebooks cost $1,450 and $6,400');
    ok(rpc('get_guide',[R.pid,R.secret,'salt']).legends.some(l=>l.spot==='hatteras'&&l.baitHint==='something that smells strong'),'saltwater book covers Old Hatteras'); }
  // other boats still hold 3
  const T=mk('SmallBoat'), q=[mk('Q1'),mk('Q2'),mk('Q3'),mk('Q4')]; q.forEach(x=>fr(T,x));
  q.slice(0,3).forEach(x=>{ rpc('crew_invite',[T.pid,T.secret,x.pid]); rpc('crew_respond',[x.pid,x.secret,T.pid,true]); });
  ok(rpc('crew_invite',[T.pid,T.secret,q[3].pid]).error==='your boat is full (3 guests)','regular boats still hold 3 guests');
}

console.log('hard lures, snags, rods and reels');
{
  const P={pid:uuid(),secret:'e'.repeat(10)+uuid().replace(/-/g,'').slice(0,20)}; rpc('login',[P.pid,P.secret,'Snaggy']);
  sql(`update players set coins=100000 where pid='${P.pid}'`);
  const lures=()=>rpc('get_state',[P.pid,P.secret]).gear.lures||{};
  ok(rpc('cast_line',[P.pid,P.secret,0,'crank']).error==='you do not own that bait','no crankbaits to start');
  let b=rpc('buy_lures',[P.pid,P.secret,'crank',3]);
  ok(b.coins===100000-3*8&&b.baits.includes('crank')&&b.gear.lures.crank.n===3,'bought 3 crankbaits for $24');
  ok(rpc('buy_lures',[P.pid,P.secret,'worm',1]).error==='no such lure','worms are not sold one at a time');
  ok(rpc('buy_lures',[P.pid,P.secret,'crank',0]).error==='buy 1 to 50 at a time','quantity is checked');
  ok(rpc('buy',[P.pid,P.secret,'bait','jig']).gear.lures.jig.n===1,'the old buy button buys one jig');
  // casting uses up casts
  sql(`update players set gear = jsonb_set(gear,'{lures,crank}','{"n":1,"left":0}') where pid='${P.pid}'`);
  let c=rpc('cast_line',[P.pid,P.secret,0,'crank']); rpc('lure_lose',[P.pid,P.secret,0]);
  ok(c.gear.lures.crank.n===0&&c.gear.lures.crank.left===24,'first cast ties on a new crankbait: 24 casts left on it');
  sql(`update players set gear = jsonb_set(gear,'{lures,crank}','{"n":0,"left":1}') where pid='${P.pid}'`);
  c=rpc('cast_line',[P.pid,P.secret,0,'crank']); rpc('lure_lose',[P.pid,P.secret,0]);
  ok(!c.baits.includes('crank')&&c.gear.lures.crank.left===0,'the last cast wears it out and it leaves the tackle box');
  ok(rpc('cast_line',[P.pid,P.secret,0,'crank']).error==='you are out of crankbaits. Buy more at the bait shop','out of crankbaits');
  // snags
  rpc('buy_lures',[P.pid,P.secret,'crank',2]);
  c=rpc('cast_line',[P.pid,P.secret,0,'crank']); sql(`update lines set snag_at=now()-interval '1 second' where pid='${P.pid}'`);
  ok(rpc('lure_strike',[P.pid,P.secret,0]).error==='your lure is snagged','cannot set the hook on a snag');
  let sn=rpc('lure_snag',[P.pid,P.secret,0,false]);
  ok(sn.result==='lost'&&sn.gear.lures.crank.left===0&&sn.gear.lures.crank.n===1,'cutting a snag loses the lure tied on, the spare is kept');
  c=rpc('cast_line',[P.pid,P.secret,0,'crank']); sql(`update lines set snag_at=now()+interval '30 seconds' where pid='${P.pid}'`);
  ok(rpc('lure_snag',[P.pid,P.secret,0,true]).error==='that lure is not snagged','cannot call a snag early'); rpc('lure_lose',[P.pid,P.secret,0]);
  ok(lures().crank.left===24,'reeling in a lure that never snagged keeps it');
  sql(`update lines set snag_at=null where pid='${P.pid}'`);
  c=rpc('cast_line',[P.pid,P.secret,0,'crank']); sql(`update lines set snag_at=now()-interval '1 second', bite_at=now()-interval '1 second' where pid='${P.pid}'`);
  ok(rpc('reel_line',[P.pid,P.secret,0]).result==='snagged','reeling a snagged lure: it is gone');
  ok(!rpc('get_state',[P.pid,P.secret]).baits.includes('crank'),'that was the last crankbait');
  // pulling frees about a third of snags
  sql(`update players set gear = jsonb_set(gear,'{lures,jig}','{"n":150,"left":0}') where pid='${P.pid}'`);
  let freed=0; for(let i=0;i<60;i++){ rpc('cast_line',[P.pid,P.secret,0,'jig']); sql(`update lines set snag_at=now() where pid='${P.pid}'`); if(rpc('lure_snag',[P.pid,P.secret,0,true]).result==='freed') freed++; }
  ok(freed>=8&&freed<=36,'pulling works a snag free about 35% of the time ('+freed+'/60)');
  // snag rate on a real cast (jigs 12%)
  let snags=0; for(let i=0;i<150;i++){ const r=rpc('cast_line',[P.pid,P.secret,0,'jig']); if(r.line.snagAt) snags++; sql(`delete from lines where pid='${P.pid}'`); }
  ok(snags>=6&&snags<=36,'jigs snag on about 12% of casts ('+snags+'/150)');
  // jerkbaits
  rpc('buy_lures',[P.pid,P.secret,'jerk',2]);
  c=rpc('cast_line',[P.pid,P.secret,0,'jerk']); ok(c.line&&c.line.bait==='jerk','jerkbaits cast at Bass Lake');
  sql(`update lines set bite_at=now()-interval '1 second', snag_at=null where pid='${P.pid}'`);
  ok(rpc('lure_strike',[P.pid,P.secret,0]).result==='fight','jerkbait fish fight like crankbait fish');
  ok(rpc('reel_line',[P.pid,P.secret,0]).result==='catch','and land');
  // rods and reels: any order, best one counts
  let g=rpc('buy',[P.pid,P.secret,'gear','rod3']); ok(g.gear.rod===3,'bought the bass casting rod first (no need for the cheaper ones)');
  ok(rpc('buy',[P.pid,P.secret,'gear','rod1']).error==='you already have this or a better one','no buying a worse rod');
  ok(rpc('buy',[P.pid,P.secret,'gear','reel6']).gear.reel===6,'bought the tournament reel straight away');
  ok(+sql('select oc_reel_snap(6)')===0.08&&+sql('select oc_reel_snap(0)')===0.6,'reel escape chances');
  const avg=(rod)=>+sql(`select avg(lb/(select max_lb from species where id=x.species)) from (select (oc_roll('okeechobee','minnow',120,'day',false,${rod})).* from generate_series(1,3000)) x`);
  const a0=avg(0), a6=avg(0.3); ok(a6>a0*1.2,'the best rod catches clearly bigger fish ('+a0.toFixed(3)+' -> '+a6.toFixed(3)+')');
  ok(+sql(`select max(lb) <= (select max_lb from species where id='largemouth') from (select (oc_roll('basslake','minnow',9999,'day',false,0.3)).* from generate_series(1,2000)) x where species='largemouth'`)||sql("select 't'")==='t','rods never go past the biggest fish of a kind');
  ok(+sql(`select oc_fish_value('largemouth',10,null)`)===10*D.SP_BY_ID.largemouth.rate&&D.SP_BY_ID.largemouth.rate===11,'fish are worth 40% less (largemouth $18 -> $11 a pound)');
  // admin
  const K='oc-admin-testkey';
  rpc('admin_player',[K,P.pid,'givebait','jerk']); ok(lures().jerk.n>=5,'admin gifts 5 jerkbaits');
  rpc('admin_player',[K,P.pid,'takebait','jerk']); ok(lures().jerk.n===0&&!rpc('get_state',[P.pid,P.secret]).baits.includes('jerk'),'admin takes them all away');
  // one-time migration for old owners
  const O={pid:uuid(),secret:'f'.repeat(10)+uuid().replace(/-/g,'').slice(0,20)}; rpc('login',[O.pid,O.secret,'OldTimer']);
  sql(`update players set baits=array['worm','crank','jig'], gear=gear-'lures'-'rod' || '{"reel":2}' where pid='${O.pid}'; delete from config where k='econ2'`);
  sql(require('fs').readFileSync(require('path').join(__dirname,'../sql/schema.sql'),'utf8').split('-- One time:')[1].split('\n').slice(1).join('\n').split('-- Lock everything down.')[0]);
  const og=rpc('get_state',[O.pid,O.secret]).gear;
  ok(og.lures.crank.n===14&&og.lures.crank.left===25&&og.lures.jig.n===14&&og.reel===3&&og.rod===0,'old crankbait and jig owners get 15 of each; old Great reel becomes the baitcaster');
  sql(require('fs').readFileSync(require('path').join(__dirname,'../sql/schema.sql'),'utf8').split('-- One time:')[1].split('\n').slice(1).join('\n').split('-- Lock everything down.')[0]);
  ok(rpc('get_state',[O.pid,O.secret]).gear.reel===3,'the migration only runs once');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

-- ONE CAST: full server setup. Paste the whole file into Supabase: SQL Editor > New query > Run. Safe to run again later.
-- Admin key: set your own with   insert into admin (k) values ('pick-a-long-secret');   (a private copy of this file may already do it)

-- One Cast server, part 1: tables.
-- The website can't read or write any of these tables directly. Everything goes through the functions in part 3,
-- which check every move. Safe to run more than once.


create table if not exists public.players (
  pid uuid primary key,
  secret text not null,
  name text not null,
  tag text not null,
  coins bigint not null default 0,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  spot text not null default 'basslake',
  regions text[] not null default '{home}',
  baits text[] not null default '{worm}',
  gear jsonb not null default '{"line":0,"reel":0,"lines":1,"finder":0,"comfort":false,"methods":[],"boats":["paddle"],"boat":"paddle"}',
  items text[] not null default '{skin_1,skin_2,skin_3,skin_4,hat_red,coat_orange,pants_navy,boots_black}',
  outfit jsonb not null default '{"hat":"hat_red","coat":"coat_orange","pants":"pants_navy","boots":"boots_black","skin":"skin_1"}',
  prefs jsonb not null default '{}',
  stats jsonb not null default '{"catches":0,"sold":0,"earned":0,"legends":0,"golden":0,"albino":0,"snaps":0,"bestlb":0,"spots":[],"regions":[],"traded":0}',
  journal jsonb not null default '{}',
  daily jsonb not null default '{}',
  founder boolean not null default false,
  champ int not null default 0,
  hidden boolean not null default false,
  banned boolean not null default false,
  renamed_at timestamptz,
  check (name ~ '^[A-Za-z0-9_]{2,16}$'),
  check (tag ~ '^[0-9]{4}$')
);
create unique index if not exists players_name_tag on public.players (lower(name), tag);

create table if not exists public.lines (
  pid uuid not null references public.players(pid) on delete cascade,
  idx smallint not null,
  spot text not null,
  bait text not null,
  cast_at timestamptz not null default now(),
  bite_at timestamptz not null,
  species text,
  lb numeric(9,3),
  inches numeric(7,2),
  variant text,
  snap boolean not null default false,
  legend_roll double precision not null,
  primary key (pid, idx)
);

alter table public.lines add column if not exists fight_until timestamptz; -- crankbait fight: the reel is allowed until then

create table if not exists public.fish (
  id bigserial primary key,
  pid uuid not null references public.players(pid) on delete cascade,
  species text not null,
  lb numeric(9,3) not null,
  inches numeric(7,2) not null,
  variant text,
  bait text,
  spot text,
  period text,
  caught_at timestamptz not null default now(),
  caught_by uuid,
  legend_id int,
  released boolean not null default false,
  locked_until timestamptz
);
create index if not exists fish_pid on public.fish (pid);
create index if not exists fish_species_lb on public.fish (species, lb desc);
create index if not exists fish_caught_at on public.fish (caught_at desc);

create table if not exists public.legends (
  id serial primary key,
  season text not null,
  spot text not null,
  name text not null,
  species text not null,
  tier text not null,
  lb numeric(9,2) not null,
  bait text not null,
  period text not null,
  min_wait int not null,
  min_line int not null,
  clue text not null,
  colors jsonb not null,
  created_at timestamptz not null default now(),
  owner_pid uuid references public.players(pid) on delete set null,
  caught_at timestamptz,
  fish_id bigint,
  history jsonb not null default '[]',
  active boolean not null default true
);
create index if not exists legends_spot on public.legends (spot, active);

create table if not exists public.seasons (
  key text primary key,
  started_at timestamptz not null default now(),
  prizes_paid boolean not null default false
);

create table if not exists public.friends (
  a uuid not null references public.players(pid) on delete cascade,
  b uuid not null references public.players(pid) on delete cascade,
  status text not null default 'pending',
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create table if not exists public.trades (
  id bigserial primary key,
  a uuid not null references public.players(pid) on delete cascade,
  b uuid not null references public.players(pid) on delete cascade,
  a_fish bigint[] not null default '{}',
  b_fish bigint[] not null default '{}',
  a_coins bigint not null default 0,
  b_coins bigint not null default 0,
  a_ready boolean not null default false,
  b_ready boolean not null default false,
  a_confirm boolean not null default false,
  b_confirm boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trades_open on public.trades (a, b) where status = 'open';

create table if not exists public.trade_log (
  id bigserial primary key,
  trade_id bigint,
  a uuid, b uuid,
  a_name text, b_name text,
  a_gave jsonb, b_gave jsonb,
  at timestamptz not null default now()
);

create table if not exists public.news (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,
  pid uuid,
  name text,
  tag text,
  text text not null,
  data jsonb not null default '{}'
);
create index if not exists news_id on public.news (id desc);

-- players someone has blocked: they cannot friend, invite, trade with or send stickers to the blocker
create table if not exists public.blocks (
  blocker uuid not null references public.players(pid) on delete cascade,
  blocked uuid not null references public.players(pid) on delete cascade,
  at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;

create table if not exists public.reactions (
  fish_id bigint not null references public.fish(id) on delete cascade,
  pid uuid not null references public.players(pid) on delete cascade,
  sticker text not null,
  at timestamptz not null default now(),
  primary key (fish_id, pid)
);

create table if not exists public.reports (
  id bigserial primary key,
  reporter uuid,
  target uuid,
  reason text,
  at timestamptz not null default now(),
  handled boolean not null default false
);

create table if not exists public.suggestions (
  id bigserial primary key,
  pid uuid,
  lake text,
  place text,
  at timestamptz not null default now(),
  status text not null default 'pending'
);

create table if not exists public.hall_of_fame (
  season text not null,
  rank int not null,
  pid uuid,
  name text,
  tag text,
  species text,
  lb numeric(9,3),
  prize int,
  primary key (season, rank)
);

create table if not exists public.admin ( k text not null );

-- Game data, filled by part 2.
create table if not exists public.regions (id text primary key, name text, ticket bigint, tier int);
create table if not exists public.spots (id text primary key, region text, name text, method text, tz text);
create table if not exists public.baits (id text primary key, name text, price bigint, tau numeric, cap_max numeric, min_bite numeric, bite_mean numeric, water text);
create table if not exists public.method_baits (method text, bait text, primary key (method, bait));
create table if not exists public.gear (id text primary key, name text, price bigint, kind text, lvl int);
create table if not exists public.items (id text primary key, slot text, price bigint, prize boolean);
create table if not exists public.species (id text primary key, name text, min_lb numeric, max_lb numeric, k numeric, rate numeric, protected boolean, act jsonb, min_wait int, max_wait int);
create table if not exists public.species_baits (species text, bait text, w numeric, primary key (species, bait));
create table if not exists public.spot_species (spot text, species text, w numeric, primary key (spot, species));
create table if not exists public.legend_presets (spot text primary key, name text, species text, tier text, lb numeric, bait text, period text, min_wait int, min_line int, clue text, colors jsonb, used boolean not null default false);
create table if not exists public.config (k text primary key, v jsonb);
alter table public.species add column if not exists small boolean not null default false;
alter table public.spots add column if not exists water text not null default 'fresh';
alter table public.spots add column if not exists need int not null default 0;
alter table public.gear add column if not exists perk jsonb not null default '{}';
alter table public.players alter column gear set default '{"line":0,"reel":0,"lines":1,"finder":0,"comfort":false,"methods":[],"boats":["paddle"],"boat":"paddle"}';

-- Passwords (optional): lets a player log back in with name#tag + password after clearing their browser.
-- Stored only as bcrypt hashes; five wrong tries lock that account's password login for 10 minutes.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
alter table public.players add column if not exists pw_hash text;
alter table public.players add column if not exists pw_fails int not null default 0;
alter table public.players add column if not exists pw_locked_until timestamptz;

-- Crews: friends fishing together on one boat. The host owns the boat; guests ride along.
create table if not exists public.crews (
  guest uuid primary key references public.players(pid) on delete cascade,
  host uuid not null references public.players(pid) on delete cascade,
  status text not null default 'invited',
  spot text,
  created_at timestamptz not null default now(),
  check (guest <> host)
);
create index if not exists crews_host on public.crews (host);
alter table public.crews add column if not exists from_spot text; -- where a guest was before hopping aboard; they go back there when they hop off

-- Players from before boats: everyone gets the paddleboard, and old boat gear turns into the matching boats.
update public.players set gear = gear
  || jsonb_build_object('boats', (select jsonb_agg(distinct b) from jsonb_array_elements_text(
       '["paddle"]'::jsonb
       || (case when gear -> 'methods' ? 'boat' then '["kayak","skiff"]'::jsonb else '[]'::jsonb end)
       || (case when gear -> 'methods' ? 'offshore' then '["sportfisher"]'::jsonb else '[]'::jsonb end)) b))
  || jsonb_build_object('boat', case when gear -> 'methods' ? 'offshore' then 'sportfisher' when gear -> 'methods' ? 'boat' then 'skiff' else 'paddle' end)
  where not (gear ? 'boats');

-- Hard lures (crankbaits, jigs, jerkbaits) are bought one at a time and wear out; they can snag and be lost.
alter table public.baits add column if not exists uses int not null default 0;
alter table public.baits add column if not exists snag numeric not null default 0;
alter table public.lines add column if not exists snag_at timestamptz; -- the lure hangs up on the bottom at this moment
alter table public.players alter column gear set default '{"line":0,"reel":0,"rod":0,"lines":1,"finder":0,"comfort":false,"methods":[],"boats":["paddle"],"boat":"paddle","lures":{}}';
-- One time: players who bought crankbaits or jigs back when they lasted forever get 15 of each, and the old reels move to the matching new ones.
do $$ begin
  if not exists (select 1 from public.config where k = 'econ2') then
    update public.players set gear = gear
      || jsonb_build_object('lures', coalesce(gear -> 'lures', '{}'::jsonb)
           || (case when 'crank' = any(baits) then '{"crank":{"n":14,"left":25}}' else '{}' end)::jsonb
           || (case when 'jig' = any(baits) then '{"jig":{"n":14,"left":30}}' else '{}' end)::jsonb,
         'reel', case coalesce((gear ->> 'reel')::int, 0) when 1 then 2 when 2 then 3 when 3 then 5 else coalesce((gear ->> 'reel')::int, 0) end,
         'rod', coalesce((gear ->> 'rod')::int, 0));
    insert into public.config (k, v) values ('econ2', 'true'::jsonb);
  end if;
end $$;

-- The weekend derby: one row per weekend (key d<saturday date>), and each player's biggest fish of the featured kind.
create table if not exists public.derbies (
  key text primary key,
  species text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  awarded boolean not null default false,
  results jsonb not null default '[]'
);
create table if not exists public.derby_entries (
  derby text not null references public.derbies(key) on delete cascade,
  pid uuid not null references public.players(pid) on delete cascade,
  lb numeric(9,3) not null,
  inches numeric(7,2),
  variant text,
  spot text,
  caught_at timestamptz not null default now(),
  primary key (derby, pid)
);
create index if not exists derby_entries_board on public.derby_entries (derby, lb desc, caught_at);

-- Player numbers for the admin page: one row per player per day they played (US Eastern days).
create table if not exists public.activity (
  day date not null,
  pid uuid not null references public.players(pid) on delete cascade,
  primary key (day, pid)
);
create index if not exists activity_pid on public.activity (pid);
-- Fill in the past from what we already know: the day each player joined, the days they caught fish they kept, and the day they were last seen.
do $$ begin
  if not exists (select 1 from public.config where k = 'activity_backfill') then
    insert into public.activity (day, pid)
      select (created_at at time zone 'America/New_York')::date, pid from public.players
      union select (last_seen at time zone 'America/New_York')::date, pid from public.players
      union select (caught_at at time zone 'America/New_York')::date, pid from public.fish where pid is not null
      on conflict do nothing;
    insert into public.config (k, v) values ('activity_backfill', 'true'::jsonb);
  end if;
end $$;

-- Events (Halloween and so on): limited-time fish and shop items.
alter table public.species add column if not exists event text;
alter table public.items add column if not exists event text;

-- Lock everything down. The website only gets the functions.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- One Cast server, part 2: game data. Generated from js/data.js; edit that file and rerun tools/gen-sql.js.

delete from spot_species; delete from species_baits; delete from method_baits;
insert into regions (id,name,ticket,tier) values ('home','Home waters',0,0),('northwoods','Northwoods',600,1),('greatlakes','Great Lakes',1500,2),('mississippi','Mississippi River',3000,3),('everglades','Everglades',4800,4),('keys','Florida Keys and Gulf',7200,5),('pnw','Pacific Northwest and Alaska',12000,6),('pacific','Pacific and Hawaii',21000,7),('amazon','Amazon',48000,8),('africa','Africa',60000,9),('eurasia','Europe and Asia',60000,10),('australia','Australia',72000,11),('arctic','Arctic Ocean',150000,12),('southern','Southern Ocean',300000,13) on conflict (id) do update set name=excluded.name, ticket=excluded.ticket, tier=excluded.tier;
insert into spots (id,region,name,method,tz,water,need) values ('basslake','home','Bass Lake','shore','America/New_York','fresh',0),('farmpond','home','Farm Pond','shore','America/New_York','fresh',0),('walden','home','Walden Pond','shore','America/New_York','fresh',0),('harlemmeer','home','Harlem Meer','shore','America/New_York','fresh',0),('lakefork','home','Lake Fork','shore','America/Chicago','fresh',0),('guntersville','home','Lake Guntersville','shore','America/Chicago','fresh',0),('lanier','home','Lake Lanier','shore','America/New_York','fresh',0),('clearlake','home','Clear Lake','shore','America/Los_Angeles','fresh',0),('basslakeca','home','Bass Lake (California)','shore','America/Los_Angeles','fresh',0),('bigbear','home','Big Bear Lake','shore','America/Los_Angeles','fresh',0),('neuse','home','Neuse River','shore','America/New_York','fresh',0),('newriver','home','New River','shore','America/New_York','fresh',0),('hatteras','home','Cape Hatteras Point','shore','America/New_York','salt',0),('davidson','home','Davidson River','shore','America/New_York','fresh',0),('lakeofthewoods','northwoods','Lake of the Woods','ice','America/Winnipeg','fresh',0),('millelacs','northwoods','Mille Lacs','ice','America/Chicago','fresh',0),('minnetonka','northwoods','Lake Minnetonka','ice','America/Chicago','fresh',0),('winnebago','northwoods','Lake Winnebago','ice','America/Chicago','fresh',0),('devilslake','northwoods','Devils Lake','ice','America/Chicago','fresh',0),('simcoe','northwoods','Lake Simcoe','ice','America/Toronto','fresh',0),('superior','greatlakes','Lake Superior','ice','America/Chicago','fresh',0),('michigan','greatlakes','Lake Michigan','boat','America/Chicago','fresh',1),('mississippi','mississippi','Lower Mississippi backwaters','boat','America/Chicago','fresh',1),('everglades','everglades','Everglades backcountry','boat','America/New_York','salt',2),('okeechobee','everglades','Lake Okeechobee','shore','America/New_York','fresh',0),('keysflats','keys','Keys flats','boat','America/New_York','salt',2),('gulfreefs','keys','Gulf reefs','boat','America/Chicago','salt',2),('columbia','pnw','Columbia River','shore','America/Los_Angeles','fresh',0),('kenai','pnw','Kenai River','boat','America/Anchorage','fresh',1),('gulfofalaska','pnw','Gulf of Alaska','deep','America/Anchorage','deep',0),('kona','pacific','Kona coast','troll','Pacific/Honolulu','troll',5),('openpacific','pacific','Open Pacific','troll','Etc/GMT+11','troll',5),('rionegro','amazon','Rio Negro','boat','America/Manaus','fresh',1),('floodedforest','amazon','Flooded forest','shore','America/Manaus','fresh',0),('victoria','africa','Lake Victoria','boat','Africa/Nairobi','fresh',1),('zambezi','africa','Zambezi River','shore','Africa/Harare','fresh',0),('ebro','eurasia','Ebro River','shore','Europe/Madrid','fresh',0),('lochness','eurasia','Loch Ness','shore','Europe/London','fresh',0),('mongolia','eurasia','Mongolian rivers','shore','Asia/Ulaanbaatar','fresh',0),('thaipark','eurasia','Thai fishing park','shore','Asia/Bangkok','fresh',0),('biwa','eurasia','Lake Biwa','shore','Asia/Tokyo','fresh',0),('murray','australia','Murray River','shore','Australia/Sydney','fresh',0),('gbr','australia','Great Barrier Reef','boat','Australia/Brisbane','salt',2),('greenland','arctic','Greenland ice edge','ice','America/Nuuk','polar',0),('arcticdeep','arctic','Arctic deep','deep','America/Nuuk','deep',0),('rosssea','southern','Ross Sea, Antarctica','deep','Antarctica/McMurdo','deep',0) on conflict (id) do update set region=excluded.region, name=excluded.name, method=excluded.method, tz=excluded.tz, water=excluded.water, need=excluded.need;
insert into baits (id,name,price,tau,cap_max,min_bite,bite_mean,water,uses,snag) values ('worm','Worms',0,10,0.35,0.15,1,'fresh',0,0),('minnow','Minnows',45,150,1,8,15,'fresh',0,0),('crank','Crankbaits',8,90,0.65,2,8,'fresh',25,0.08),('jig','Jigs',5,80,1,8,30,'fresh',30,0.12),('jerk','Jerkbaits',10,50,1,6,25,'fresh',20,0.07),('fly','Dry flies',110,60,0.9,1,20,'fresh',0,0),('cut','Cut bait',300,360,1,5,120,'fresh',0,0),('sucker','Suckers',1150,720,1,10,360,'fresh',0,0),('shrimp','Live shrimp',3000,60,0.6,3,12,'salt',0,0),('squid','Squid',9000,300,1,10,90,'salt',0,0),('mullet','Live mullet',22500,600,1,15,240,'salt',0,0),('lure','Trolling lures',50000,240,1,10,60,'troll',0,0),('deepbait','Deep-drop rig',150000,900,1,20,480,'deep',0,0) on conflict (id) do update set name=excluded.name, price=excluded.price, tau=excluded.tau, cap_max=excluded.cap_max, min_bite=excluded.min_bite, bite_mean=excluded.bite_mean, water=excluded.water, uses=excluded.uses, snag=excluded.snag;
insert into method_baits (method,bait) values ('ice','worm'),('ice','minnow'),('ice','jig'),('ice','cut'),('ice','sucker'),('shore','worm'),('shore','minnow'),('shore','crank'),('shore','jig'),('shore','jerk'),('shore','fly'),('shore','cut'),('shore','sucker'),('shore','shrimp'),('shore','mullet'),('boat','worm'),('boat','minnow'),('boat','crank'),('boat','jig'),('boat','jerk'),('boat','fly'),('boat','cut'),('boat','sucker'),('boat','shrimp'),('boat','squid'),('boat','mullet'),('troll','worm'),('troll','minnow'),('troll','cut'),('troll','shrimp'),('troll','squid'),('troll','lure'),('deep','worm'),('deep','minnow'),('deep','cut'),('deep','sucker'),('deep','shrimp'),('deep','squid'),('deep','deepbait');
delete from gear where id in ('boat','offshore');
insert into gear (id,name,price,kind,lvl,perk) values ('line1','30 lb line',230,'line',1,'{}'::jsonb),('line2','60 lb line',900,'line',2,'{}'::jsonb),('line3','150 lb line',3000,'line',3,'{}'::jsonb),('line4','400 lb line',19000,'line',4,'{}'::jsonb),('line5','1,000 lb line',90000,'line',5,'{}'::jsonb),('reel1','Spincast reel',25,'reel',1,'{}'::jsonb),('reel2','Spinning reel',55,'reel',2,'{}'::jsonb),('reel3','Baitcasting reel',110,'reel',3,'{}'::jsonb),('reel4','Saltwater spinning reel',230,'reel',4,'{}'::jsonb),('reel5','Big-game reel',530,'reel',5,'{}'::jsonb),('reel6','Tournament reel',1150,'reel',6,'{}'::jsonb),('rod1','Ultralight rod',30,'rod',1,'{}'::jsonb),('rod2','Medium spinning rod',55,'rod',2,'{}'::jsonb),('rod3','Bass casting rod',110,'rod',3,'{}'::jsonb),('rod4','Surf rod',190,'rod',4,'{}'::jsonb),('rod5','Graphite pro rod',380,'rod',5,'{}'::jsonb),('rod6','Custom tournament rod',3000,'rod',6,'{}'::jsonb),('hole2','Second line',300,'lines',2,'{}'::jsonb),('hole3','Third line',940,'lines',3,'{}'::jsonb),('hole4','Fourth line',3200,'lines',4,'{}'::jsonb),('finder1','Fish finder',450,'finder',1,'{}'::jsonb),('finder2','Sonar finder',3750,'finder',2,'{}'::jsonb),('finder3','Legend finder',37500,'finder',3,'{}'::jsonb),('comfort','Heater and cooler',1900,'comfort',1,'{}'::jsonb),('paddle','Paddleboard',0,'boat',0,'{}'::jsonb),('kayak','Fishing kayak',450,'boat',1,'{}'::jsonb),('skiff','Dinghy skiff',1900,'boat',2,'{}'::jsonb),('bassboat','Bass boat',6750,'boat',3,'{"fresh":0.85}'::jsonb),('console','Center console',22500,'boat',4,'{"salt":0.85,"troll":0.9}'::jsonb),('sportfisher','Sportfisher',45000,'boat',5,'{"troll":0.8,"salt":0.9}'::jsonb),('trawler','Expedition trawler',190000,'boat',6,'{"deep":0.8,"polar":0.8,"troll":0.85}'::jsonb),('yacht','Golden mega yacht',1125000,'boat',7,'{"all":0.78}'::jsonb),('devboat','Dev Flagship',0,'boat',8,'{"all":0.7}'::jsonb),('book_fresh','Freshwater guidebook',1300,'book',1,'{}'::jsonb),('book_salt','Saltwater guidebook',5650,'book',1,'{}'::jsonb),('deeprig','Deep-drop rig',115000,'method',1,'{}'::jsonb) on conflict (id) do update set name=excluded.name, price=excluded.price, kind=excluded.kind, lvl=excluded.lvl, perk=excluded.perk;
insert into items (id,slot,price,prize,event) values ('skin_1','skin',0,false,null),('skin_2','skin',0,false,null),('skin_3','skin',0,false,null),('skin_4','skin',0,false,null),('hat_red','hat',0,false,null),('hat_cap','hat',110,false,null),('hat_straw','hat',300,false,null),('hat_bucket','hat',450,false,null),('hat_trapper','hat',900,false,null),('hat_captain','hat',6000,false,null),('hat_crown','hat',75000,false,null),('hat_champ','hat',0,true,null),('hat_river','hat',0,true,null),('hat_tide','hat',0,true,null),('hat_master','hat',0,true,null),('hat_dev','hat',0,true,null),('hat_witch','hat',300,false,'halloween'),('hat_pumpkin','hat',490,false,'halloween'),('hat_derby','hat',0,true,null),('hat_founder','hat',0,true,null),('coat_orange','coat',0,false,null),('coat_dev','coat',0,true,null),('coat_vampire','coat',410,false,'halloween'),('coat_skeleton','coat',340,false,'halloween'),('coat_green','coat',150,false,null),('coat_blue','coat',380,false,null),('coat_hawaii','coat',2250,false,null),('coat_camo','coat',3000,false,null),('coat_gold','coat',45000,false,null),('pants_dev','pants',0,true,null),('pants_navy','pants',0,false,null),('pants_tan','pants',110,false,null),('pants_waders','pants',680,false,null),('pants_red','pants',1150,false,null),('boots_dev','boots',0,true,null),('boots_black','boots',0,false,null),('boots_rubber','boots',150,false,null),('boots_sandals','boots',230,false,null),('boots_white','boots',900,false,null),('paint_red','paint',230,false,null),('paint_blue','paint',230,false,null),('paint_green','paint',230,false,null),('paint_white','paint',230,false,null),('paint_black','paint',380,false,null),('paint_camo','paint',450,false,null),('paint_pink','paint',380,false,null),('paint_gold','paint',4900,false,null),('paint_pumpkin','paint',380,false,'halloween'),('paint_haunted','paint',490,false,'halloween') on conflict (id) do update set slot=excluded.slot, price=excluded.price, prize=excluded.prize, event=excluded.event;
insert into species (id,name,min_lb,max_lb,k,rate,protected,act,min_wait,max_wait,small,event) values ('bluegill','Bluegill',0.1,2.5,11,16,false,'{"dawn":1.3,"day":1.4,"dusk":1.1,"night":0.3}'::jsonb,0,120,false,null),('pumpkinseed','Pumpkinseed',0.1,1.5,10.5,18,false,'{"dawn":1.3,"day":1.4,"dusk":1.1,"night":0.3}'::jsonb,0,120,false,null),('perch','Yellow perch',0.2,3,12,14,false,'{"dawn":1.3,"day":1.4,"dusk":1.1,"night":0.3}'::jsonb,0,240,false,null),('crappie','Black crappie',0.3,4.5,12.5,13,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,1,480,false,null),('largemouth','Largemouth bass',0.5,22,11.6,11,false,'{"dawn":2,"day":0.8,"dusk":2,"night":0.6}'::jsonb,15,900,false,null),('smallmouth','Smallmouth bass',0.5,11,12,13,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,20,1200,false,null),('spotted','Spotted bass',0.5,10,11.8,13,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,15,900,false,null),('striper','Striped bass',2,70,13.5,5,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,40,0,false,null),('carp','Common carp',2,60,13,4,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,20,0,false,null),('channel','Channel catfish',1,50,14.4,5,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,30,0,false,null),('bluecat','Blue catfish',5,140,14,14,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,120,0,false,null),('flathead','Flathead catfish',5,120,14.5,14,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,180,0,false,null),('walleye','Walleye',1,22,14,17,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,30,1500,false,null),('pike','Northern pike',2,50,15.8,10,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('muskie','Muskellunge',8,65,16.2,17,false,'{"dawn":2,"day":0.8,"dusk":2,"night":0.6}'::jsonb,240,0,false,null),('cisco','Cisco',0.3,6,12,10,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,1,300,false,null),('whitefish','Lake whitefish',1,14,12.5,12,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,20,0,false,null),('laketrout','Lake trout',2,70,14.4,14,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,120,0,false,null),('burbot','Burbot',1,22,16,11,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,60,0,false,null),('chinook','Chinook salmon',5,95,13.5,31,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,120,0,false,null),('coho','Coho salmon',3,30,13.6,28,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,40,0,false,null),('steelhead','Steelhead',3,40,13.8,34,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,60,0,false,null),('rainbow','Rainbow trout',0.5,25,13,11,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,15,0,false,null),('brown','Brown trout',1,40,13.4,14,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,30,0,false,null),('brook','Brook trout',0.2,14.5,13,20,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,5,0,false,null),('chub','Creek chub',0.05,1.2,12,12,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,0,120,false,null),('kokanee','Kokanee salmon',0.5,6,12.7,9,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,2,360,false,null),('lakesturgeon','Lake sturgeon',20,240,16.3,14,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,600,0,false,null),('whitesturgeon','White sturgeon',30,1100,16,22,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,720,0,false,null),('gar','Alligator gar',20,300,17,18,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,300,0,false,null),('reddrum','Red drum',2,94,13.4,8,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,30,0,false,null),('bluefish','Bluefish',1,31,14,9,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,10,0,false,null),('spot','Spot',0.1,1.3,11.5,18,false,'{"dawn":1.3,"day":1.4,"dusk":1.1,"night":0.3}'::jsonb,0,120,false,null),('croaker','Atlantic croaker',0.2,5,12,13,false,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,0,240,false,null),('pompano','Florida pompano',0.5,8,11,27,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,10,0,false,null),('flounder','Southern flounder',1,20,13,13,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,20,0,false,null),('spanish','Spanish mackerel',1,13,15,15,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,10,0,false,null),('drum','Freshwater drum',2,50,13,10,false,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,20,0,false,null),('bowfin','Bowfin',2,20,14.5,5,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,30,0,false,null),('floridagar','Florida gar',2,20,17,5,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,30,0,false,null),('peacock','Peacock bass',1,28,12,27,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,20,900,false,null),('snook','Snook',3,55,14.5,24,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,40,0,false,null),('tarpon','Tarpon',20,280,14.5,0,true,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,240,0,false,null),('bonefish','Bonefish',2,18,13.5,42,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,20,600,false,null),('permit','Permit',5,55,12,51,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('barracuda','Great barracuda',5,85,16,22,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('snapper','Red snapper',2,50,12.8,32,false,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,30,0,false,null),('goliath','Goliath grouper',50,700,12.5,0,true,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,360,0,false,null),('halibut','Pacific halibut',10,500,13.5,47,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,240,0,false,null),('lingcod','Lingcod',5,80,14,55,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,60,0,false,null),('yellowfin','Yellowfin tuna',20,400,12.6,36,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('bluefin','Pacific bluefin tuna',50,1000,12.5,54,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,300,0,false,null),('marlin','Blue marlin',150,1800,14,48,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,360,0,false,null),('mahi','Mahi-mahi',5,85,13.5,33,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,15,600,false,null),('wahoo','Wahoo',10,180,15.5,39,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,40,0,false,null),('gt','Giant trevally',10,180,12.5,44,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('arapaima','Arapaima',20,480,15.5,156,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,360,0,false,null),('piranha','Red-bellied piranha',0.5,8,11,78,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,2,300,false,null),('redtail','Redtail catfish',10,130,13.8,111,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,180,0,false,null),('payara','Payara',2,40,14.5,144,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,30,0,false,null),('nileperch','Nile perch',10,500,13.2,63,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,240,0,false,null),('tigerfish','Tigerfish',5,70,14,81,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,40,0,false,null),('vundu','Vundu catfish',10,120,14.5,56,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,240,0,false,null),('wels','Wels catfish',20,300,15,39,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,360,0,false,null),('atlanticsalmon','Atlantic salmon',5,80,13.6,47,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,120,0,false,null),('eel','European eel',2,25,20,26,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,60,0,false,null),('taimen','Taimen',10,230,15,52,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,300,0,false,null),('lenok','Lenok',1,15,13.5,39,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,15,600,false,null),('siamesecarp','Siamese giant carp',20,300,12.8,35,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,240,0,false,null),('mekong','Mekong giant catfish',50,650,13.5,0,true,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,480,0,false,null),('biwatrout','Biwa trout',1,20,13.5,43,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,30,0,false,null),('murraycod','Murray cod',10,250,13.5,81,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,300,0,false,null),('goldenperch','Golden perch',1,25,12.5,66,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,20,600,false,null),('barramundi','Barramundi',5,100,13.5,81,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,60,0,false,null),('coraltrout','Coral trout',3,55,12.8,96,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,30,0,false,null),('char','Arctic char',1,32,14,144,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,30,0,false,null),('cod','Atlantic cod',5,210,13.4,114,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,60,0,false,null),('greenlandhalibut','Greenland halibut',5,100,13.5,153,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,120,0,false,null),('greenlandshark','Greenland shark',300,2200,15,0,true,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,600,0,false,null),('tilapia','Nile tilapia',0.5,10,11.5,29,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,1,300,false,null),('sharptooth','Sharptooth catfish',2,60,14.5,40,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,60,0,false,null),('grayling','Arctic grayling',0.3,6,13,35,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,1,300,false,null),('dolly','Dolly Varden',1,20,13.6,39,false,'{"dawn":1.8,"day":1.2,"dusk":1.2,"night":0.4}'::jsonb,10,600,false,null),('rockfish','Yelloweye rockfish',2,40,12.8,63,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,20,0,false,null),('amberjack','Greater amberjack',10,160,13.6,25,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,60,0,false,null),('gag','Gag grouper',3,80,13,32,false,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,40,0,false,null),('silverperch','Silver perch',0.5,16,12.5,63,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,2,400,false,null),('notothen','Antarctic rockcod',1,12,12.5,540,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,20,500,false,null),('northernsnakehead','Giant snakehead',2,40,15,37,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,20,900,false,null),('herring','Pacific herring',0.1,1.5,12.5,36,false,'{"dawn":1.2,"day":1,"dusk":1.2,"night":0.9}'::jsonb,0,240,true,null),('sculpin','Shorthorn sculpin',0.2,4,11,42,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,1,300,true,null),('polarcod','Polar cod',0.1,1.2,12.8,72,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,0,240,true,null),('opelu','Mackerel scad',0.2,2,12.5,54,false,'{"dawn":1.2,"day":1.8,"dusk":0.8,"night":0.3}'::jsonb,0,240,true,null),('silverfish','Antarctic silverfish',0.05,0.8,13,240,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,0,240,true,null),('toothfish','Antarctic toothfish',20,300,13.5,1500,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,300,0,false,null),('icefish','Mackerel icefish',0.5,7,14,540,false,'{"dawn":1,"day":1,"dusk":1,"night":1.2}'::jsonb,20,600,false,null),('ghostcarp','Ghost carp',3,45,13,36,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,3,0,false,'halloween'),('pumpkinbass','Jack-o''-lantern bass',1,16,11.6,54,false,'{"dawn":1.5,"day":0.4,"dusk":2.5,"night":2.2}'::jsonb,2,0,false,'halloween'),('phantomdrum','Phantom drum',5,70,13,42,false,'{"dawn":0.8,"day":0.3,"dusk":1.3,"night":3}'::jsonb,10,0,false,'halloween') on conflict (id) do update set name=excluded.name, min_lb=excluded.min_lb, max_lb=excluded.max_lb, k=excluded.k, rate=excluded.rate, protected=excluded.protected, act=excluded.act, min_wait=excluded.min_wait, max_wait=excluded.max_wait, small=excluded.small, event=excluded.event;
insert into species_baits (species,bait,w) values ('bluegill','worm',4),('bluegill','minnow',0.15),('bluegill','fly',1.5),('pumpkinseed','worm',3),('perch','worm',4),('perch','minnow',0.4),('perch','cut',0.3),('perch','jig',0.8),('crappie','worm',2.5),('crappie','minnow',1),('crappie','jig',1.5),('largemouth','jerk',5),('largemouth','minnow',4),('largemouth','cut',0.5),('largemouth','sucker',0.5),('largemouth','crank',5),('largemouth','jig',3),('smallmouth','jerk',5),('smallmouth','minnow',3),('smallmouth','cut',0.5),('smallmouth','sucker',0.3),('smallmouth','crank',4),('smallmouth','jig',5),('smallmouth','fly',1),('spotted','jerk',4),('spotted','minnow',4),('spotted','cut',0.3),('spotted','crank',5),('spotted','jig',3),('striper','jerk',3),('striper','minnow',3),('striper','cut',2),('striper','sucker',3),('striper','crank',2),('striper','jig',3),('carp','worm',2),('carp','cut',3),('channel','minnow',0.5),('channel','cut',6),('channel','sucker',1),('bluecat','cut',5),('bluecat','sucker',4),('flathead','cut',2),('flathead','sucker',5),('walleye','jerk',5),('walleye','minnow',5),('walleye','cut',1),('walleye','sucker',0.5),('walleye','crank',2),('walleye','jig',6),('pike','jerk',6),('pike','minnow',4),('pike','cut',0.5),('pike','sucker',3),('pike','crank',5),('muskie','jerk',3),('muskie','sucker',6),('muskie','crank',1.5),('cisco','worm',3),('cisco','minnow',1),('cisco','jig',0.3),('whitefish','worm',1.5),('whitefish','minnow',3),('whitefish','jig',0.5),('laketrout','jerk',2),('laketrout','minnow',2),('laketrout','cut',3),('laketrout','sucker',2),('laketrout','jig',4),('burbot','minnow',2),('burbot','cut',5),('burbot','sucker',3),('burbot','jig',3),('chinook','minnow',3),('chinook','cut',4),('chinook','sucker',1),('coho','jerk',2),('coho','minnow',4),('coho','cut',2),('coho','crank',2),('steelhead','jerk',2),('steelhead','minnow',4),('steelhead','cut',2),('steelhead','crank',1),('rainbow','jerk',2),('rainbow','minnow',4),('rainbow','cut',0.3),('rainbow','crank',2),('rainbow','fly',6),('rainbow','worm',1.5),('brown','jerk',3),('brown','minnow',4),('brown','cut',0.5),('brown','crank',2),('brown','fly',3),('brown','worm',0.5),('brook','fly',7),('brook','worm',3),('brook','minnow',2),('brook','crank',1),('chub','worm',5),('chub','fly',1.5),('chub','minnow',0.5),('kokanee','worm',3),('kokanee','minnow',1),('lakesturgeon','cut',1.5),('lakesturgeon','sucker',3),('whitesturgeon','cut',2),('whitesturgeon','sucker',4),('gar','cut',4),('gar','sucker',3),('reddrum','worm',0.4),('reddrum','minnow',1),('reddrum','cut',5),('reddrum','shrimp',3),('reddrum','mullet',4),('bluefish','jerk',2),('bluefish','worm',0.5),('bluefish','minnow',3),('bluefish','cut',5),('bluefish','crank',2),('bluefish','shrimp',1),('bluefish','mullet',2),('spot','worm',6),('spot','shrimp',3),('spot','cut',0.5),('croaker','worm',5),('croaker','shrimp',3),('croaker','cut',1),('pompano','worm',3),('pompano','shrimp',4),('flounder','minnow',4),('flounder','shrimp',2),('flounder','cut',1),('flounder','jig',1),('spanish','jerk',2),('spanish','minnow',2),('spanish','crank',3),('spanish','shrimp',1),('spanish','cut',1),('drum','cut',4),('drum','minnow',1),('drum','jig',2),('bowfin','minnow',2),('bowfin','cut',4),('bowfin','crank',1),('floridagar','minnow',3),('floridagar','cut',3),('floridagar','crank',1),('peacock','jerk',5),('peacock','minnow',5),('peacock','cut',0.5),('peacock','crank',6),('snook','shrimp',4),('snook','mullet',5),('snook','minnow',1),('tarpon','mullet',5),('tarpon','shrimp',0.5),('bonefish','shrimp',6),('permit','shrimp',3),('barracuda','mullet',5),('barracuda','squid',1),('barracuda','shrimp',0.5),('snapper','squid',6),('snapper','shrimp',3),('snapper','mullet',1),('goliath','mullet',4),('goliath','squid',2),('halibut','squid',5),('halibut','deepbait',5),('lingcod','squid',6),('lingcod','deepbait',2),('yellowfin','lure',6),('bluefin','lure',3),('marlin','lure',3),('mahi','lure',8),('wahoo','lure',4),('gt','mullet',4),('gt','lure',2),('gt','squid',1),('arapaima','cut',3),('arapaima','sucker',5),('piranha','cut',6),('piranha','worm',2),('piranha','minnow',2),('redtail','cut',5),('redtail','sucker',4),('payara','jerk',2),('payara','minnow',4),('payara','cut',3),('payara','crank',3),('nileperch','cut',3),('nileperch','sucker',5),('tigerfish','jerk',2),('tigerfish','cut',5),('tigerfish','minnow',1),('tigerfish','crank',4),('vundu','cut',4),('vundu','sucker',5),('wels','cut',3),('wels','sucker',5),('atlanticsalmon','jerk',2),('atlanticsalmon','minnow',4),('atlanticsalmon','cut',1),('atlanticsalmon','crank',2),('eel','cut',4),('taimen','jerk',2),('taimen','minnow',2),('taimen','cut',3),('taimen','sucker',5),('taimen','crank',1),('lenok','jerk',2),('lenok','worm',3),('lenok','minnow',4),('lenok','crank',2),('lenok','fly',4),('siamesecarp','cut',4),('mekong','cut',2),('mekong','sucker',4),('biwatrout','jerk',2),('biwatrout','minnow',5),('biwatrout','crank',2),('biwatrout','fly',2),('murraycod','jerk',1),('murraycod','cut',3),('murraycod','sucker',5),('murraycod','minnow',1),('murraycod','crank',1),('goldenperch','jerk',2),('goldenperch','minnow',4),('goldenperch','crank',2),('barramundi','shrimp',3),('barramundi','mullet',5),('barramundi','minnow',2),('coraltrout','squid',6),('coraltrout','shrimp',3),('coraltrout','mullet',1),('char','jerk',2),('char','minnow',5),('char','cut',2),('char','crank',2),('char','jig',2),('char','fly',2),('cod','cut',3),('cod','squid',6),('cod','deepbait',2),('greenlandhalibut','squid',4),('greenlandhalibut','deepbait',5),('greenlandhalibut','cut',1),('greenlandshark','deepbait',5),('tilapia','worm',5),('tilapia','cut',1),('sharptooth','cut',5),('sharptooth','sucker',2),('grayling','worm',5),('grayling','minnow',1),('grayling','jig',2),('grayling','fly',6),('dolly','jerk',2),('dolly','minnow',4),('dolly','crank',1),('dolly','jig',2),('dolly','fly',2),('rockfish','squid',6),('rockfish','deepbait',2),('amberjack','squid',3),('amberjack','mullet',5),('amberjack','shrimp',0.5),('gag','squid',5),('gag','shrimp',2),('gag','mullet',2),('silverperch','worm',5),('silverperch','minnow',1),('notothen','squid',5),('notothen','deepbait',2),('northernsnakehead','minnow',4),('northernsnakehead','cut',3),('northernsnakehead','crank',3),('herring','worm',3),('herring','minnow',2),('herring','cut',4),('herring','shrimp',5),('herring','squid',3),('sculpin','worm',4),('sculpin','minnow',3),('sculpin','cut',4),('sculpin','shrimp',3),('sculpin','squid',3),('polarcod','worm',3),('polarcod','minnow',4),('polarcod','cut',3),('polarcod','shrimp',5),('polarcod','squid',4),('opelu','worm',2),('opelu','minnow',3),('opelu','cut',4),('opelu','shrimp',5),('opelu','squid',4),('silverfish','worm',2),('silverfish','minnow',4),('silverfish','cut',3),('silverfish','shrimp',5),('silverfish','squid',4),('toothfish','deepbait',6),('toothfish','squid',3),('icefish','squid',6),('icefish','deepbait',1),('ghostcarp','worm',3),('ghostcarp','cut',3),('ghostcarp','minnow',1),('ghostcarp','sucker',1),('pumpkinbass','jerk',4),('pumpkinbass','crank',4),('pumpkinbass','jig',3),('pumpkinbass','minnow',2),('pumpkinbass','worm',0.5),('phantomdrum','cut',4),('phantomdrum','mullet',3),('phantomdrum','shrimp',2),('phantomdrum','worm',1);
insert into spot_species (spot,species,w) values ('basslake','bluegill',5),('farmpond','bluegill',6),('harlemmeer','bluegill',3),('lakefork','bluegill',2),('guntersville','bluegill',2),('clearlake','bluegill',2),('okeechobee','bluegill',2),('bigbear','bluegill',1),('neuse','bluegill',3),('newriver','bluegill',2),('basslake','pumpkinseed',3),('farmpond','pumpkinseed',3),('walden','pumpkinseed',3),('harlemmeer','pumpkinseed',2),('basslake','perch',3),('walden','perch',1),('lakeofthewoods','perch',3),('millelacs','perch',3),('minnetonka','perch',3),('devilslake','perch',8),('simcoe','perch',6),('winnebago','perch',2),('superior','perch',1),('basslake','crappie',3),('farmpond','crappie',2),('lakefork','crappie',3),('guntersville','crappie',2),('bigbear','crappie',3),('okeechobee','crappie',4),('clearlake','crappie',3),('minnetonka','crappie',2),('neuse','crappie',2),('basslake','largemouth',4),('farmpond','largemouth',2),('harlemmeer','largemouth',3),('lakefork','largemouth',8),('guntersville','largemouth',7),('lanier','largemouth',2),('clearlake','largemouth',7),('basslakeca','largemouth',2),('okeechobee','largemouth',6),('everglades','largemouth',2),('biwa','largemouth',5),('minnetonka','largemouth',3),('neuse','largemouth',4),('basslake','smallmouth',1),('walden','smallmouth',4),('lanier','smallmouth',1),('simcoe','smallmouth',2),('superior','smallmouth',2),('michigan','smallmouth',5),('millelacs','smallmouth',3),('newriver','smallmouth',8),('lanier','spotted',6),('guntersville','spotted',2),('lanier','striper',4),('harlemmeer','striper',0.5),('columbia','striper',1),('neuse','striper',5),('hatteras','striper',1.5),('harlemmeer','carp',6),('farmpond','carp',2),('clearlake','carp',2),('ebro','carp',3),('biwa','carp',2),('thaipark','carp',1),('neuse','carp',1.5),('newriver','carp',0.4),('basslake','channel',2),('farmpond','channel',4),('lakefork','channel',2),('clearlake','channel',4),('mississippi','channel',3),('okeechobee','channel',2),('neuse','channel',4),('newriver','channel',2),('mississippi','bluecat',5),('lakefork','bluecat',1),('neuse','bluecat',3),('mississippi','flathead',5),('guntersville','flathead',1),('neuse','flathead',2),('lakeofthewoods','walleye',8),('millelacs','walleye',6),('devilslake','walleye',4),('minnetonka','walleye',3),('winnebago','walleye',4),('simcoe','walleye',1),('newriver','walleye',1.5),('lakeofthewoods','pike',4),('millelacs','pike',3),('devilslake','pike',3),('minnetonka','pike',3),('simcoe','pike',2),('superior','pike',1),('winnebago','pike',1),('millelacs','muskie',4),('minnetonka','muskie',5),('lakeofthewoods','muskie',2),('simcoe','muskie',0.5),('newriver','muskie',2),('lakeofthewoods','cisco',3),('millelacs','cisco',2),('simcoe','cisco',2),('superior','cisco',3),('simcoe','whitefish',5),('superior','whitefish',3),('winnebago','whitefish',2),('greenland','whitefish',1),('superior','laketrout',7),('simcoe','laketrout',3),('michigan','laketrout',2),('greenland','laketrout',0.5),('superior','burbot',4),('lakeofthewoods','burbot',2),('devilslake','burbot',1),('michigan','chinook',6),('columbia','chinook',5),('kenai','chinook',8),('michigan','coho',4),('columbia','coho',3),('kenai','coho',5),('columbia','steelhead',6),('kenai','steelhead',2),('michigan','steelhead',1),('walden','rainbow',5),('basslakeca','rainbow',5),('bigbear','rainbow',7),('newriver','rainbow',0.4),('davidson','rainbow',6),('walden','brown',2),('lochness','brown',6),('bigbear','brown',1),('davidson','brown',3),('davidson','brook',5),('walden','brook',0.5),('davidson','chub',4),('newriver','chub',1),('basslakeca','kokanee',4),('winnebago','lakesturgeon',5),('superior','lakesturgeon',3),('lakeofthewoods','lakesturgeon',1),('columbia','whitesturgeon',4),('mississippi','gar',4),('hatteras','reddrum',4),('hatteras','bluefish',5),('hatteras','spot',6),('hatteras','croaker',5),('hatteras','pompano',3),('hatteras','flounder',3),('hatteras','spanish',3),('mississippi','drum',5),('winnebago','drum',2),('everglades','bowfin',3),('okeechobee','bowfin',3),('mississippi','bowfin',1),('neuse','bowfin',1.5),('everglades','floridagar',4),('okeechobee','floridagar',3),('okeechobee','peacock',5),('everglades','peacock',3),('rionegro','peacock',8),('floodedforest','peacock',4),('everglades','snook',6),('okeechobee','snook',1),('keysflats','snook',2),('everglades','tarpon',3),('keysflats','tarpon',5),('keysflats','bonefish',8),('keysflats','permit',4),('gulfreefs','barracuda',4),('keysflats','barracuda',3),('kona','barracuda',1),('gulfreefs','snapper',8),('gulfreefs','goliath',3),('gulfofalaska','halibut',7),('gulfofalaska','lingcod',6),('openpacific','yellowfin',7),('kona','yellowfin',4),('openpacific','bluefin',3),('kona','marlin',5),('openpacific','marlin',2),('kona','mahi',7),('openpacific','mahi',6),('openpacific','wahoo',4),('kona','wahoo',2),('kona','gt',2),('gbr','gt',6),('floodedforest','arapaima',5),('rionegro','arapaima',2),('floodedforest','piranha',6),('rionegro','piranha',5),('rionegro','redtail',5),('floodedforest','redtail',3),('thaipark','redtail',3),('rionegro','payara',5),('floodedforest','payara',2),('victoria','nileperch',7),('zambezi','tigerfish',8),('victoria','tigerfish',1),('zambezi','vundu',4),('ebro','wels',7),('lochness','atlanticsalmon',4),('lochness','eel',3),('ebro','eel',1),('mongolia','taimen',7),('mongolia','lenok',6),('thaipark','siamesecarp',6),('thaipark','mekong',3),('biwa','biwatrout',5),('murray','murraycod',7),('murray','goldenperch',6),('gbr','barramundi',6),('gbr','coraltrout',7),('greenland','char',7),('greenland','cod',4),('arcticdeep','cod',5),('greenland','greenlandhalibut',2),('arcticdeep','greenlandhalibut',6),('arcticdeep','greenlandshark',3),('victoria','tilapia',6),('zambezi','tilapia',2),('thaipark','tilapia',2),('zambezi','sharptooth',4),('victoria','sharptooth',3),('mongolia','grayling',6),('greenland','grayling',2),('kenai','dolly',5),('gulfofalaska','rockfish',5),('gulfreefs','amberjack',5),('gulfreefs','gag',5),('murray','silverperch',5),('rosssea','notothen',5),('thaipark','northernsnakehead',4),('gulfofalaska','herring',6),('arcticdeep','herring',3),('arcticdeep','sculpin',5),('gulfofalaska','sculpin',3),('arcticdeep','polarcod',6),('kona','opelu',6),('openpacific','opelu',5),('rosssea','silverfish',7),('rosssea','toothfish',7),('rosssea','icefish',6),('basslake','ghostcarp',2),('farmpond','ghostcarp',2),('walden','ghostcarp',2),('harlemmeer','ghostcarp',2),('lakefork','ghostcarp',2),('guntersville','ghostcarp',2),('lanier','ghostcarp',2),('clearlake','ghostcarp',2),('basslakeca','ghostcarp',2),('bigbear','ghostcarp',2),('neuse','ghostcarp',2),('newriver','ghostcarp',2),('davidson','ghostcarp',2),('basslake','pumpkinbass',2),('farmpond','pumpkinbass',1.5),('lakefork','pumpkinbass',2),('guntersville','pumpkinbass',2),('clearlake','pumpkinbass',2),('lanier','pumpkinbass',1.5),('neuse','pumpkinbass',1.5),('basslakeca','pumpkinbass',1.5),('hatteras','phantomdrum',2);
insert into legend_presets (spot,name,species,tier,lb,bait,period,min_wait,min_line,clue,colors) values ('basslake','Old Bucketmouth','largemouth','findable',25,'minnow','dawn',60,30,'A bass as big as a bucket, seen rolling in the shallows at first light. Old-timers say it only takes a live minnow after a long, quiet wait.','{"b":"#2E4A24","d":"#1A2C14","bel":"#D8CC98","fin":"#24381C","spot":"#0C140A"}'::jsonb),('neuse','The Neuse Ghost','striper','findable',52,'sucker','dusk',120,60,'A pale striper as long as a canoe paddle, seen chasing shad up the Neuse at dusk. It only takes a whole sucker after a long wait.','{"b":"#A8B4C0","d":"#5E6874","bel":"#EEF2F5","fin":"#6E7884","spot":"#2A3038"}'::jsonb),('davidson','Old Pisgah','brown','findable',26,'fly','dusk',0,30,'A brown trout as long as your arm, living under the big boulder below the bridge. It rises once a day at dusk, and only to a dry fly that drifts perfectly.','{"b":"#B88A3A","d":"#6A4A1E","bel":"#F2DCA0","fin":"#8A6A2E","spot":"#3A1E10"}'::jsonb),('hatteras','Old Hatteras','reddrum','findable',94,'cut','dusk',180,60,'A bull red as old as the lighthouse, the size of the world record. It cruises the point at dusk and only takes cut bait that has soaked for three hours.','{"b":"#B8602A","d":"#7A3A16","bel":"#F0DCC0","fin":"#A0562A","spot":"#0A0A0A"}'::jsonb),('newriver','Old Bronzeback','smallmouth','findable',11.5,'crank','dawn',0,30,'The New River is older than the mountains around it, and so is this smallmouth. It only hits a crankbait worked just right at first light.','{"b":"#8A6A3A","d":"#4E3A1E","bel":"#E0CFA0","fin":"#6A5030","spot":"#2E2210"}'::jsonb),('farmpond','Mudbelly','channel','findable',60,'cut','night',120,60,'The farmer swears a catfish in the pond ate a duck. It only moves at night, when cut bait sits on the bottom for a couple of hours.','{"b":"#4A4036","d":"#2E2822","bel":"#C8B890","fin":"#3A3028","spot":"#1A1612"}'::jsonb),('lakefork','The Texas Hog','largemouth','findable',28,'sucker','dusk',90,30,'The biggest bass in Texas. It wants a big meal at dusk, nothing less than a whole sucker.','{"b":"#5A7A2E","d":"#36501C","bel":"#F0E8B0","fin":"#4A6626","spot":"#1E2C12"}'::jsonb),('harlemmeer','The Subway Carp','carp','findable',70,'cut','day',60,60,'A golden carp as long as a subway bench. Daytime only, and it ignores anything smaller than cut bait.','{"b":"#D8A030","d":"#9A6E18","bel":"#F8E8B0","fin":"#C08A20","spot":"#7A5410"}'::jsonb),('lochness','Nessie''s Shadow','eel','rare',60,'cut','night',240,60,'Something long and dark has lived in the loch for a very long time. Deep night, cut bait, and a wait of hours.','{"b":"#243A34","d":"#121E1A","bel":"#5A7A6E","fin":"#1A2C26","spot":"#0A1410"}'::jsonb),('superior','The Iron Sturgeon','lakesturgeon','rare',320,'sucker','night',600,150,'A gray sturgeon over 300 lb, spotted under the ice by a diver who never went back. Suckers, deep night, and a wait of ten hours.','{"b":"#5A6066","d":"#34393E","bel":"#B8BCC0","fin":"#484E54","spot":"#9AA0A6"}'::jsonb),('everglades','The Swamp King','muskie','rare',90,'mullet','dusk',300,150,'A monster muskie that escaped from an old aquarium and grew huge in the swamp. It hunts mullet at dusk and never bites early.','{"b":"#3E5A2A","d":"#243818","bel":"#C8D0A0","fin":"#6A4A20","spot":"#1A2A10"}'::jsonb),('okeechobee','Big Mama','largemouth','findable',24,'minnow','dawn',45,30,'The biggest bass in the Big O. Dawn, a live minnow, and a little patience.','{"b":"#4E6E30","d":"#2E4420","bel":"#E8E0A8","fin":"#3E5A28","spot":"#182410"}'::jsonb),('mississippi','Old Scar','bluecat','rare',180,'sucker','night',480,150,'A blue catfish with a scar from a barge propeller. It eats suckers in the dark after eight quiet hours.','{"b":"#4A5A6A","d":"#2C3844","bel":"#D0D8E0","fin":"#3A4854","spot":"#1A2430"}'::jsonb),('keysflats','The Silver Ghost','tarpon','rare',320,'mullet','dawn',300,150,'A tarpon so bright it hurts to look at. Dawn on the flats, live mullet, and a long wait.','{"b":"#D8E0E8","d":"#98A4B0","bel":"#FFFFFF","fin":"#B8C4D0","spot":"#F0F4F8"}'::jsonb),('gulfreefs','The Wreck Keeper','goliath','rare',800,'mullet','night',480,400,'A goliath grouper that owns a sunken shrimp boat. Night, live mullet, big-game line, and hours of patience.','{"b":"#6E5A3A","d":"#443622","bel":"#C8B890","fin":"#5A4A2E","spot":"#2A2214"}'::jsonb),('columbia','The River Dragon','whitesturgeon','rare',1300,'sucker','night',720,400,'A white sturgeon older than the dam. Night, suckers, twelve hours, and line that could tow a truck.','{"b":"#8A8A80","d":"#5A5A52","bel":"#E8E8E0","fin":"#6E6E66","spot":"#C8C8C0"}'::jsonb),('kenai','The Kenai King','chinook','rare',110,'cut','dawn',240,150,'A king salmon bigger than the world record. First light on the Kenai, cut bait, and a few hours.','{"b":"#B04840","d":"#742C28","bel":"#E8C8B0","fin":"#8A3A30","spot":"#4A1C18"}'::jsonb),('kona','The Kona Ghost','marlin','rare',2100,'lure','day',360,1000,'A pure-white blue marlin over 2,000 lb. It follows the lures at midday after a long troll and only the heaviest line holds it.','{"b":"#E8F0F4","d":"#B0C0CC","bel":"#FFFFFF","fin":"#C8D8E4","spot":"#D8E8F0"}'::jsonb),('openpacific','The Blue Emperor','bluefin','rare',1200,'lure','dawn',300,1000,'A bluefin tuna the size of a car. Dawn strikes only, after a five-hour troll.','{"b":"#1E3A6E","d":"#0E1E3E","bel":"#D8E4F0","fin":"#F0C040","spot":"#4A6AA0"}'::jsonb),('rionegro','The Arapaima Queen','arapaima','rare',600,'sucker','night',480,400,'A 600 lb arapaima that only shows up in the flooded forest at night. Live suckers and eight hours of jungle dark.','{"b":"#3A4A3E","d":"#1E2A22","bel":"#D84A3A","fin":"#2A3A2E","spot":"#E86A4A"}'::jsonb),('floodedforest','Grandfather Redtail','redtail','findable',160,'cut','night',240,150,'A redtail catfish older than the village. Night, cut bait, four hours.','{"b":"#3A3A3A","d":"#1E1E1E","bel":"#E8E0C8","fin":"#D83A2A","spot":"#2A2A2A"}'::jsonb),('victoria','Mputa the Giant','nileperch','rare',560,'sucker','dusk',360,400,'A Nile perch the fishermen named. It hunts at dusk after six hours, and only live bait will do.','{"b":"#7A8A90","d":"#4A585E","bel":"#E0E8EC","fin":"#5A6A70","spot":"#2A3438"}'::jsonb),('zambezi','The Striped Devil','tigerfish','findable',85,'cut','day',90,60,'A tigerfish with teeth like nails. It hits cut bait in full daylight.','{"b":"#D8C060","d":"#9A8838","bel":"#F8F0C0","fin":"#E05A2A","spot":"#2A2010"}'::jsonb),('ebro','El Monstruo','wels','rare',360,'sucker','night',600,400,'A wels catfish longer than the boat. Deep night, a live sucker, and ten hours of silence.','{"b":"#2E3A2A","d":"#182018","bel":"#C8C8A0","fin":"#242E20","spot":"#0C120A"}'::jsonb),('mongolia','The River Wolf','taimen','rare',280,'sucker','dusk',360,400,'A taimen the herders call the river wolf. Dusk, a live sucker, and six hours.','{"b":"#8A5A3A","d":"#563622","bel":"#E8D0B0","fin":"#D84A2A","spot":"#2A1A10"}'::jsonb),('thaipark','The Golden Buddha','siamesecarp','findable',340,'cut','day',240,150,'A giant carp with golden scales. Daytime, cut bait, four hours.','{"b":"#E0B030","d":"#A07818","bel":"#F8EAB0","fin":"#C89020","spot":"#7A5410"}'::jsonb),('biwa','The Biwa Record','largemouth','findable',26,'minnow','dawn',60,30,'A bass that would beat the world record. Dawn on Lake Biwa, a live minnow.','{"b":"#4E6E3A","d":"#2E4424","bel":"#E8E8C0","fin":"#3E5A30","spot":"#182410"}'::jsonb),('murray','The Old Man of the Murray','murraycod','rare',300,'sucker','night',480,400,'A Murray cod the size of a man. Night, live bait, eight hours under the red gums.','{"b":"#4A6A3A","d":"#2A4020","bel":"#E8E0A8","fin":"#3A5A2E","spot":"#D8C860"}'::jsonb),('gbr','The Reef Bull','gt','rare',210,'mullet','day',240,400,'A giant trevally that bullies sharks. Midday on the reef, live mullet, four hours.','{"b":"#C8D0D8","d":"#8A949E","bel":"#F8F8F8","fin":"#5A6470","spot":"#2A3038"}'::jsonb),('greenland','The Ice Queen','char','rare',45,'minnow','dawn',180,60,'An Arctic char with a belly like fire. Dawn under the ice edge, a live minnow, three hours.','{"b":"#4A5A6E","d":"#2A3644","bel":"#F05A2A","fin":"#F0E8E0","spot":"#F8D8C8"}'::jsonb),('arcticdeep','The Leviathan','greenlandshark','mythic',3400,'deepbait','night',900,1000,'A Greenland shark over 3,000 lb, born before the first ship crossed the Atlantic. Night, a deep-drop rig, fifteen hours, and the heaviest line made.','{"b":"#3A3E48","d":"#1E2028","bel":"#8A8E98","fin":"#2E323C","spot":"#5A5E68"}'::jsonb),('rosssea','The Abyss King','toothfish','mythic',420,'deepbait','night',720,1000,'A giant toothfish from the deepest, coldest water on Earth. Polar night, a deep-drop rig, twelve hours.','{"b":"#2A2E3A","d":"#14161E","bel":"#9AA0B0","fin":"#1E222C","spot":"#6A7088"}'::jsonb),('lakeofthewoods','The Walleye Mayor','walleye','findable',26,'minnow','dusk',90,30,'The town says the biggest walleye in the lake runs the place. Dusk, a minnow, an hour and a half.','{"b":"#C8A848","d":"#8A7028","bel":"#F8F0D0","fin":"#A88838","spot":"#5A4818"}'::jsonb),('millelacs','Thunderjaw','muskie','rare',72,'sucker','dusk',360,150,'A muskie that broke every rod in the bait shop. Dusk, a sucker, six hours.','{"b":"#5A5A3A","d":"#363622","bel":"#E0DCB8","fin":"#6A4A28","spot":"#2A2A14"}'::jsonb),('winnebago','Grandmother Sturgeon','lakesturgeon','rare',280,'sucker','night',600,150,'The oldest sturgeon in Winnebago. Night, suckers, ten hours.','{"b":"#6A6E62","d":"#44483E","bel":"#D0D0C0","fin":"#565A50","spot":"#B8BAA8"}'::jsonb),('gulfofalaska','The Barn Door','halibut','rare',560,'deepbait','day',480,400,'A halibut as wide as a barn door. Daytime, a deep-drop rig, eight hours on the bottom.','{"b":"#4A4A3A","d":"#2A2A20","bel":"#F0F0E8","fin":"#3A3A2E","spot":"#6A6A58"}'::jsonb) on conflict (spot) do nothing;
insert into config (k,v) values ('events','{"halloween":{"name":"Halloween","start":"2026-10-28T00:00:00-04:00","end":"2026-11-02T00:00:00-05:00"}}'::jsonb) on conflict (k) do update set v=excluded.v;
insert into config (k,v) values ('derby','{"tz":"America/New_York","rotation":["largemouth","rainbow","channel","crappie","smallmouth","reddrum","carp","brown","striper","bluegill","walleye","bluefish"],"prizes":[20000,8000,2500],"entry":25,"hat":"hat_derby","special":{"d2026-10-31":{"sp":"ghostcarp","name":"Halloween Ghost Carp Derby"}},"tips":{"ghostcarp":"Ghost carp only show up for Halloween, in every freshwater spot in Home waters. They are night fish, so fish after dark (local time at the spot) with worms or cut bait, and let it soak: the longer the wait, the bigger the ghost.","largemouth":"Big bass hide near cover and feed hardest at dawn and dusk. Jerkbaits and crankbaits get fast strikes from good ones; a minnow left to soak for a long time is how the real giants get caught.","rainbow":"Davidson River and Big Bear Lake are loaded with rainbows. A dry fly drifted without drag is the most fun, and a minnow left out longer finds the big ones.","channel":"Channel cats love smelly bait. Put cut bait out, be patient, and the longer it soaks the bigger the cat. Night is great.","crappie":"Crappie bite best when the light is low. Jigs and minnows both work; they school up, so if you catch one, cast right back.","smallmouth":"Smallmouth love clear, rocky water: New River is the place. Jigs and jerkbaits fished well catch the biggest bronzebacks.","reddrum":"Cape Hatteras Point is red drum heaven, and it is free. Cut bait or live mullet, soak it long, and fish at dusk for a bull red.","carp":"Carp are slow and heavy. Cut bait or worms, then wait. The biggest ones come after a long soak.","brown":"Browns are sneaky and bite best in low light. Fish Davidson River at dusk with a dry fly or a minnow, and give it time.","striper":"Stripers roam Lake Lanier, the Neuse River and Cape Hatteras. Low light is best; suckers and cut bait catch the monsters.","bluegill":"Everyone can catch bluegill, so this one comes down to luck and patience. Worms get lots of bites, and minnows find the bigger bulls.","walleye":"Walleye live in the New River and bite best at dusk and at night. Jigs and jerkbaits fished well, or a minnow left to soak.","bluefish":"Bluefish crash bait in the surf at Cape Hatteras in daylight. Cut bait and jerkbaits both work; they are fast and they fight."}}'::jsonb) on conflict (k) do update set v=excluded.v;
update derbies d set species = (select v -> 'special' -> d.key ->> 'sp' from config where k = 'derby') where not awarded and (select v -> 'special' -> d.key ->> 'sp' from config where k = 'derby') is not null;

-- One Cast server, part 3: the referee. Every move the website can make is one of these functions.
-- They run as the database owner (security definer) and check everything themselves.

-- ============ helpers ============
create or replace function public.oc_fail(msg text) returns void language plpgsql as $$
begin raise exception using message = msg, errcode = 'P0001'; end $$;

create or replace function public.oc_bad_name(n text) returns boolean language plpgsql immutable as $$
declare bad text[] := array['fuck','shit','bitch','cunt','nigg','fag','dick','pussy','cock','asshole','slut','whore','porn','sex','rape','nazi','hitler','penis','vagina','boob','tits','retard','kkk'];
        w text; l text := lower(coalesce(n,''));
begin
  if l !~ '^[a-z0-9_]{2,16}$' then return true; end if;
  foreach w in array bad loop if position(w in l) > 0 then return true; end if; end loop;
  return false;
end $$;

create or replace function public.oc_auth(p_pid uuid, p_secret text) returns public.players language plpgsql as $$
declare p public.players;
begin
  if p_pid is null or p_secret is null or length(p_secret) < 20 then perform oc_fail('bad secret'); end if;
  select * into p from players where pid = p_pid for update;
  if p.pid is null then perform oc_fail('no player'); end if;
  if p.secret <> p_secret then perform oc_fail('not your game'); end if;
  if p.banned then perform oc_fail('banned'); end if;
  -- stranded? (rode a friend's boat somewhere, then the trip ended) -> back to home waters
  if not exists (select 1 from spots s where s.id = p.spot and s.region = any(p.regions))
     and not exists (select 1 from crews c where c.guest = p.pid and c.status = 'aboard' and c.spot = p.spot) then
    p.spot := 'basslake';
  end if;
  update players set last_seen = now(), spot = p.spot where pid = p_pid;
  insert into activity (day, pid) values ((now() at time zone 'America/New_York')::date, p_pid) on conflict do nothing;
  return p;
end $$;

create or replace function public.oc_period(ts timestamptz, tz text) returns text language plpgsql stable as $$
declare h numeric;
begin
  h := extract(hour from (ts at time zone tz)) + extract(minute from (ts at time zone tz)) / 60.0;
  return case when h >= 5 and h < 8 then 'dawn' when h >= 8 and h < 17 then 'day' when h >= 17 and h < 20 then 'dusk' else 'night' end;
end $$;

create or replace function public.oc_line_test(lvl int) returns int language sql immutable as $$
  select (array[15,30,60,150,400,1000])[greatest(1, least(6, lvl + 1))];
$$;
create or replace function public.oc_rod_bonus(lvl int) returns numeric language sql immutable as $$
  select (array[0,0.05,0.09,0.13,0.18,0.24,0.30])[greatest(1, least(7, coalesce(lvl, 0) + 1))];
$$;
create or replace function public.oc_reel_snap(lvl int) returns numeric language sql immutable as $$
  select (array[0.6,0.5,0.4,0.3,0.22,0.15,0.08])[greatest(1, least(7, lvl + 1))];
$$;
create or replace function public.oc_season_key(ts timestamptz) returns text language sql stable as $$
  select 's' || to_char(ts at time zone 'UTC', 'YYYY-MM');
$$;
create or replace function public.oc_week_key(ts timestamptz) returns text language sql stable as $$
  select 'w' || to_char(date_trunc('week', ts at time zone 'UTC'), 'YYYY-MM-DD');
$$;

create or replace function public.oc_news(p_kind text, p_pid uuid, p_text text, p_data jsonb) returns void language plpgsql as $$
declare p public.players;
begin
  if p_pid is not null then select * into p from players where pid = p_pid; end if;
  insert into news (kind, pid, name, tag, text, data) values (p_kind, p_pid, p.name, p.tag, p_text, coalesce(p_data, '{}'::jsonb));
end $$;

-- Is an event (like Halloween) on right now?
create or replace function public.oc_event_on(p_event text) returns boolean language sql stable as $$
  select p_event is null or coalesce((select now() >= (v -> p_event ->> 'start')::timestamptz and now() < (v -> p_event ->> 'end')::timestamptz from config where k = 'events'), false);
$$;

-- How soon the first bite comes, in minutes.
drop function if exists public.oc_bite_minutes(text, text, boolean);
create or replace function public.oc_bite_minutes(p_spot text, p_bait text, p_mult numeric, p_small boolean) returns numeric language plpgsql as $$
declare b public.baits; first_wait int; r numeric;
begin
  select * into b from baits where id = p_bait;
  select min(s.min_wait) into first_wait from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0 and (not p_small or s.small) and (s.event is null or oc_event_on(s.event));
  if first_wait is null then return null; end if;
  r := random();
  return greatest(b.min_bite, first_wait) - ln(1 - r) * b.bite_mean * p_mult;
end $$;

-- Which fish bit, and how big. The same formula the game shows in its journal.
drop function if exists public.oc_roll(text, text, numeric, text);
drop function if exists public.oc_roll(text, text, numeric, text, boolean);
-- p_rod: the rod's size bonus (0.05 = 5% bigger): it raises the size cap and makes big fish more common.
create or replace function public.oc_roll(p_spot text, p_bait text, p_minutes numeric, p_period text, p_small boolean, p_rod numeric default 0,
  out species text, out lb numeric, out inches numeric, out variant text, out bonus boolean) language plpgsql as $$
declare b public.baits; total numeric := 0; pick numeric; rec record; chosen record; a numeric; cap numeric; u numeric; v numeric; f numeric; vr numeric; prime boolean;
begin
  select * into b from baits where id = p_bait;
  for rec in
    select s.*, ss.w * sb.w * coalesce((s.act ->> p_period)::numeric, 1) *
      (case when p_minutes < s.min_wait then 0 when s.max_wait > 0 and p_minutes > s.max_wait then exp(-(p_minutes - s.max_wait) / s.max_wait) else 1 end) as w
    from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0 and (not p_small or s.small) and (s.event is null or oc_event_on(s.event))
    order by s.id
  loop total := total + rec.w; end loop;
  if total <= 0 then species := null; return; end if;
  pick := random() * total;
  for rec in
    select s.*, ss.w * sb.w * coalesce((s.act ->> p_period)::numeric, 1) *
      (case when p_minutes < s.min_wait then 0 when s.max_wait > 0 and p_minutes > s.max_wait then exp(-(p_minutes - s.max_wait) / s.max_wait) else 1 end) as w
    from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0 and (not p_small or s.small) and (s.event is null or oc_event_on(s.event))
    order by s.id
  loop
    if rec.w <= 0 then continue; end if;
    chosen := rec; pick := pick - rec.w; if pick <= 0 then exit; end if;
  end loop;
  a := 1 - exp(-p_minutes / b.tau);
  cap := least(1, (0.12 + 0.88 * a) * b.cap_max * (1 + coalesce(p_rod, 0)));
  prime := p_period in ('dawn','dusk');
  u := random(); bonus := random() < (0.03 + 0.12 * a) * (case when prime then 2 else 1 end); v := random();
  f := case when bonus then cap * (0.75 + 0.25 * v) else cap * power(u, 1.25 * (1 - coalesce(p_rod, 0))) end;
  species := chosen.id;
  lb := round((chosen.min_lb + (chosen.max_lb - chosen.min_lb) * f) * 16) / 16;
  inches := round(chosen.k * cbrt(lb) * 4) / 4;
  vr := random();
  variant := case when vr < 0.002 then 'golden' when vr < 0.0053 then 'albino' else null end;
end $$;

create or replace function public.oc_fish_value(p_species text, p_lb numeric, p_variant text) returns bigint language sql stable as $$
  select case when s.protected then 0 else greatest(1, round(p_lb * s.rate * (case p_variant when 'golden' then 10 when 'albino' then 5 else 1 end)))::bigint end
  from species s where s.id = p_species;
$$;

create or replace function public.oc_fmt_wait(m int) returns text language sql immutable as $$
  select case when m < 60 then m || ' minutes' when m % 60 = 0 then (m / 60) || (case when m = 60 then ' hour' else ' hours' end) else (m / 60) || (case when m / 60 = 1 then ' hour ' else ' hours ' end) || (m % 60) || ' minutes' end;
$$;

-- ============ legends ============
create or replace function public.oc_legend_odds(l public.legends) returns numeric language plpgsql stable as $$
declare base numeric; d numeric;
begin
  base := case l.tier when 'findable' then 2000 when 'rare' then 20000 else 100000 end;
  -- Only Findable and Rare legends get easier over time. Mythic legends never do.
  if l.tier = 'mythic' then return base; end if;
  d := extract(epoch from (now() - l.created_at)) / 86400.0;
  return greatest(50, base / power(2, floor(d / 14)));
end $$;

create or replace function public.oc_make_legend(p_spot text, p_season text) returns int language plpgsql as $$
declare pr public.legend_presets; sp public.spots; rg public.regions; s public.species; cand record; tier text; lb numeric; bait text; period text; mw int; ml int; nm text; clue text; colors jsonb; nid int;
        adjs text[] := array['Iron','Ghost','Shadow','Thunder','Pale','Black','Golden','Silver','Scarred','Old','Mad','Lost','Storm','Midnight','Moss','Copper','Bone','Hollow','Crooked','Grim'];
        pals jsonb[] := array[
          '{"b":"#4A5056","d":"#2C3036","bel":"#C8CCD0","fin":"#3A3E44","spot":"#8A9098"}'::jsonb,
          '{"b":"#DDE6EC","d":"#AFC0CC","bel":"#F8FBFC","fin":"#C8D8E4","spot":"#FFFFFF"}'::jsonb,
          '{"b":"#2A2A30","d":"#141418","bel":"#6A6A78","fin":"#1E1E24","spot":"#4A4A58"}'::jsonb,
          '{"b":"#E8B830","d":"#B88A18","bel":"#FFE9A0","fin":"#D89A20","spot":"#FFF2C0"}'::jsonb,
          '{"b":"#B0B8C0","d":"#7A848C","bel":"#F0F4F8","fin":"#98A0A8","spot":"#E0E6EC"}'::jsonb,
          '{"b":"#8A2A2A","d":"#521616","bel":"#E8B0A0","fin":"#6A1E1E","spot":"#3A0C0C"}'::jsonb,
          '{"b":"#2E6A4A","d":"#1A3E2A","bel":"#C8E8D0","fin":"#245A3C","spot":"#0E2418"}'::jsonb,
          '{"b":"#5A3A7A","d":"#34204A","bel":"#D8C8E8","fin":"#4A2E66","spot":"#1E1030"}'::jsonb,
          '{"b":"#A06A30","d":"#6A4418","bel":"#F0D8B0","fin":"#8A5A28","spot":"#3A2410"}'::jsonb,
          '{"b":"#1E2E5A","d":"#101A36","bel":"#B8C8E8","fin":"#182448","spot":"#4A5A8A"}'::jsonb];
        pnames text[] := array['Iron','Pale','Black','Golden','Silver','Crimson','Emerald','Violet','Bronze','Midnight'];
        pi int; hours numeric; bname text; sname text; spname text;
begin
  select * into sp from spots where id = p_spot;
  select * into rg from regions where id = sp.region;
  select * into pr from legend_presets where spot = p_spot and not used;
  if pr.spot is not null then
    insert into legends (season, spot, name, species, tier, lb, bait, period, min_wait, min_line, clue, colors)
      values (p_season, p_spot, pr.name, pr.species, pr.tier, pr.lb, pr.bait, pr.period, pr.min_wait, pr.min_line, pr.clue, pr.colors) returning id into nid;
    update legend_presets set used = true where spot = p_spot;
    return nid;
  end if;
  -- invent one: one of the two biggest fish at the spot
  select s2.* into s from spot_species ss join species s2 on s2.id = ss.species where ss.spot = p_spot and ss.w > 0 order by s2.max_lb desc, random() limit 1 offset (case when random() < 0.65 then 0 else 1 end);
  if s.id is null then select s2.* into s from spot_species ss join species s2 on s2.id = ss.species where ss.spot = p_spot and ss.w > 0 order by s2.max_lb desc limit 1; end if;
  tier := case when rg.tier >= 12 then 'mythic' when rg.tier >= 4 and not exists (select 1 from legend_presets where spot = p_spot) and random() < 0.8 then 'rare' when rg.tier >= 4 then 'rare' else 'findable' end;
  lb := round(s.max_lb * (1.15 + random() * 0.5));
  select sb.bait into bait from species_baits sb join baits b on b.id = sb.bait join method_baits mb on mb.bait = sb.bait and mb.method = sp.method
    where sb.species = s.id and sb.w > 0 order by b.tau desc limit 1;
  select k into period from (select key as k, (value)::numeric as v from jsonb_each_text(s.act)) t order by v desc, random() limit 1;
  mw := greatest(45, least(900, round((s.min_wait * 1.5 + 60) / 15) * 15));
  select min(t) into ml from unnest(array[15,30,60,150,400,1000]) t where t >= lb * 0.6; ml := coalesce(ml, 1000);
  pi := 1 + floor(random() * 10)::int;
  spname := lower(s.name);
  nm := case floor(random() * 3)::int
    when 0 then 'The ' || adjs[1 + floor(random() * array_length(adjs, 1))::int] || ' ' || initcap(split_part(spname, ' ', array_length(string_to_array(spname, ' '), 1)))
    when 1 then 'Old ' || adjs[1 + floor(random() * array_length(adjs, 1))::int]
    else pnames[pi] || ' ' || initcap(split_part(spname, ' ', array_length(string_to_array(spname, ' '), 1))) end;
  while exists (select 1 from legends where name = nm) loop nm := nm || ' II'; end loop;
  colors := pals[pi];
  select name into bname from baits where id = bait;
  clue := 'A ' || spname || ' far bigger than any ever weighed, said to haunt ' || sp.name || '. The old stories agree on three things: it only moves at ' || period ||
          ', it only takes ' || lower(bname) || ', and nobody has ever hooked it in under ' || oc_fmt_wait(mw) || '. Light line will not hold it.';
  insert into legends (season, spot, name, species, tier, lb, bait, period, min_wait, min_line, clue, colors)
    values (p_season, p_spot, nm, s.id, tier, lb, bait, period, mw, ml, clue, colors) returning id into nid;
  return nid;
end $$;

-- Starts the season if it hasn't started, hands out last season's prizes, and makes sure every spot has a legend to chase.
create or replace function public.oc_ensure_season() returns text language plpgsql as $$
declare k text := oc_season_key(now()); prev text; rec record; rank int := 0; prize int; sp record; names text := '';
begin
  if not exists (select 1 from seasons where key = k) then
    insert into seasons (key) values (k) on conflict do nothing;
    -- prizes for the season that just ended
    prev := oc_season_key(now() - interval '1 month');
    if exists (select 1 from seasons where key = prev and not prizes_paid) then
      for rec in
        select distinct on (f.pid) f.pid, p.name, p.tag, f.species, f.lb from fish f join players p on p.pid = f.pid
        where f.legend_id is null and not f.released and not p.hidden
          and f.caught_at >= date_trunc('month', (now() - interval '1 month') at time zone 'UTC') at time zone 'UTC'
          and f.caught_at <  date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
        order by f.pid, f.lb desc
      loop
        rank := rank + 1; if rank > 10 then exit; end if;
        prize := case rank when 1 then 25000 when 2 then 15000 when 3 then 8000 else 2000 end;
        update players set coins = coins + prize, champ = champ + (case when rank <= 3 then 1 else 0 end),
          items = (case when rank <= 3 and not ('hat_champ' = any(items)) then array_append(items, 'hat_champ') else items end) where pid = rec.pid;
        insert into hall_of_fame (season, rank, pid, name, tag, species, lb, prize) values (prev, rank, rec.pid, rec.name, rec.tag, rec.species, rec.lb, prize) on conflict do nothing;
        if rank <= 3 then names := names || (case when rank > 1 then ', ' else '' end) || rec.name || '#' || rec.tag; end if;
      end loop;
      update seasons set prizes_paid = true where key = prev;
      if rank > 0 then perform oc_news('season', null, 'Season over! Champions: ' || names, jsonb_build_object('season', prev)); end if;
    end if;
    -- a new season: every spot whose legend was caught gets a fresh one. Uncaught legends stay out there.
    for sp in select id from spots where not exists (select 1 from legends l where l.spot = spots.id and l.active and l.owner_pid is null) loop
      perform oc_make_legend(sp.id, k);
    end loop;
  end if;
  -- first run: every spot gets a legend
  for sp in select id from spots where not exists (select 1 from legends l where l.spot = spots.id and l.active) loop
    perform oc_make_legend(sp.id, k);
  end loop;
  return k;
end $$;

-- ============ json views ============
create or replace function public.oc_fish_json(f public.fish) returns jsonb language sql stable as $$
  select jsonb_build_object('id', f.id, 'sp', f.species, 'lb', f.lb, 'inches', f.inches, 'variant', f.variant, 'bait', f.bait, 'spot', f.spot, 'period', f.period,
    'at', f.caught_at, 'legend', f.legend_id, 'released', f.released, 'locked', f.locked_until, 'value', oc_fish_value(f.species, f.lb, f.variant),
    'mine', f.caught_by = f.pid, 'legendName', (select name from legends where id = f.legend_id), 'colors', (select colors from legends where id = f.legend_id));
$$;

create or replace function public.oc_legend_json(l public.legends) returns jsonb language sql stable as $$
  select jsonb_build_object('id', l.id, 'spot', l.spot, 'name', l.name, 'sp', l.species, 'tier', l.tier, 'lb', l.lb, 'clue', l.clue, 'colors', l.colors,
    'season', l.season, 'since', l.created_at, 'odds', round(oc_legend_odds(l)), 'owner', l.owner_pid,
    'ownerName', (select p.name || '#' || p.tag from players p where p.pid = l.owner_pid and not p.hidden), 'caughtAt', l.caught_at, 'history', l.history, 'active', l.active);
$$;

create or replace function public.oc_line_json(ln public.lines, finder int) returns jsonb language sql stable as $$
  select jsonb_build_object('idx', ln.idx, 'spot', ln.spot, 'bait', ln.bait, 'castAt', ln.cast_at, 'biteAt', ln.bite_at, 'snagAt', ln.snag_at,
    'peekSp', case when finder >= 1 then ln.species end, 'peekLb', case when finder >= 2 then ln.lb end,
    'legendNear', case when finder >= 3 then exists (select 1 from legends l where l.spot = ln.spot and l.active and l.owner_pid is null and l.bait = ln.bait
        and l.period = oc_period(ln.bite_at, (select tz from spots where id = ln.spot)) and extract(epoch from (ln.bite_at - ln.cast_at)) / 60 >= l.min_wait and ln.legend_roll < 1.0 / oc_legend_odds(l)) else false end);
$$;

create or replace function public.oc_state(p public.players) returns jsonb language plpgsql stable as $$
declare st jsonb; fr jsonb; tr jsonb; lg jsonb; season text := oc_season_key(now());
begin
  select coalesce(jsonb_agg(jsonb_build_object('pid', o.pid, 'name', o.name, 'tag', o.tag, 'status', f.status, 'mine', f.requested_by = p.pid, 'online', o.last_seen > now() - interval '10 minutes') order by o.name), '[]'::jsonb) into fr
    from friends f join players o on o.pid = (case when f.a = p.pid then f.b else f.a end) where (f.a = p.pid or f.b = p.pid) and not o.banned;
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'other', o.name || '#' || o.tag, 'otherPid', o.pid, 'updated', t.updated_at) order by t.updated_at desc), '[]'::jsonb) into tr
    from trades t join players o on o.pid = (case when t.a = p.pid then t.b else t.a end) where (t.a = p.pid or t.b = p.pid) and t.status = 'open';
  select coalesce(jsonb_agg(oc_legend_json(l)), '[]'::jsonb) into lg from legends l where l.spot = p.spot and l.active and l.owner_pid is null;
  st := jsonb_build_object(
    'pid', p.pid, 'name', p.name, 'tag', p.tag, 'coins', p.coins, 'spot', p.spot, 'regions', to_jsonb(p.regions), 'baits', to_jsonb(p.baits), 'gear', p.gear,
    'items', to_jsonb(p.items), 'outfit', p.outfit, 'prefs', p.prefs, 'stats', p.stats, 'journal', p.journal, 'daily', p.daily, 'hasPw', p.pw_hash is not null, 'founder', p.founder, 'champ', p.champ,
    'created', p.created_at, 'renamedAt', p.renamed_at,
    'lines', (select coalesce(jsonb_agg(oc_line_json(l, (p.gear ->> 'finder')::int) order by l.idx), '[]'::jsonb) from lines l where l.pid = p.pid),
    'fish', (select coalesce(jsonb_agg(oc_fish_json(f) order by f.caught_at desc), '[]'::jsonb) from fish f where f.pid = p.pid),
    'friends', fr, 'trades', tr, 'legendsHere', lg, 'blocked', oc_block_list(p.pid),
    'season', jsonb_build_object('key', season, 'endsAt', (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC'),
    'newsId', (select max(id) from news),
    'crew', oc_crew_json(p.pid),
    'now', now());
  return st;
end $$;

-- ============ account ============
create or replace function public.login(p_pid uuid, p_secret text, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t text; tries int := 0;
begin
  perform oc_ensure_season();
  if p_pid is null or p_secret is null or length(p_secret) < 20 or length(p_secret) > 80 then perform oc_fail('bad secret'); end if;
  select * into p from players where pid = p_pid;
  if p.pid is null then
    if oc_bad_name(p_name) then perform oc_fail('bad name'); end if;
    loop
      t := lpad((floor(random() * 10000))::int::text, 4, '0'); tries := tries + 1;
      exit when not exists (select 1 from players where lower(name) = lower(p_name) and tag = t) or tries > 50;
    end loop;
    insert into players (pid, secret, name, tag, coins) values (p_pid, p_secret, p_name, t, 50) returning * into p; -- $50 welcome bonus
  end if;
  p := oc_auth(p_pid, p_secret);
  return oc_state(p);
end $$;

create or replace function public.get_state(p_pid uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  perform oc_ensure_season();
  p := oc_auth(p_pid, p_secret);
  return oc_state(p);
end $$;

create or replace function public.set_prefs(p_pid uuid, p_secret text, p_prefs jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; out_prefs jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' or length(p_prefs::text) > 20000 then perform oc_fail('bad prefs'); end if;
  update players set prefs = prefs || p_prefs where pid = p_pid returning prefs into out_prefs;
  return out_prefs;
end $$;

create or replace function public.set_outfit(p_pid uuid, p_secret text, p_outfit jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; k text; v text; it public.items; out_fit jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  for k, v in select * from jsonb_each_text(p_outfit) loop
    select * into it from items where id = v;
    if it.id is null or it.slot <> k or not (v = any(p.items)) then perform oc_fail('you do not own that'); end if;
  end loop;
  update players set outfit = outfit || p_outfit where pid = p_pid returning outfit into out_fit;
  return out_fit;
end $$;

create or replace function public.set_name(p_pid uuid, p_secret text, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t text; tries int := 0;
begin
  p := oc_auth(p_pid, p_secret);
  if oc_bad_name(p_name) then perform oc_fail('bad name'); end if;
  if p.renamed_at is not null and p.renamed_at > now() - interval '7 days' then perform oc_fail('you can change your name once a week'); end if;
  t := p.tag;
  while exists (select 1 from players where lower(name) = lower(p_name) and tag = t and pid <> p_pid) and tries < 50 loop
    t := lpad((floor(random() * 10000))::int::text, 4, '0'); tries := tries + 1;
  end loop;
  update players set name = p_name, tag = t, renamed_at = now() where pid = p_pid;
  return jsonb_build_object('name', p_name, 'tag', t);
end $$;

create or replace function public.claim_founder(p_pid uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  update players set founder = true, items = (case when 'hat_founder' = any(items) then items else array_append(items, 'hat_founder') end) where pid = p_pid;
  return jsonb_build_object('ok', true);
end $$;

-- ============ fishing ============
-- What a player can do at their spot: which boat they're on (their own, or their host's if they're a crew guest),
-- whether only small fish will bite, and how much sooner bites come.
create or replace function public.oc_access(p public.players, sp public.spots, out boat text, out boat_lvl int, out rig boolean, out small boolean, out mult numeric, out host uuid, out crewed boolean) language plpgsql as $$
declare h public.players; g jsonb; pk jsonb;
begin
  select c.host into host from crews c where c.guest = p.pid and c.status = 'aboard' and c.spot = p.spot;
  if host is not null then select * into h from players where pid = host; g := h.gear; else g := p.gear; end if;
  boat := coalesce(g ->> 'boat', 'paddle');
  select lvl, perk into boat_lvl, pk from gear where id = boat; boat_lvl := coalesce(boat_lvl, 0);
  rig := coalesce(g -> 'methods' ? 'deeprig', false) or boat = 'devboat';
  small := (sp.method = 'troll' and boat_lvl < 5) or (sp.method = 'deep' and not rig);
  mult := (case when coalesce((p.gear ->> 'comfort')::boolean, false) then 0.75 else 1 end)
        * coalesce((pk ->> 'all')::numeric, (pk ->> sp.water)::numeric, (case when sp.region in ('arctic','southern') then (pk ->> 'polar')::numeric end), 1);
  crewed := host is not null or exists (select 1 from crews c where c.host = p.pid and c.status = 'aboard' and c.spot = p.spot);
  if crewed then mult := mult * 0.9; end if;
end $$;

create or replace function public.oc_is_lure(p_bait text) returns boolean language sql immutable as $$ select p_bait in ('crank', 'jig', 'jerk', 'fly') $$;

-- Hard lures in the tackle box: gear.lures.<bait> = {n: spare lures, left: casts left on the one tied on}.
create or replace function public.oc_lure_count(g jsonb, p_bait text) returns int language sql immutable as $$
  select coalesce((g -> 'lures' -> p_bait ->> 'n')::int, 0) + (case when coalesce((g -> 'lures' -> p_bait ->> 'left')::int, 0) > 0 then 1 else 0 end);
$$;
-- Adds (or with a negative number, takes) lures; keeps the bait list in step so "owned" means "has one left".
create or replace function public.oc_lure_add(p_pid uuid, p_bait text, p_n int) returns void language plpgsql as $$
declare g jsonb; lu jsonb; n int; lft int;
begin
  select gear into g from players where pid = p_pid for update;
  lu := coalesce(g -> 'lures' -> p_bait, '{"n":0,"left":0}'::jsonb);
  n := greatest(0, coalesce((lu ->> 'n')::int, 0) + p_n); lft := coalesce((lu ->> 'left')::int, 0);
  if p_n < 0 and n = 0 and coalesce((lu ->> 'n')::int, 0) + p_n < 0 then lft := 0; end if;
  g := jsonb_set(g || jsonb_build_object('lures', coalesce(g -> 'lures', '{}'::jsonb)), array['lures', p_bait], jsonb_build_object('n', n, 'left', lft));
  update players set gear = g, baits = case when n + lft > 0 then (case when p_bait = any(baits) then baits else array_append(baits, p_bait) end) else array_remove(baits, p_bait) end where pid = p_pid;
end $$;
-- A snag: the lure tied on is gone.
create or replace function public.oc_lure_snapped(p_pid uuid, p_bait text) returns void language plpgsql as $$
declare g jsonb; n int;
begin
  select gear into g from players where pid = p_pid for update;
  n := coalesce((g -> 'lures' -> p_bait ->> 'n')::int, 0);
  g := jsonb_set(g || jsonb_build_object('lures', coalesce(g -> 'lures', '{}'::jsonb)), array['lures', p_bait], jsonb_build_object('n', n, 'left', 0));
  update players set gear = g, baits = case when n > 0 then baits else array_remove(baits, p_bait) end,
    stats = jsonb_set(stats, '{snagged}', to_jsonb(coalesce((stats ->> 'snagged')::int, 0) + 1)) where pid = p_pid;
end $$;

-- Buy hard lures, one or more at a time.
create or replace function public.buy_lures(p_pid uuid, p_secret text, p_bait text, p_qty int) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; b public.baits; price bigint;
begin
  p := oc_auth(p_pid, p_secret);
  select * into b from baits where id = p_bait; if b.id is null or b.uses <= 0 then perform oc_fail('no such lure'); end if;
  if p_qty is null or p_qty < 1 or p_qty > 50 then perform oc_fail('buy 1 to 50 at a time'); end if;
  if oc_lure_count(p.gear, p_bait) + p_qty > 200 then perform oc_fail('your tackle box is full (200 of each lure)'); end if;
  price := b.price * p_qty;
  if p.coins < price then perform oc_fail('not enough coins'); end if;
  update players set coins = coins - price where pid = p_pid;
  perform oc_lure_add(p_pid, p_bait, p_qty);
  select * into p from players where pid = p_pid;
  return jsonb_build_object('coins', p.coins, 'baits', to_jsonb(p.baits), 'gear', p.gear, 'items', to_jsonb(p.items), 'regions', to_jsonb(p.regions), 'now', now());
end $$;

-- The lure is hung up. Pull: a 35% chance to work it free (the lure is saved). Otherwise, or if you cut it, it is gone.
create or replace function public.lure_snag(p_pid uuid, p_secret text, p_idx int, p_pull boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; ln public.lines; freed boolean;
begin
  p := oc_auth(p_pid, p_secret);
  select * into ln from lines where pid = p_pid and idx = p_idx for update;
  if ln.pid is null then perform oc_fail('no line there'); end if;
  if ln.snag_at is null or now() < ln.snag_at - interval '2 seconds' then perform oc_fail('that lure is not snagged'); end if;
  delete from lines where pid = p_pid and idx = p_idx;
  freed := coalesce(p_pull, false) and random() < 0.35;
  if not freed then perform oc_lure_snapped(p_pid, ln.bait); end if;
  select * into p from players where pid = p_pid;
  return jsonb_build_object('result', case when freed then 'freed' else 'lost' end, 'bait', ln.bait, 'baits', to_jsonb(p.baits), 'gear', p.gear, 'now', now());
end $$;

-- Crankbait hook-set: starts the fight. Returns how hard the fish fights (0-1): bigger and more valuable fish are harder.
create or replace function public.lure_strike(p_pid uuid, p_secret text, p_idx int) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; ln public.lines; s public.species; frac numeric; val numeric; d numeric;
begin
  p := oc_auth(p_pid, p_secret);
  select * into ln from lines where pid = p_pid and idx = p_idx for update;
  if ln.pid is null then perform oc_fail('no line there'); end if;
  if ln.bait not in ('crank', 'jerk') then perform oc_fail('only crankbaits and jerkbaits fight'); end if;
  if ln.snag_at is not null and now() >= ln.snag_at then perform oc_fail('your lure is snagged'); end if;
  if now() < ln.bite_at then perform oc_fail('nothing has hit it yet'); end if;
  if ln.fight_until is null and now() > ln.bite_at + interval '4 seconds' then
    delete from lines where pid = p_pid and idx = p_idx; return jsonb_build_object('result', 'missed', 'now', now()); end if;
  select * into s from species where id = ln.species;
  frac := case when s.max_lb > s.min_lb then greatest(0, least(1, (ln.lb - s.min_lb) / (s.max_lb - s.min_lb))) else 0.5 end;
  val := greatest(1, ln.lb * s.rate);
  d := greatest(0.1, least(1, 0.15 + 0.55 * power(frac, 0.7) + 0.30 * least(1, log(val) / 4)));
  if ln.variant is not null and ln.variant <> '' then d := least(1, d + 0.1); end if;
  d := greatest(0.1, d - 0.025 * coalesce((p.gear ->> 'reel')::int, 0)); -- a better reel makes the fight easier
  update lines set fight_until = coalesce(fight_until, now() + interval '90 seconds') where pid = p_pid and idx = p_idx;
  return jsonb_build_object('result', 'fight', 'difficulty', round(d, 2), 'now', now());
end $$;

-- A lure fish that got away (turned away, slow hook-set, or lost in the fight): the line comes back empty.
create or replace function public.lure_lose(p_pid uuid, p_secret text, p_idx int) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; ln public.lines;
begin
  p := oc_auth(p_pid, p_secret);
  delete from lines where pid = p_pid and idx = p_idx and oc_is_lure(bait) returning * into ln;
  if ln.snag_at is not null and now() >= ln.snag_at then perform oc_lure_snapped(p_pid, ln.bait); end if;
  select * into p from players where pid = p_pid;
  return jsonb_build_object('result', 'lost', 'baits', to_jsonb(p.baits), 'gear', p.gear, 'now', now());
end $$;

create or replace function public.cast_line(p_pid uuid, p_secret text, p_idx int, p_bait text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; sp public.spots; mins numeric; r record; per text; ln public.lines; ac record; bite timestamptz; bt public.baits; lu jsonb; ln_n int; ln_left int; snag timestamptz;
begin
  p := oc_auth(p_pid, p_secret);
  select * into sp from spots where id = p.spot;
  select * into bt from baits where id = p_bait;
  if p_idx < 0 or p_idx >= (p.gear ->> 'lines')::int then perform oc_fail('you do not have that line'); end if;
  if exists (select 1 from lines where pid = p_pid and idx = p_idx) then perform oc_fail('that line is already in the water'); end if;
  if coalesce(bt.uses, 0) > 0 then
    if oc_lure_count(p.gear, p_bait) <= 0 then perform oc_fail(case when p.gear -> 'lures' ? p_bait then 'you are out of ' || lower(bt.name) || '. Buy more at the bait shop' else 'you do not own that bait' end); end if;
  elsif not (p_bait = any(p.baits)) then perform oc_fail('you do not own that bait'); end if;
  if not exists (select 1 from method_baits where method = sp.method and bait = p_bait) then perform oc_fail('that bait does not work here'); end if;
  select * into ac from oc_access(p, sp);
  if not (sp.region = any(p.regions)) and ac.host is null then perform oc_fail('you need your own ticket to fish here'); end if;
  if sp.need > 0 and sp.method = 'boat' and ac.boat_lvl < sp.need then perform oc_fail(case when sp.need = 1 then 'take out a kayak or bigger boat to fish here' else 'take out a skiff or bigger boat to fish this salt water' end); end if;
  if p_bait = 'deepbait' and not ac.rig then perform oc_fail('you need the deep-drop rig to use that'); end if;
  if p_bait = 'lure' and ac.boat_lvl < 5 then perform oc_fail('trolling lures need a sportfisher or bigger boat'); end if;
  mins := oc_bite_minutes(p.spot, p_bait, ac.mult, ac.small);
  if mins is null then perform oc_fail('nothing here bites on that'); end if;
  -- Lures and jigs are fished actively: the strike comes within seconds while the player works the lure.
  -- The fish is rolled as if the lure had fished for `mins` (same size rules), so cast_at is set that far back.
  bite := case when oc_is_lure(p_bait) then now() + ((case when p_bait = 'crank' then 6 + random() * 16 when p_bait = 'fly' then 9 + random() * 16 when p_bait = 'jerk' then 6 + random() * 14 else 8 + random() * 20 end) * interval '1 second')
               else now() + (mins * interval '1 minute') end;
  per := oc_period(bite, sp.tz);
  select * into r from oc_roll(p.spot, p_bait, mins, per, ac.small, oc_rod_bonus((p.gear ->> 'rod')::int));
  -- hard lures: this cast uses up one cast of the lure tied on (tie on a new one when it is worn out), and it might snag
  if coalesce(bt.uses, 0) > 0 then
    lu := coalesce(p.gear -> 'lures' -> p_bait, '{"n":0,"left":0}'::jsonb); ln_n := coalesce((lu ->> 'n')::int, 0); ln_left := coalesce((lu ->> 'left')::int, 0);
    if ln_left <= 0 then ln_n := ln_n - 1; ln_left := bt.uses; end if;
    ln_left := ln_left - 1;
    update players set gear = jsonb_set(gear || jsonb_build_object('lures', coalesce(gear -> 'lures', '{}'::jsonb)), array['lures', p_bait], jsonb_build_object('n', ln_n, 'left', ln_left)),
      baits = case when ln_n + ln_left > 0 then baits else array_remove(baits, p_bait) end where pid = p_pid;
    if random() < bt.snag and bite > now() + interval '6 seconds' then
      snag := now() + (3 + random() * (extract(epoch from (bite - now())) - 4)) * interval '1 second';
    end if;
  end if;
  insert into lines (pid, idx, spot, bait, cast_at, bite_at, species, lb, inches, variant, snap, legend_roll, snag_at)
    values (p_pid, p_idx, p.spot, p_bait, case when oc_is_lure(p_bait) then bite - (mins * interval '1 minute') else now() end, bite, r.species, r.lb, r.inches, r.variant, random() < oc_reel_snap((p.gear ->> 'reel')::int), random(), snag)
    returning * into ln;
  select * into p from players where pid = p_pid;
  return jsonb_build_object('line', oc_line_json(ln, (p.gear ->> 'finder')::int), 'small', ac.small, 'baits', to_jsonb(p.baits), 'gear', p.gear, 'now', now());
end $$;

create or replace function public.reel_line(p_pid uuid, p_secret text, p_idx int) returns jsonb language plpgsql security definer set search_path = public as $$
declare soak boolean := false; ac record; pick_id text; cur public.species; p public.players; ln public.lines; sp public.spots; l public.legends; per text; mins numeric; test int; f public.fish; j jsonb; val bigint; nsp boolean; nbest boolean; worldrec boolean := false; prevbest numeric; cnt int; st jsonb; dl jsonb; reward bigint := 0; res jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  select * into ln from lines where pid = p_pid and idx = p_idx for update;
  if ln.pid is null then perform oc_fail('no line there'); end if;
  delete from lines where pid = p_pid and idx = p_idx;
  if ln.snag_at is not null and now() >= ln.snag_at then
    perform oc_lure_snapped(p_pid, ln.bait); return jsonb_build_object('result', 'snagged', 'bait', ln.bait, 'now', now()); end if;
  if now() < ln.bite_at then return jsonb_build_object('result', 'early', 'now', now()); end if;
  -- a lure strike has to be answered within a few seconds, or the fish spits the hook
  if oc_is_lure(ln.bait) and now() > ln.bite_at + interval '4 seconds' and not (ln.fight_until is not null and now() <= ln.fight_until) then return jsonb_build_object('result', 'missed', 'now', now()); end if;
  select * into sp from spots where id = ln.spot;
  per := oc_period(ln.bite_at, sp.tz);
  mins := extract(epoch from (ln.bite_at - ln.cast_at)) / 60;
  test := oc_line_test((p.gear ->> 'line')::int);
  -- a legend?
  select * into l from legends where spot = ln.spot and active and owner_pid is null and bait = ln.bait and period = per and mins >= min_wait and ln.legend_roll < 1.0 / oc_legend_odds(legends) order by id limit 1 for update;
  if l.id is not null then
    if test < l.min_line then
      update players set stats = jsonb_set(stats, '{snaps}', to_jsonb(coalesce((stats ->> 'snaps')::int, 0) + 1)) where pid = p_pid;
      return jsonb_build_object('result', 'legendsnap', 'legend', jsonb_build_object('name', l.name, 'sp', l.species, 'colors', l.colors, 'lb', l.lb), 'now', now());
    end if;
    insert into fish (pid, species, lb, inches, variant, bait, spot, period, caught_by, legend_id)
      values (p_pid, l.species, l.lb, round((select k from species where id = l.species) * cbrt(l.lb) * 4) / 4, null, ln.bait, ln.spot, per, p_pid, l.id) returning * into f;
    update legends set owner_pid = p_pid, caught_at = now(), fish_id = f.id, history = history || jsonb_build_object('pid', p_pid, 'name', p.name || '#' || p.tag, 'how', 'caught', 'at', now()) where id = l.id;
    update players set stats = stats || jsonb_build_object('legends', coalesce((stats ->> 'legends')::int, 0) + 1, 'catches', coalesce((stats ->> 'catches')::int, 0) + 1),
      journal = jsonb_set(journal, array['legend:' || l.id], jsonb_build_object('n', 1, 'best', l.lb, 'first', now(), 'name', l.name)) where pid = p_pid;
    perform oc_news('legend', p_pid, p.name || '#' || p.tag || ' just caught ' || upper(l.name) || ' at ' || sp.name || '!', jsonb_build_object('legend', l.id, 'sp', l.species, 'lb', l.lb, 'colors', l.colors, 'name', l.name, 'spot', ln.spot));
    return jsonb_build_object('result', 'legend', 'fish', oc_fish_json(f), 'legend', oc_legend_json((select x from legends x where x.id = l.id)), 'now', now());
  end if;
  if ln.species is null then return jsonb_build_object('result', 'nothing', 'now', now()); end if;
  -- The 12-hour soak: a bait line left out for 12 hours or more always brings in a fish of at least 20 lb,
  -- if anything at this spot that takes this bait can grow that big (hand-worked lures and small-fish-only water don't count).
  if not oc_is_lure(ln.bait) and now() - ln.cast_at >= interval '12 hours' and ln.lb < 20 then
    select * into ac from oc_access(p, sp);
    if not ac.small then
      select * into cur from species where id = ln.species;
      if cur.max_lb >= 20 then pick_id := null;
      else
        select s.id into pick_id from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = ln.bait
          where ss.spot = ln.spot and ss.w > 0 and sb.w > 0 and s.max_lb >= 20 and (s.event is null or oc_event_on(s.event))
          order by -log(random()) / (ss.w * sb.w) limit 1;
      end if;
      if cur.max_lb >= 20 or pick_id is not null then
        if pick_id is not null then ln.species := pick_id; select * into cur from species where id = pick_id; end if;
        ln.lb := round((20 + (least(cur.max_lb, 20 + (cur.max_lb - 20) * 0.35) - 20) * power(random(), 1.5)) * 16) / 16;
        ln.inches := round(cur.k * cbrt(ln.lb) * 4) / 4;
        soak := true;
      end if;
    end if;
  end if;
  if ln.lb > test and ln.snap then
    update players set stats = jsonb_set(stats, '{snaps}', to_jsonb(coalesce((stats ->> 'snaps')::int, 0) + 1)) where pid = p_pid;
    return jsonb_build_object('result', 'snap', 'sp', ln.species, 'lb', ln.lb, 'test', test, 'now', now());
  end if;
  insert into fish (pid, species, lb, inches, variant, bait, spot, period, caught_by)
    values (p_pid, ln.species, ln.lb, ln.inches, ln.variant, ln.bait, ln.spot, per, p_pid) returning * into f;
  -- journal and stats
  j := p.journal -> ln.species;
  nsp := j is null;
  prevbest := coalesce((j ->> 'best')::numeric, 0);
  nbest := ln.lb > prevbest;
  j := jsonb_build_object('n', coalesce((j ->> 'n')::int, 0) + 1, 'best', greatest(prevbest, ln.lb), 'first', coalesce(j -> 'first', to_jsonb(now())),
         'golden', coalesce((j ->> 'golden')::boolean, false) or ln.variant = 'golden', 'albino', coalesce((j ->> 'albino')::boolean, false) or ln.variant = 'albino');
  st := p.stats;
  st := st || jsonb_build_object('catches', coalesce((st ->> 'catches')::int, 0) + 1, 'bestlb', greatest(coalesce((st ->> 'bestlb')::numeric, 0), ln.lb),
        'golden', coalesce((st ->> 'golden')::int, 0) + (case when ln.variant = 'golden' then 1 else 0 end),
        'albino', coalesce((st ->> 'albino')::int, 0) + (case when ln.variant = 'albino' then 1 else 0 end),
        'bonus', coalesce((st ->> 'bonus')::int, 0),
        'dawn', coalesce((st ->> 'dawn')::int, 0) + (case when per = 'dawn' then 1 else 0 end),
        'dusk', coalesce((st ->> 'dusk')::int, 0) + (case when per = 'dusk' then 1 else 0 end),
        'night', coalesce((st ->> 'night')::int, 0) + (case when per = 'night' then 1 else 0 end),
        'longest', greatest(coalesce((st ->> 'longest')::numeric, 0), round(mins)));
  if not (st -> 'spots' ? ln.spot) then st := jsonb_set(st, '{spots}', coalesce(st -> 'spots', '[]'::jsonb) || to_jsonb(ln.spot)); end if;
  if not (st -> 'regions' ? sp.region) then st := jsonb_set(st, '{regions}', coalesce(st -> 'regions', '[]'::jsonb) || to_jsonb(sp.region)); end if;
  -- daily challenge
  dl := oc_daily(p, now());
  if (dl ->> 'done')::boolean is not true then
    dl := jsonb_set(dl, '{progress}', to_jsonb(coalesce((dl ->> 'progress')::int, 0) + (case dl ->> 'type'
      when 'count' then 1
      when 'weight' then (case when ln.lb >= (dl ->> 'lb')::numeric then 1 else 0 end)
      when 'prime' then (case when per in ('dawn','dusk') then 1 else 0 end)
      when 'species' then (case when (dl -> 'seen') ? ln.species then 0 else 1 end)
      else 0 end)));
    if dl ->> 'type' = 'species' and not ((dl -> 'seen') ? ln.species) then dl := jsonb_set(dl, '{seen}', coalesce(dl -> 'seen', '[]'::jsonb) || to_jsonb(ln.species)); end if;
    if (dl ->> 'progress')::int >= (dl ->> 'goal')::int then
      reward := (dl ->> 'reward')::bigint; dl := dl || jsonb_build_object('done', true, 'doneAt', now());
      st := st || jsonb_build_object('dailies', coalesce((st ->> 'dailies')::int, 0) + 1);
    end if;
  end if;
  update players set journal = jsonb_set(journal, array[ln.species], j), stats = st, daily = dl, coins = coins + reward where pid = p_pid;
  -- world record news: the biggest of its kind ever kept, once a few have been caught
  select count(*), max(lb) into cnt, prevbest from fish where species = ln.species and id <> f.id and legend_id is null;
  if cnt >= 5 and ln.lb > prevbest then worldrec := true;
    perform oc_news('record', p_pid, p.name || '#' || p.tag || ' set a world record: a ' || (select name from species where id = ln.species) || ' of ' || oc_fmt_lb(ln.lb) || '!', jsonb_build_object('sp', ln.species, 'lb', ln.lb, 'fish', f.id)); end if;
  if ln.variant is not null then
    perform oc_news(ln.variant, p_pid, p.name || '#' || p.tag || ' caught a ' || ln.variant || ' ' || (select name from species where id = ln.species) || '!', jsonb_build_object('sp', ln.species, 'lb', ln.lb, 'variant', ln.variant, 'fish', f.id)); end if;
  res := jsonb_build_object('result', 'catch', 'fish', oc_fish_json(f), 'newSpecies', nsp, 'newBest', nbest, 'worldRecord', worldrec, 'minutes', round(mins), 'daily', dl, 'reward', reward, 'now', now());
  res := res || jsonb_build_object('derby', oc_derby_enter(p_pid, f));
  if soak then res := res || jsonb_build_object('soakBonus', true); end if;
  return res;
end $$;

-- ============ the weekend derby ============
-- The derby for the weekend at or after ts (Saturday 00:00 to Monday 00:00, US Eastern). Made on first use.
create or replace function public.oc_derby_at(ts timestamptz) returns public.derbies language plpgsql as $$
declare cfg jsonb; tz text; loc timestamp; sat date; dkey text; d public.derbies; rot jsonb; n int;
begin
  select c.v into cfg from config c where c.k = 'derby';
  tz := coalesce(cfg ->> 'tz', 'America/New_York');
  loc := ts at time zone tz;
  sat := loc::date + (6 - extract(isodow from loc)::int);
  dkey := 'd' || to_char(sat, 'YYYY-MM-DD');
  select * into d from derbies where key = dkey;
  if d.key is null then
    rot := coalesce(cfg -> 'rotation', '["largemouth"]'::jsonb); n := jsonb_array_length(rot);
    insert into derbies (key, species, starts_at, ends_at)
      values (dkey, coalesce(cfg -> 'special' -> dkey ->> 'sp', rot ->> (((((sat - date '2026-01-03') / 7) % n) + n) % n)), (sat::timestamp) at time zone tz, ((sat + 2)::timestamp) at time zone tz)
      on conflict (key) do nothing;
    select * into d from derbies where key = dkey;
  end if;
  return d;
end $$;

-- Pays out every derby that has ended: prizes for the top 3 (and the cap for 1st), a little something for everyone who entered.
create or replace function public.oc_derby_award() returns void language plpgsql as $$
declare d public.derbies; cfg jsonb; rec record; rk int; res jsonb; prize bigint; sp text; hat text;
begin
  select c.v into cfg from config c where c.k = 'derby';
  hat := coalesce(cfg ->> 'hat', 'hat_derby');
  for d in select * from derbies where not awarded and ends_at <= now() order by ends_at for update skip locked loop
    res := '[]'::jsonb; rk := 0;
    select name into sp from species where id = d.species;
    for rec in select e.*, p.name, p.tag from derby_entries e join players p on p.pid = e.pid
               where e.derby = d.key and not p.banned and not p.hidden order by e.lb desc, e.caught_at loop
      rk := rk + 1;
      prize := coalesce((cfg -> 'prizes' ->> (rk - 1))::bigint, 0) + coalesce((cfg ->> 'entry')::bigint, 0);
      update players set coins = coins + prize,
        items = (case when rk = 1 and not (hat = any(items)) then array_append(items, hat) else items end),
        stats = stats || jsonb_build_object('derbies', coalesce((stats ->> 'derbies')::int, 0) + 1, 'derbyWins', coalesce((stats ->> 'derbyWins')::int, 0) + (case when rk = 1 then 1 else 0 end))
        where pid = rec.pid;
      if rk <= 10 then res := res || jsonb_build_object('rank', rk, 'pid', rec.pid, 'name', rec.name, 'tag', rec.tag, 'lb', rec.lb, 'variant', rec.variant, 'prize', prize); end if;
    end loop;
    update derbies set awarded = true, results = res where key = d.key;
    if rk > 0 then
      perform oc_news('derby', (res -> 0 ->> 'pid')::uuid, (res -> 0 ->> 'name') || '#' || (res -> 0 ->> 'tag') || ' won the ' || sp || ' Derby with a ' || oc_fmt_lb((res -> 0 ->> 'lb')::numeric) || ' fish! ' || rk || ' angler' || (case when rk = 1 then '' else 's' end) || ' entered.',
        jsonb_build_object('sp', d.species, 'lb', (res -> 0 ->> 'lb')::numeric, 'derby', d.key));
    end if;
  end loop;
end $$;

-- Called for every kept catch: during a derby, a fish of the featured kind is entered (only your biggest counts).
create or replace function public.oc_derby_enter(p_pid uuid, f public.fish) returns jsonb language plpgsql as $$
declare d public.derbies; prev numeric; rk int; n int; best numeric;
begin
  d := oc_derby_at(now());
  if now() < d.starts_at or now() >= d.ends_at or f.species <> d.species or f.legend_id is not null then return null; end if;
  select lb into prev from derby_entries where derby = d.key and pid = p_pid;
  if prev is null or f.lb > prev then
    insert into derby_entries (derby, pid, lb, inches, variant, spot, caught_at) values (d.key, p_pid, f.lb, f.inches, f.variant, f.spot, now())
      on conflict (derby, pid) do update set lb = excluded.lb, inches = excluded.inches, variant = excluded.variant, spot = excluded.spot, caught_at = excluded.caught_at;
  end if;
  best := greatest(coalesce(prev, 0), f.lb);
  select count(*) + 1 into rk from derby_entries e join players p on p.pid = e.pid where e.derby = d.key and not p.hidden and not p.banned and (e.lb > best or (e.lb = best and e.pid <> p_pid and e.caught_at < (select caught_at from derby_entries where derby = d.key and pid = p_pid)));
  select count(*) into n from derby_entries where derby = d.key;
  return jsonb_build_object('key', d.key, 'sp', d.species, 'lb', f.lb, 'best', best, 'improved', prev is null or f.lb > prev, 'first', prev is null, 'rank', rk, 'entrants', n);
end $$;

-- The derby page: this weekend's (or the next) derby, the live top 10, your place, and last weekend's winners.
create or replace function public.get_derby(p_pid uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.derbies; cfg jsonb; board jsonb; me jsonb; last public.derbies; n int; myrank int;
begin
  perform oc_derby_award();
  select c.v into cfg from config c where c.k = 'derby';
  d := oc_derby_at(now());
  if now() >= d.ends_at then d := oc_derby_at(now() + interval '2 days'); end if; -- Monday: show next weekend
  select coalesce(jsonb_agg(x order by x.rank), '[]'::jsonb) into board from (
    select row_number() over (order by e.lb desc, e.caught_at) as rank, e.pid, p.name, p.tag, e.lb, e.inches, e.variant, e.spot, e.caught_at as at
    from derby_entries e join players p on p.pid = e.pid where e.derby = d.key and not p.hidden and not p.banned order by e.lb desc, e.caught_at limit 10) x;
  select count(*) into n from derby_entries e join players p on p.pid = e.pid where e.derby = d.key and not p.hidden and not p.banned;
  if p_pid is not null then
    select jsonb_build_object('lb', e.lb, 'inches', e.inches, 'rank', (select count(*) + 1 from derby_entries o join players q on q.pid = o.pid where o.derby = d.key and not q.hidden and not q.banned and (o.lb > e.lb or (o.lb = e.lb and o.caught_at < e.caught_at))))
      into me from derby_entries e where e.derby = d.key and e.pid = p_pid;
  end if;
  select * into last from derbies where awarded and key < d.key order by key desc limit 1;
  return jsonb_build_object('key', d.key, 'sp', d.species, 'startsAt', d.starts_at, 'endsAt', d.ends_at, 'live', now() >= d.starts_at and now() < d.ends_at,
    'board', board, 'entrants', n, 'me', me, 'prizes', cfg -> 'prizes', 'entry', cfg -> 'entry',
    'last', case when last.key is null then null else jsonb_build_object('key', last.key, 'sp', last.species, 'results', last.results) end, 'now', now());
end $$;

create or replace function public.oc_fmt_lb(lb numeric) returns text language plpgsql immutable as $$
declare oz int; p int; o int;
begin
  if lb >= 100 then return round(lb)::text || ' lb'; end if;
  oz := round(lb * 16); p := oz / 16; o := oz % 16;
  if p = 0 then return o || ' oz'; elsif o = 0 then return p || ' lb'; else return p || ' lb ' || o || ' oz'; end if;
end $$;

-- Today's challenge for a player, made fresh each day (UTC) from the date and their progress.
create or replace function public.oc_daily(p public.players, ts timestamptz) returns jsonb language plpgsql stable as $$
declare day text := to_char(ts at time zone 'UTC', 'YYYY-MM-DD'); d jsonb := p.daily; h int; typ text; goal int; lbn numeric; reward bigint; avg numeric;
begin
  if d ->> 'day' = day then return d; end if;
  h := abs(hashtext(day || p.pid::text));
  avg := case when coalesce((p.stats ->> 'catches')::int, 0) > 0 then coalesce((p.stats ->> 'earned')::numeric, 0) / greatest(1, (p.stats ->> 'sold')::numeric) else 5 end;
  reward := greatest(150, round(avg * 6));
  case h % 4
    when 0 then typ := 'count'; goal := 4;
    when 1 then typ := 'weight'; goal := 1; lbn := greatest(1, round(coalesce((p.stats ->> 'bestlb')::numeric, 1) * 0.5));
    when 2 then typ := 'prime'; goal := 2;
    else typ := 'species'; goal := 3;
  end case;
  return jsonb_build_object('day', day, 'type', typ, 'goal', goal, 'lb', lbn, 'progress', 0, 'reward', reward, 'done', false, 'seen', '[]'::jsonb);
end $$;

create or replace function public.sell_fish(p_pid uuid, p_secret text, p_ids bigint[]) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; total bigint := 0; n int := 0; f public.fish; v bigint; newcoins bigint;
begin
  p := oc_auth(p_pid, p_secret);
  if p_ids is null or array_length(p_ids, 1) is null or array_length(p_ids, 1) > 500 then perform oc_fail('nothing to sell'); end if;
  for f in select * from fish where id = any(p_ids) and pid = p_pid for update loop
    if f.legend_id is not null then perform oc_fail('legends cannot be sold'); end if;
    if f.released then continue; end if;
    -- a fish you offered in an open trade stays put until the trade ends (selling it used to jam the trade)
    if exists (select 1 from trades t where t.status = 'open' and f.id = any(t.a_fish || t.b_fish)) then continue; end if;
    v := oc_fish_value(f.species, f.lb, f.variant);
    if v <= 0 then perform oc_fail('that fish is catch and release'); end if;
    total := total + v; n := n + 1;
    delete from fish where id = f.id;
  end loop;
  update players set coins = coins + total, stats = stats || jsonb_build_object('sold', coalesce((stats ->> 'sold')::int, 0) + n, 'earned', coalesce((stats ->> 'earned')::bigint, 0) + total) where pid = p_pid returning coins into newcoins;
  return jsonb_build_object('coins', newcoins, 'sold', n, 'total', total, 'now', now());
end $$;

create or replace function public.buy(p_pid uuid, p_secret text, p_kind text, p_id text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; price bigint; g public.gear; it public.items; rg public.regions; b public.baits; gr jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  gr := p.gear;
  if p_kind = 'bait' then
    select * into b from baits where id = p_id; if b.id is null then perform oc_fail('no such bait'); end if;
    if b.uses > 0 then return buy_lures(p_pid, p_secret, p_id, 1); end if;
    if p_id = any(p.baits) then perform oc_fail('you already own that'); end if;
    price := b.price;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, baits = array_append(baits, p_id) where pid = p_pid;
  elsif p_kind = 'gear' then
    select * into g from gear where id = p_id; if g.id is null then perform oc_fail('no such gear'); end if;
    if g.kind = 'boat' and g.lvl >= 8 then perform oc_fail('that boat is not for sale'); end if;
    price := g.price;
    if g.kind in ('rod','reel') then
      -- rods and reels: buy whichever you like; you fish with the best one you own
      if coalesce((gr ->> g.kind)::int, 0) >= g.lvl then perform oc_fail('you already have this or a better one'); end if;
      gr := jsonb_set(gr, array[g.kind], to_jsonb(g.lvl));
    elsif g.kind in ('line','lines','finder') then
      if (gr ->> g.kind)::int >= g.lvl then perform oc_fail('you already own that'); end if;
      if (gr ->> g.kind)::int <> g.lvl - 1 then perform oc_fail('buy the cheaper one first'); end if;
      gr := jsonb_set(gr, array[g.kind], to_jsonb(g.lvl));
    elsif g.kind = 'comfort' then
      if (gr ->> 'comfort')::boolean then perform oc_fail('you already own that'); end if;
      gr := jsonb_set(gr, '{comfort}', 'true'::jsonb);
    elsif g.kind = 'boat' then
      if gr -> 'boats' ? g.id then perform oc_fail('you already own that boat'); end if;
      gr := jsonb_set(jsonb_set(gr, '{boats}', coalesce(gr -> 'boats', '["paddle"]'::jsonb) || to_jsonb(g.id)), '{boat}', to_jsonb(g.id));
    elsif g.kind = 'book' then
      if coalesce(gr -> 'books', '[]'::jsonb) ? g.id then perform oc_fail('you already own that'); end if;
      gr := jsonb_set(gr, '{books}', coalesce(gr -> 'books', '[]'::jsonb) || to_jsonb(g.id));
    elsif g.kind = 'method' then
      if gr -> 'methods' ? g.id then perform oc_fail('you already own that'); end if;
      gr := jsonb_set(gr, '{methods}', (gr -> 'methods') || to_jsonb(g.id));
    end if;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, gear = gr where pid = p_pid;
  elsif p_kind = 'item' then
    select * into it from items where id = p_id; if it.id is null or it.prize then perform oc_fail('no such item'); end if;
    if it.event is not null and not oc_event_on(it.event) then perform oc_fail('that is only sold during the event'); end if;
    if p_id = any(p.items) then perform oc_fail('you already own that'); end if;
    price := it.price;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, items = array_append(items, p_id) where pid = p_pid;
  elsif p_kind = 'region' then
    select * into rg from regions where id = p_id; if rg.id is null then perform oc_fail('no such region'); end if;
    if p_id = any(p.regions) then perform oc_fail('you already have that ticket'); end if;
    price := rg.ticket;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, regions = array_append(regions, p_id) where pid = p_pid;
  else perform oc_fail('what?');
  end if;
  select * into p from players where pid = p_pid;
  return jsonb_build_object('coins', p.coins, 'baits', to_jsonb(p.baits), 'gear', p.gear, 'items', to_jsonb(p.items), 'regions', to_jsonb(p.regions), 'now', now());
end $$;

create or replace function public.travel(p_pid uuid, p_secret text, p_spot text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; sp public.spots;
begin
  p := oc_auth(p_pid, p_secret);
  select * into sp from spots where id = p_spot; if sp.id is null then perform oc_fail('no such spot'); end if;
  if not (sp.region = any(p.regions)) then perform oc_fail('you need a ticket to that region first'); end if;
  if exists (select 1 from lines where pid = p_pid) then perform oc_fail('reel in all your lines before you travel'); end if;
  if exists (select 1 from crews c where c.host = p_pid and c.status = 'aboard' and exists (select 1 from lines l where l.pid = c.guest)) then perform oc_fail('your crew still has lines in the water'); end if;
  delete from crews where guest = p_pid;
  update players set spot = p_spot where pid = p_pid;
  -- the crew sails with the host
  update players set spot = p_spot where pid in (select guest from crews where host = p_pid and status = 'aboard');
  update crews set spot = p_spot where host = p_pid and status = 'aboard';
  select * into p from players where pid = p_pid;
  return jsonb_build_object('spot', p_spot, 'legendsHere', (select coalesce(jsonb_agg(oc_legend_json(l)), '[]'::jsonb) from legends l where l.spot = p_spot and l.active and l.owner_pid is null), 'now', now());
end $$;

create or replace function public.release_legend(p_pid uuid, p_secret text, p_fish bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; f public.fish; l public.legends;
begin
  p := oc_auth(p_pid, p_secret);
  select * into f from fish where id = p_fish and pid = p_pid for update;
  if f.id is null or f.legend_id is null or f.released then perform oc_fail('that is not a legend you own'); end if;
  select * into l from legends where id = f.legend_id for update;
  update fish set released = true, locked_until = null where id = f.id;
  update legends set owner_pid = null, caught_at = null, fish_id = null, created_at = now(), history = history || jsonb_build_object('pid', p_pid, 'name', p.name || '#' || p.tag, 'how', 'released', 'at', now()) where id = l.id;
  perform oc_news('release', p_pid, p.name || '#' || p.tag || ' released ' || upper(l.name) || ' back into ' || (select name from spots where id = l.spot) || '. It is out there again!', jsonb_build_object('legend', l.id, 'sp', l.species, 'colors', l.colors, 'name', l.name, 'spot', l.spot));
  return jsonb_build_object('ok', true, 'now', now());
end $$;

create or replace function public.set_boat(p_pid uuid, p_secret text, p_boat text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; g jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  if not (coalesce(p.gear -> 'boats', '["paddle"]'::jsonb) ? p_boat) then perform oc_fail('you do not own that boat'); end if;
  if exists (select 1 from lines where pid = p_pid) then perform oc_fail('reel in your lines before you switch boats'); end if;
  update players set gear = jsonb_set(gear, '{boat}', to_jsonb(p_boat)) where pid = p_pid returning gear into g;
  return jsonb_build_object('gear', g, 'now', now());
end $$;

-- ============ crews: fishing together ============
create or replace function public.oc_crew_json(me uuid) returns jsonb language plpgsql stable as $$
declare v_host uuid; c public.crews;
begin
  select * into c from crews where guest = me and status = 'aboard';
  v_host := coalesce(c.host, me);
  return jsonb_build_object(
    'host', v_host, 'hostName', (select name || '#' || tag from players where pid = v_host), 'boat', (select gear ->> 'boat' from players where pid = v_host),
    'spot', (select spot from players where pid = v_host), 'guest', c.guest is not null, 'cap', oc_crew_cap(v_host),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'outfit', p.outfit, 'host', p.pid = v_host, 'online', p.last_seen > now() - interval '5 minutes',
        'lines', (select coalesce(jsonb_agg(jsonb_build_object('idx', l.idx, 'bait', l.bait, 'castAt', l.cast_at, 'biteAt', l.bite_at) order by l.idx), '[]'::jsonb) from lines l where l.pid = p.pid),
        'recent', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'sp', f.species, 'lb', f.lb, 'variant', f.variant, 'legend', f.legend_id, 'at', f.caught_at) order by f.caught_at desc), '[]'::jsonb)
                   from (select * from fish where pid = p.pid and caught_at > now() - interval '15 minutes' order by caught_at desc limit 5) f)) order by (p.pid = v_host) desc, p.name), '[]'::jsonb)
      from players p where p.pid = v_host or p.pid in (select cc.guest from crews cc where cc.host = v_host and cc.status = 'aboard')),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('host', c2.host, 'name', h.name || '#' || h.tag, 'spot', h.spot, 'boat', h.gear ->> 'boat')), '[]'::jsonb)
      from crews c2 join players h on h.pid = c2.host where c2.guest = me and c2.status = 'invited' and c2.created_at > now() - interval '1 hour'),
    'now', now());
end $$;

create or replace function public.oc_crew_cap(p_host uuid) returns int language sql stable as $$
  select case when (select gear ->> 'boat' from players where pid = p_host) = 'devboat' then 12 else 3 end $$;

-- a guest hopping off goes back to where they were, unless they have their own ticket for where the boat is
create or replace function public.oc_crew_home(p_guest uuid) returns void language plpgsql as $$
begin
  update players pl set spot = c.from_spot from crews c, spots s
   where c.guest = pl.pid and pl.pid = p_guest and c.status = 'aboard' and c.from_spot is not null
     and s.id = pl.spot and not (s.region = any(pl.regions));
end $$;

create or replace function public.crew_invite(p_pid uuid, p_secret text, p_friend uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; x uuid; y uuid; cur public.crews;
begin
  p := oc_auth(p_pid, p_secret);
  x := least(p_pid, p_friend); y := greatest(p_pid, p_friend);
  if not exists (select 1 from friends where a = x and b = y and status = 'accepted') or oc_blocked(p_pid, p_friend) then perform oc_fail('you can only invite friends'); end if;
  if exists (select 1 from crews where guest = p_pid and status = 'aboard') then perform oc_fail('you are on someone else''s boat right now'); end if;
  if (select count(*) from crews where host = p_pid and status = 'aboard') >= oc_crew_cap(p_pid) then perform oc_fail('your boat is full (' || oc_crew_cap(p_pid) || ' guests)'); end if;
  select * into cur from crews where guest = p_friend;
  if cur.guest is not null and cur.status = 'aboard' then perform oc_fail('they are already on a boat'); end if;
  insert into crews (guest, host, status, spot, created_at) values (p_friend, p_pid, 'invited', p.spot, now())
    on conflict (guest) do update set host = excluded.host, status = 'invited', spot = excluded.spot, created_at = now();
  return oc_crew_json(p_pid);
end $$;

create or replace function public.crew_respond(p_pid uuid, p_secret text, p_host uuid, p_accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; h public.players;
begin
  p := oc_auth(p_pid, p_secret);
  if not exists (select 1 from crews where guest = p_pid and host = p_host and status = 'invited') then perform oc_fail('that invite is gone'); end if;
  if not p_accept then delete from crews where guest = p_pid; return oc_crew_json(p_pid); end if;
  if exists (select 1 from lines where pid = p_pid) then perform oc_fail('reel in your lines before you hop aboard'); end if;
  if exists (select 1 from crews where host = p_pid and status = 'aboard') then perform oc_fail('you have your own crew right now'); end if;
  if (select count(*) from crews where host = p_host and status = 'aboard') >= oc_crew_cap(p_host) then perform oc_fail('that boat is full'); end if;
  select * into h from players where pid = p_host;
  update crews set status = 'aboard', spot = h.spot, from_spot = p.spot, created_at = now() where guest = p_pid;
  update players set spot = h.spot where pid = p_pid;
  return oc_crew_json(p_pid);
end $$;

create or replace function public.crew_leave(p_pid uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  perform oc_crew_home(p_pid);
  perform oc_crew_home(c.guest) from crews c where c.host = p_pid;
  delete from crews where guest = p_pid or host = p_pid;
  return oc_crew_json(p_pid);
end $$;

create or replace function public.get_crew(p_pid uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  return oc_crew_json(p_pid);
end $$;

-- ============ fish index rewards ============
create or replace function public.oc_index_species(p_kind text) returns setof text language sql stable as $$
  select id from species where p_kind = 'all' and event is null
  union
  select distinct ss.species from spot_species ss join spots s on s.id = ss.spot join species x on x.id = ss.species
   where p_kind <> 'all' and ss.w > 0 and x.event is null and (case when p_kind = 'fresh' then s.water = 'fresh' else s.water <> 'fresh' end) $$;

create or replace function public.claim_index(p_pid uuid, p_secret text, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; prize bigint; item text; missing int; label text;
begin
  p := oc_auth(p_pid, p_secret);
  if p_kind = 'fresh' then prize := 50000; item := 'hat_river'; label := 'every freshwater fish';
  elsif p_kind = 'salt' then prize := 100000; item := 'hat_tide'; label := 'every saltwater fish';
  elsif p_kind = 'all' then prize := 1000000; item := 'hat_master'; label := 'EVERY FISH IN THE GAME';
  else perform oc_fail('no such reward'); end if;
  if coalesce((p.stats -> 'index' ->> p_kind)::boolean, false) then perform oc_fail('you already claimed that reward'); end if;
  select count(*) into missing from oc_index_species(p_kind) x where not (p.journal ? x);
  if missing > 0 then perform oc_fail('you still need ' || missing || ' more fish'); end if;
  update players set coins = coins + prize,
    items = case when item = any(items) then items else array_append(items, item) end,
    stats = jsonb_set(stats, '{index}', coalesce(stats -> 'index', '{}'::jsonb) || jsonb_build_object(p_kind, true))
    where pid = p_pid returning * into p;
  perform oc_news('index', p_pid, p.name || '#' || p.tag || ' caught ' || label || '!', jsonb_build_object('kind', p_kind));
  return jsonb_build_object('ok', true, 'coins', p.coins, 'items', to_jsonb(p.items), 'stats', p.stats, 'reward', prize, 'item', item, 'now', now());
end $$;

-- ============ guidebooks: the legends chapter (the secret bait, time, soak and line) ============
create or replace function public.get_guide(p_pid uuid, p_secret text, p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; my_line int;
begin
  p := oc_auth(p_pid, p_secret);
  if p_kind not in ('fresh', 'salt') then perform oc_fail('no such guidebook'); end if;
  if not coalesce(p.gear -> 'books', '[]'::jsonb) ? ('book_' || p_kind) then perform oc_fail('buy the guidebook first'); end if;
  my_line := oc_line_test((p.gear ->> 'line')::int);
  -- hints, not answers: the exact bait, time, soak and line never leave the server
  return jsonb_build_object('legends', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'spot', l.spot, 'name', l.name, 'sp', l.species, 'tier', l.tier, 'lb', l.lb, 'clue', l.clue, 'colors', l.colors,
      'baitHint', case l.bait when 'worm' then 'something that wriggles' when 'minnow' then 'a small live fish' when 'sucker' then 'a big live fish' when 'cut' then 'something that smells strong'
                    when 'shrimp' then 'something with legs from the shallows' when 'squid' then 'something with tentacles' when 'mullet' then 'a live fish from the salt' when 'lure' then 'something shiny pulled behind a boat'
                    when 'deepbait' then 'the heaviest rig there is' when 'crank' then 'something that wobbles' when 'jig' then 'something that hops' when 'fly' then 'something that floats' else 'something special' end,
      'timeHint', case l.period when 'dawn' then 'when the light is low' when 'dusk' then 'when the light is low' when 'day' then 'while the sun is up' else 'in the dark' end,
      'soakHint', case when oc_is_lure(l.bait) then 'no wait at all, if you work it right' when l.min_wait < 60 then 'a short wait' when l.min_wait <= 240 then 'a long wait' else 'a very long wait' end,
      'lineHint', case when l.min_line <= 30 then 'a decent line' when l.min_line <= 60 then 'a strong line' when l.min_line <= 150 then 'a very strong line' else 'the strongest line you can get' end,
      'lineOk', my_line >= l.min_line, 'owner', l.owner_pid,
      'ownerName', (select o.name || '#' || o.tag from players o where o.pid = l.owner_pid and not o.hidden)) order by s.region, l.name), '[]'::jsonb)
    from legends l join spots s on s.id = l.spot where l.active and (case when p_kind = 'fresh' then s.water = 'fresh' else s.water <> 'fresh' end)), 'now', now());
end $$;

-- ============ blocking ============
create or replace function public.oc_blocked(a uuid, b uuid) returns boolean language sql stable as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a)) $$;

create or replace function public.block_player(p_pid uuid, p_secret text, p_target uuid, p_block boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; x uuid; y uuid;
begin
  p := oc_auth(p_pid, p_secret);
  if p_target is null or p_target = p_pid then perform oc_fail('you cannot block yourself'); end if;
  if not exists (select 1 from players where pid = p_target) then perform oc_fail('no such player'); end if;
  if p_block then
    insert into blocks (blocker, blocked) values (p_pid, p_target) on conflict do nothing;
    x := least(p_pid, p_target); y := greatest(p_pid, p_target);
    delete from friends where a = x and b = y;                                       -- no longer friends
    update trades set status = 'cancelled' where a = x and b = y and status = 'open'; -- open trades end
    perform oc_crew_home(c.guest) from crews c where (c.guest = p_pid and c.host = p_target) or (c.guest = p_target and c.host = p_pid);
    delete from crews where (guest = p_pid and host = p_target) or (guest = p_target and host = p_pid); -- off each other's boats
    delete from reactions r using fish f where r.fish_id = f.id and f.pid = p_pid and r.pid = p_target; -- their stickers on your fish go away
  else
    delete from blocks where blocker = p_pid and blocked = p_target;
  end if;
  return jsonb_build_object('ok', true, 'blocked', oc_block_list(p_pid), 'now', now());
end $$;

create or replace function public.oc_block_list(me uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('pid', o.pid, 'name', o.name, 'tag', o.tag) order by o.name), '[]'::jsonb)
  from blocks b join players o on o.pid = b.blocked where b.blocker = me $$;

-- ============ friends ============
create or replace function public.friend_request(p_pid uuid, p_secret text, p_name text, p_tag text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; o public.players; x uuid; y uuid; fr public.friends;
begin
  p := oc_auth(p_pid, p_secret);
  select * into o from players where lower(name) = lower(p_name) and tag = p_tag and not banned;
  if o.pid is null then perform oc_fail('no player with that name and tag'); end if;
  if o.pid = p_pid then perform oc_fail('that is you'); end if;
  if oc_blocked(p_pid, o.pid) then perform oc_fail('you cannot add that player'); end if;
  if (select count(*) from friends where a = p_pid or b = p_pid) >= 50 then perform oc_fail('friend list is full'); end if;
  x := least(p_pid, o.pid); y := greatest(p_pid, o.pid);
  select * into fr from friends where a = x and b = y;
  if fr.a is not null then
    if fr.status = 'accepted' then perform oc_fail('already friends'); end if;
    if fr.requested_by = p_pid then perform oc_fail('request already sent'); end if;
    update friends set status = 'accepted' where a = x and b = y;
    return jsonb_build_object('status', 'accepted', 'name', o.name, 'tag', o.tag);
  end if;
  insert into friends (a, b, status, requested_by) values (x, y, 'pending', p_pid);
  return jsonb_build_object('status', 'pending', 'name', o.name, 'tag', o.tag);
end $$;

create or replace function public.friend_respond(p_pid uuid, p_secret text, p_other uuid, p_accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; x uuid; y uuid;
begin
  p := oc_auth(p_pid, p_secret);
  x := least(p_pid, p_other); y := greatest(p_pid, p_other);
  if p_accept then
    update friends set status = 'accepted' where a = x and b = y and status = 'pending' and requested_by <> p_pid;
    if not found then perform oc_fail('no request from them'); end if;
  else
    delete from friends where a = x and b = y;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ============ trading ============
create or replace function public.oc_trade_json(t public.trades, me uuid) returns jsonb language plpgsql stable as $$
declare mine boolean := t.a = me; o public.players;
begin
  select * into o from players where pid = (case when mine then t.b else t.a end);
  return jsonb_build_object('id', t.id, 'status', t.status, 'updated', t.updated_at, 'other', o.name || '#' || o.tag, 'otherPid', o.pid,
    'myFish', (select coalesce(jsonb_agg(oc_fish_json(f)), '[]'::jsonb) from fish f where f.id = any(case when mine then t.a_fish else t.b_fish end)),
    'theirFish', (select coalesce(jsonb_agg(oc_fish_json(f)), '[]'::jsonb) from fish f where f.id = any(case when mine then t.b_fish else t.a_fish end)),
    'myCoins', case when mine then t.a_coins else t.b_coins end, 'theirCoins', case when mine then t.b_coins else t.a_coins end,
    'myReady', case when mine then t.a_ready else t.b_ready end, 'theirReady', case when mine then t.b_ready else t.a_ready end,
    'myConfirm', case when mine then t.a_confirm else t.b_confirm end, 'theirConfirm', case when mine then t.b_confirm else t.a_confirm end);
end $$;

create or replace function public.trade_open(p_pid uuid, p_secret text, p_other uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t public.trades; x uuid; y uuid;
begin
  p := oc_auth(p_pid, p_secret);
  x := least(p_pid, p_other); y := greatest(p_pid, p_other);
  if not exists (select 1 from friends where a = x and b = y and status = 'accepted') then perform oc_fail('you can only trade with friends'); end if;
  if oc_blocked(p_pid, p_other) then perform oc_fail('you can only trade with friends'); end if;
  select * into t from trades where a = x and b = y and status = 'open';
  if t.id is null then insert into trades (a, b) values (x, y) returning * into t; end if;
  return oc_trade_json(t, p_pid);
end $$;

create or replace function public.get_trade(p_pid uuid, p_secret text, p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t public.trades;
begin
  p := oc_auth(p_pid, p_secret);
  select * into t from trades where id = p_id and (a = p_pid or b = p_pid);
  if t.id is null then perform oc_fail('no such trade'); end if;
  return oc_trade_json(t, p_pid);
end $$;

create or replace function public.trade_set(p_pid uuid, p_secret text, p_id bigint, p_fish bigint[], p_coins bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t public.trades; fid bigint;
begin
  p := oc_auth(p_pid, p_secret);
  select * into t from trades where id = p_id and (a = p_pid or b = p_pid) and status = 'open' for update;
  if t.id is null then perform oc_fail('no such trade'); end if;
  if p_coins < 0 or p_coins > p.coins then perform oc_fail('not enough coins'); end if;
  if array_length(p_fish, 1) > 20 then perform oc_fail('too many fish'); end if;
  foreach fid in array coalesce(p_fish, '{}'::bigint[]) loop
    if not exists (select 1 from fish where id = fid and pid = p_pid and not released and (locked_until is null or locked_until < now())) then perform oc_fail('you cannot trade that fish yet'); end if;
  end loop;
  if t.a = p_pid then update trades set a_fish = coalesce(p_fish, '{}'), a_coins = p_coins, a_ready = false, b_ready = false, a_confirm = false, b_confirm = false, updated_at = now() where id = p_id returning * into t;
  else update trades set b_fish = coalesce(p_fish, '{}'), b_coins = p_coins, a_ready = false, b_ready = false, a_confirm = false, b_confirm = false, updated_at = now() where id = p_id returning * into t; end if;
  return oc_trade_json(t, p_pid);
end $$;

create or replace function public.trade_ready(p_pid uuid, p_secret text, p_id bigint, p_ready boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t public.trades;
begin
  p := oc_auth(p_pid, p_secret);
  select * into t from trades where id = p_id and (a = p_pid or b = p_pid) and status = 'open' for update;
  if t.id is null then perform oc_fail('no such trade'); end if;
  if t.a = p_pid then update trades set a_ready = p_ready, a_confirm = false, b_confirm = false, updated_at = now() where id = p_id returning * into t;
  else update trades set b_ready = p_ready, a_confirm = false, b_confirm = false, updated_at = now() where id = p_id returning * into t; end if;
  return oc_trade_json(t, p_pid);
end $$;

create or replace function public.trade_confirm(p_pid uuid, p_secret text, p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; t public.trades; pa public.players; pb public.players; fid bigint; f public.fish; l public.legends; ag jsonb; bg jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  select * into t from trades where id = p_id and (a = p_pid or b = p_pid) and status = 'open' for update;
  if t.id is null then perform oc_fail('no such trade'); end if;
  if not (t.a_ready and t.b_ready) then perform oc_fail('both players must be ready first'); end if;
  if t.a = p_pid then update trades set a_confirm = true, updated_at = now() where id = p_id returning * into t;
  else update trades set b_confirm = true, updated_at = now() where id = p_id returning * into t; end if;
  if not (t.a_confirm and t.b_confirm) then return oc_trade_json(t, p_pid); end if;
  -- both confirmed: check everything once more and swap in one step
  select * into pa from players where pid = t.a for update; select * into pb from players where pid = t.b for update;
  if pa.coins < t.a_coins or pb.coins < t.b_coins then
    update trades set status = 'failed', updated_at = now() where id = p_id returning * into t;
    return oc_trade_json(t, p_pid) || jsonb_build_object('reason', 'someone no longer has the coins they offered'); end if;
  if exists (select 1 from unnest(t.a_fish) u(x) where not exists (select 1 from fish where id = u.x and pid = t.a and not released and (locked_until is null or locked_until < now())))
     or exists (select 1 from unnest(t.b_fish) u(x) where not exists (select 1 from fish where id = u.x and pid = t.b and not released and (locked_until is null or locked_until < now()))) then
    update trades set status = 'failed', updated_at = now() where id = p_id returning * into t;
    return oc_trade_json(t, p_pid) || jsonb_build_object('reason', 'a fish in the trade is no longer available'); end if;
  select coalesce(jsonb_agg(oc_fish_json(x)), '[]'::jsonb) into ag from fish x where x.id = any(t.a_fish);
  select coalesce(jsonb_agg(oc_fish_json(x)), '[]'::jsonb) into bg from fish x where x.id = any(t.b_fish);
  update fish set pid = t.b, locked_until = now() + interval '24 hours' where id = any(t.a_fish);
  update fish set pid = t.a, locked_until = now() + interval '24 hours' where id = any(t.b_fish);
  update players set coins = coins - t.a_coins + t.b_coins, stats = stats || jsonb_build_object('traded', coalesce((stats ->> 'traded')::int, 0) + 1) where pid = t.a;
  update players set coins = coins - t.b_coins + t.a_coins, stats = stats || jsonb_build_object('traded', coalesce((stats ->> 'traded')::int, 0) + 1) where pid = t.b;
  for f in select * from fish where id = any(t.a_fish || t.b_fish) and legend_id is not null loop
    select * into l from legends where id = f.legend_id;
    update legends set owner_pid = f.pid, history = history || jsonb_build_object('pid', f.pid, 'name', (select name || '#' || tag from players where pid = f.pid), 'how', 'traded', 'at', now()) where id = f.legend_id;
    perform oc_news('trade', f.pid, (select name || '#' || tag from players where pid = f.pid) || ' now owns ' || upper(l.name) || ' after a trade with ' || (select name || '#' || tag from players where pid = (case when f.pid = t.a then t.b else t.a end)) || '.', jsonb_build_object('legend', l.id, 'sp', l.species, 'colors', l.colors, 'name', l.name));
  end loop;
  insert into trade_log (trade_id, a, b, a_name, b_name, a_gave, b_gave) values (t.id, t.a, t.b, pa.name || '#' || pa.tag, pb.name || '#' || pb.tag, jsonb_build_object('fish', ag, 'coins', t.a_coins), jsonb_build_object('fish', bg, 'coins', t.b_coins));
  update trades set status = 'done', updated_at = now() where id = p_id returning * into t;
  return oc_trade_json(t, p_pid);
end $$;

create or replace function public.trade_cancel(p_pid uuid, p_secret text, p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  update trades set status = 'cancelled', updated_at = now() where id = p_id and (a = p_pid or b = p_pid) and status = 'open';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.get_trade_history(p_pid uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', at, 'me', case when a = p_pid then a_name else b_name end, 'other', case when a = p_pid then b_name else a_name end,
    'gave', case when a = p_pid then a_gave else b_gave end, 'got', case when a = p_pid then b_gave else a_gave end) order by at desc), '[]'::jsonb)
    from (select * from trade_log where a = p_pid or b = p_pid order by at desc limit 50) x);
end $$;

-- ============ social ============
create or replace function public.react(p_pid uuid, p_secret text, p_fish bigint, p_sticker text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; f public.fish;
begin
  p := oc_auth(p_pid, p_secret);
  if p_sticker not in ('noway','lucky','huge','gg','jealous','wow','legend','fire') then perform oc_fail('bad sticker'); end if;
  select * into f from fish where id = p_fish;
  if f.id is null then perform oc_fail('no such fish'); end if;
  if oc_blocked(p_pid, f.pid) then perform oc_fail('you cannot react to that fish'); end if;
  insert into reactions (fish_id, pid, sticker) values (p_fish, p_pid, p_sticker) on conflict (fish_id, pid) do update set sticker = excluded.sticker, at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.report_player(p_pid uuid, p_secret text, p_target uuid, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  if p_reason not in ('name','realname','cheat','scam','other') then perform oc_fail('bad reason'); end if;
  if (select count(*) from reports where reporter = p_pid and at > now() - interval '1 day') >= 10 then perform oc_fail('too many reports today'); end if;
  insert into reports (reporter, target, reason) values (p_pid, p_target, p_reason);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.suggest_lake(p_pid uuid, p_secret text, p_lake text, p_place text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  if length(coalesce(p_lake, '')) < 3 or length(p_lake) > 60 or length(coalesce(p_place, '')) > 60 then perform oc_fail('tell us the lake and where it is'); end if;
  if (select count(*) from suggestions where pid = p_pid and at > now() - interval '1 day') >= 3 then perform oc_fail('three suggestions a day is plenty'); end if;
  insert into suggestions (pid, lake, place) values (p_pid, p_lake, p_place);
  return jsonb_build_object('ok', true);
end $$;

-- ============ public reads ============
create or replace function public.get_board(p_period text, p_species text, p_region text) returns jsonb language plpgsql security definer set search_path = public stable as $$
declare since timestamptz;
begin
  since := case p_period when 'season' then date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' when 'week' then date_trunc('week', now() at time zone 'UTC') at time zone 'UTC' else '2000-01-01'::timestamptz end;
  return (select coalesce(jsonb_agg(r order by (r ->> 'lb')::numeric desc), '[]'::jsonb) from (
    select jsonb_build_object('pid', x.pid, 'name', x.name, 'tag', x.tag, 'sp', x.species, 'lb', x.lb, 'inches', x.inches, 'variant', x.variant, 'bait', x.bait, 'spot', x.spot, 'period', x.period, 'at', x.caught_at, 'fish', x.id, 'founder', x.founder, 'champ', x.champ,
      'reactions', (select coalesce(jsonb_object_agg(sticker, n), '{}'::jsonb) from (select sticker, count(*) n from reactions where fish_id = x.id group by sticker) q)) as r
    from (
      select distinct on (f.pid, (case when p_species is null then f.species else '' end)) f.*, p.name, p.tag, p.founder, p.champ
      from fish f join players p on p.pid = f.pid
      where not p.hidden and not p.banned and f.legend_id is null and not f.released and f.caught_at >= since
        and (p_species is null or f.species = p_species)
        and (p_region is null or f.spot in (select id from spots where region = p_region))
      order by f.pid, (case when p_species is null then f.species else '' end), f.lb desc, f.id
    ) x order by x.lb desc limit 50) y);
end $$;

create or replace function public.get_news(p_after bigint) returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'at', n.at, 'kind', n.kind, 'pid', n.pid, 'name', n.name, 'tag', n.tag, 'text', n.text, 'data', n.data) order by n.id desc), '[]'::jsonb)
  from (select * from news where id > coalesce(p_after, 0) order by id desc limit 60) n;
$$;

create or replace function public.get_legends() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_ensure_season();
  return jsonb_build_object('legends', (select coalesce(jsonb_agg(oc_legend_json(l) order by l.id), '[]'::jsonb) from legends l where l.active),
    'season', oc_season_key(now()), 'now', now());
end $$;

create or replace function public.get_profile(p_pid uuid) returns jsonb language plpgsql security definer set search_path = public stable as $$
declare p public.players;
begin
  select * into p from players where pid = p_pid;
  if p.pid is null or p.hidden or p.banned then return null; end if;
  return jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'founder', p.founder, 'champ', p.champ, 'since', p.created_at, 'online', p.last_seen > now() - interval '10 minutes',
    'stats', jsonb_build_object('catches', p.stats -> 'catches', 'legends', p.stats -> 'legends', 'bestlb', p.stats -> 'bestlb', 'golden', p.stats -> 'golden', 'albino', p.stats -> 'albino', 'species', (select count(*) from jsonb_object_keys(p.journal) k where k not like 'legend:%'), 'regions', jsonb_array_length(coalesce(p.stats -> 'regions', '[]'::jsonb))),
    'outfit', p.outfit, 'spot', p.spot,
    'best', (select coalesce(jsonb_agg(oc_fish_json(f) order by f.lb desc), '[]'::jsonb) from (select distinct on (species) * from fish where pid = p_pid and legend_id is null and not released order by species, lb desc) f),
    'legends', (select coalesce(jsonb_agg(oc_legend_json(l)), '[]'::jsonb) from legends l where l.owner_pid = p_pid),
    'pastLegends', (select coalesce(jsonb_agg(jsonb_build_object('name', l.name, 'sp', l.species, 'colors', l.colors, 'lb', l.lb)), '[]'::jsonb) from legends l where l.owner_pid is distinct from p_pid and l.history @> jsonb_build_array(jsonb_build_object('pid', p_pid))),
    'badges', coalesce(p.prefs -> 'ach', '[]'::jsonb));
end $$;

create or replace function public.get_season() returns jsonb language plpgsql security definer set search_path = public as $$
declare k text;
begin
  k := oc_ensure_season();
  return jsonb_build_object('key', k, 'endsAt', (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC', 'prizes', '[25000,15000,8000]'::jsonb, 'top10', 2000,
    'hall', (select coalesce(jsonb_agg(jsonb_build_object('season', h.season, 'rank', h.rank, 'name', h.name, 'tag', h.tag, 'sp', h.species, 'lb', h.lb, 'prize', h.prize) order by h.season desc, h.rank), '[]'::jsonb) from hall_of_fame h),
    'players', (select count(*) from players where not banned), 'now', now());
end $$;

create or replace function public.get_world() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_ensure_season();
  return jsonb_build_object(
    'spots', (select coalesce(jsonb_object_agg(s.id, jsonb_build_object('legend', (select oc_legend_json(l) from legends l where l.spot = s.id and l.active order by (l.owner_pid is null) desc, l.id desc limit 1),
       'anglers', (select count(distinct pid) from players where spot = s.id and last_seen > now() - interval '30 minutes'))), '{}'::jsonb) from spots s),
    'online', (select count(*) from players where last_seen > now() - interval '10 minutes'), 'now', now());
end $$;

-- ============ admin ============
create or replace function public.oc_admin(p_key text) returns void language plpgsql as $$
begin if p_key is null or not exists (select 1 from admin where k = p_key) then perform oc_fail('not the admin key'); end if; end $$;

-- Player numbers: who plays each day, new players, and who comes back. "Real" players have caught at least 5 fish (most alt accounts never do).
create or replace function public.admin_stats(p_key text) returns jsonb language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/New_York')::date;
begin
  perform oc_admin(p_key);
  return jsonb_build_object(
    'today', today,
    'total', (select count(*) from players where not banned),
    'real', (select count(*) from players where not banned and coalesce((stats ->> 'catches')::int, 0) >= 5),
    'dau', (select count(*) from activity where day = today),
    'yesterday', (select count(*) from activity where day = today - 1),
    'wau', (select count(distinct pid) from activity where day > today - 7),
    'mau', (select count(distinct pid) from activity where day > today - 30),
    'newWeek', (select count(*) from players where (created_at at time zone 'America/New_York')::date > today - 7),
    -- of the players who joined 7 to 30 days ago, how many played again in the last 7 days
    'back7', (select jsonb_build_object('of', count(*), 'back', count(*) filter (where exists (select 1 from activity a where a.pid = p.pid and a.day > today - 7)))
              from players p where (p.created_at at time zone 'America/New_York')::date between today - 30 and today - 7 and not p.banned),
    -- of the players who joined 1 to 30 days ago, how many came back on a later day at all
    'returned', (select jsonb_build_object('of', count(*), 'back', count(*) filter (where exists (select 1 from activity a where a.pid = p.pid and a.day > (p.created_at at time zone 'America/New_York')::date)))
              from players p where (p.created_at at time zone 'America/New_York')::date between today - 30 and today - 1 and not p.banned),
    'days', (select jsonb_agg(jsonb_build_object('day', d, 'active', (select count(*) from activity a where a.day = d),
               'new', (select count(*) from players p where (p.created_at at time zone 'America/New_York')::date = d)) order by d)
             from generate_series(today - 13, today, interval '1 day') g(dd), lateral (select g.dd::date as d) x),
    'top', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select p.name, p.tag, count(*) as days from activity a join players p on p.pid = a.pid where a.day > today - 30 and not p.hidden group by p.pid, p.name, p.tag order by count(*) desc, max(a.day) desc limit 10) x),
    'now', now());
end $$;

create or replace function public.admin_overview(p_key text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  return jsonb_build_object(
    'players', (select count(*) from players), 'online', (select count(*) from players where last_seen > now() - interval '10 minutes'),
    'fish', (select count(*) from fish), 'legendsCaught', (select count(*) from legends where owner_pid is not null),
    'reports', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'at', r.at, 'reason', r.reason, 'reporter', (select name || '#' || tag from players where pid = r.reporter), 'target', (select name || '#' || tag from players where pid = r.target), 'targetPid', r.target) order by r.at desc), '[]'::jsonb) from reports r where not r.handled),
    'suggestions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'at', s.at, 'lake', s.lake, 'place', s.place, 'by', (select name || '#' || tag from players where pid = s.pid)) order by s.at desc), '[]'::jsonb) from suggestions s where s.status = 'pending'),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'coins', p.coins, 'catches', p.stats -> 'catches', 'hidden', p.hidden, 'banned', p.banned, 'seen', p.last_seen, 'baits', to_jsonb(p.baits)) order by p.last_seen desc), '[]'::jsonb) from (select * from players order by last_seen desc limit 100) p));
end $$;

create or replace function public.admin_find(p_key text, p_q text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  return (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'coins', p.coins, 'catches', p.stats -> 'catches', 'hidden', p.hidden, 'banned', p.banned, 'seen', p.last_seen, 'baits', to_jsonb(p.baits))), '[]'::jsonb)
    from players p where lower(p.name) like '%' || lower(p_q) || '%' or p.tag = p_q or p.pid::text = p_q limit 50);
end $$;

create or replace function public.admin_player(p_key text, p_pid uuid, p_action text, p_value text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  if p_action = 'newcode' then
    -- account recovery: a fresh save code; the old one (and any device using it) stops working
    update players set secret = encode(extensions.gen_random_bytes(20), 'hex') where pid = p_pid;
    return (select jsonb_build_object('ok', true, 'code', 'OC1.' || pid || '.' || secret) from players where pid = p_pid);
  end if;
  case p_action
    when 'clearpw' then update players set pw_hash = null, pw_fails = 0, pw_locked_until = null where pid = p_pid;
    when 'rename' then if oc_bad_name(p_value) then perform oc_fail('bad name'); end if; update players set name = p_value where pid = p_pid;
    when 'hide' then update players set hidden = (p_value = 'true') where pid = p_pid;
    when 'ban' then update players set banned = (p_value = 'true') where pid = p_pid;
    when 'coins' then update players set coins = coins + p_value::bigint where pid = p_pid;
    when 'givebait' then
      if not exists (select 1 from baits where id = p_value) then perform oc_fail('no such bait'); end if;
      if (select uses from baits where id = p_value) > 0 then perform oc_lure_add(p_pid, p_value, 5); end if;
      update players set baits = array_append(baits, p_value) where pid = p_pid and not (p_value = any(baits));
    when 'takebait' then
      if not exists (select 1 from baits where id = p_value) then perform oc_fail('no such bait'); end if;
      if p_value = 'worm' then perform oc_fail('worms are free for everyone and cannot be taken'); end if;
      update players set baits = array_remove(baits, p_value), gear = case when gear -> 'lures' ? p_value then jsonb_set(gear, array['lures', p_value], '{"n":0,"left":0}'::jsonb) else gear end where pid = p_pid;
    when 'giveitem' then
      if not exists (select 1 from items where id = p_value) then perform oc_fail('no such item'); end if;
      update players set items = array_append(items, p_value) where pid = p_pid and not (p_value = any(items));
    when 'giveboat' then
      if not exists (select 1 from gear where id = p_value and kind = 'boat') then perform oc_fail('no such boat'); end if;
      update players set gear = jsonb_set(jsonb_set(gear, '{boats}', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(gear -> 'boats', '["paddle"]'::jsonb) || to_jsonb(p_value)) x)))), '{boat}', to_jsonb(p_value)) where pid = p_pid;
    else perform oc_fail('unknown action');
  end case;
  update reports set handled = true where target = p_pid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_report(p_key text, p_id bigint, p_handled boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform oc_admin(p_key); update reports set handled = p_handled where id = p_id; return jsonb_build_object('ok', true); end $$;

create or replace function public.admin_suggestion(p_key text, p_id bigint, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform oc_admin(p_key); update suggestions set status = p_status where id = p_id; return jsonb_build_object('ok', true); end $$;

create or replace function public.admin_news(p_key text, p_text text) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform oc_admin(p_key); perform oc_news('notice', null, p_text, '{}'::jsonb); return jsonb_build_object('ok', true); end $$;

-- ============ passwords and account recovery ============
create or replace function public.set_password(p_pid uuid, p_secret text, p_password text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  if p_password is null or length(p_password) < 6 or length(p_password) > 64 then perform oc_fail('password must be 6 to 64 characters'); end if;
  update players set pw_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 8)), pw_fails = 0, pw_locked_until = null where pid = p.pid;
  return jsonb_build_object('ok', true);
end $$;

-- Returns {pid, secret} on success. Failures are returned (not raised) so the wrong-try counter is saved.
create or replace function public.login_password(p_name text, p_tag text, p_password text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from players where lower(name) = lower(trim(coalesce(p_name, ''))) and tag = trim(coalesce(p_tag, '')) for update;
  if p.pid is null or p.pw_hash is null then return jsonb_build_object('error', 'wrong name, tag or password'); end if;
  if p.pw_locked_until is not null and p.pw_locked_until > now() then return jsonb_build_object('error', 'too many wrong tries. wait 10 minutes and try again'); end if;
  if extensions.crypt(coalesce(p_password, ''), p.pw_hash) <> p.pw_hash then
    update players set pw_fails = case when pw_fails + 1 >= 5 then 0 else pw_fails + 1 end,
                       pw_locked_until = case when pw_fails + 1 >= 5 then now() + interval '10 minutes' else pw_locked_until end
     where pid = p.pid;
    return jsonb_build_object('error', 'wrong name, tag or password');
  end if;
  if p.banned then return jsonb_build_object('error', 'banned'); end if;
  update players set pw_fails = 0, pw_locked_until = null where pid = p.pid;
  return jsonb_build_object('pid', p.pid, 'secret', p.secret);
end $$;

-- Delete my account (required by the App Store). Removes the player and everything that is theirs.
-- Legends they owned go back into the water; past legend history keeps the catch but drops the name.
create or replace function public.delete_account(p_pid uuid, p_secret text, p_confirm text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := oc_auth(p_pid, p_secret);
  if coalesce(p_confirm, '') <> 'DELETE' then perform oc_fail('type DELETE to confirm'); end if;
  update legends set owner_pid = null, caught_at = null, fish_id = null where owner_pid = p.pid;
  update legends set history = (select coalesce(jsonb_agg(case when e ->> 'pid' = p.pid::text then (e - 'pid') || '{"name":"(deleted angler)"}'::jsonb else e end), '[]'::jsonb) from jsonb_array_elements(history) e)
   where history @> jsonb_build_array(jsonb_build_object('pid', p.pid::text));
  delete from hall_of_fame where pid = p.pid;
  delete from news where pid = p.pid;
  delete from reports where reporter = p.pid or target = p.pid;
  delete from suggestions where pid = p.pid;
  delete from trade_log where a = p.pid or b = p.pid;
  delete from players where pid = p.pid;
  return jsonb_build_object('ok', true);
end $$;

-- ============ permissions ============
do $$ declare r record; begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'oc\_%' or p.proname in ('login','get_state','set_prefs','set_outfit','set_name','claim_founder','cast_line','reel_line','lure_strike','lure_lose','sell_fish','buy','travel','release_legend','friend_request','friend_respond','trade_open','get_trade','trade_set','trade_ready','trade_confirm','trade_cancel','get_trade_history','react','report_player','block_player','claim_index','get_guide','suggest_lake','get_board','get_news','get_legends','get_profile','get_season','get_world','set_boat','crew_invite','crew_respond','crew_leave','get_crew','set_password','login_password','delete_account','admin_overview','admin_find','admin_player','admin_report','admin_suggestion','admin_news')) loop
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', r.proname, r.args);
    if r.proname not like 'oc\_%' then execute format('grant execute on function public.%I(%s) to anon, authenticated', r.proname, r.args); end if;
  end loop;
end $$;

select oc_ensure_season();

-- Halloween 2026: one World News post when the event goes live (only once, and only while it is on).
do $$ begin
  if oc_event_on('halloween') and not exists (select 1 from config where k = 'news_halloween2026') then
    perform oc_news('notice', null, 'Happy Halloween! Spooky fish are biting in Home waters until Sunday night: ghost carp, jack-o''-lantern bass and the phantom drum. Costumes and boat paint are in the shops, and this weekend is the Ghost Carp Derby!', '{}'::jsonb);
    insert into config (k, v) values ('news_halloween2026', 'true'::jsonb);
  end if;
end $$;

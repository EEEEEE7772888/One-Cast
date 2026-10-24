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
  gear jsonb not null default '{"line":0,"reel":0,"lines":1,"finder":0,"comfort":false,"methods":[]}',
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

-- Lock everything down. The website only gets the functions.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

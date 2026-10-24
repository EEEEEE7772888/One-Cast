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
  update players set last_seen = now() where pid = p_pid;
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
create or replace function public.oc_reel_snap(lvl int) returns numeric language sql immutable as $$
  select (array[0.6,0.45,0.3,0.15])[greatest(1, least(4, lvl + 1))];
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

-- How soon the first bite comes, in minutes.
create or replace function public.oc_bite_minutes(p_spot text, p_bait text, p_comfort boolean) returns numeric language plpgsql as $$
declare b public.baits; first_wait int; r numeric;
begin
  select * into b from baits where id = p_bait;
  select min(s.min_wait) into first_wait from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0;
  if first_wait is null then return null; end if;
  r := random();
  return greatest(b.min_bite, first_wait) - ln(1 - r) * b.bite_mean * (case when p_comfort then 0.75 else 1 end);
end $$;

-- Which fish bit, and how big. The same formula the game shows in its journal.
create or replace function public.oc_roll(p_spot text, p_bait text, p_minutes numeric, p_period text,
  out species text, out lb numeric, out inches numeric, out variant text, out bonus boolean) language plpgsql as $$
declare b public.baits; total numeric := 0; pick numeric; rec record; chosen record; a numeric; cap numeric; u numeric; v numeric; f numeric; vr numeric; prime boolean;
begin
  select * into b from baits where id = p_bait;
  for rec in
    select s.*, ss.w * sb.w * coalesce((s.act ->> p_period)::numeric, 1) *
      (case when p_minutes < s.min_wait then 0 when s.max_wait > 0 and p_minutes > s.max_wait then exp(-(p_minutes - s.max_wait) / s.max_wait) else 1 end) as w
    from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0
    order by s.id
  loop total := total + rec.w; end loop;
  if total <= 0 then species := null; return; end if;
  pick := random() * total;
  for rec in
    select s.*, ss.w * sb.w * coalesce((s.act ->> p_period)::numeric, 1) *
      (case when p_minutes < s.min_wait then 0 when s.max_wait > 0 and p_minutes > s.max_wait then exp(-(p_minutes - s.max_wait) / s.max_wait) else 1 end) as w
    from spot_species ss join species s on s.id = ss.species join species_baits sb on sb.species = s.id and sb.bait = p_bait
    where ss.spot = p_spot and ss.w > 0 and sb.w > 0
    order by s.id
  loop
    if rec.w <= 0 then continue; end if;
    chosen := rec; pick := pick - rec.w; if pick <= 0 then exit; end if;
  end loop;
  a := 1 - exp(-p_minutes / b.tau);
  cap := (0.12 + 0.88 * a) * b.cap_max;
  prime := p_period in ('dawn','dusk');
  u := random(); bonus := random() < (0.03 + 0.12 * a) * (case when prime then 2 else 1 end); v := random();
  f := case when bonus then cap * (0.75 + 0.25 * v) else cap * power(u, 1.25) end;
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
  select jsonb_build_object('idx', ln.idx, 'spot', ln.spot, 'bait', ln.bait, 'castAt', ln.cast_at, 'biteAt', ln.bite_at,
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
    'items', to_jsonb(p.items), 'outfit', p.outfit, 'prefs', p.prefs, 'stats', p.stats, 'journal', p.journal, 'daily', p.daily, 'founder', p.founder, 'champ', p.champ,
    'created', p.created_at, 'renamedAt', p.renamed_at,
    'lines', (select coalesce(jsonb_agg(oc_line_json(l, (p.gear ->> 'finder')::int) order by l.idx), '[]'::jsonb) from lines l where l.pid = p.pid),
    'fish', (select coalesce(jsonb_agg(oc_fish_json(f) order by f.caught_at desc), '[]'::jsonb) from fish f where f.pid = p.pid),
    'friends', fr, 'trades', tr, 'legendsHere', lg,
    'season', jsonb_build_object('key', season, 'endsAt', (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC'),
    'newsId', (select max(id) from news),
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
    insert into players (pid, secret, name, tag) values (p_pid, p_secret, p_name, t) returning * into p;
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
create or replace function public.cast_line(p_pid uuid, p_secret text, p_idx int, p_bait text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; sp public.spots; need text; mins numeric; r record; per text; ln public.lines; cmf boolean;
begin
  p := oc_auth(p_pid, p_secret);
  select * into sp from spots where id = p.spot;
  if p_idx < 0 or p_idx >= (p.gear ->> 'lines')::int then perform oc_fail('you do not have that line'); end if;
  if exists (select 1 from lines where pid = p_pid and idx = p_idx) then perform oc_fail('that line is already in the water'); end if;
  if not (p_bait = any(p.baits)) then perform oc_fail('you do not own that bait'); end if;
  if not exists (select 1 from method_baits where method = sp.method and bait = p_bait) then perform oc_fail('that bait does not work here'); end if;
  need := case sp.method when 'boat' then 'boat' when 'troll' then 'offshore' when 'deep' then 'deeprig' else null end;
  if need is not null and not (p.gear -> 'methods' ? need) then perform oc_fail('you need the right boat for this spot'); end if;
  cmf := coalesce((p.gear ->> 'comfort')::boolean, false);
  mins := oc_bite_minutes(p.spot, p_bait, cmf);
  if mins is null then perform oc_fail('nothing here bites on that'); end if;
  per := oc_period(now() + (mins * interval '1 minute'), sp.tz);
  select * into r from oc_roll(p.spot, p_bait, mins, per);
  insert into lines (pid, idx, spot, bait, cast_at, bite_at, species, lb, inches, variant, snap, legend_roll)
    values (p_pid, p_idx, p.spot, p_bait, now(), now() + (mins * interval '1 minute'), r.species, r.lb, r.inches, r.variant, random() < oc_reel_snap((p.gear ->> 'reel')::int), random())
    returning * into ln;
  return jsonb_build_object('line', oc_line_json(ln, (p.gear ->> 'finder')::int), 'now', now());
end $$;

create or replace function public.reel_line(p_pid uuid, p_secret text, p_idx int) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; ln public.lines; sp public.spots; l public.legends; per text; mins numeric; test int; f public.fish; j jsonb; val bigint; nsp boolean; nbest boolean; worldrec boolean := false; prevbest numeric; cnt int; st jsonb; dl jsonb; reward bigint := 0; res jsonb;
begin
  p := oc_auth(p_pid, p_secret);
  select * into ln from lines where pid = p_pid and idx = p_idx for update;
  if ln.pid is null then perform oc_fail('no line there'); end if;
  delete from lines where pid = p_pid and idx = p_idx;
  if now() < ln.bite_at then return jsonb_build_object('result', 'early', 'now', now()); end if;
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
  return res;
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
    if p_id = any(p.baits) then perform oc_fail('you already own that'); end if;
    price := b.price;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, baits = array_append(baits, p_id) where pid = p_pid;
  elsif p_kind = 'gear' then
    select * into g from gear where id = p_id; if g.id is null then perform oc_fail('no such gear'); end if;
    price := g.price;
    if g.kind in ('line','reel','lines','finder') then
      if (gr ->> g.kind)::int >= g.lvl then perform oc_fail('you already own that'); end if;
      if (gr ->> g.kind)::int <> g.lvl - 1 then perform oc_fail('buy the cheaper one first'); end if;
      gr := jsonb_set(gr, array[g.kind], to_jsonb(g.lvl));
    elsif g.kind = 'comfort' then
      if (gr ->> 'comfort')::boolean then perform oc_fail('you already own that'); end if;
      gr := jsonb_set(gr, '{comfort}', 'true'::jsonb);
    elsif g.kind = 'method' then
      if gr -> 'methods' ? g.id then perform oc_fail('you already own that'); end if;
      gr := jsonb_set(gr, '{methods}', (gr -> 'methods') || to_jsonb(g.id));
    end if;
    if p.coins < price then perform oc_fail('not enough coins'); end if;
    update players set coins = coins - price, gear = gr where pid = p_pid;
  elsif p_kind = 'item' then
    select * into it from items where id = p_id; if it.id is null or it.prize then perform oc_fail('no such item'); end if;
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
  update players set spot = p_spot where pid = p_pid;
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

-- ============ friends ============
create or replace function public.friend_request(p_pid uuid, p_secret text, p_name text, p_tag text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.players; o public.players; x uuid; y uuid; fr public.friends;
begin
  p := oc_auth(p_pid, p_secret);
  select * into o from players where lower(name) = lower(p_name) and tag = p_tag and not banned;
  if o.pid is null then perform oc_fail('no player with that name and tag'); end if;
  if o.pid = p_pid then perform oc_fail('that is you'); end if;
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
  if pa.coins < t.a_coins or pb.coins < t.b_coins then update trades set status = 'failed', updated_at = now() where id = p_id; perform oc_fail('someone no longer has the coins'); end if;
  foreach fid in array t.a_fish loop if not exists (select 1 from fish where id = fid and pid = t.a and not released and (locked_until is null or locked_until < now())) then update trades set status = 'failed', updated_at = now() where id = p_id; perform oc_fail('a fish is no longer available'); end if; end loop;
  foreach fid in array t.b_fish loop if not exists (select 1 from fish where id = fid and pid = t.b and not released and (locked_until is null or locked_until < now())) then update trades set status = 'failed', updated_at = now() where id = p_id; perform oc_fail('a fish is no longer available'); end if; end loop;
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

create or replace function public.admin_overview(p_key text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  return jsonb_build_object(
    'players', (select count(*) from players), 'online', (select count(*) from players where last_seen > now() - interval '10 minutes'),
    'fish', (select count(*) from fish), 'legendsCaught', (select count(*) from legends where owner_pid is not null),
    'reports', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'at', r.at, 'reason', r.reason, 'reporter', (select name || '#' || tag from players where pid = r.reporter), 'target', (select name || '#' || tag from players where pid = r.target), 'targetPid', r.target) order by r.at desc), '[]'::jsonb) from reports r where not r.handled),
    'suggestions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'at', s.at, 'lake', s.lake, 'place', s.place, 'by', (select name || '#' || tag from players where pid = s.pid)) order by s.at desc), '[]'::jsonb) from suggestions s where s.status = 'pending'),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'coins', p.coins, 'catches', p.stats -> 'catches', 'hidden', p.hidden, 'banned', p.banned, 'seen', p.last_seen) order by p.last_seen desc), '[]'::jsonb) from (select * from players order by last_seen desc limit 100) p));
end $$;

create or replace function public.admin_find(p_key text, p_q text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  return (select coalesce(jsonb_agg(jsonb_build_object('pid', p.pid, 'name', p.name, 'tag', p.tag, 'coins', p.coins, 'catches', p.stats -> 'catches', 'hidden', p.hidden, 'banned', p.banned, 'seen', p.last_seen)), '[]'::jsonb)
    from players p where lower(p.name) like '%' || lower(p_q) || '%' or p.tag = p_q or p.pid::text = p_q limit 50);
end $$;

create or replace function public.admin_player(p_key text, p_pid uuid, p_action text, p_value text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform oc_admin(p_key);
  case p_action
    when 'rename' then if oc_bad_name(p_value) then perform oc_fail('bad name'); end if; update players set name = p_value where pid = p_pid;
    when 'hide' then update players set hidden = (p_value = 'true') where pid = p_pid;
    when 'ban' then update players set banned = (p_value = 'true') where pid = p_pid;
    when 'coins' then update players set coins = coins + p_value::bigint where pid = p_pid;
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

-- ============ permissions ============
do $$ declare r record; begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'oc\_%' or p.proname in ('login','get_state','set_prefs','set_outfit','set_name','claim_founder','cast_line','reel_line','sell_fish','buy','travel','release_legend','friend_request','friend_respond','trade_open','get_trade','trade_set','trade_ready','trade_confirm','trade_cancel','get_trade_history','react','report_player','suggest_lake','get_board','get_news','get_legends','get_profile','get_season','get_world','admin_overview','admin_find','admin_player','admin_report','admin_suggestion','admin_news')) loop
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', r.proname, r.args);
    if r.proname not like 'oc\_%' then execute format('grant execute on function public.%I(%s) to anon, authenticated', r.proname, r.args); end if;
  end loop;
end $$;

select oc_ensure_season();

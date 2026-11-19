-- Migration 0029: weather for the phone. farm_weather(farm) = the days of every parcel (owner and worker of THAT farm only); weather_targets() = where to fetch (service role only).
-- Real `authenticated` / `anon` roles. Written BEFORE 0029: neither function exists.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000f9') on conflict do nothing;      -- a signed-in user who belongs to no farm
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; o constant uuid := '22222222-2222-2222-2222-222222222222'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        pn constant uuid := '33333333-3333-3333-3333-3333333333a1'; pd constant uuid := '33333333-3333-3333-3333-3333333333a2'; fp constant uuid := '44444444-4444-4444-4444-444444444444';
        d0 constant date := (now() at time zone 'Europe/Athens')::date; old_run constant timestamptz := now() - interval '6 hours'; new_run constant timestamptz := now() - interval '1 hour';
begin
  update parcels set lat = 37.99, lng = 23.35, edit_reason = 'fixture' where id = p;
  update parcels set lat = 38.01, lng = 23.40, edit_reason = 'fixture' where id = fp;
  insert into parcels(id,farm_id,name,area_str) values (pn, f, 'No position', 1);                                    -- no position: cannot be fetched
  insert into parcels(id,farm_id,name,area_str,lat,lng,deleted_at) values (pd, f, 'Deleted', 1, 38.0, 23.3, now());   -- deleted: not fetched, not shown
  -- two forecasts of the same day: the LATER one is shown; an older one is not
  insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model,tmin,tmax,rain_mm) values (p,f,d0,'forecast',old_run,'icon_eu',1,9,0), (p,f,d0,'forecast',new_run,'icon_eu',3,11,2.5);
  insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model,tmin,tmax,rain_mm) values (p,f,d0+1,'forecast',new_run,'icon_eu',4,12,null);
  insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model,tmin,tmax) values (p,f,d0-30,'forecast',new_run,'icon_eu',5,15);      -- far in the past: not part of the strip
  insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model,tmin,tmax) values (pd,f,d0,'forecast',new_run,'icon_eu',0,0), (fp,o,d0,'forecast',new_run,'icon_eu',7,17);
  -- hourly values of the shown forecast: the day's strongest wind / gust (a maximum, nothing is averaged or rounded)
  insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model,wind_kmh,gust_kmh) values
    (p,f,(d0::timestamp + interval '10 hours') at time zone 'Europe/Athens','forecast',new_run,'icon_eu',12.5,30.5),
    (p,f,(d0::timestamp + interval '15 hours') at time zone 'Europe/Athens','forecast',new_run,'icon_eu',18.25,41),
    (p,f,(d0::timestamp + interval '12 hours') at time zone 'Europe/Athens','forecast',old_run,'icon_eu',99,99);                   -- the OLD run: ignored
end $$;
-- the OWNER and the WORKER of farm F
do $$
declare who text; r jsonb; d jsonb;
begin
  foreach who in array array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2'] loop
    execute 'reset role'; perform set_config('test.uid', who, false); execute 'set role authenticated';
    r := farm_weather('11111111-1111-1111-1111-111111111111');
    if jsonb_array_length(r) <> 1 or r->0->>'parcel_id' <> '33333333-3333-3333-3333-333333333333' then raise exception '(0029) %: expected ONE parcel (the other farm''s and the deleted one are not shown): %', who, r; end if;
    d := (select jsonb_agg(e order by e->>'date') from jsonb_array_elements(r->0->'days') e where e->>'date' >= (current_date - 1)::text);   -- (an older fixture row from other tests may sit at today-2)
    if exists (select 1 from jsonb_array_elements(r->0->'days') e where e->>'date' = (current_date - 30)::text) then raise exception '(0029) %: a day a month ago is in the strip', who; end if;
    if jsonb_array_length(d) <> 2 then raise exception '(0029) %: expected 2 days (today and tomorrow): %', who, d; end if;
    if (d->0->>'tmin')::numeric <> 3 or (d->0->>'tmax')::numeric <> 11 or (d->0->>'rain_mm')::numeric <> 2.5 then raise exception '(0029) %: the later forecast must win: %', who, d->0; end if;
    if (d->0->>'gust_kmh')::numeric <> 41 or (d->0->>'wind_kmh')::numeric <> 18.25 then raise exception '(0029) %: wind and gust are the day''s maximum of the shown run: %', who, d->0; end if;
    if d->1->'rain_mm' <> 'null'::jsonb or d->1->'gust_kmh' <> 'null'::jsonb then raise exception '(0029) %: a missing value stays null, never 0: %', who, d->1; end if;
    if d->0->>'kind' <> 'forecast' then raise exception '(0029) %: the kind is passed on: %', who, d->0; end if;
  end loop;
end $$;
-- somebody who belongs to NO farm, and the other farm's view: refused (not an empty answer)
reset role; set test.uid = '00000000-0000-0000-0000-0000000000f9'; set role authenticated;
do $$ begin
  begin perform farm_weather('11111111-1111-1111-1111-111111111111'); raise exception '(0029) a stranger read the weather of the farm';
  exception when insufficient_privilege then null; end;
end $$;
-- anon and signed-in users cannot ask where to fetch
reset role; set test.uid = ''; set role anon;
do $$ begin
  begin perform farm_weather('11111111-1111-1111-1111-111111111111'); raise exception '(0029) anon read the weather';
  exception when insufficient_privilege then null; end;
  begin perform weather_targets(); raise exception '(0029) anon asked for the fetch list'; exception when insufficient_privilege then null; end;
end $$;
reset role; set test.uid = '00000000-0000-0000-0000-0000000000a1'; set role authenticated;
do $$ begin
  begin perform weather_targets(); raise exception '(0029) a signed-in user asked for the fetch list'; exception when insufficient_privilege then null; end;
end $$;
-- the fetch list (service side): parcels with a position, not deleted, of every farm
reset role; set test.uid = '';
do $$ begin
  if (select count(*) from weather_targets() where id in ('33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444')) <> 2 then raise exception '(0029) the fetch list must hold the parcels with a position (of every farm)'; end if;
  if exists (select 1 from weather_targets() where id in ('33333333-3333-3333-3333-3333333333a1','33333333-3333-3333-3333-3333333333a2')) then raise exception '(0029) a parcel without position or a deleted one is in the fetch list'; end if;
  if exists (select 1 from weather_targets() where lat is null or lng is null or farm_id is null) then raise exception '(0029) the fetch list has an incomplete row'; end if;
end $$;

-- MET Norway (beta source): the cache state of each parcel's last fetch (Expires / Last-Modified exactly as MET sent them) lives in weather_fetch_state: service role only. weather_targets hands
-- it to the job; farm_weather passes the source (`model`) on so the screen can name it.
reset role; set test.uid = '';
insert into weather_fetch_state(parcel_id, farm_id, last_modified, expires, fetched_at) values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Thu, 19 Nov 2026 14:40:00 GMT', 'Thu, 19 Nov 2026 20:40:00 GMT', now());
do $$ begin
  if (select last_modified from weather_targets() where id = '33333333-3333-3333-3333-333333333333') <> 'Thu, 19 Nov 2026 14:40:00 GMT' or (select expires from weather_targets() where id = '33333333-3333-3333-3333-333333333333') <> 'Thu, 19 Nov 2026 20:40:00 GMT' then raise exception '(0029) the fetch list does not carry the cache state'; end if;
  if (select last_modified from weather_targets() where id = '44444444-4444-4444-4444-444444444444') is not null then raise exception '(0029) a parcel never fetched has a cache state'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin perform 1 from weather_fetch_state; raise exception '(0029) the owner read the fetch state'; exception when insufficient_privilege then null; end;
  begin insert into weather_fetch_state(parcel_id, farm_id) values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'); raise exception '(0029) the owner wrote the fetch state'; exception when insufficient_privilege then null; end;
  if (select (farm_weather('11111111-1111-1111-1111-111111111111')->0->'days'->-1->>'model') is null) then raise exception '(0029) the days of farm_weather do not name their source (model)'; end if;
end $$;
set role anon;
do $$ begin begin perform 1 from weather_fetch_state; raise exception '(0029) anon read the fetch state'; exception when insufficient_privilege then null; end; end $$;
reset role; set test.uid = '';

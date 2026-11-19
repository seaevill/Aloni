-- 0029_weather_read.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Weather for the phone. A NEW file; builds on 0001–0028. Nothing is deployed by it and no schedule is switched on.
--  * farm_weather(p_farm)  the days of every parcel of ONE farm, for its owner and its workers: today −2 … today +6 (Athens), per parcel and day the LATEST forecast run (analysis, station and
--                          sensor values rank before a forecast), the day's strongest wind and gust taken from the hourly rows of that same run (a maximum: nothing is averaged or rounded). A value
--                          that is not there stays null (never 0). Somebody who is not an owner or worker of the farm is REFUSED (an error, not an empty answer).
--  * weather_targets()     where the weather function must fetch: every parcel with a position that is not deleted. For the service role only (the scheduled function); no signed-in user, no anon.
-- It is information only: no rule reads these functions, nothing is decided or sent from them.

create function farm_weather(p_farm uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d0 constant date := (now() at time zone 'Europe/Athens')::date;
begin
  if auth.uid() is null or not private.has_role(p_farm, array['owner','worker']) then raise exception 'not allowed' using errcode = 'insufficient_privilege'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('parcel_id', x.pid, 'days', x.days) order by x.pid)
    from (
      select d.parcel_id as pid,
             jsonb_agg(jsonb_build_object('date', d.day, 'tmin', d.tmin, 'tmax', d.tmax, 'rain_mm', d.rain_mm, 'wind_kmh', h.wind, 'gust_kmh', h.gust, 'rh_pct', d.rh_pct,
                                          'kind', d.kind, 'issued_at', d.issued_at) order by d.day) as days
      from (
        select distinct on (w.parcel_id, w.day) w.*
        from weather_daily w join parcels p on p.id = w.parcel_id and p.farm_id = w.farm_id and p.deleted_at is null
        where w.farm_id = p_farm and w.day between d0 - 2 and d0 + 6
        order by w.parcel_id, w.day, case w.kind when 'station' then 0 when 'sensor' then 1 when 'analysis' then 2 else 3 end, w.issued_at desc
      ) d
      left join lateral (
        select max(hh.wind_kmh) as wind, max(hh.gust_kmh) as gust from weather_hourly hh
        where hh.parcel_id = d.parcel_id and hh.farm_id = d.farm_id and hh.kind = d.kind and hh.issued_at = d.issued_at and (hh.at at time zone 'Europe/Athens')::date = d.day
      ) h on true
      group by d.parcel_id
    ) x
  ), '[]'::jsonb);
end $$;

create function weather_targets() returns table (id uuid, farm_id uuid, lat numeric, lng numeric) language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.farm_id, p.lat, p.lng from parcels p where p.deleted_at is null and p.lat is not null and p.lng is not null;
$$;

revoke execute on function farm_weather(uuid) from public;
revoke execute on function weather_targets() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function farm_weather(uuid) from anon; revoke execute on function weather_targets() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function farm_weather(uuid) to authenticated; revoke execute on function weather_targets() from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function weather_targets() to service_role; end if;
end $$;
comment on function farm_weather(uuid) is 'OPEN TO SIGNED-IN USERS ON PURPOSE: the phone''s weather strip. It checks the session itself (owner or worker of this farm, else an error) and shows information only.';
comment on function weather_targets() is 'SERVICE ROLE ONLY: the parcels (with a position) the scheduled weather function fetches. Not open to any signed-in user.';

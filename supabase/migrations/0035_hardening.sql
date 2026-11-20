-- 0035: two small hardening steps from the Codex database review (docs/reviews/team/2026-11-20-codex-db-hardening.md). Nothing else changes: no table, no policy, no grant, no data.
--  1. weather_daily gets a farm-first index for the tenant + day read (0029 weather read). Measured: 8,800 index candidates → 88 on 100 synthetic farms (docs/reviews/team/2026-11-21-0035-evidence.md).
--  2. private.has_role gets a MINIMAL search_path (pg_catalog, pg_temp last — the 0022 rule wants pg_temp listed, Codex proposed an empty one); its body already names public.farm_members and auth.uid() in full below. `create or replace` keeps the existing grants (authenticated only).
-- weather_hourly index and the other definer functions are NOT in this file on purpose (no workload measurement / each needs its own grant check): BACKLOG.
create index if not exists weather_daily_farm_day_idx on public.weather_daily (farm_id, day);

create or replace function private.has_role(p_farm uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select exists (
    select 1 from public.farm_members m
    where m.farm_id = p_farm and m.user_id = auth.uid() and m.active and m.role = any (p_roles)
  );
$$;

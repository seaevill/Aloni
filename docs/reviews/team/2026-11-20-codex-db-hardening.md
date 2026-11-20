# Database hardening review (0001–0032)

Scope: disposable PostgreSQL 17.11 + PostGIS 3.5.2 initialized from migrations 0001–0032 and the repository Auth stub. All data was synthetic. The SQL below is a proposal for a later migration.

## RLS and tenant lookup indexes

A catalog check found no non-partial index led by `farm_id` on `applied_ops`, `audit_log`, `invitations`, `job_fertilise`, `job_irrigate`, `job_sow`, `weather_daily`, `weather_fetch_state` and `weather_hourly`. This is a candidate list. The invitations partial index already covers open-invite queries beginning with `farm_id`. The weather fetch state is keyed by parcel and denies authenticated reads. Check callers and row volume before adding indexes to those tables. The `farm_members(farm_id,user_id)` primary key already matches the two-column membership check in `private.has_role`.

Tested farm/date reads as an authenticated owner, with RLS active, 100 synthetic farms and 30,000 rows per weather table. `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` used the following row counts. The same date filters and tenant were used before and after adding the candidate indexes in a transaction.

| Table | Before, index candidates | After, index candidates | Returned rows |
| --- | ---: | ---: | ---: |
| `weather_daily` | Parcel-first PK, 8,800 | Farm/day bitmap index, 88 | 88 |
| `weather_hourly` | Parcel-first PK, 8,400 | Farm/time bitmap index, 84 | 84 |

The daily query reflects the tenant and day filter in `0029_weather_read.sql:32–33`. The hourly measurement applies to a tenant-wide time range. The hourly lateral query at lines 36–38 also has a parcel constraint and a local-date expression, so this synthetic plan does not establish an improvement for that specific query. Treat the hourly index as optional pending a workload measurement.

## SECURITY DEFINER search paths

The catalog contained 31 application-owned definer functions in `public` and `private`. Each had a fixed path. None had an empty path. `farm_weather` and `weather_targets` use `public, pg_temp`. The other 29 use `public, private, pg_temp`. A non-empty fixed path is a hardening opportunity. Whether it is exploitable depends on who can create objects in searched schemas and how the function resolves names.

Convert gradually with schema-qualified dependencies and unchanged grants. `private.has_role(uuid,text[])` is the first candidate: it reads `public.farm_members` and `auth.uid()`. The replacement below was tested in a rolled-back transaction. As `authenticated`, a synthetic owner passed the owner check, a worker passed the worker check, and the worker failed the owner check. Trigger functions and extension-backed routines need their own resolution and grant checks before conversion.

## Proposed 0035+ migration excerpt

```sql
create index if not exists weather_daily_farm_day_idx
  on public.weather_daily (farm_id, day);

create or replace function private.has_role(p_farm uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.farm_members m
    where m.farm_id = p_farm
      and m.user_id = auth.uid()
      and m.active
      and m.role = any (p_roles)
  );
$$;

-- Optional after measuring a tenant-wide hourly workload:
-- create index weather_hourly_farm_at_idx on public.weather_hourly (farm_id, at);
```

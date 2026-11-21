# Independent review of database hardening (0035)

Reviewed #271 at `55166a2a469caaa9a775bacda3020c6a6b664086`.

## MUST

None.

- `supabase/migrations/0035_hardening.sql:5` creates a btree on `public.weather_daily(farm_id, day)`, in that order. The catalog confirmed that exact definition. It matches the tenant and date predicates in `supabase/migrations/0029_weather_read.sql:32–33` and the synthetic query plans in the evidence report.
- `supabase/migrations/0035_hardening.sql:7–13` preserves the function signature, owner, grants, stability, and definer status. The function reads `public.farm_members` and `auth.uid()` explicitly. The fixed `pg_catalog, pg_temp` path satisfies the repository's `pg_temp`-last rule at `supabase/tests/m5_0022.sql:62–69` and excludes application schemas from unqualified resolution.
- Under the local `authenticated` role, H2b verified owner and worker membership, worker denial for owner scope, and stranger denial. H3 and the before/after catalog check verified that authenticated retains EXECUTE and anon has none.

## SHOULD

No open findings.

## LOW

`supabase/tests/m16_hardening.sql:6–12` currently accepts any valid non-partial index led by `farm_id`. Checking the relation by `public.weather_daily` and the second key as `day` would make the test enforce the full migration contract. The actual index is correct.

## Verification

On disposable PostgreSQL 17.11 with PostGIS 3.5.2, m16 failed against 0034 at H1. The upgrade from the historical fixture and the extensions-schema SQL suite passed with 0035. The Auth identities in these tests come from the repository's local stub.

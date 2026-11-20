-- WHAT THIS CHECKS (read-only, from the system catalogs; it changes nothing): that the 22 expected tables exist; that RLS is ON for every table in `public` and that every RLS
-- table has at least one policy; that the sync/worker/verification functions (apply_ops, apply_one, pull, verify_spray_chain, complete_spray_job, worker_sees_spray) are NOT
-- executable by PUBLIC/anon; that every SECURITY DEFINER function has a fixed search_path; that the key triggers exist; that migrations 0012 and 0013/0014 are in.
-- WHAT IT DOES NOT CHECK (so it never stands in for them): what a policy actually ALLOWS (a policy that is too wide still counts as «a policy»), what a signed-in user or a
-- worker can really read and write (that is the role tests in supabase/tests/*.sql and the real-account trial in RUNBOOK 10.1 step 10), the real Supabase Auth/JWT behaviour,
-- the grants Supabase adds by default, storage buckets, or anything the Supabase Security Advisor looks at. The Advisor screen is a SECOND look, not a replacement.
-- Read-only check to run in the Supabase SQL Editor AFTER the migrations (and in CI after the tests). It changes nothing.
-- Every row it returns is a PROBLEM; the last line says OK only when there is none.
with expected_tables(t) as (values ('farms'),('profiles'),('farm_members'),('parcels'),('crops'),('plantings'),('products'),('label_uses'),('soil_tests'),('water_tests'),('stock_lots'),('stock_movements'),
  ('jobs'),('job_plantings'),('job_spray'),('job_harvest'),('observations'),('workers'),('media'),('farm_settings'),('applied_ops'),('audit_log')),
problems as (
  select 'table missing: ' || t as problem from expected_tables where not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
  union all select 'RLS is OFF on ' || tablename from pg_tables where schemaname = 'public' and not rowsecurity and tablename <> 'spatial_ref_sys'   -- spatial_ref_sys belongs to PostGIS (on Supabase it lives in the extensions schema)
  union all select 'RLS on but no policy: ' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relname <> 'sync_meta' and not exists (select 1 from pg_policy p where p.polrelid = c.oid)   -- sync_meta is closed on purpose: only the functions read it
  union all select 'callable by anon/PUBLIC: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.proname in ('apply_ops', 'apply_one', 'pull', 'verify_spray_chain', 'complete_spray_job', 'worker_sees_spray', 'has_role', 'accept_invitation', 'controller_complete', 'server_identity', 'bump_sync_generation', 'sync_generation', 'sync_visibility')
      and (has_function_privilege('public', p.oid, 'execute') or (exists (select 1 from pg_roles where rolname = 'anon') and has_function_privilege('anon', p.oid, 'execute')))
  union all select 'authenticated can TRUNCATE ' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'spatial_ref_sys'
    and exists (select 1 from pg_roles where rolname = 'authenticated') and has_table_privilege('authenticated', c.oid, 'truncate')
  union all select 'anon has a right on ' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'spatial_ref_sys'
    and exists (select 1 from pg_roles where rolname = 'anon') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'truncate'))
  union all select 'authenticated can call bump_sync_generation' where exists (select 1 from pg_roles where rolname = 'authenticated') and exists (select 1 from pg_proc where proname = 'bump_sync_generation') and has_function_privilege('authenticated', 'bump_sync_generation()', 'execute')
  union all select 'function without a fixed search_path: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  union all select 'trigger function callable through the API: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and (has_function_privilege('public', p.oid, 'execute') or (exists (select 1 from pg_roles where rolname = 'anon') and has_function_privilege('anon', p.oid, 'execute')) or (exists (select 1 from pg_roles where rolname = 'authenticated') and has_function_privilege('authenticated', p.oid, 'execute')))
  union all select 'an RLS helper is still in the exposed schema public: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('has_role', 'worker_sees_spray', 'sync_generation', 'sync_visibility')
  union all select 'policy not limited to authenticated: ' || tablename || '.' || policyname from pg_policies where schemaname = 'public' and roles <> '{authenticated}'
  union all select 'the server restarted after the last bump_sync_generation(): if this was a restore, run it once (RUNBOOK 10), then verify again' where exists (select 1 from information_schema.columns where table_name = 'sync_meta' and column_name = 'bumped_at') and (select bumped_at from sync_meta) < pg_postmaster_start_time()
  union all select 'migration 0019 not applied (label_uses.supersedes_id is missing)' where not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'label_uses' and column_name = 'supersedes_id')
  union all select 'trigger missing: ' || x.tg from (values ('zz_job_spray_chain'),('job_harvest_phi'),('job_spray_check'),('jobs_worker_guard'),('jobs_identity'),('job_spray_append_only'),('job_harvest_append_only'),('stock_movements_append_only'),('media_guard')) x(tg)
    where not exists (select 1 from pg_trigger where tgname = x.tg and not tgisinternal)
  union all select 'migration 0013 not applied (complete_spray_job is missing)' where not exists (select 1 from pg_proc where proname = 'complete_spray_job')
  union all select 'restored server: run bump_sync_generation() once (RUNBOOK 10.3); the stored server identity is not this server''s' where exists (select 1 from pg_proc where proname = 'server_identity') and exists (select 1 from sync_meta where server_identity() is not null and system_id is distinct from server_identity())
  union all select 'migration 0018 not applied (accept_invitation is missing)' where not exists (select 1 from pg_proc where proname = 'accept_invitation')
  union all select 'migration 0017 not applied (server_identity is missing)' where not exists (select 1 from pg_proc where proname = 'server_identity')
  union all select 'migration 0016 not applied (sync_generation is missing)' where not exists (select 1 from pg_proc where proname = 'sync_generation')
  union all select 'migration 0015 not applied (forbid_truncate is missing)' where not exists (select 1 from pg_proc where proname = 'forbid_truncate')
  union all select 'migration 0014 not applied (complete_spray_job does not know a retry)' where not exists (select 1 from pg_proc where proname = 'complete_spray_job' and prosrc like '%rei_conflict%')
  union all select 'weather schedule missing: cron.job has no weather-fetch (0032 only notes it when pg_cron/pg_net/Vault were off): RUNBOOK 14' where to_regclass('cron.job') is not null and (xpath('/row/c/text()', query_to_xml('select count(*) as c from cron.job where jobname = ''weather-fetch''', false, true, '')))[1]::text = '0'
  union all select 'migration 0012 not applied (sync_table does not know crops)' where not exists (select 1 from pg_proc where proname = 'sync_table') or sync_table('crops') is null
)
select problem from problems
union all select 'OK: ' || n || ' tables with RLS, no problem found' from (select count(*) as n from pg_tables where schemaname = 'public' and rowsecurity) x where not exists (select 1 from problems);   -- the OK row exists ONLY when there is no problem (an aggregate without WHERE would always return a row)

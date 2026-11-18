-- Read-only check to run in the Supabase SQL Editor AFTER the migrations (and in CI after the tests). It changes nothing.
-- Every row it returns is a PROBLEM; the last line says OK only when there is none.
with expected_tables(t) as (values ('farms'),('profiles'),('farm_members'),('parcels'),('crops'),('plantings'),('products'),('label_uses'),('soil_tests'),('water_tests'),('stock_lots'),('stock_movements'),
  ('jobs'),('job_plantings'),('job_spray'),('job_harvest'),('observations'),('workers'),('media'),('farm_settings'),('applied_ops'),('audit_log')),
problems as (
  select 'table missing: ' || t as problem from expected_tables where not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
  union all select 'RLS is OFF on ' || tablename from pg_tables where schemaname = 'public' and not rowsecurity and tablename <> 'spatial_ref_sys'   -- spatial_ref_sys belongs to PostGIS (on Supabase it lives in the extensions schema)
  union all select 'RLS on but no policy: ' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  union all select 'callable by anon/PUBLIC: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('apply_ops', 'apply_one', 'pull', 'verify_spray_chain')
      and (has_function_privilege('public', p.oid, 'execute') or (exists (select 1 from pg_roles where rolname = 'anon') and has_function_privilege('anon', p.oid, 'execute')))
  union all select 'SECURITY DEFINER without a fixed search_path: ' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  union all select 'trigger missing: ' || x.tg from (values ('zz_job_spray_chain'),('job_harvest_phi'),('job_spray_check'),('jobs_worker_guard'),('jobs_identity'),('job_spray_append_only'),('job_harvest_append_only'),('stock_movements_append_only'),('media_guard')) x(tg)
    where not exists (select 1 from pg_trigger where tgname = x.tg and not tgisinternal)
  union all select 'migration 0012 not applied (sync_table does not know crops)' where not exists (select 1 from pg_proc where proname = 'sync_table') or sync_table('crops') is null
)
select problem from problems
union all select 'OK: ' || count(*) || ' tables with RLS, no problem found' from pg_tables where schemaname = 'public' and rowsecurity and not exists (select 1 from problems);

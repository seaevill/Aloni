-- 0035 hardening (Codex report 2026-11-20): (H1) weather_daily has a farm-first index for the tenant+day read; (H2) private.has_role has the minimal search_path pg_catalog, pg_temp (every name qualified) and
-- still answers correctly for a real `authenticated` owner and worker; (H3) grants unchanged (anon cannot execute). Written BEFORE 0035 (red against 0034), then green. Runs after m14_approval.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = ''; set test.jwt = '';

-- H1: a valid, non-partial btree on public.weather_daily whose keys are exactly (farm_id, day) in that order
do $$ begin
  if not exists (select 1 from pg_index i
                 join pg_attribute a1 on a1.attrelid = i.indrelid and a1.attnum = i.indkey[0]
                 join pg_attribute a2 on a2.attrelid = i.indrelid and a2.attnum = i.indkey[1]
                 join pg_class ic on ic.oid = i.indexrelid join pg_am am on am.oid = ic.relam
                 where i.indrelid = 'public.weather_daily'::regclass and i.indnkeyatts = 2 and a1.attname = 'farm_id' and a2.attname = 'day'
                   and i.indpred is null and i.indisvalid and am.amname = 'btree') then
    raise exception '(H1) public.weather_daily has no btree index on (farm_id, day)';
  end if;
end $$;

-- H2: the helper has the minimal search_path
do $$ declare cfg text[]; begin
  select p.proconfig into cfg from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'has_role';
  if cfg is null or not ('search_path=pg_catalog, pg_temp' = any (cfg)) then raise exception '(H2) private.has_role search_path is %', cfg; end if;
end $$;

-- H2b: owner passes the owner check, worker passes the worker check and FAILS the owner check, a stranger fails both
set role authenticated;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  if not private.has_role('11111111-1111-1111-1111-111111111111', array['owner']) then raise exception '(H2b) the owner is not an owner'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if not private.has_role('11111111-1111-1111-1111-111111111111', array['worker']) then raise exception '(H2b) the worker is not a worker'; end if;
  if private.has_role('11111111-1111-1111-1111-111111111111', array['owner']) then raise exception '(H2b) the worker passed the owner check'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000015a1';
do $$ begin
  if private.has_role('11111111-1111-1111-1111-111111111111', array['owner','worker']) then raise exception '(H2b) a stranger passed'; end if;
end $$;

-- H3: grants unchanged
reset role; do $$ begin
  if has_function_privilege('anon', 'private.has_role(uuid,text[])', 'EXECUTE') then raise exception '(H3) anon can execute has_role'; end if;
  if not has_function_privilege('authenticated', 'private.has_role(uuid,text[])', 'EXECUTE') then raise exception '(H3) authenticated lost has_role'; end if;
end $$;

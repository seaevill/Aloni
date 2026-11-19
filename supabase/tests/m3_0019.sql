-- Findings of the morning review (migration 0019), as the REAL `authenticated` role where it matters. Runs AFTER invite.sql on the same database.
-- Written BEFORE 0019: against 0001–0018 every block below fails.
\set ON_ERROR_STOP on
reset role; set test.uid = ''; set test.jwt = '';
do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticated') then raise exception 'no authenticated role'; end if; end $$;

-- (1) a SIGNED label use cannot be changed (the review lowered PHI 7 → 1 and a PHI-1 correction then passed). A change is a NEW row that says why.
reset role;
insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps)
  values ('cccccccc-1111-0000-0000-000000000901', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 'm3 test', 'single', 'ml/str', 0.025, 7, 24, 3);
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare lu constant uuid := 'cccccccc-1111-0000-0000-000000000901';
begin
  -- still unsigned: it can be edited freely, and then signed with the values as they are
  update label_uses set phi_days = 9 where id = lu;
  update label_uses set sign_off_by = 'agronomist', sign_off_on = current_date, sign_off_fingerprint = 'fp' where id = lu;
  begin update label_uses set phi_days = 1 where id = lu; raise exception '(1) a signed PHI was lowered'; exception when check_violation then null; end;
  begin update label_uses set rei_hours = 1 where id = lu; raise exception '(1) a signed REI was lowered'; exception when check_violation then null; end;
  begin update label_uses set dose_min = 0.5 where id = lu; raise exception '(1) a signed dose was changed'; exception when check_violation then null; end;
  begin update label_uses set max_apps = 9 where id = lu; raise exception '(1) the signed max applications were changed'; exception when check_violation then null; end;
  begin update label_uses set sign_off_by = null, sign_off_on = null, sign_off_fingerprint = null where id = lu; raise exception '(1) the signature was taken off'; exception when check_violation then null; end;
  begin update label_uses set phi_days = 1, sign_off_by = null, sign_off_on = null, sign_off_fingerprint = null where id = lu; raise exception '(1) unsign + lower in one step'; exception when check_violation then null; end;
  -- archiving is allowed (and does not weaken anything: the gate reads archived labels too)
  update label_uses set deleted_at = now() where id = lu;
  -- a change = a new row with a reason
  begin insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps, supersedes_id)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 'm3 test v2', 'single', 'ml/str', 0.025, 1, 24, 3, lu); raise exception '(1) a superseding label without a reason';
  exception when check_violation then null; end;
  insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps, supersedes_id, change_reason)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 'm3 test v2', 'single', 'ml/str', 0.025, 1, 24, 3, lu, 'label revised by the manufacturer');
  if (select phi_days from label_uses where id = lu) <> 9 then raise exception '(1) the signed label changed anyway'; end if;
end $$;

-- (2) every function in `public` has a fixed search_path (the Security Advisor's 10)
reset role;
do $$
declare bad text;
begin
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if bad is not null then raise exception '(2) functions without a fixed search_path: %', bad; end if;
end $$;

-- (3) trigger functions are not callable through the API; the helpers RLS needs live in a schema the API does not expose
do $$
declare bad text;
begin
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('public', p.oid, 'execute'));
  if bad is not null then raise exception '(3) trigger functions anyone can call: %', bad; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('has_role', 'worker_sees_spray', 'sync_generation', 'sync_visibility')) then
    raise exception '(3) an RLS helper is still in the exposed schema public'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname in ('has_role', 'worker_sees_spray', 'sync_generation', 'sync_visibility')) <> 4 then
    raise exception '(3) the RLS helpers are not in the private schema'; end if;
  if has_function_privilege('anon', 'private.has_role(uuid, text[])', 'execute') or has_function_privilege('public', 'private.has_role(uuid, text[])', 'execute') then raise exception '(3) anon can execute has_role'; end if;
  if not has_function_privilege('authenticated', 'private.has_role(uuid, text[])', 'execute') then raise exception '(3) authenticated cannot execute has_role: RLS would break'; end if;
  if not has_function_privilege('authenticated', 'public.complete_spray_job(uuid, timestamptz, text, text)', 'execute') then raise exception '(3) complete_spray_job must stay callable (it is the worker''s «Έγινε», on purpose)'; end if;
  if (select obj_description('public.complete_spray_job(uuid, timestamptz, text, text)'::regprocedure, 'pg_proc')) is null then raise exception '(3) complete_spray_job does not say why it is open'; end if;
end $$;

-- (4) policies: only for authenticated, auth.uid() through a sub-select, one permissive policy per table and command
do $$
declare bad text;
begin
  select string_agg(tablename || '.' || policyname, ', ') into bad from pg_policies where schemaname = 'public' and roles <> '{authenticated}';
  if bad is not null then raise exception '(4) policies not limited to authenticated: %', bad; end if;
  select string_agg(tablename || '.' || policyname, ', ') into bad from pg_policies where schemaname = 'public'
    and (coalesce(qual, '') ~ '(?<!SELECT )auth\.uid\(\)' or coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)' or coalesce(qual, '') ~ '(?<!SELECT )current_setting' or coalesce(with_check, '') ~ '(?<!SELECT )current_setting');
  if bad is not null then raise exception '(4) policies that call auth.uid() once per row: %', bad; end if;
  select string_agg(tablename || ' ' || c, ', ') into bad from (select tablename, c from pg_policies p, unnest(case when cmd = 'ALL' then array['SELECT','INSERT','UPDATE','DELETE'] else array[cmd] end) c
    where schemaname = 'public' and permissive = 'PERMISSIVE' group by 1, 2 having count(*) > 1) x;
  if bad is not null then raise exception '(4) several permissive policies for one table and command: %', bad; end if;
end $$;
-- ... and the farm still works for each role after the rewrite (the worker reads her job, the owner reads everything)
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin if not exists (select 1 from jobs) then raise exception '(4) the worker lost her jobs'; end if; if exists (select 1 from products where farm_id <> '11111111-1111-1111-1111-111111111111') then raise exception '(4) the worker sees another farm'; end if; end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin if (select count(*) from parcels) < 1 or (select count(*) from jobs) < 3 then raise exception '(4) the owner lost rows'; end if; end $$;
reset role; set test.uid = '';

-- (5) accept_invitation trusts auth.users (a CONFIRMED e-mail), not an e-mail claim in the token
insert into auth.users(id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a7', 'confirmed@example.org', now()), ('00000000-0000-0000-0000-0000000000a8', 'unconfirmed@example.org', null);
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into invitations(farm_id, email) values ('11111111-1111-1111-1111-111111111111', 'confirmed@example.org'), ('11111111-1111-1111-1111-111111111111', 'unconfirmed@example.org');
set test.uid = '00000000-0000-0000-0000-0000000000a8'; set test.jwt = '{"email":"unconfirmed@example.org"}';
do $$ begin begin perform accept_invitation(); raise exception '(5) an UNCONFIRMED e-mail address accepted an invitation'; exception when no_data_found or insufficient_privilege then null; end; end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a7'; set test.jwt = '{"email":"someone.else@example.org"}';   -- a token claim for ANOTHER address must not matter
do $$ begin
  if jsonb_array_length(accept_invitation()->'farms') <> 1 then raise exception '(5) the confirmed address did not get its invitation'; end if;
end $$;
reset role; set test.uid = ''; set test.jwt = '';

-- (6, 7) invitations: the server sets the expiry; an expired invitation does not block a new one; the owner can withdraw an open one
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; e timestamptz;
begin
  insert into invitations(farm_id, email, expires_at, created_at) values (f, 'forever@example.org', now() + interval '100 years', now() - interval '3 years');
  select expires_at into e from invitations where email = 'forever@example.org';
  if e > now() + interval '15 days' then raise exception '(7) the client set the expiry of an invitation: %', e; end if;
  if (select created_at from invitations where email = 'forever@example.org') < now() - interval '1 day' then raise exception '(7) the client set created_at'; end if;
end $$;
reset role; set test.uid = '';
update invitations set expires_at = now() - interval '1 day' where email = 'forever@example.org';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into invitations(farm_id, email) values (f, 'forever@example.org');     -- the expired one must not block this
  if (select count(*) from invitations where email = 'forever@example.org' and accepted_at is null) <> 1 then raise exception '(7) the expired invitation is still there next to the new one'; end if;
  delete from invitations where email = 'forever@example.org' and accepted_at is null;    -- withdrawing an open one
  if exists (select 1 from invitations where email = 'forever@example.org') then raise exception '(7) the owner could not withdraw'; end if;
end $$;
reset role; set test.uid = '';

-- (8) the server's identity is never «unknown»; a bump is recorded and the verification asks for one after a restart
do $$ begin
  if (select pg_get_functiondef('server_identity()'::regprocedure)) ~* 'exception\s+when' then raise exception '(8) server_identity() still swallows a failure and returns null'; end if;
  if not exists (select 1 from information_schema.columns where table_name = 'sync_meta' and column_name = 'bumped_at') then raise exception '(8) sync_meta has no bumped_at'; end if;
end $$;
do $$ begin raise notice 'm3-0019 tests passed'; end $$;

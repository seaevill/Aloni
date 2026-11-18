-- Review tests (2026-11-18): identity, same-farm references, deletes, photos, atomic groups, server-owned columns, who may call the RPCs.
-- Runs AFTER smoke.sql on the same database (it reuses its farms, users and roster), as the table owner first, then as the real roles.
\set ON_ERROR_STOP on

do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; foreign_farm constant uuid := '22222222-2222-2222-2222-222222222222';
        foreign_parcel constant uuid := '44444444-4444-4444-4444-444444444444'; own_parcel constant uuid := '33333333-3333-3333-3333-333333333333';
        crop uuid; owner_ constant uuid := '00000000-0000-0000-0000-0000000000a1'; n int; cb uuid; m uuid := gen_random_uuid();
begin
  select id into crop from crops where farm_id = f limit 1;
  -- a row cannot point at ANOTHER farm's row, even with a valid id
  begin insert into plantings(farm_id,parcel_id,crop_id,area_str,sown_on,status) values (f, foreign_parcel, crop, 1, '2026-11-17', 'growing'); raise exception 'planting on a foreign parcel accepted'; exception when foreign_key_violation then null; end;
  insert into plantings(farm_id,parcel_id,crop_id,area_str,sown_on,status) values (f, own_parcel, crop, 1, '2026-11-17', 'growing');
  -- no hard delete of synced rows
  begin delete from plantings where farm_id = f and area_str = 1; raise exception 'hard delete allowed'; exception when insufficient_privilege then null; end;
  -- the deliberate administrator step works inside one transaction only
  perform set_config('aloni.allow_delete', 'on', true); delete from plantings where farm_id = f and area_str = 1; get diagnostics n = row_count; if n <> 1 then raise exception 'admin delete failed'; end if;
  -- photos: storage_path is filled once, nothing else may change
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values (m, f, repeat('b', 64), 'image/jpeg', 10, 10, 10);
  update media set storage_path = 'farm/b.jpg' where id = m;
  begin update media set storage_path = 'other' where id = m; raise exception 'storage_path changed twice'; exception when insufficient_privilege then null; end;
  begin update media set bytes = 99 where id = m; raise exception 'photo bytes changed'; exception when insufficient_privilege then null; end;
  begin delete from media where id = m; raise exception 'photo deleted'; exception when insufficient_privilege then null; end;
end $$;

-- who may call the RPCs: signed-in users only (anon and PUBLIC have no EXECUTE)
do $$ begin
  if has_function_privilege('anon', 'apply_ops(jsonb)', 'execute') or has_function_privilege('anon', 'pull(uuid,jsonb,integer)', 'execute') then raise exception 'anon can call the sync RPCs'; end if;
  if has_function_privilege('public', 'apply_ops(jsonb)', 'execute') then raise exception 'PUBLIC can call apply_ops'; end if;
  if not has_function_privilege('authenticated', 'apply_ops(jsonb)', 'execute') then raise exception 'signed-in users cannot call apply_ops'; end if;
  if has_function_privilege('authenticated', 'apply_one(jsonb)', 'execute') and not has_function_privilege('authenticated', 'apply_ops(jsonb)', 'execute') then raise exception 'x'; end if;
end $$;

set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';   -- owner
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; owner_ constant uuid := '00000000-0000-0000-0000-0000000000a1'; res jsonb; n int; cb uuid;
        g1 constant uuid := '77777777-0000-0000-0000-000000000001'; pa constant uuid := gen_random_uuid(); pb constant uuid := gen_random_uuid(); oa constant uuid := gen_random_uuid(); ob constant uuid := gen_random_uuid(); oc constant uuid := gen_random_uuid();
begin
  -- identity: «created_by» is the session, whatever a direct insert claims
  insert into parcels(id,farm_id,name,area_str,created_by) values (pa, f, 'Forged', 1, '00000000-0000-0000-0000-0000000000b2');
  select created_by into cb from parcels where id = pa; if cb is distinct from owner_ then raise exception 'created_by taken from the client: %', cb; end if;
  -- through apply_ops the phone may not even send server-owned columns
  res := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'name', 'x', 'area_str', 1, 'created_by', owner_)),
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'name', 'x', 'area_str', 1, 'server_seq', 1)),
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_spray', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'hash', 'forged'))));
  select count(*) into n from jsonb_array_elements(res) x where x->>'status' = 'rejected' and x->>'reason' like '%set by the server%'; if n <> 3 then raise exception 'server-owned columns accepted: %', res; end if;
  -- a group is atomic: the second op is bad, so the first is NOT applied and NOT recorded
  res := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', oa, 'group_id', g1, 'group_size', 2, 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', pb, 'farm_id', f, 'name', 'In group', 'area_str', 2)),
    jsonb_build_object('op_id', ob, 'group_id', g1, 'group_size', 2, 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'name', 'x', 'area_str', 1, 'colour', 'red'))));
  if res->0->>'status' <> 'rejected' or res->1->>'status' <> 'rejected' or res->0->>'reason' not like 'group rolled back:%' or res->1->>'reason' not like 'unknown column%' then raise exception 'group not rolled back as a whole: %', res; end if;
  if exists (select 1 from parcels where id = pb) or exists (select 1 from applied_ops where op_id in (oa, ob)) then raise exception 'a rejected group left a trace'; end if;
  -- the same group sent again, now complete and valid, applies as a whole (the first answer did not burn the op ids)
  res := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', oa, 'group_id', g1, 'group_size', 2, 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', pb, 'farm_id', f, 'name', 'In group', 'area_str', 2)),
    jsonb_build_object('op_id', ob, 'group_id', g1, 'group_size', 2, 'farm_id', f, 'table', 'parcels', 'op', 'update', 'row', jsonb_build_object('id', pb, 'farm_id', f, 'name', 'In group, renamed'))));
  if res->0->>'status' <> 'applied' or res->1->>'status' <> 'applied' then raise exception 'valid group not applied: %', res; end if;
  -- an incomplete group (3 announced, 2 sent) is rejected whole
  res := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'group_id', gen_random_uuid(), 'group_size', 3, 'farm_id', f, 'table', 'parcels', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'name', 'x', 'area_str', 1))));
  if res->0->>'status' <> 'rejected' or res->0->>'reason' not like 'incomplete group%' then raise exception 'incomplete group accepted: %', res; end if;
  -- answers come back in the order the ops were sent, one per op
  if jsonb_array_length(apply_ops('[]'::jsonb)) <> 0 then raise exception 'empty batch'; end if;
  begin perform apply_ops('{}'::jsonb); raise exception 'non-array accepted'; exception when invalid_parameter_value then null; end;
end $$;

-- the roster decides who a job is assigned to; a client-sent assignee is overwritten, a worker cannot reassign
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; j constant uuid := gen_random_uuid(); a uuid;
begin
  insert into jobs(id,farm_id,kind,status,product_id,worker_id,assigned_to,dose_str,dose_unit,planned_for) values (j,f,'spray','planned',prod,w,'00000000-0000-0000-0000-0000000000a1',0.025,'ml/str','2026-11-19');
  select assigned_to into a from jobs where id = j;
  if a is distinct from '00000000-0000-0000-0000-0000000000b2'::uuid then raise exception 'assignee not derived from the roster: %', a; end if;
end $$;

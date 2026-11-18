-- Findings m2-0015 (migration 0017): (1) the harvest gate has a FLOOR from the signed label use, (2) received_at is always the server's now(), (3) the generation changes by itself
-- on a restored server, (4) a worker's pull restarts when rows became visible to her without changing themselves, (5) the flows run as the REAL `authenticated` role
-- (the other tests use a role that owns every right). Runs AFTER pull_generation.sql. Written BEFORE 0017: against 0001–0016 the blocks below fail.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
        crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; i int;
begin
  for i in 1..4 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-0000000009' || lpad(i::text, 2, '0'))::uuid,f,p,crop2,0.25,'2026-11-01','growing');
  end loop;
  insert into products(id,farm_id,name,type,unit) values ('aaaaaaaa-0000-0000-0000-000000000009',f,'Floor test product','fungicide','kg');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000901',f,'spray','done',w1,prod,now() - interval '1 hour');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000901','dddddddd-0000-0000-0000-000000000901');
end $$;

do $$ declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := now() - interval '3 days';
begin
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-000000000901',f,'eeeeeeee-0000-0000-0000-000000000901',prod,w1,lu,t,0.025,'ml/str','unsigned');
end $$;
-- (1) THE FLOOR from the signed label use (PHI 7 / REI 24). The original spray names it but its own waiting period is unknown (label_state unsigned, no PHI).
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; lu_unsigned constant uuid := 'cccccccc-1111-0000-0000-000000000003';
        w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000901');
begin
  -- a) the correction may not point at ANOTHER (unsigned, shorter) label use to lose the floor
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000901',prod,w1,lu_unsigned,t,0.025,'ml/str','unsigned',1,1,'manual',t + interval '1 day',t + interval '1 hour','55555555-0000-0000-0000-000000000901','x');
    raise exception '(1a) a correction pointed at another label use and lost the signed floor';
  exception when check_violation then null; end;
end $$;
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000901');
begin
  -- b) the gate itself: a correction row with a short PHI that got in with the triggers off (a restored or old row) does not open the gate: the floor is read from the signed label
  set session_replication_role = replica;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-000000000903',f,'eeeeeeee-0000-0000-0000-000000000901',prod,w1,lu,t,0.025,'ml/str','unsigned',1,1,'manual',t + interval '1 day',t + interval '1 hour','55555555-0000-0000-0000-000000000901','x');
  set session_replication_role = origin;
  begin insert into job_harvest(farm_id,planting_id,harvested_at,crates_str) values (f,'dddddddd-0000-0000-0000-000000000901',now(),1); raise exception '(1b) the harvest gate trusted a short stored PHI instead of the signed label floor';
  exception when check_violation then null; end;
end $$;

-- (2) received_at is the SERVER's clock: a supplied value is ignored, so «late» cannot be dodged
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := now() - interval '20 days'; r record;
begin
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,received_at)
    values ('55555555-0000-0000-0000-000000000902',f,'eeeeeeee-0000-0000-0000-000000000901',prod,w1,t,0.025,'ml/str','unsigned', t + interval '1 hour');
  select * into r from job_spray where id = '55555555-0000-0000-0000-000000000902';
  if r.received_at < now() - interval '1 minute' then raise exception '(2) received_at was taken from the writer: %', r.received_at; end if;
  if not ('late_entry' = any (r.flags)) then raise exception '(2) a 20-day-old spray was not marked late because the writer supplied received_at'; end if;
  insert into job_harvest(id,farm_id,planting_id,harvested_at,crates_str,received_at) values ('66666666-0000-0000-0000-000000000902',f,'dddddddd-0000-0000-0000-000000000902',now(), 1, '2020-01-01');
  if (select received_at from job_harvest where id = '66666666-0000-0000-0000-000000000902') < now() - interval '1 minute' then raise exception '(2) a harvest took received_at from the writer'; end if;
end $$;

-- (3) a restored server has another identity: the generation token changes BY ITSELF (no administrator step), so phones that held a cursor start again
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; cur jsonb; res jsonb; g_before text := sync_generation();
begin
  cur := pull(f, null, 5)->'cursor';
  if (pull(f, cur, 5)->>'reset')::boolean is not false then raise exception '(3) setup: a fresh cursor was reset'; end if;
  update sync_meta set system_id = 'another-server';       -- what a dump restored on another server looks like to this server
  if sync_generation() = g_before then raise exception '(3) the generation did not change although the server identity did'; end if;
  res := pull(f, cur, 5);
  if (res->>'reset')::boolean is not true then raise exception '(3) a cursor of the old server identity was not reset'; end if;
  update sync_meta set system_id = (select system_id from (select system_identifier::text as system_id from pg_control_system()) s);   -- back to this server
end $$;

-- (4) rows that became visible to a worker WITHOUT changing themselves: the manager gives her job another product, and links another planting to it
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000903',f,'spray','planned',w1,prod,'cccccccc-1111-0000-0000-000000000001',0.025,'ml/str','2026-11-19');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000903','dddddddd-0000-0000-0000-000000000903');
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
create temp table w_cur as select pull('11111111-1111-1111-1111-111111111111', null, 1000)->'cursor' as c;
reset role; set test.uid = '';
update jobs set product_id = 'aaaaaaaa-0000-0000-0000-000000000009' where id = 'eeeeeeee-0000-0000-0000-000000000903';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$
declare res jsonb; got boolean;
begin
  res := pull('11111111-1111-1111-1111-111111111111', (select c from w_cur), 1000);
  if (res->>'reset')::boolean is not true then raise exception '(4) the worker''s cursor was not reset although her job got another product (the new product row is old and would never arrive)'; end if;
  select exists (select 1 from jsonb_array_elements(res->'rows') e where e->>'table' = 'products' and e->'row'->>'id' = 'aaaaaaaa-0000-0000-0000-000000000009') into got;
  if not got then raise exception '(4) the new product of her job was not served'; end if;
end $$;

-- (5) the REAL `authenticated` role (only the rights migration 0015 gave it): the owner syncs, the worker completes, and nobody gets more
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; res jsonb;
begin
  res := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'parcels', 'row_id', '33333333-3333-3333-3333-333333333333', 'op', 'update',
    'row', (select to_jsonb(x) - 'sync_xid' - 'server_seq' - 'created_by' from parcels x where id = '33333333-3333-3333-3333-333333333333'))));
  if res->0->>'status' not in ('applied', 'duplicate') then raise exception '(5) the owner''s apply_ops as the real authenticated role failed: %', res; end if;
  begin truncate job_spray; raise exception '(5) authenticated could TRUNCATE'; exception when insufficient_privilege then null; end;
  begin perform bump_sync_generation(); raise exception '(5) authenticated could call bump_sync_generation'; exception when insufficient_privilege then null; end;
end $$;
-- (a separate statement: a pull in the transaction that wrote is refused on purpose, its own rows are «from the future» of its snapshot)
do $$ begin
  if jsonb_array_length(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') < 10 then raise exception '(5) the owner''s pull as authenticated returned too little'; end if;
end $$;
-- a worker's «Έγινε» as the real role, with the rights it really has
reset role; set test.uid = '';
insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000904','11111111-1111-1111-1111-111111111111','spray','planned','bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-1111-0000-0000-000000000001',0.025,'ml/str','2026-11-19');
insert into job_plantings(farm_id,job_id,planting_id) values ('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000904','dddddddd-0000-0000-0000-000000000904');
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare r jsonb; begin
  r := complete_spray_job('eeeeeeee-0000-0000-0000-000000000904', now() - interval '5 minutes');
  if r->>'spray_id' is null then raise exception '(5) the worker''s completion as authenticated gave no record: %', r; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm2-0015 tests passed'; end $$;

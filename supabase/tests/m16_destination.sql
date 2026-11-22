-- Migration 0036: where a harvest went («destination»): 'store' (to the shop/stock) or 'direct' (straight to a buyer); EMPTY = unknown (records made before 0036 and by older phones; nothing is guessed). Real `authenticated` owner and worker roles. Written BEFORE 0036.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'job_harvest' and column_name = 'destination') then raise exception '(0036) job_harvest.destination does not exist'; end if;
  if (select is_nullable from information_schema.columns where table_name = 'job_harvest' and column_name = 'destination') <> 'YES' then raise exception '(0036) destination must allow empty = unknown'; end if;
end $$;
do $$ begin
  insert into workers(id,farm_id,name) values ('bbbbbbbb-0000-0000-0000-0000000016a1','11111111-1111-1111-1111-111111111111','Cutter16');
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) select 'dddddddd-0000-0000-0000-0000000016a1','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',id,0.25,'2026-11-01','growing' from crops where farm_id = '11111111-1111-1111-1111-111111111111' limit 1;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pl constant uuid := 'dddddddd-0000-0000-0000-0000000016a1'; w constant uuid := 'bbbbbbbb-0000-0000-0000-0000000016a1';
begin
  insert into job_harvest(id,farm_id,planting_id,crates_str,harvested_at,cut_by,destination) values ('66666666-0000-0000-0000-0000000016a1',f,pl,3,now(),w,'store');
  insert into job_harvest(id,farm_id,planting_id,crates_str,harvested_at,cut_by,destination) values ('66666666-0000-0000-0000-0000000016a2',f,pl,4,now(),w,'direct');
  insert into job_harvest(id,farm_id,planting_id,crates_str,harvested_at,cut_by) values ('66666666-0000-0000-0000-0000000016a3',f,pl,5,now(),w);        -- an older phone: no destination = unknown, accepted and NOT turned into «store»
  if (select destination from job_harvest where id = '66666666-0000-0000-0000-0000000016a3') is not null then raise exception '(0036) an unknown destination was filled in'; end if;
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at,cut_by,destination) values (f,pl,3,now(),w,'market'); raise exception '(0036) an invented destination was accepted'; exception when check_violation then null; end;
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at,cut_by,destination) values (f,pl,3,now(),w,''); raise exception '(0036) an empty-string destination was accepted'; exception when check_violation then null; end;
  -- append-only: the destination of a logged harvest is never changed afterwards (a correction is a new record)
  begin update job_harvest set destination = 'direct' where id = '66666666-0000-0000-0000-0000000016a1'; raise exception '(0036) a harvest record was changed'; exception when insufficient_privilege or check_violation or raise_exception then if sqlerrm like '(0036)%' then raise; end if; end;
end $$;
-- a worker of the farm reads the destination of the harvests she is allowed to see; she can never change one
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin update job_harvest set destination = 'store' where id = '66666666-0000-0000-0000-0000000016a3'; raise exception '(0036) a worker changed a harvest record'; exception when insufficient_privilege or check_violation or raise_exception then if sqlerrm like '(0036)%' then raise; end if; end;
end $$;

-- the normal sync entry points (SHOULD 1 of the Codex review): an OLD payload (no destination), a NEW payload and an invented value go through apply_ops; pull returns the destination as stored
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pl constant uuid := 'dddddddd-0000-0000-0000-0000000016a1'; w constant uuid := 'bbbbbbbb-0000-0000-0000-0000000016a1'; r jsonb;
begin
  r := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_harvest', 'op', 'insert', 'row', jsonb_build_object('id', '66666666-0000-0000-0000-0000000016b1', 'farm_id', f, 'planting_id', pl, 'crates_str', '2', 'harvested_at', now(), 'cut_by', w)),
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_harvest', 'op', 'insert', 'row', jsonb_build_object('id', '66666666-0000-0000-0000-0000000016b2', 'farm_id', f, 'planting_id', pl, 'crates_str', '3', 'harvested_at', now(), 'cut_by', w, 'destination', 'direct'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(0036) an old or a new payload was not applied: %', r; end if;
  r := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_harvest', 'op', 'insert', 'row', jsonb_build_object('id', '66666666-0000-0000-0000-0000000016b3', 'farm_id', f, 'planting_id', pl, 'crates_str', '1', 'harvested_at', now(), 'cut_by', w, 'destination', 'market'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' = 'applied') then raise exception '(0036) an invented destination went through apply_ops: %', r; end if;
end $$;
do $$
declare got jsonb;
begin   -- a separate block: pull serves only finished transactions
  got := pull('11111111-1111-1111-1111-111111111111', null, 1000);
  if not exists (select 1 from jsonb_array_elements(got->'rows') e where e->>'table' = 'job_harvest' and e->'row'->>'id' = '66666666-0000-0000-0000-0000000016b2' and e->'row'->>'destination' = 'direct') then raise exception '(0036) pull lost the destination'; end if;
  if not exists (select 1 from jsonb_array_elements(got->'rows') e where e->>'table' = 'job_harvest' and e->'row'->>'id' = '66666666-0000-0000-0000-0000000016b1' and (e->'row'->>'destination') is null) then raise exception '(0036) pull invented a destination for an old record'; end if;
end $$;
-- a worker of the farm writes her OWN harvest with a destination and reads it back with it; she does not see the owner's rows; and a harvest naming ANOTHER farm is not applied for her
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pl constant uuid := 'dddddddd-0000-0000-0000-000000000705'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; r jsonb;
begin
  r := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_harvest', 'op', 'insert', 'row', jsonb_build_object('id', '66666666-0000-0000-0000-0000000016c1', 'farm_id', f, 'planting_id', pl, 'crates_str', '2', 'harvested_at', now(), 'cut_by', w, 'destination', 'store'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(0036) the worker''s own harvest with a destination was not applied: %', r; end if;
end $$;
do $$ begin
  if (select count(*) from job_harvest where id = '66666666-0000-0000-0000-0000000016c1' and destination = 'store') <> 1 then raise exception '(0036) a worker cannot read back her own harvest destination'; end if;
  if (select count(*) from job_harvest where id = '66666666-0000-0000-0000-0000000016b2') <> 0 then raise exception '(0036) a worker read a harvest she did not make'; end if;
  if exists (select 1 from jsonb_array_elements(apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', '22222222-2222-2222-2222-222222222222', 'table', 'job_harvest', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', '22222222-2222-2222-2222-222222222222', 'planting_id', 'dddddddd-0000-0000-0000-0000000016a1', 'crates_str', '1', 'harvested_at', now(), 'destination', 'store'))))) e where e->>'status' = 'applied') then raise exception '(0036) a worker wrote a harvest into another farm'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm16-destination tests passed'; end $$;

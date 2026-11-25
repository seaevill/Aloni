-- Migration 0040: the planting outline inside its parcel. Real `authenticated` owner and worker roles. Written BEFORE 0040.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'plantings' and column_name = 'boundary') then raise exception '(0040) plantings.boundary does not exist'; end if;
  if not exists (select 1 from information_schema.columns where table_name = 'plantings' and column_name = 'area_m2') then raise exception '(0040) plantings.area_m2 does not exist'; end if;
  update parcels set boundary = '{"type":"Polygon","coordinates":[[[23.35,38.0],[23.352,38.0],[23.352,38.002],[23.35,38.002],[23.35,38.0]]]}'::jsonb, edit_reason = 'test fixture' where id = '33333333-3333-3333-3333-333333333333';
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) select 'dddddddd-0000-0000-0000-0000000020a1','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',id,0.25,'2026-11-01','growing' from crops where farm_id = '11111111-1111-1111-1111-111111111111' limit 1;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare p constant uuid := 'dddddddd-0000-0000-0000-0000000020a1'; a numeric;
begin
  update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0015],[23.3505,38.0015],[23.3505,38.0005]]]}'::jsonb, edit_reason = 'outline drawn' where id = p;
  select area_m2 into a from plantings where id = p;
  if a is null or a <= 0 then raise exception '(0040) the server did not compute the area (%)', a; end if;
  if (select area_str from plantings where id = p) is distinct from 0.25 then raise exception '(0040) the typed area was changed'; end if;
  update plantings set area_m2 = 1, edit_reason = 'x' where id = p;                                   -- the phone cannot set the area itself
  if (select area_m2 from plantings where id = p) is distinct from a then raise exception '(0040) the phone set area_m2'; end if;
  begin update plantings set boundary = '{"type":"Polygon","coordinates":[[[24.0,38.0],[24.001,38.0],[24.001,38.001],[24.0,38.0]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) an outline OUTSIDE the parcel was accepted'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Point","coordinates":[1,2]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) a Point was accepted'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Polygon","coordinates":[[[0,0],[2,2],[2,0],[0,2],[0,0]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) a self-crossing ring was accepted'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Polygon","crs":{"type":"name","properties":{"name":"EPSG:2100"}},"coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0015],[23.3505,38.0005]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) a foreign member was accepted'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0015],[23.3505,38.0005]]]}'::jsonb where id = p; raise exception '(0040) a changed outline without a reason was accepted'; exception when check_violation then null; end;
  update plantings set boundary = null, edit_reason = 'outline removed' where id = p;                   -- null is allowed (no outline drawn)
  if (select area_m2 from plantings where id = p) is not null then raise exception '(0040) the area stayed after the outline was removed'; end if;
end $$;
-- a worker has no write right on plantings
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0015],[23.3505,38.0005]]]}'::jsonb, edit_reason = 'sneaky' where id = 'dddddddd-0000-0000-0000-0000000020a1';
  if found then raise exception '(0040) a worker changed a planting outline'; end if;
exception when insufficient_privilege then null;
end $$;

-- Codex MUST: shrinking the parcel under an existing outline is refused, in both orders; a planting outline must be inside the parcel as it is now
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare p constant uuid := 'dddddddd-0000-0000-0000-0000000020a1'; pa constant uuid := '33333333-3333-3333-3333-333333333333';
begin
  update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0015],[23.3505,38.0015],[23.3505,38.0005]]]}'::jsonb, edit_reason = 'outline again' where id = p;
  begin update parcels set boundary = '{"type":"Polygon","coordinates":[[[23.35,38.0],[23.351,38.0],[23.351,38.001],[23.35,38.001],[23.35,38.0]]]}'::jsonb, edit_reason = 'shrunk' where id = pa; raise exception '(0040) the parcel was shrunk under a planting outline'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005],[23.3515,38.0005],[23.3515,38.0025],[23.3505,38.0025],[23.3505,38.0005]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) an outline beyond the parcel was accepted'; exception when check_violation then null; end;
  begin update plantings set boundary = '{"type":"Polygon","coordinates":[[[23.3505,38.0005,10],[23.3515,38.0005,10],[23.3515,38.0015,10],[23.3505,38.0005,10]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0040) a 3D outline was accepted'; exception when check_violation then null; end;
  update parcels set boundary = '{"type":"Polygon","coordinates":[[[23.35,38.0],[23.353,38.0],[23.353,38.003],[23.35,38.003],[23.35,38.0]]]}'::jsonb, edit_reason = 'grown' where id = pa;      -- growing is fine
end $$;
-- Codex SHOULD: the normal owner sync path (apply_ops): an outline edit with a reason, and the server's square metres
do $$ declare r jsonb; a numeric; begin
  r := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', '11111111-1111-1111-1111-111111111111', 'table', 'plantings', 'op', 'update', 'row_id', 'dddddddd-0000-0000-0000-0000000020a1', 'row', jsonb_build_object('id', 'dddddddd-0000-0000-0000-0000000020a1', 'farm_id', '11111111-1111-1111-1111-111111111111', 'boundary', '{"type":"Polygon","coordinates":[[[23.3506,38.0006],[23.3514,38.0006],[23.3514,38.0014],[23.3506,38.0014],[23.3506,38.0006]]]}'::jsonb, 'edit_reason', 'via apply_ops'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(0040) an outline edit through apply_ops was not applied: %', r; end if;
  select area_m2 into a from plantings where id = 'dddddddd-0000-0000-0000-0000000020a1'; if a is null or a <= 0 then raise exception '(0040) apply_ops: no square metres'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm20-planting-boundary tests passed'; end $$;

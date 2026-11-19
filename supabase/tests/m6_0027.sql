-- Migration 0027: the parcel BOUNDARY drawn on the map (GeoJSON Polygon in `boundary`, next to the typed area). Written BEFORE 0027: the column does not exist. Runs AFTER m6_0026.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare p constant uuid := '33333333-3333-3333-3333-333333333333';
begin
  update parcels set boundary = '{"type":"Polygon","coordinates":[[[23.35,38.0],[23.351,38.0],[23.351,38.001],[23.35,38.0]]]}'::jsonb, edit_reason = 'boundary drawn' where id = p;
  begin update parcels set boundary = '{"type":"Point","coordinates":[1,2]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) a Point was accepted as a boundary'; exception when check_violation then null; end;
  begin update parcels set boundary = '[1,2]'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) an array was accepted as a boundary'; exception when check_violation then null; end;
  -- team review m5-0027 finding 7: broken shapes are refused by the SERVER
  begin update parcels set boundary = '{"type":"Polygon","coordinates":[[["x"]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) unreadable coordinates were accepted'; exception when check_violation then null; end;
  begin update parcels set boundary = '{"type":"Polygon","coordinates":[[[500,-300],[501,-300],[501,-299],[500,-300]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) coordinates out of range were accepted'; exception when check_violation then null; end;
  begin update parcels set boundary = '{"type":"Polygon","coordinates":[[[0,0],[2,2],[2,0],[0,2],[0,0]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) a self-intersecting ring was accepted'; exception when check_violation then null; end;
  begin update parcels set boundary = '{"type":"Polygon","crs":{"type":"name","properties":{"name":"EPSG:2100"}},"coordinates":[[[23.35,38.0],[23.351,38.0],[23.351,38.001],[23.35,38.0]]]}'::jsonb, edit_reason = 'x' where id = p; raise exception '(0027) a crs member was accepted'; exception when check_violation then null; end;
  -- the typed area is a separate column and is NOT touched by the boundary
  if (select area_str from parcels where id = p) is null then raise exception '(0027) the typed area vanished'; end if;
end $$;
do $$ begin raise notice 'm6-0027 tests passed'; end $$;

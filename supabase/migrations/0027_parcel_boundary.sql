-- 0027_parcel_boundary.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The parcel boundary drawn on the map. A NEW file; builds on 0001–0026.
--  `boundary` is a GeoJSON Polygon kept as jsonb (the phone sends it as it is; the older `geom` PostGIS column stays for a later, reviewed use). The typed area (area_str) is a separate column
--  and is never replaced by the area computed from the drawing.
-- The check at the very top stops with a clear message if 0026 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('check_tank_mix()') is null then raise exception '0027 stopped: 0026 is not applied (nothing was changed)'; end if;
end $$;

alter table parcels add column boundary jsonb;
alter table parcels add constraint parcels_boundary_polygon check (boundary is null or (jsonb_typeof(boundary) = 'object' and boundary ->> 'type' = 'Polygon' and jsonb_typeof(boundary -> 'coordinates') = 'array'));

-- team review m5-0027 finding 7: the shape is checked by the SERVER with PostGIS, not only by its «type»: a closed, valid (not self-intersecting) polygon in SRID 4326 with coordinates inside
-- longitude −180..180 / latitude −90..90, and nothing but `type` and `coordinates` (no `crs`, no foreign members). Anything else is refused.
create function check_parcel_boundary() returns trigger language plpgsql set search_path = public, extensions, private, pg_temp as $$
declare k text; g record;   -- a RECORD, not a `geometry` variable: PL/pgSQL resolves a declared type with the CALLER's search_path (apply_ops has no `extensions` on Supabase)
begin
  if new.boundary is null then return new; end if;
  if jsonb_typeof(new.boundary) <> 'object' then raise exception 'the boundary must be a GeoJSON object' using errcode = 'check_violation'; end if;
  for k in select jsonb_object_keys(new.boundary) loop
    if k not in ('type', 'coordinates') then raise exception 'the boundary may hold only «type» and «coordinates» (found «%»)', k using errcode = 'check_violation'; end if;
  end loop;
  begin
    execute 'select GeometryType(x) as kind, ST_XMin(x) as xmin, ST_XMax(x) as xmax, ST_YMin(x) as ymin, ST_YMax(x) as ymax, ST_IsValid(x) as ok from (select ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) as x) q' into g using new.boundary::text;
  exception when others then raise exception 'the boundary is not a readable GeoJSON polygon' using errcode = 'check_violation'; end;
  if g.kind <> 'POLYGON' then raise exception 'the boundary must be one polygon' using errcode = 'check_violation'; end if;
  if g.xmin < -180 or g.xmax > 180 or g.ymin < -90 or g.ymax > 90 then raise exception 'the boundary has coordinates outside longitude −180..180 / latitude −90..90' using errcode = 'check_violation'; end if;
  if not g.ok then raise exception 'the boundary is not a valid polygon (for example it crosses itself)' using errcode = 'check_violation'; end if;
  return new;
end $$;
create trigger parcels_boundary_check before insert or update of boundary on parcels for each row execute function check_parcel_boundary();
revoke execute on function check_parcel_boundary() from public, anon, authenticated;

-- 0040_planting_boundary.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The planting's own outline drawn inside its parcel. A NEW file (0001–0035 are applied and frozen); the same pattern as 0027 (parcel boundary).
--  plantings.boundary = a GeoJSON Polygon kept as jsonb (nothing but `type` and `coordinates`, one valid closed polygon in SRID 4326, coordinates in range) — and, when the parcel HAS a boundary, it must lie inside it (touching the edge is fine).
--  plantings.area_m2 = the area of that outline in square metres, computed by the SERVER (geography) and stored beside the typed area. It NEVER replaces the typed στρέμματα (area_str): a difference is shown, never corrected.
--  Who may write: the same as before (the owner; a worker has no write right on plantings). A change of an existing outline is a change of the planting: 0024's edit history asks for a reason, like any other field.
do $$ begin
  if to_regclass('public.plantings') is null or to_regclass('public.parcels') is null then raise exception '0040 stopped: plantings or parcels is missing (nothing was changed)'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'parcels' and column_name = 'boundary') then raise exception '0040 stopped: parcels.boundary (0027) is missing (nothing was changed)'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plantings' and column_name in ('boundary', 'area_m2')) then raise exception '0040 stopped: plantings.boundary or area_m2 already exists (nothing was changed)'; end if;
end $$;

alter table public.plantings add column boundary jsonb, add column area_m2 numeric;
alter table public.plantings add constraint plantings_boundary_polygon check (boundary is null or (jsonb_typeof(boundary) = 'object' and boundary ->> 'type' = 'Polygon' and jsonb_typeof(boundary -> 'coordinates') = 'array'));
alter table public.plantings add constraint plantings_area_m2_positive check (area_m2 is null or area_m2 > 0);

create function public.check_planting_boundary() returns trigger language plpgsql set search_path = public, extensions, private, pg_temp as $$
declare k text; g record; inside boolean; parcel_boundary jsonb;   -- RECORDs, not `geometry` variables: PL/pgSQL resolves a declared type with the CALLER's search_path (apply_ops has no `extensions` on Supabase)
begin
  new.area_m2 := null;                                          -- the server alone sets it; whatever the phone sent is ignored
  if new.boundary is null then return new; end if;
  if jsonb_typeof(new.boundary) <> 'object' then raise exception 'the planting outline must be a GeoJSON object' using errcode = 'check_violation'; end if;
  for k in select jsonb_object_keys(new.boundary) loop
    if k not in ('type', 'coordinates') then raise exception 'the planting outline may hold only «type» and «coordinates» (found «%»)', k using errcode = 'check_violation'; end if;
  end loop;
  begin
    execute 'select GeometryType(x) as kind, ST_XMin(x) as xmin, ST_XMax(x) as xmax, ST_YMin(x) as ymin, ST_YMax(x) as ymax, ST_IsValid(x) as ok, ST_IsEmpty(x) as empty, ST_Area(x::geography) as area from (select ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) as x) q' into g using new.boundary::text;
  exception when others then raise exception 'the planting outline is not a readable GeoJSON polygon' using errcode = 'check_violation'; end;
  if g.empty then raise exception 'the planting outline is empty' using errcode = 'check_violation'; end if;
  if g.kind <> 'POLYGON' then raise exception 'the planting outline must be one polygon' using errcode = 'check_violation'; end if;
  if g.xmin < -180 or g.xmax > 180 or g.ymin < -90 or g.ymax > 90 then raise exception 'the planting outline has coordinates out of range' using errcode = 'check_violation'; end if;
  if not g.ok then raise exception 'the planting outline is not a valid polygon (for example it crosses itself)' using errcode = 'check_violation'; end if;
  select p.boundary into parcel_boundary from parcels p where p.id = new.parcel_id and p.farm_id = new.farm_id;
  if parcel_boundary is not null then
    execute 'select ST_CoveredBy(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))' into inside using new.boundary::text, parcel_boundary::text;
    if inside is not true then raise exception 'the planting outline is not inside its parcel' using errcode = 'check_violation'; end if;
  end if;
  new.area_m2 := g.area;
  return new;
end $$;
create trigger plantings_boundary_check before insert or update on public.plantings for each row execute function public.check_planting_boundary();
revoke execute on function public.check_planting_boundary() from public, anon, authenticated;

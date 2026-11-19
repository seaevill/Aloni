-- 0027_parcel_boundary.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The parcel boundary drawn on the map. A NEW file; builds on 0001–0026.
--  `boundary` is a GeoJSON Polygon kept as jsonb (the phone sends it as it is; the older `geom` PostGIS column stays for a later, reviewed use). The typed area (area_str) is a separate column
--  and is never replaced by the area computed from the drawing.
-- The check at the very top stops with a clear message if 0026 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('check_tank_mix()') is null then raise exception '0027 stopped: 0026 is not applied (nothing was changed)'; end if;
end $$;

alter table parcels add column boundary jsonb;
alter table parcels add constraint parcels_boundary_polygon check (boundary is null or (jsonb_typeof(boundary) = 'object' and boundary ->> 'type' = 'Polygon' and jsonb_typeof(boundary -> 'coordinates') = 'array'));

-- 0005_weather_topo.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Team input round 2, 2026-11-17.
-- * weather rows: kind = analysis | forecast | sensor | station (a model's "past" values are not observations);
--   model_run and cell_elev_m added; the model NAME stays plain data in `model` (never code, Open-Meteo changes ids on 2026-11-30).
-- * parcels.topo_class (plain | slope | coast): optional, chosen by Bora, no default (needed by the M3 frost rule).
-- * profiles.lang may be 'sq' (Albanian, workers in M2).

alter table weather_daily  drop constraint if exists weather_daily_kind_check;
alter table weather_hourly drop constraint if exists weather_hourly_kind_check;
alter table weather_daily  add constraint weather_daily_kind_check  check (kind in ('analysis','forecast','sensor','station'));
alter table weather_hourly add constraint weather_hourly_kind_check check (kind in ('analysis','forecast','sensor','station'));

-- The model name is part of the row identity, so ICON-EU and IFS HRES for the same parcel/time/kind/issue can sit side by side
-- (the model-disagreement rule needs both). The tables are empty, so NOT NULL is safe; no default: an unknown model is a bug, not a value.
alter table weather_daily  alter column model set not null;
alter table weather_hourly alter column model set not null;
alter table weather_daily  drop constraint weather_daily_pkey,  add primary key (parcel_id, day, kind, model, issued_at);
alter table weather_hourly drop constraint weather_hourly_pkey, add primary key (parcel_id, at, kind, model, issued_at);

alter table weather_daily  add column model_run timestamptz, add column cell_elev_m numeric;
alter table weather_hourly add column model_run timestamptz, add column cell_elev_m numeric;

alter table parcels add column topo_class text check (topo_class in ('plain','slope','coast'));  -- NULL = not chosen yet

alter table profiles drop constraint if exists profiles_lang_check;
alter table profiles add constraint profiles_lang_check check (lang in ('el','tr','en','sq'));
alter table farms drop constraint if exists farms_lang_check;
alter table farms add constraint farms_lang_check check (lang in ('el','tr','en','sq'));

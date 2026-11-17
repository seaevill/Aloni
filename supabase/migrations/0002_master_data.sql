-- 0002_master_data.sql  (WRITTEN, NOT APPLIED)  Parcels, crops, plantings, products, label uses, soil/water tests.

create table parcels (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  name text not null,
  geom geometry(Polygon, 4326),
  area_str numeric(8,2) not null check (area_str >= 0),     -- στρέμματα (1 στρ = 0.1 ha); computed from geom, can be overridden
  elevation_m numeric(6,1),
  opekepe_code text,
  irrigation_type text,
  water_source_id uuid,
  weather_cell_id text,
  legacy_id text,                                            -- id in the v2 prototype (P1..P5)
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);
create index on parcels using gist (geom);
create index on parcels (farm_id, server_seq);

create table crops (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  slug text not null,                                        -- shared with Κλούβες
  name_el text not null, name_tr text, name_en text,
  latin text, family text,
  crate_kg_default numeric(6,2), base_temp_c numeric(4,1),
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  unique (farm_id, slug)
);

create table plantings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null references parcels(id),
  crop_id uuid not null references crops(id),
  variety text, lot_label text,
  area_str numeric(8,2) not null check (area_str >= 0),
  sown_on date, harvest_from date, harvest_to date,
  est_crates numeric(8,1), est_basis text,
  status text not null default 'planned' check (status in ('planned','growing','harvesting','done','abandoned')),
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);
create index on plantings (farm_id, parcel_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  trade_name text not null,
  reg_no text,
  active_ingredients text,
  type text not null,                                        -- fungicide, insecticide, herbicide, fertiliser...
  group_system text check (group_system in ('FRAC','IRAC','HRAC')),
  group_code text,
  unit text not null,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);

-- Label data. No row for (product, crop) = NOT REGISTERED. Every numeric label column is nullable:
-- NULL = unknown = blocked. The app never fills a default (CLAUDE.md safety rule 1).
create table label_uses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  product_id uuid not null references products(id),
  crop_id uuid not null references crops(id),
  target text,
  dose_min numeric, dose_max numeric,                        -- per στρ, never rounded
  water_l numeric,
  phi_days integer, rei_h integer, max_apps integer, min_interval_days integer,
  source text,
  signed_off_by text, signed_off_at timestamptz,             -- unsigned = shown with a badge, may not decide
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  unique (product_id, crop_id, target)
);

create table soil_tests (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null references parcels(id),
  sampled_on date not null, lab text,
  ph numeric, ec_ds_m numeric, om_pct numeric, n_ppm numeric, p_ppm numeric, k_ppm numeric, caco3_pct numeric,
  extra jsonb not null default '{}', report_photo text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);

create table water_tests (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid references parcels(id),
  sampled_on date not null, lab text,
  ph numeric, ec_ds_m numeric, no3_ppm numeric, cl_ppm numeric,
  extra jsonb not null default '{}', report_photo text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);

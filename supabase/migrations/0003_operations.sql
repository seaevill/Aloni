-- 0003_operations.sql  (WRITTEN, NOT APPLIED)  Stock, jobs, spray/harvest records, weather, rules, orders.

create table stock_lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  product_id uuid not null references products(id),
  batch text, expiry date,
  prescription_ref text, prescription_photo text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);

-- Append-only ledger. Balance = sum(qty). A negative balance raises an alert (never an overwrite).
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  lot_id uuid not null references stock_lots(id),
  qty numeric not null,                                      -- signed
  reason text not null check (reason in ('receive','spray','adjust','discard')),
  job_id uuid,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);
create view stock_balance with (security_invoker = true) as
  select farm_id, lot_id, sum(qty) as qty from stock_movements group by farm_id, lot_id;

create table jobs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null references parcels(id),
  kind text not null check (kind in ('spray','fertilise','irrigate','sow','harvest','other')),
  status text not null default 'planned' check (status in ('planned','done','skipped')),
  assigned_to uuid references auth.users(id),
  planned_for date, started_at timestamptz, ended_at timestamptz,
  done_by uuid references auth.users(id),
  recommendation_id uuid,
  skip_reason text, photos text[] not null default '{}',
  weather_snapshot jsonb,                                    -- server-filled
  notes text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);
create index on jobs (farm_id, planned_for);
create index on jobs (farm_id, assigned_to);

create table job_plantings (
  job_id uuid not null references jobs(id),
  planting_id uuid not null references plantings(id),
  farm_id uuid not null references farms(id) on delete cascade,
  area_str_treated numeric(8,2),
  server_seq bigint,
  primary key (job_id, planting_id)
);

-- LEGAL SPRAY RECORD: append-only, hash-chained per farm. No UPDATE, no DELETE; amend with a new row.
create table job_spray (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  job_id uuid not null references jobs(id),
  lot_id uuid references stock_lots(id),
  label_use_id uuid references label_uses(id),
  target text,
  dose_per_str numeric,                                      -- exactly as entered, never rounded
  water_l_per_str numeric, tank_l numeric, total_qty numeric,
  sprayer text, operator_name text,
  phi_until timestamptz,                                     -- NULL = unknown = blocked (never shortened)
  rei_until timestamptz,
  override_reason text,                                      -- required by the app when a warning is overridden
  amends_job_id uuid references job_spray(id),
  prev_hash text, hash text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);

create table job_fertilise (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  job_id uuid not null references jobs(id),
  product_id uuid references products(id),
  n_form text not null,                                      -- the N form is mandatory (urea vs nitrate behave differently)
  n_kg_per_str numeric,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);
create table job_irrigate (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  job_id uuid not null references jobs(id),
  minutes numeric, m3 numeric,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);
create table job_sow (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  job_id uuid not null references jobs(id),
  planting_id uuid references plantings(id),
  seed_lot text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);
-- Harvest counter rows: append-only.
create table job_harvest (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  job_id uuid not null references jobs(id),
  planting_id uuid not null references plantings(id),
  crates numeric not null, kg numeric, waste_pct numeric,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);

create table observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null references parcels(id),
  kind text not null check (kind in ('dew','frost_damage','disease','pest','other')),
  note text, photo text, observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint
);

create table weather_daily (
  parcel_id uuid not null references parcels(id),
  farm_id uuid not null references farms(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('observed','forecast')),
  issued_at timestamptz not null,
  tmin numeric, tmax numeric, rain_mm numeric, wind_kmh numeric, gust_kmh numeric, rh_pct numeric,
  leafwet_h_est numeric, et0 numeric, model text, elev_corr numeric,
  server_seq bigint,
  primary key (parcel_id, day, kind, issued_at)
);
create table weather_hourly (
  parcel_id uuid not null references parcels(id),
  farm_id uuid not null references farms(id) on delete cascade,
  at timestamptz not null,
  kind text not null check (kind in ('observed','forecast')),
  issued_at timestamptz not null,
  temp_c numeric, dewpoint_c numeric, rain_mm numeric, wind_kmh numeric, gust_kmh numeric, rh_pct numeric,
  leafwet_h_est numeric, et0 numeric, model text, elev_corr numeric,
  server_seq bigint,
  primary key (parcel_id, at, kind, issued_at)
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null, version integer not null,
  definition jsonb not null,
  status text not null default 'unsigned' check (status in ('unsigned','signed','retired')),
  signed_off_by text, signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  unique (rule_id, version)
);
create table rule_params (
  farm_id uuid not null references farms(id) on delete cascade,
  rule_id text not null, param text not null, value jsonb not null,
  updated_at timestamptz not null default now(), server_seq bigint,
  primary key (farm_id, rule_id, param)
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  kind text not null, severity text not null check (severity in ('info','medium','high')),
  parcel_id uuid references parcels(id), planting_id uuid references plantings(id),
  rule_id text not null, rule_version integer not null,
  dedupe_key text not null,
  window_from timestamptz, window_to timestamptz,
  title_key text not null, title_params jsonb not null default '{}',
  inputs jsonb not null, sources jsonb not null default '[]',
  confidence text not null, confidence_reason text, data_as_of timestamptz,
  status text not null default 'open' check (status in ('open','accepted','dismissed','superseded')),
  job_id uuid references jobs(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), server_seq bigint,
  unique (farm_id, dedupe_key)
);

create table orders_weekly (
  farm_id uuid not null references farms(id) on delete cascade,
  crop_id uuid not null references crops(id),
  iso_week text not null,                                    -- e.g. 2026-W47
  crates numeric not null,
  source text not null default 'manual', synced_at timestamptz,
  server_seq bigint,
  primary key (farm_id, crop_id, iso_week)
);

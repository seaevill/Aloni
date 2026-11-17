-- 0006_phone_model.sql  (WRITTEN, NOT APPLIED ANYWHERE)  M1 close, 2026-11-17.
-- Makes the server tables match the PHONE's data model (app/src/db/schema.ts and the record builders) one to one, so that `apply_ops` (PR 5)
-- can store exactly what the phone sends. Nothing is converted or rounded on the way: numbers stay `numeric` without a scale, an EC keeps the unit
-- the lab printed, «not on the label» is its own flag (never a made-up number), a dose of 0 is refused. The tables are still empty at this point of the
-- migration chain, so the NOT NULL additions are safe. Written together with the phone code of M1 PR 4–14.

-- ---- who wrote it, on which phone (every synced record; text because a restored old record has the actor «unknown») ----
do $$
declare t text;
begin
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements'] loop
    execute format('alter table %I add column device_id text, add column actor_id text', t);
  end loop;
end $$;

-- ---- photos: the row the phone queues (bytes travel separately, storage_path is filled when the upload is done) ----
create table media (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime text not null check (mime = 'image/jpeg'),
  width integer not null check (width > 0), height integer not null check (height > 0), bytes integer not null check (bytes > 0),
  storage_path text,
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), server_seq bigint,
  unique (farm_id, sha256)                                   -- the same photo is stored once per farm
);

-- ---- owner settings (data controller details): key / value per farm ----
create table farm_settings (
  farm_id uuid not null references farms(id) on delete cascade,
  key text not null, value jsonb not null,
  device_id text, actor_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), server_seq bigint,
  primary key (farm_id, key)
);

-- ---- parcels: typed area never rounded (0,625 stays 0.625), optional GPS pin ----
alter table parcels alter column area_str type numeric;
alter table parcels drop constraint if exists parcels_area_str_check;
alter table parcels add constraint parcels_area_str_check check (area_str > 0);
alter table parcels add column lat numeric, add column lng numeric, add column pin_accuracy_m numeric;
alter table parcels add constraint parcels_pin_check check ((lat is null) = (lng is null) and (lat is null or (lat between -90 and 90 and lng between -180 and 180)));

-- ---- plantings ----
alter table plantings alter column area_str type numeric;
alter table plantings drop constraint if exists plantings_area_str_check;
alter table plantings add constraint plantings_area_str_check check (area_str > 0);
alter table plantings alter column sown_on set not null;
alter table plantings alter column status drop default;     -- chosen by the farmer
alter table plantings drop constraint if exists plantings_status_check;
alter table plantings add constraint plantings_status_check check (status in ('planned','growing','harvesting','finished'));

-- ---- products: `name` as printed on the label; a type and a pack unit that were chosen ----
alter table products rename column trade_name to name;
alter table products add column label_photo_id uuid references media(id);
alter table products add constraint products_type_check check (type in ('fungicide','insecticide','herbicide','fertiliser','other'));
alter table products add constraint products_unit_check check (unit in ('L','kg'));

-- ---- label uses: dose kind + unit (both chosen), three states per value, the agronomist's signature ----
alter table label_uses rename column rei_h to rei_hours;
alter table label_uses drop column signed_off_by, drop column signed_off_at;
alter table label_uses
  add column dose_kind text check (dose_kind in ('single','range')),
  add column dose_unit text check (dose_unit in ('ml/str','g/str','l/str','kg/str','ml/100l','g/100l')),  -- provisional list (DECISIONS), never converted
  add column dose_min_not_on_label boolean not null default false, add column dose_max_not_on_label boolean not null default false,
  add column phi_days_not_on_label boolean not null default false, add column rei_hours_not_on_label boolean not null default false,
  add column max_apps_not_on_label boolean not null default false,
  add column sign_off_by text, add column sign_off_on date, add column sign_off_fingerprint text;
alter table label_uses
  add constraint label_uses_dose_positive check ((dose_min is null or dose_min > 0) and (dose_max is null or dose_max > 0)),     -- a dose of 0 is not a dose
  add constraint label_uses_dose_order check (dose_min is null or dose_max is null or dose_min <= dose_max),
  add constraint label_uses_single_one_box check (dose_kind is distinct from 'single' or (dose_max is null and not dose_max_not_on_label)),
  add constraint label_uses_value_xor_flag check (
    not (dose_min is not null and dose_min_not_on_label) and not (dose_max is not null and dose_max_not_on_label)
    and not (phi_days is not null and phi_days_not_on_label) and not (rei_hours is not null and rei_hours_not_on_label)
    and not (max_apps is not null and max_apps_not_on_label)),
  add constraint label_uses_whole_numbers check ((phi_days is null or phi_days >= 0) and (rei_hours is null or rei_hours >= 0) and (max_apps is null or max_apps >= 0)),
  add constraint label_uses_sign_off_whole check ((sign_off_by is null) = (sign_off_on is null) and (sign_off_by is null) = (sign_off_fingerprint is null)),
  -- only a COMPLETE label can carry a signature: kind, unit, dose, PHI, REI and max applications all entered
  add constraint label_uses_sign_off_complete check (sign_off_by is null or (
    dose_kind is not null and dose_unit is not null and dose_min is not null and (dose_kind = 'single' or dose_max is not null)
    and phi_days is not null and rei_hours is not null and max_apps is not null));

-- ---- soil and water analyses: pH, EC with the lab's own unit (no conversion), notes, report photo ----
alter table soil_tests  drop column ec_ds_m, drop column report_photo;
alter table water_tests drop column ec_ds_m, drop column report_photo;
alter table water_tests alter column parcel_id set not null;
do $$
declare t text;
begin
  foreach t in array array['soil_tests','water_tests'] loop
    execute format('alter table %I add column ec numeric, add column ec_unit text, add column notes text, add column photo_id uuid references media(id)', t);
    execute format('alter table %I add constraint %I check (ph is null or (ph >= 0 and ph <= 14))', t, t||'_ph_scale');
    execute format('alter table %I add constraint %I check (ec is null or ec >= 0)', t, t||'_ec_nonneg');
    execute format('alter table %I add constraint %I check (ec_unit is null or ec_unit in (''dS/m'',''mS/cm'',''uS/cm''))', t, t||'_ec_unit');
    execute format('alter table %I add constraint %I check ((ec is null) = (ec_unit is null))', t, t||'_ec_has_unit');
  end loop;
end $$;

-- ---- stock: a ledger of lots and movements, append-only; `lot_key` = id of the first row of a lot, a correction is a new row ----
alter table stock_lots drop column prescription_photo, drop column updated_at, drop column deleted_at;
alter table stock_lots add column lot_key uuid not null, add column amends_id uuid references stock_lots(id), add column photo_id uuid references media(id);
alter table stock_lots alter column expiry set not null;     -- an expiry date with its year is required
alter table stock_lots add constraint stock_lots_key check (amends_id is not null or lot_key = id);

drop view stock_balance;
alter table stock_movements rename column lot_id to lot_key;
alter table stock_movements drop column qty;
alter table stock_movements drop constraint if exists stock_movements_reason_check;                -- free text written by the farmer ('receipt' for a receipt)
alter table stock_movements
  add column product_id uuid not null references products(id),
  add column direction text not null check (direction in ('in','out')),
  add column qty_str numeric not null check (qty_str > 0),                                           -- as typed, always above zero
  add column amends_id uuid references stock_movements(id),
  add column qty numeric generated always as (case when direction = 'in' then qty_str else -qty_str end) stored;
create view stock_balance with (security_invoker = true) as
  select farm_id, lot_key as lot_id, sum(qty) as qty from stock_movements group by farm_id, lot_key;   -- a negative balance is shown, never clamped

-- ---- triggers and RLS for the new tables (same pattern as 0004) ----
create trigger media_seq before insert or update on media for each row execute function set_server_seq();
create trigger farm_settings_seq before insert or update on farm_settings for each row execute function set_server_seq();
create trigger media_audit after insert or update or delete on media for each row execute function write_audit();
create trigger farm_settings_audit after insert or update or delete on farm_settings for each row execute function write_audit();
create trigger media_append_only before update or delete on media for each row execute function forbid_change();
create trigger stock_lots_append_only before update or delete on stock_lots for each row execute function forbid_change();
alter table media enable row level security;
alter table farm_settings enable row level security;
create policy media_owner on media for all using (has_role(farm_id, array['owner'])) with check (has_role(farm_id, array['owner']));
create policy farm_settings_owner on farm_settings for all using (has_role(farm_id, array['owner'])) with check (has_role(farm_id, array['owner']));
-- Workers get NO policy on media or farm_settings in M1 (worker photos are decided in M2).

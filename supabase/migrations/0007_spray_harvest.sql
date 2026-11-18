-- 0007_spray_harvest.sql  (WRITTEN, NOT APPLIED ANYWHERE)  M2-a, 2026-11-17.
-- The phone's spray / harvest / worker-roster records, one to one (app/src/spray/*, app/src/workers/*, schema v7). Same rules as 0006: exact numbers,
-- nothing converted or rounded, unknown stays NULL (a waiting period is NULL when it is unknown, never a default), append-only ledgers.
-- Tables are still empty at this point of the chain, so NOT NULL additions are safe.

-- ---- the roster: a NAME only (no certificate, phone, photo or location: open question in M2.md §11). `user_id` stays empty until accounts exist (M2-c). ----
create table workers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  user_id uuid references auth.users(id),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint
);
create index on workers (farm_id);

-- ---- jobs: the phone's job has no parcel of its own (its plantings carry them) and names a roster worker ----
alter table jobs alter column parcel_id drop not null;
alter table jobs add column worker_id uuid references workers(id), add column product_id uuid references products(id), add column label_use_id uuid references label_uses(id),
  add column done_at timestamptz, add column device_id text, add column actor_id text;

-- ---- job_plantings: one row per planting of a job, with its own id ----
alter table job_plantings drop constraint job_plantings_pkey;
alter table job_plantings alter column area_str_treated type numeric;
alter table job_plantings add column id uuid primary key default gen_random_uuid(), add column created_at timestamptz not null default now(), add column device_id text, add column actor_id text;
alter table job_plantings add constraint job_plantings_once unique (job_id, planting_id);

-- ---- job_spray: what really happened. A weak label does NOT stop the record: it is marked in label_state / flags ----
alter table job_spray
  drop column lot_id, drop column target, drop column dose_per_str, drop column water_l_per_str, drop column tank_l, drop column total_qty,
  drop column sprayer, drop column operator_name, drop column override_reason, drop column amends_job_id;
alter table job_spray
  add column product_id uuid not null references products(id),
  add column applicator_id uuid not null references workers(id),                                  -- «Ψέκασε: …»
  add column sprayed_at timestamptz not null,
  add column dose_str numeric not null check (dose_str > 0),                                      -- as typed, a dose of 0 is not a dose
  add column dose_unit text not null check (dose_unit in ('ml/str','g/str','l/str','kg/str','ml/100l','g/100l')),
  add column label_state text not null check (label_state in ('signed','unsigned','changed','blocked','none')),
  add column lot_key uuid, add column qty_str numeric check (qty_str is null or qty_str > 0),     -- the quantity taken from the lot, typed, never converted
  add column water_l numeric check (water_l is null or water_l >= 0), add column note text,
  add column phi_days integer check (phi_days is null or phi_days >= 0), add column rei_hours integer check (rei_hours is null or rei_hours >= 0),
  add column phi_source text check (phi_source in ('label','manual')),                            -- label = from a SIGNED label use; manual = typed by Bora from the label (amending row)
  add column flags text[] not null default '{}',
  add column amends_id uuid references job_spray(id),
  add column device_id text, add column actor_id text;
alter table job_spray
  add constraint job_spray_wait_known check ((phi_days is null) = (phi_source is null) and (phi_days is null) = (phi_until is null) and (rei_hours is null) = (rei_until is null)),
  -- only a signed label or Bora's own entry may give a waiting period; an unsigned / changed / incomplete label leaves it NULL = unknown = harvest blocked
  add constraint job_spray_label_wait check (phi_source is distinct from 'label' or label_state = 'signed'),
  add constraint job_spray_amends_manual check (amends_id is null or coalesce(phi_source, '') = 'manual');

-- ---- job_harvest: the crate counter (no job of its own on the phone) ----
alter table job_harvest alter column job_id drop not null;
alter table job_harvest drop column crates;
alter table job_harvest add column crates_str integer not null check (crates_str > 0), add column harvested_at timestamptz not null, add column note text,
  add column device_id text, add column actor_id text;

-- The server refuses a harvest inside a waiting period, whatever the phone says. It looks at NOW (the server's clock), never at the typed harvest time, so a
-- time in the future cannot step over a PHI; a harvest time more than 5 minutes ahead of the server is refused (clock skew). A spray counts unless a later row
-- amends it; a waiting period that is unknown (NULL) blocks. There is no override.
create function check_harvest_phi() returns trigger language plpgsql as $$
begin
  if new.harvested_at > now() + interval '5 minutes' then
    raise exception 'harvest time is in the future' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
    where jp.planting_id = new.planting_id
      and not exists (select 1 from job_spray a where a.amends_id = s.id)
      and (s.phi_until is null or s.phi_until > now())
  ) then
    raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting period' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger job_harvest_phi before insert on job_harvest for each row execute function check_harvest_phi();

-- ---- triggers and RLS for the roster (same pattern as 0004; workers get no policy until accounts exist) ----
create trigger workers_seq before insert or update on workers for each row execute function set_server_seq();
create trigger workers_audit after insert or update or delete on workers for each row execute function write_audit();
alter table workers enable row level security;
create policy workers_owner on workers for all using (has_role(farm_id, array['owner'])) with check (has_role(farm_id, array['owner']));

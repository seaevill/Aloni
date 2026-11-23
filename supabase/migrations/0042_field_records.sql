-- 0042_field_records.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Three things the app keeps on the phone today and the owner asked to keep on the server too. A NEW file (0001–0035 are applied; 0036–0041 are written, not applied; nothing earlier is edited).
--  1. parcels.kaek: the 12-digit national cadastre number (ΚΑΕΚ) of the plot, typed by the owner: exactly 12 digits or nothing. NOTES. (a) Same caveat as 0040's `boundary`: apply_one writes WHOLE rows, so a phone that does not yet carry `kaek` in its parcel rows
--     would empty it on its next parcel write. Two cases (found by the independent review): a rename WITH a reason is applied and silently nulls the number (it stays recoverable from the parcel's `edits` history, `before: {kaek: …}`);
--     an old phone that only ARCHIVES a parcel (deleted_at) is REJECTED («a change of a parcels needs a reason»), because kaek going to null counts as a change. So the phone side (the field in the parcel builder and in
--     supabase/tests/phone-columns.json) ships BEFORE the number is relied on. (b) Every change of `kaek` goes through the parcel edit history (edit_reason is required, as for any parcel change).
--     (c) `parcels` is readable by the farm's workers, so a worker can READ the ΚΑΕΚ (a property identifier the owner already shares with the people working the plot); only the owner can write it. If it must be hidden
--     from workers it needs its own owner-only table instead of a column.
--  2. field_cuts(parcel, day, method shredder|hand|other): «Κοπή / καθαρισμός» records.
--  3. field_work(parcel, kind fertilise|irrigate, day, …): «Λίπανση / Άρδευση» records: what was DONE, typed by the owner (the form of the nitrogen as the package says — mandatory for a fertilising record, like
--     job_fertilise.n_form —, the kg of N per στρέμμα, the minutes / m³ of water, and a copy of that day's weather). Amounts are TEXT exactly as typed (a decimal comma is allowed), checked to be numbers above 0, like the other *_str columns.
--  Both tables: OWNER ONLY (a worker and a stranger get nothing from select and nothing from pull()); a record is NEVER edited — the owner may only tombstone it (deleted_at, once, never back); no hard delete.
--  Parcels are referenced by (id, farm_id), so a record can never point at another farm's parcel. Same pattern as the other synced tables (server_seq + sync_xid, audit trigger, created_by forced).
--  The three fixed table lists are re-issued with TWO names added; the file stops, changing nothing, unless each is exactly the definition 0041 leaves (body hash, security mode, volatility, search path).
do $$ begin
  if to_regclass('public.field_cuts') is not null or to_regclass('public.field_work') is not null then raise exception '0042 stopped: field_cuts or field_work already exists (nothing was changed)'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'parcels' and column_name = 'kaek') then raise exception '0042 stopped: parcels.kaek already exists (nothing was changed)'; end if;
  if not exists (select 1 from pg_constraint where conname = 'parcels_id_farm_unique') then raise exception '0042 stopped: the parcels (id, farm_id) key of 0029 is missing (nothing was changed)'; end if;
  if not exists (select 1 from pg_proc p where p.oid = 'public.pull(uuid,jsonb,integer)'::regprocedure and md5(p.prosrc) = '83c20243f1673d1d5c707926271b8d59' and not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=public, private'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.bump_sync_generation()'::regprocedure and md5(p.prosrc) = '196fbed3513d0f13c1f461dad1c01f9e' and p.prosecdef and p.provolatile = 'v' and p.proconfig = array['search_path=public, private, pg_temp'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.sync_table(text)'::regprocedure and md5(p.prosrc) = '7b156fb8d64b3d151f45d49de06a2b56' and not p.prosecdef and p.provolatile = 'i' and p.proconfig = array['search_path=public, private']) then
    raise exception '0042 stopped: pull / bump_sync_generation / sync_table are not exactly the definitions this file was written against (run 0041 first; nothing was changed)'; end if;
end $$;

alter table public.parcels add column kaek text check (kaek is null or kaek ~ '^[0-9]{12}$');

create table public.field_cuts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null,
  foreign key (parcel_id, farm_id) references parcels(id, farm_id),
  day date not null check (day between date '2000-01-01' and date '2100-01-01'),
  method text not null check (method in ('shredder', 'hand', 'other')),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);

create table public.field_work (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  parcel_id uuid not null,
  foreign key (parcel_id, farm_id) references parcels(id, farm_id),
  kind text not null check (kind in ('fertilise', 'irrigate')),
  day date not null check (day between date '2000-01-01' and date '2100-01-01'),
  n_form text check (n_form is null or (n_form ~ '\S' and length(n_form) <= 120)),
  n_kg_per_str text check (n_kg_per_str is null or (n_kg_per_str ~ '^[0-9]{1,6}([.,][0-9]{1,6})?$' and n_kg_per_str ~ '[1-9]')),
  minutes_str text check (minutes_str is null or (minutes_str ~ '^[0-9]{1,5}$' and minutes_str ~ '[1-9]')),
  m3_str text check (m3_str is null or (m3_str ~ '^[0-9]{1,6}([.,][0-9]{1,6})?$' and m3_str ~ '[1-9]')),
  weather jsonb check (weather is null or (jsonb_typeof(weather) = 'object' and length(weather::text) <= 500)),
  constraint field_work_shape check (
    (kind = 'fertilise' and n_form is not null and minutes_str is null and m3_str is null)
    or (kind = 'irrigate' and n_form is null and n_kg_per_str is null and (minutes_str is not null or m3_str is not null))),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);

-- a field record is never edited: the owner can only tombstone it, once
create function private.field_record_tombstone_only() returns trigger language plpgsql set search_path = public, private, pg_temp as $$
begin
  if auth.uid() is null then return new; end if;                          -- maintenance by the database owner only (bump_sync_generation, a restore)
  if (to_jsonb(new) - 'deleted_at' - 'updated_at' - 'server_seq' - 'sync_xid') is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at' - 'server_seq' - 'sync_xid') then
    raise exception 'a field record is never edited: only its removal (deleted_at) can change' using errcode = 'check_violation'; end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then raise exception 'a removed field record stays removed' using errcode = 'check_violation'; end if;
  return new;
end $$;
revoke execute on function private.field_record_tombstone_only() from public, anon, authenticated;

create index field_cuts_farm_idx on public.field_cuts (farm_id);
create index field_cuts_sync_idx on public.field_cuts (farm_id, sync_xid, server_seq);
create index field_cuts_parcel_idx on public.field_cuts (farm_id, parcel_id, day) where deleted_at is null;
create index field_work_farm_idx on public.field_work (farm_id);
create index field_work_sync_idx on public.field_work (farm_id, sync_xid, server_seq);
create index field_work_parcel_idx on public.field_work (farm_id, parcel_id, day) where deleted_at is null;
create trigger field_cuts_tombstone before update on public.field_cuts for each row execute function private.field_record_tombstone_only();
create trigger field_work_tombstone before update on public.field_work for each row execute function private.field_record_tombstone_only();
create trigger field_cuts_seq before insert or update on public.field_cuts for each row execute function set_server_seq();
create trigger field_work_seq before insert or update on public.field_work for each row execute function set_server_seq();
create trigger field_cuts_audit after insert or update or delete on public.field_cuts for each row execute function write_audit();
create trigger field_work_audit after insert or update or delete on public.field_work for each row execute function write_audit();
create trigger field_cuts_created_by before insert on public.field_cuts for each row execute function force_created_by();
create trigger field_work_created_by before insert on public.field_work for each row execute function force_created_by();
create trigger field_cuts_no_delete before delete on public.field_cuts for each row execute function forbid_hard_delete();
create trigger field_work_no_delete before delete on public.field_work for each row execute function forbid_hard_delete();
alter table public.field_cuts enable row level security;
alter table public.field_work enable row level security;
create policy field_cuts_select on public.field_cuts for select to authenticated using (private.has_role(farm_id, array['owner']));
create policy field_cuts_insert on public.field_cuts for insert to authenticated with check (private.has_role(farm_id, array['owner']));
create policy field_cuts_update on public.field_cuts for update to authenticated using (private.has_role(farm_id, array['owner'])) with check (private.has_role(farm_id, array['owner']));
create policy field_work_select on public.field_work for select to authenticated using (private.has_role(farm_id, array['owner']));
create policy field_work_insert on public.field_work for insert to authenticated with check (private.has_role(farm_id, array['owner']));
create policy field_work_update on public.field_work for update to authenticated using (private.has_role(farm_id, array['owner'])) with check (private.has_role(farm_id, array['owner']));
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.field_cuts from authenticated; grant select, insert, update on public.field_cuts to authenticated;
    revoke all on public.field_work from authenticated; grant select, insert, update on public.field_work to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on public.field_cuts from anon; revoke all on public.field_work from anon; end if;
end $$;

-- ---------------------------------------------------------------- the three fixed table lists, with `field_cuts` and `field_work` added
CREATE OR REPLACE FUNCTION public.sync_table(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'private'
AS $function$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','worker_cards','customers','customer_orders','day_notes','crop_targets','field_cuts','field_work']) then p end $function$;

CREATE OR REPLACE FUNCTION public.pull(p_farm uuid, p_cursor jsonb, p_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'private'
AS $function$
declare
  t text; q text := ''; fq text := ''; cx xid8 := '0'::xid8; cs bigint := 0; got jsonb; more boolean; last_ jsonb; gen constant text := sync_generation(); vis constant text := sync_visibility(p_farm);
  reset_ boolean := false; future boolean; has_cursor boolean := p_cursor is not null and p_cursor <> 'null'::jsonb and p_cursor <> '{}'::jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'pull needs a limit from 1 to 1000' using errcode = 'invalid_parameter_value'; end if;
  if has_cursor then
    if p_cursor->>'g' is distinct from gen or p_cursor->>'v' is distinct from vis then reset_ := true;      -- another generation (a restore) or other visible jobs: start again
    else cx := (p_cursor->>'x')::xid8; cs := (p_cursor->>'s')::bigint; end if;
  end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes','crop_targets','field_cuts','field_work'] loop
    q := q || case when q = '' then '' else ' union all ' end
      || format('select %L::text as tbl, sync_xid as xid, server_seq as seq, to_jsonb(x) - ''sync_xid'' as row from %I x where farm_id = $1 and sync_xid < pg_snapshot_xmin(pg_current_snapshot()) and (sync_xid, server_seq) > ($2, $3)', t, t);
    fq := fq || case when fq = '' then '' else ' union all ' end || format('select 1 from %I where farm_id = $1 and sync_xid >= pg_snapshot_xmax(pg_current_snapshot())', t);
  end loop;
  -- rows stamped by a transaction that has not happened yet on THIS server: the data came from another server (a restored dump). Serving around them would silently lose rows.
  execute format('select exists (%s)', fq) into future using p_farm;
  if future then raise exception 'the data is newer than this server''s transaction counter (a restored dump?): an administrator must run bump_sync_generation() once' using errcode = 'object_not_in_prerequisite_state'; end if;
  execute format('select coalesce(jsonb_agg(jsonb_build_object(''table'', tbl, ''x'', xid::text, ''seq'', seq, ''row'', row) order by xid, seq), ''[]''::jsonb) from (select * from (%s) u order by xid, seq limit $4) w', q)
    into got using p_farm, cx, cs, p_limit + 1;
  more := jsonb_array_length(got) > p_limit;
  if more then got := (select jsonb_agg(e order by ord) from jsonb_array_elements(got) with ordinality as a(e, ord) where ord <= p_limit); end if;
  last_ := got->(jsonb_array_length(got) - 1);
  return jsonb_build_object('rows', got, 'more', more, 'reset', reset_,
    'cursor', case when jsonb_array_length(got) = 0 then jsonb_build_object('x', cx::text, 's', cs, 'g', gen, 'v', vis)
                   else jsonb_build_object('x', last_->>'x', 's', (last_->>'seq')::bigint, 'g', gen, 'v', vis) end);
end $function$;

CREATE OR REPLACE FUNCTION public.bump_sync_generation()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare t text; new_gen uuid := gen_random_uuid();
begin
  if auth.uid() is not null then raise exception 'only an administrator (no end-user session) may run bump_sync_generation()' using errcode = 'insufficient_privilege'; end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes','crop_targets','field_cuts','field_work'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity(), bumped_at = now();
  return new_gen::text;
end $function$;


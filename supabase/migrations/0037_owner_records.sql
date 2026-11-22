-- 0037_owner_records.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Owner-only synced records: the worker card, customers, customer orders. A NEW file (0001–0034 are applied and frozen); needs nothing from 0035/0036.
--  worker_cards(worker_id, surname, phone): first name stays workers.name; NO date of birth (Bora's decision). customers(name, phone, note). customer_orders(customer, crop, whole crates, day, status).
--  All three are SYNCED tables that only the OWNER can read or write: no worker policy, so a worker gets nothing from select AND nothing from pull() (pull runs as the caller, row-level security filters it).
--  Same pattern as `workers` (0007/0012/0019): server_seq + sync_xid stamping, audit trigger, created_by forced, no hard delete (a removal is deleted_at), no DELETE right.
--  The three fixed table lists (sync_table, pull, bump_sync_generation) are re-issued with the three names added and NOTHING ELSE changed: the bodies below are the definitions the database holds today.
--  A guard stops the file, changing nothing, if one of them no longer looks the way it was read.
do $$ begin
  if to_regclass('public.workers') is null or to_regclass('public.crops') is null then raise exception '0037 stopped: workers or crops is missing (nothing was changed)'; end if;
  if to_regclass('public.worker_cards') is not null or to_regclass('public.customers') is not null or to_regclass('public.customer_orders') is not null then raise exception '0037 stopped: one of the new tables already exists (nothing was changed)'; end if;
  -- the three fixed lists are re-issued below: the file stops, changing nothing, unless each function is EXACTLY the one this file was written against (body text hash, security mode, volatility and search path), not just similar
  if not exists (select 1 from pg_proc p where p.oid = 'public.pull(uuid,jsonb,integer)'::regprocedure and md5(p.prosrc) = '753901e2c4393294ee4ada5f8ce2eff8' and not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=public, private'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.bump_sync_generation()'::regprocedure and md5(p.prosrc) = '8c5d4b38085e517e35d39b9a6f6552a2' and p.prosecdef and p.provolatile = 'v' and p.proconfig = array['search_path=public, private, pg_temp'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.sync_table(text)'::regprocedure and md5(p.prosrc) = '82b3f67405a702f74fc27dd15098e8c9' and not p.prosecdef and p.provolatile = 'i' and p.proconfig = array['search_path=public, private']) then
    raise exception '0037 stopped: pull / bump_sync_generation / sync_table are not exactly the definitions this file was written against (nothing was changed)'; end if;
  if exists (select 1 from pg_constraint where conname in ('workers_id_farm_key', 'crops_id_farm_key')) then raise exception '0037 stopped: a constraint this file adds already exists (nothing was changed)'; end if;
end $$;

-- ---------------------------------------------------------------- the tables
-- the parents get a (id, farm_id) key so a child can point at a parent OF ITS OWN FARM by the database's own rule: a parent can never be moved to another farm while a child points at it, and a child can never name another farm's parent
alter table public.workers add constraint workers_id_farm_key unique (id, farm_id);
alter table public.crops add constraint crops_id_farm_key unique (id, farm_id);
create table worker_cards (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  worker_id uuid not null,
  foreign key (worker_id, farm_id) references workers(id, farm_id),
  surname text check (surname is null or btrim(surname) <> ''),
  phone text check (phone is null or btrim(phone) <> ''),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);
create unique index worker_cards_one_live on worker_cards (worker_id) where deleted_at is null;

create table customers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  phone text check (phone is null or btrim(phone) <> ''),
  note text check (note is null or length(note) <= 2000),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id(),
  unique (id, farm_id)
);

create table customer_orders (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  customer_id uuid not null,
  crop_id uuid not null,
  foreign key (customer_id, farm_id) references customers(id, farm_id),
  foreign key (crop_id, farm_id) references crops(id, farm_id),
  crates_str text not null check (crates_str ~ '^[1-9][0-9]{0,5}$'),                 -- a whole number of crates above 0, kept exactly as written (like job_harvest.crates_str)
  for_day date not null,
  status text not null check (status in ('open', 'sent', 'cancelled')),              -- no default: the phone says which
  note text check (note is null or length(note) <= 2000),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);
create index customer_orders_day on customer_orders (farm_id, for_day) where deleted_at is null;

-- ---------------------------------------------------------------- triggers, row-level security (owner only), rights, indexes
do $$
declare t text;
begin
  foreach t in array array['worker_cards', 'customers', 'customer_orders'] loop
    execute format('create index %I on %I (farm_id)', t || '_farm_idx', t);
    execute format('create index %I on %I (farm_id, sync_xid, server_seq)', t || '_sync_idx', t);
    execute format('create trigger %I before insert or update on %I for each row execute function set_server_seq()', t || '_seq', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function write_audit()', t || '_audit', t);
    execute format('create trigger %I before insert on %I for each row execute function force_created_by()', t || '_created_by', t);
    execute format('create trigger %I before delete on %I for each row execute function forbid_hard_delete()', t || '_no_delete', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (private.has_role(farm_id, array[''owner'']))', t || '_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (private.has_role(farm_id, array[''owner'']))', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using (private.has_role(farm_id, array[''owner''])) with check (private.has_role(farm_id, array[''owner'']))', t || '_update', t);
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on %I from authenticated', t); execute format('grant select, insert, update on %I to authenticated', t); end if;
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on %I from anon', t); end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- the three fixed table lists, with the three names added (definitions as the database holds them today)
CREATE OR REPLACE FUNCTION public.sync_table(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'private'
AS $function$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','worker_cards','customers','customer_orders']) then p end $function$;

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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders'] loop
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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity(), bumped_at = now();
  return new_gen::text;
end $function$;


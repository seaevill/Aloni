-- 0041_crop_targets.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The season target per crop, on the server (Bora's own numbers: «πόσες κλούβες θέλω φέτος»). A NEW file (0001–0035 are applied and frozen).
--  ORDER: the newest row is the one with the highest server_seq (created_at is the phone's own clock and can be set freely): screens must order by server_seq.
--  crop_targets(crop, season_start, target_crates > 0): OWNER ONLY (read and write; a worker gets nothing from select and nothing from pull()). INSERT-ONLY: a change is a NEW row, the newest row of a crop and season wins, the older ones stay as history.
--  Until a row exists the screens say «δεν έχει οριστεί στόχος». The target is information for the owner: nothing is decided from it. The crop is referenced by (id, farm_id) so a target can never point at another farm's crop (needs the key of 0037).
--  The three fixed table lists are re-issued with ONE name added; the file stops, changing nothing, unless each is exactly the definition 0039 leaves.
do $$ begin
  if to_regclass('public.crop_targets') is not null then raise exception '0041 stopped: crop_targets already exists (nothing was changed)'; end if;
  if not exists (select 1 from pg_constraint where conname = 'crops_id_farm_key') then raise exception '0041 stopped: the crops (id, farm_id) key of 0037 is missing (nothing was changed)'; end if;
  if not exists (select 1 from pg_proc p where p.oid = 'public.pull(uuid,jsonb,integer)'::regprocedure and md5(p.prosrc) = '501487a60168efee2c44f5ea89ad01db' and not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=public, private'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.bump_sync_generation()'::regprocedure and md5(p.prosrc) = 'bfe854b641fef007467be5222c8c2a04' and p.prosecdef and p.provolatile = 'v' and p.proconfig = array['search_path=public, private, pg_temp'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.sync_table(text)'::regprocedure and md5(p.prosrc) = '5bbafc25b2882634b09d59f83f692f98' and not p.prosecdef and p.provolatile = 'i' and p.proconfig = array['search_path=public, private']) then
    raise exception '0041 stopped: pull / bump_sync_generation / sync_table are not exactly the definitions this file was written against (run 0039 first; nothing was changed)'; end if;
end $$;

create table public.crop_targets (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  crop_id uuid not null,
  foreign key (crop_id, farm_id) references crops(id, farm_id),
  season_start date not null,
  target_crates integer not null check (target_crates > 0 and target_crates <= 1000000),
  note text check (note is null or length(note) <= 500),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);
create index crop_targets_farm_idx on public.crop_targets (farm_id);
create index crop_targets_sync_idx on public.crop_targets (farm_id, sync_xid, server_seq);
create index crop_targets_crop on public.crop_targets (farm_id, crop_id, season_start, created_at);
create trigger crop_targets_seq before insert or update on public.crop_targets for each row execute function set_server_seq();
create trigger crop_targets_audit after insert or update or delete on public.crop_targets for each row execute function write_audit();
create trigger crop_targets_created_by before insert on public.crop_targets for each row execute function force_created_by();
create trigger crop_targets_no_delete before delete on public.crop_targets for each row execute function forbid_hard_delete();
alter table public.crop_targets enable row level security;
create policy crop_targets_select on public.crop_targets for select to authenticated using (private.has_role(farm_id, array['owner']));
create policy crop_targets_insert on public.crop_targets for insert to authenticated with check (private.has_role(farm_id, array['owner']));
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on public.crop_targets from authenticated; grant select, insert on public.crop_targets to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on public.crop_targets from anon; end if;
end $$;

-- ---------------------------------------------------------------- the three fixed table lists, with `crop_targets` added
CREATE OR REPLACE FUNCTION public.sync_table(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'private'
AS $function$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','worker_cards','customers','customer_orders','day_notes','crop_targets']) then p end $function$;

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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes','crop_targets'] loop
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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes','crop_targets'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity(), bumped_at = now();
  return new_gen::text;
end $function$;


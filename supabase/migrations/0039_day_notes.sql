-- 0039_day_notes.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Notes for the next days (the day a note is for is stored as the writer sent it: a past day is allowed, nothing is replaced by the server date) («＋ Σημείωση για αύριο»): the owner and the workers write them, the owner confirms or removes them, everybody of the farm reads them. A NEW file (0001–0035 are applied and frozen).
--  day_notes(for_day, text ≤280, from_worker, status open|confirmed|deleted). `from_worker` is set by the SERVER from the writer's role (a worker can never claim «not from a worker», the owner never shows as one); a worker's note always starts `open`.
--  Workers insert and read; only the owner changes a note (confirm, remove = status 'deleted'); no hard delete. Same pattern as the other synced tables (server_seq + sync_xid, audit trigger, created_by forced).
--  The three fixed table lists are re-issued with ONE name added; the file stops, changing nothing, unless each is exactly the definition 0037 leaves (body hash, security mode, volatility, search path).
do $$ begin
  if to_regclass('public.day_notes') is not null then raise exception '0039 stopped: day_notes already exists (nothing was changed)'; end if;
  if not exists (select 1 from pg_proc p where p.oid = 'public.pull(uuid,jsonb,integer)'::regprocedure and md5(p.prosrc) = '9900faa938f78e2884187f2307c7bf84' and not p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=public, private'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.bump_sync_generation()'::regprocedure and md5(p.prosrc) = '16d19f23af698c540328a7187dc86167' and p.prosecdef and p.provolatile = 'v' and p.proconfig = array['search_path=public, private, pg_temp'])
     or not exists (select 1 from pg_proc p where p.oid = 'public.sync_table(text)'::regprocedure and md5(p.prosrc) = '6118be2e1b0acfbd5d03e49a255b24bc' and not p.prosecdef and p.provolatile = 'i' and p.proconfig = array['search_path=public, private']) then
    raise exception '0039 stopped: pull / bump_sync_generation / sync_table are not exactly the definitions this file was written against (run 0037 first; nothing was changed)'; end if;
end $$;

create table public.day_notes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  for_day date not null,
  text text not null check (btrim(text) <> '' and length(text) <= 280),
  from_worker boolean not null default false,
  status text not null default 'open' check (status in ('open', 'confirmed', 'deleted')),
  device_id text, actor_id text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, server_seq bigint,
  sync_xid xid8 not null default pg_current_xact_id()
);
create index day_notes_day on public.day_notes (farm_id, for_day) where deleted_at is null;

-- the SERVER decides «from a worker»: whoever writes without the owner role is a worker, and a worker's note starts open
create function private.day_notes_stamp() returns trigger language plpgsql set search_path = public, private, pg_temp as $$
begin
  if auth.uid() is null then return new; end if;                          -- maintenance by the database owner only
  if tg_op = 'INSERT' then
    new.from_worker := not has_role(new.farm_id, array['owner']);
    if new.from_worker then new.status := 'open'; new.deleted_at := null; end if;          -- a worker's note starts open and not removed
  else
    new.from_worker := old.from_worker;                                    -- never changed afterwards
    if new.farm_id is distinct from old.farm_id then raise exception 'a day note never changes farm' using errcode = 'check_violation'; end if;   -- not even for an owner of both farms (a move would leave no tombstone in the first farm's pull)
  end if;
  return new;
end $$;
revoke execute on function private.day_notes_stamp() from public, anon, authenticated;

create index day_notes_farm_idx on public.day_notes (farm_id);
create index day_notes_sync_idx on public.day_notes (farm_id, sync_xid, server_seq);
create trigger day_notes_stamp before insert or update on public.day_notes for each row execute function private.day_notes_stamp();
create trigger day_notes_seq before insert or update on public.day_notes for each row execute function set_server_seq();
create trigger day_notes_audit after insert or update or delete on public.day_notes for each row execute function write_audit();
create trigger day_notes_created_by before insert on public.day_notes for each row execute function force_created_by();
create trigger day_notes_no_delete before delete on public.day_notes for each row execute function forbid_hard_delete();
alter table public.day_notes enable row level security;
create policy day_notes_select on public.day_notes for select to authenticated using (private.has_role(farm_id, array['owner', 'worker']));
create policy day_notes_insert on public.day_notes for insert to authenticated with check (private.has_role(farm_id, array['owner', 'worker']));
create policy day_notes_update on public.day_notes for update to authenticated using (private.has_role(farm_id, array['owner'])) with check (private.has_role(farm_id, array['owner']));
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on public.day_notes from authenticated; grant select, insert, update on public.day_notes to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on public.day_notes from anon; end if;
end $$;

-- ---------------------------------------------------------------- the three fixed table lists, with `day_notes` added
CREATE OR REPLACE FUNCTION public.sync_table(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'private'
AS $function$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','worker_cards','customers','customer_orders','day_notes']) then p end $function$;

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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes'] loop
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
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity(), bumped_at = now();
  return new_gen::text;
end $function$;


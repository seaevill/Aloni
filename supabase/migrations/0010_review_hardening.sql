-- 0010_review_hardening.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Pre-Supabase review, 2026-11-18. A NEW file: 0001-0009 are not touched.
-- Findings it closes (see docs/reviews/2026-11-18-migrations.md):
--   C1  pgcrypto lives in the `extensions` schema on Supabase, so chain_hash() (search_path = public) could not find digest(): no spray could be recorded.
--       (Fixed by not needing pgcrypto at all: PostgreSQL's own sha256().)
--   H1  identity: created_by / done_by / assigned_to come from the verified session (auth.uid()) and the roster, never from what the phone sends.
--   H2  apply_ops: the same op_id with DIFFERENT content is rejected; server-owned columns cannot be sent; ops of one phone transaction (group) are atomic.
--   H3  pull: the cursor is (transaction id, server_seq) and only rows of finished transactions are served, so a late-committing transaction is never skipped.
--   M   hard deletes of synced rows are refused (a delete would never reach the other phones), photos can get their storage_path once, a row can only point
--       at rows of its OWN farm, and the RPCs are executable by signed-in users only.

-- ---------------------------------------------------------------- C1: pgcrypto's schema on Supabase
-- The fix uses PostgreSQL's own sha256() (same hash as pgcrypto's digest(.., 'sha256')), so the chain no longer depends on where an extension is installed.
create or replace function chain_hash() returns trigger language plpgsql security definer set search_path = public as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || new.farm_id::text, 0));
  execute format('select hash from %I where farm_id = $1 order by server_seq desc nulls last, created_at desc limit 1', tg_table_name)
    into prev using new.farm_id;
  new.prev_hash := prev;
  new.hash := encode(sha256(convert_to(coalesce(prev, '') || (to_jsonb(new) - 'hash' - 'prev_hash')::text, 'UTF8')), 'hex');
  return new;
end $$;

-- ---------------------------------------------------------------- H3: a pull cursor that cannot skip a late commit
-- server_seq is handed out when a row is written, not when its transaction commits, so «everything above the last seq I saw» can skip a transaction that
-- committed late. sync_xid is the writing transaction; pull() serves only transactions older than every transaction still running, in (xid, seq) order.
do $$
declare t text;
begin
  foreach t in array array['parcels','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    execute format('alter table %I add column sync_xid xid8 not null default pg_current_xact_id()', t);
    execute format('create index %I on %I (farm_id, sync_xid, server_seq)', t || '_sync_idx', t);
  end loop;
end $$;
create or replace function set_server_seq() returns trigger language plpgsql as $$
begin
  new.server_seq := nextval('server_seq_seq');
  if to_jsonb(new) ? 'sync_xid' then new.sync_xid := pg_current_xact_id(); end if;
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'updated_at' then new.updated_at := now(); end if;
  return new;
end $$;

-- ---------------------------------------------------------------- H1: who did it comes from the session
create function force_created_by() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.created_by := auth.uid(); end if;   -- an admin session (no end user) may set it explicitly
  return new;
end $$;
do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
           where c.table_schema = 'public' and c.column_name = 'created_by' loop
    execute format('create trigger %I before insert on %I for each row execute function force_created_by()', t || '_created_by', t);
  end loop;
end $$;

-- a job's account comes from the roster (workers.user_id), and «done by» from the session: a worker cannot claim to be someone else or reassign a job
create function jobs_identity() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.assigned_to := (select w.user_id from workers w where w.id = new.worker_id and w.farm_id = new.farm_id and w.deleted_at is null);
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') and auth.uid() is not null then new.done_by := auth.uid(); end if;
  return new;
end $$;
create trigger jobs_identity before insert or update on jobs for each row execute function jobs_identity();

-- ---------------------------------------------------------------- M: a row points only at rows of its own farm
create function check_same_farm() returns trigger language plpgsql security definer set search_path = public as $$
declare a text; col text; ref text; ok boolean; val uuid;
begin
  foreach a in array tg_argv loop
    col := split_part(a, ':', 1); ref := split_part(a, ':', 2);
    val := nullif(to_jsonb(new) ->> col, '')::uuid;
    if val is null then continue; end if;
    execute format('select exists (select 1 from %I r where r.id = $1 and r.farm_id = $2)', ref) into ok using val, new.farm_id;
    if not ok then raise exception '% points at a row of another farm (or none): %', col, val using errcode = 'foreign_key_violation'; end if;
  end loop;
  return new;
end $$;
create trigger plantings_same_farm before insert or update on plantings for each row execute function check_same_farm('parcel_id:parcels', 'crop_id:crops');
create trigger label_uses_same_farm before insert or update on label_uses for each row execute function check_same_farm('product_id:products', 'crop_id:crops');
create trigger stock_lots_same_farm before insert or update on stock_lots for each row execute function check_same_farm('product_id:products', 'photo_id:media', 'amends_id:stock_lots');
create trigger stock_movements_same_farm before insert or update on stock_movements for each row execute function check_same_farm('product_id:products', 'amends_id:stock_movements');
create trigger products_same_farm before insert or update on products for each row execute function check_same_farm('label_photo_id:media');
create trigger soil_tests_same_farm before insert or update on soil_tests for each row execute function check_same_farm('parcel_id:parcels', 'photo_id:media');
create trigger water_tests_same_farm before insert or update on water_tests for each row execute function check_same_farm('parcel_id:parcels', 'photo_id:media');
create trigger jobs_same_farm before insert or update on jobs for each row execute function check_same_farm('parcel_id:parcels', 'product_id:products', 'label_use_id:label_uses', 'worker_id:workers');
create trigger job_plantings_same_farm before insert or update on job_plantings for each row execute function check_same_farm('job_id:jobs', 'planting_id:plantings');
create trigger job_spray_same_farm before insert or update on job_spray for each row execute function check_same_farm('job_id:jobs', 'product_id:products', 'label_use_id:label_uses', 'applicator_id:workers', 'amends_id:job_spray');
create trigger job_harvest_same_farm before insert or update on job_harvest for each row execute function check_same_farm('planting_id:plantings');
create trigger observations_same_farm before insert or update on observations for each row execute function check_same_farm('parcel_id:parcels');

-- ---------------------------------------------------------------- M: no hard delete of synced rows (archive with deleted_at instead)
create function forbid_hard_delete() returns trigger language plpgsql as $$
begin
  if current_setting('aloni.allow_delete', true) = 'on' then return old; end if;   -- a deliberate administrator step: set_config('aloni.allow_delete','on',true)
  raise exception 'a % row is archived (deleted_at), never deleted: the other phones would never hear of a delete', tg_table_name using errcode = '42501';
end $$;
do $$
declare t text;
begin
  foreach t in array array['parcels','plantings','products','label_uses','soil_tests','water_tests','workers','jobs','job_plantings','farm_settings'] loop
    execute format('create trigger %I before delete on %I for each row execute function forbid_hard_delete()', t || '_no_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- M: photos: storage_path is filled ONCE after the upload; nothing else about a photo changes
drop trigger media_append_only on media;
create function media_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.storage_path is null and new.storage_path is not null
     and (to_jsonb(new) - 'storage_path' - 'server_seq' - 'sync_xid') = (to_jsonb(old) - 'storage_path' - 'server_seq' - 'sync_xid') then return new; end if;
  raise exception 'media is append-only (only storage_path may be filled, once)' using errcode = '42501';
end $$;
create trigger media_guard before update or delete on media for each row execute function media_guard();

-- ---------------------------------------------------------------- H2: apply_ops
alter table applied_ops add column payload_hash text, add column applied_by uuid default auth.uid();
drop policy applied_ops_member on applied_ops;
create policy applied_ops_read   on applied_ops for select using (has_role(farm_id, array['owner','worker']));
create policy applied_ops_insert on applied_ops for insert with check (has_role(farm_id, array['owner','worker']) and applied_by = auth.uid());   -- never update, never delete

drop function apply_ops(jsonb);
drop function pull(uuid, bigint, integer);

-- one op. Raises when it cannot be applied; returns 'applied' or 'duplicate'.
create function apply_one(o jsonb) returns text language plpgsql set search_path = public as $$
declare
  tbl text := sync_table(o->>'table'); r jsonb := o->'row'; farm uuid := (o->'row'->>'farm_id')::uuid; opid uuid := (o->>'op_id')::uuid;
  bad text; cols text; sets text; n int; h text := encode(sha256(convert_to(o::text, 'UTF8')), 'hex'); prior record;
begin
  if tbl is null then raise exception 'table not synced: %', o->>'table' using errcode = 'insufficient_privilege'; end if;
  if jsonb_typeof(r) is distinct from 'object' then raise exception 'row must be an object' using errcode = 'check_violation'; end if;
  if farm is null or (o->>'farm_id')::uuid is distinct from farm then raise exception 'row and op name different farms' using errcode = 'check_violation'; end if;
  if o->>'op' not in ('insert', 'update') then raise exception 'unknown op %', o->>'op' using errcode = 'check_violation'; end if;
  select k into bad from jsonb_object_keys(r) k where k in ('server_seq', 'sync_xid', 'hash', 'prev_hash', 'created_by', 'received_at', 'assigned_to', 'done_by') limit 1;
  if bad is not null then raise exception 'column % is set by the server, not sent by the phone', bad using errcode = 'insufficient_privilege'; end if;
  select k into bad from jsonb_object_keys(r) k where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = tbl and c.column_name = k) limit 1;
  if bad is not null then raise exception 'unknown column % on %', bad, tbl using errcode = 'undefined_column'; end if;
  select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(r) k;

  -- the same op twice has ONE effect; the same op_id with different content is an error (never silently "duplicate")
  insert into applied_ops(op_id, farm_id, table_name, payload_hash) values (opid, farm, tbl, h) on conflict (op_id) do nothing;
  if not found then
    select a.farm_id, a.payload_hash into prior from applied_ops a where a.op_id = opid;
    if prior.payload_hash is not distinct from h and prior.farm_id = farm then return 'duplicate'; end if;
    raise exception 'op_id % was used before with different content (or by another farm)', opid using errcode = 'unique_violation';
  end if;

  if o->>'op' = 'insert' then
    if tbl = 'farm_settings' then
      select string_agg(format('%1$I = excluded.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('farm_id', 'key');
      execute format('insert into farm_settings (%1$s) select %1$s from jsonb_populate_record(null::farm_settings, $1) on conflict (farm_id, key) do update set %2$s', cols, sets) using r;
    else
      execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_record(null::%1$I, $1) on conflict (id) do nothing', tbl, cols) using r;
    end if;
  elsif tbl = 'farm_settings' then
    select string_agg(format('%1$I = x.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('farm_id', 'key');
    execute format('update farm_settings t set %s from jsonb_populate_record(null::farm_settings, $1) x where t.farm_id = $2 and t.key = x.key', sets) using r, farm;
    get diagnostics n = row_count;
    if n = 0 then raise exception 'nothing to update (no such setting in this farm)' using errcode = 'no_data_found'; end if;
  else
    select string_agg(format('%1$I = x.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('id', 'farm_id');
    execute format('update %1$I t set %2$s from jsonb_populate_record(null::%1$I, $1) x where t.id = x.id and t.farm_id = $2', tbl, sets) using r, farm;
    get diagnostics n = row_count;
    if n = 0 then raise exception 'nothing to update (no such row in this farm)' using errcode = 'no_data_found'; end if;
  end if;
  return 'applied';
end $$;

-- Ops that belong to ONE phone transaction carry the same `group_id` and a `group_size`: they are applied together or not at all (a spray, its stock movement,
-- its job and its plantings). An op without a group is a group of one. Every op gets its own answer; a rejected one is NOT recorded as applied.
create function apply_ops(p_ops jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  units jsonb := '{}'::jsonb; order_ text[] := '{}'; u text; o jsonb; ops jsonb; res jsonb := '{}'::jsonb; st text; failed text; why text; code text; answered jsonb := '[]'::jsonb; size_ int;
begin
  if jsonb_typeof(p_ops) is distinct from 'array' or jsonb_array_length(p_ops) > 500 then raise exception 'apply_ops takes an array of at most 500 ops' using errcode = 'invalid_parameter_value'; end if;
  for o in select * from jsonb_array_elements(p_ops) loop
    u := coalesce(nullif(o->>'group_id', ''), 'op:' || coalesce(o->>'op_id', gen_random_uuid()::text));
    if not units ? u then units := units || jsonb_build_object(u, '[]'::jsonb); order_ := order_ || u; end if;
    units := jsonb_set(units, array[u], (units->u) || jsonb_build_array(o));
  end loop;
  foreach u in array order_ loop
    ops := units->u;
    size_ := nullif(ops->0->>'group_size', '')::int;
    begin
      if size_ is not null and size_ <> jsonb_array_length(ops) then raise exception 'incomplete group: % of % ops sent', jsonb_array_length(ops), size_ using errcode = 'check_violation'; end if;
      failed := null;
      for o in select * from jsonb_array_elements(ops) loop
        begin
          failed := o->>'op_id';
          st := apply_one(o);
          res := res || jsonb_build_object(o->>'op_id', jsonb_build_object('op_id', o->>'op_id', 'status', st));
        exception when others then
          get stacked diagnostics why = message_text; code := sqlstate;
          raise exception '%', why using errcode = code, detail = failed;   -- abandon the whole unit; the handler below answers for every op of it
        end;
      end loop;
    exception when others then
      get stacked diagnostics why = message_text, failed = pg_exception_detail;
      code := sqlstate;
      for o in select * from jsonb_array_elements(ops) loop
        res := res || jsonb_build_object(o->>'op_id', jsonb_build_object('op_id', o->>'op_id', 'status', 'rejected',
          'reason', case when jsonb_array_length(ops) > 1 and o->>'op_id' is distinct from failed then 'group rolled back: ' || why else why end, 'code', code));
      end loop;
    end;
  end loop;
  -- answers in the order the ops were sent
  for o in select * from jsonb_array_elements(p_ops) loop answered := answered || jsonb_build_array(res->(o->>'op_id')); end loop;
  return answered;
end $$;

-- ---------------------------------------------------------------- H3: pull
create function pull(p_farm uuid, p_cursor jsonb, p_limit integer) returns jsonb language plpgsql stable set search_path = public as $$
declare t text; q text := ''; cx xid8 := '0'::xid8; cs bigint := 0; got jsonb; more boolean; last_ jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'pull needs a limit from 1 to 1000' using errcode = 'invalid_parameter_value'; end if;
  if p_cursor is not null and p_cursor <> 'null'::jsonb and p_cursor <> '{}'::jsonb then
    cx := (p_cursor->>'x')::xid8; cs := (p_cursor->>'s')::bigint;
  end if;
  foreach t in array array['parcels','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    q := q || case when q = '' then '' else ' union all ' end
      || format('select %L::text as tbl, sync_xid as xid, server_seq as seq, to_jsonb(x) - ''sync_xid'' as row from %I x where farm_id = $1 and sync_xid < pg_snapshot_xmin(pg_current_snapshot()) and (sync_xid, server_seq) > ($2, $3)', t, t);
  end loop;
  execute format('select coalesce(jsonb_agg(jsonb_build_object(''table'', tbl, ''x'', xid::text, ''seq'', seq, ''row'', row) order by xid, seq), ''[]''::jsonb) from (select * from (%s) u order by xid, seq limit $4) w', q)
    into got using p_farm, cx, cs, p_limit + 1;
  more := jsonb_array_length(got) > p_limit;
  if more then got := (select jsonb_agg(e order by ord) from jsonb_array_elements(got) with ordinality as a(e, ord) where ord <= p_limit); end if;
  last_ := got->(jsonb_array_length(got) - 1);
  return jsonb_build_object('rows', got, 'more', more,
    'cursor', case when jsonb_array_length(got) = 0 then jsonb_build_object('x', cx::text, 's', cs) else jsonb_build_object('x', last_->>'x', 's', (last_->>'seq')::bigint) end);
end $$;

-- ---------------------------------------------------------------- M: who may call the RPCs (Supabase gives EXECUTE to everyone by default)
revoke execute on function apply_ops(jsonb), apply_one(jsonb), pull(uuid, jsonb, integer) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function apply_ops(jsonb), apply_one(jsonb), pull(uuid, jsonb, integer) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function apply_ops(jsonb), apply_one(jsonb), pull(uuid, jsonb, integer) to authenticated; end if;
end $$;

-- ---------------------------------------------------------------- the worker guard of 0008 learns the new server-owned column (sync_xid changes on every update)
create or replace function jobs_worker_guard() returns trigger language plpgsql as $$
declare allowed constant text[] := array['status','skip_reason','done_at','started_at','ended_at','done_by','photos','notes','weather_snapshot','updated_at','server_seq','sync_xid','device_id','actor_id'];
begin
  if has_role(old.farm_id, array['worker']) and not has_role(old.farm_id, array['owner']) then
    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'a worker cannot change the product, dose or assignment of a job' using errcode = 'insufficient_privilege';
    end if;
    if new.status is distinct from old.status and not (old.status = 'planned' and new.status in ('done','skipped')) then
      raise exception 'a worker can only close an open job' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

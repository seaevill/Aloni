-- 0012_phone_contract.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Pre-Supabase review part B, 2026-11-18. A NEW file; builds on 0010 / 0011.
-- The phone ↔ server contract, proven by running the phone's REAL records through apply_ops (supabase/tests/phone-ops.json, made by
-- app/tests/unit/phone-contract.test.ts). It found four things the server did not understand:
--   * the phone syncs `crops` (a planting needs its crop) but the server did not accept the table;
--   * a label use's «not on the label» is the text 'not_on_label' in phi_days / rei_hours / max_apps / dose_*, the server has a flag column for it (an integer column
--     cannot hold the text: the whole label would be rejected);
--   * a label use's signature is ONE object `sign_off` {by, on, fingerprint} on the phone, three columns on the server;
--   * an owner setting carries no farm_id in its row (the op envelope has it), and its first write is an «update».
-- And one thing that would have kept a stale value: the phone sends the WHOLE row on an update, so a column the phone leaves out is EMPTY on the phone;
-- the server now empties it too (a label edited after its signature must not keep the old signature on the server).

alter table crops add column sync_xid xid8 not null default pg_current_xact_id();
create index crops_sync_idx on crops (farm_id, sync_xid, server_seq);
create trigger crops_no_delete before delete on crops for each row execute function forbid_hard_delete();

create or replace function sync_table(p text) returns text language sql immutable as $$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations']) then p end $$;

-- the phone's label-use row → the server's columns
create function normalize_label_row(r jsonb) returns jsonb language plpgsql immutable as $$
declare k text;
begin
  foreach k in array array['dose_min', 'dose_max', 'phi_days', 'rei_hours', 'max_apps'] loop
    if r->>k = 'not_on_label' then r := (r - k) || jsonb_build_object(k || '_not_on_label', true); end if;
  end loop;
  if jsonb_typeof(r->'sign_off') = 'object' then
    r := (r - 'sign_off') || jsonb_build_object('sign_off_by', r->'sign_off'->>'by', 'sign_off_on', r->'sign_off'->>'on', 'sign_off_fingerprint', r->'sign_off'->>'fingerprint');
  else
    r := (r - 'sign_off') || jsonb_build_object('sign_off_by', null, 'sign_off_on', null, 'sign_off_fingerprint', null);   -- no signature on the phone = none on the server
  end if;
  return r;
end $$;

create or replace function apply_one(o jsonb) returns text language plpgsql set search_path = public as $$
declare
  tbl text := sync_table(o->>'table'); r jsonb := o->'row'; farm uuid; opid uuid := (o->>'op_id')::uuid;
  bad text; cols text; sets text; n int; h text := encode(sha256(convert_to(o::text, 'UTF8')), 'hex'); prior record; server_owned constant text[] := array['server_seq', 'sync_xid', 'hash', 'prev_hash', 'chain_no', 'created_by', 'received_at', 'assigned_to', 'done_by'];
begin
  if tbl is null then raise exception 'table not synced: %', o->>'table' using errcode = 'insufficient_privilege'; end if;
  if jsonb_typeof(r) is distinct from 'object' then raise exception 'row must be an object' using errcode = 'check_violation'; end if;
  if not r ? 'farm_id' then r := r || jsonb_build_object('farm_id', o->>'farm_id'); end if;     -- an owner setting has no farm_id of its own
  farm := (r->>'farm_id')::uuid;
  if farm is null or (o->>'farm_id')::uuid is distinct from farm then raise exception 'row and op name different farms' using errcode = 'check_violation'; end if;
  if o->>'op' not in ('insert', 'update') then raise exception 'unknown op %', o->>'op' using errcode = 'check_violation'; end if;
  select k into bad from jsonb_object_keys(r) k where k = any (server_owned) limit 1;
  if bad is not null then raise exception 'column % is set by the server, not sent by the phone', bad using errcode = 'insufficient_privilege'; end if;
  if tbl = 'label_uses' then r := normalize_label_row(r); end if;
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

  if tbl = 'farm_settings' then      -- an owner setting: the first write and every later one are the same upsert (key per farm)
    select string_agg(format('%1$I = excluded.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('farm_id', 'key');
    execute format('insert into farm_settings (%1$s) select %1$s from jsonb_populate_record(null::farm_settings, $1) on conflict (farm_id, key) do update set %2$s', cols, sets) using r;
  elsif o->>'op' = 'insert' then
    execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_record(null::%1$I, $1) on conflict (id) do nothing', tbl, cols) using r;
  else
    -- the phone sends the WHOLE row: a nullable column it leaves out is empty there, so it is emptied here too (not kept as a stale value)
    select string_agg(case when r ? c.column_name then format('%1$I = x.%1$I', c.column_name) else format('%I = null', c.column_name) end, ',') into sets
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = tbl and c.column_name not in ('id', 'farm_id') and c.column_name <> all (server_owned)
        and (r ? c.column_name or c.is_nullable = 'YES') and c.is_generated = 'NEVER' and c.column_name not in ('storage_path');
    execute format('update %1$I t set %2$s from jsonb_populate_record(null::%1$I, $1) x where t.id = x.id and t.farm_id = $2', tbl, sets) using r, farm;
    get diagnostics n = row_count;
    if n = 0 then raise exception 'nothing to update (no such row in this farm)' using errcode = 'no_data_found'; end if;
  end if;
  return 'applied';
end $$;

-- pull now serves crops too
create or replace function pull(p_farm uuid, p_cursor jsonb, p_limit integer) returns jsonb language plpgsql stable set search_path = public as $$
declare t text; q text := ''; cx xid8 := '0'::xid8; cs bigint := 0; got jsonb; more boolean; last_ jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'pull needs a limit from 1 to 1000' using errcode = 'invalid_parameter_value'; end if;
  if p_cursor is not null and p_cursor <> 'null'::jsonb and p_cursor <> '{}'::jsonb then
    cx := (p_cursor->>'x')::xid8; cs := (p_cursor->>'s')::bigint;
  end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
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

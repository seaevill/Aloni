-- 0009_sync.sql  (WRITTEN, NOT APPLIED ANYWHERE)  M2 step (b), PR 5, 2026-11-18. The server half of the phone's outbox (`app/src/repo`):
--   apply_ops(ops jsonb) : push. Idempotent by op_id (the same op twice has ONE effect). Runs with the CALLER's rights, so RLS decides who may write what.
--   pull(farm, after, n) : the rows of ONE farm that changed after `server_seq` = after (oldest first), for the farms the caller may read.
-- Nothing is guessed: an unknown table, an unknown column, a row of another farm, or a write RLS refuses is REJECTED with its reason and is not recorded as
-- applied, so the phone keeps it in its outbox and shows it; nothing is dropped silently. Append-only tables keep refusing updates (their trigger).

create table applied_ops (
  op_id      uuid primary key,
  farm_id    uuid not null references farms(id),
  table_name text not null,
  applied_at timestamptz not null default now()
);
alter table applied_ops enable row level security;
create policy applied_ops_member on applied_ops for all using (has_role(farm_id, array['owner','worker'])) with check (has_role(farm_id, array['owner','worker']));

-- the tables the phone syncs (phone name -> server table). `settings` on the phone is farm_settings here.
create function sync_table(p text) returns text language sql immutable as $$
  select case when p = 'settings' then 'farm_settings'
              when p = any (array['parcels','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations']) then p end $$;

create function apply_ops(p_ops jsonb) returns jsonb language plpgsql as $$
declare
  o jsonb; r jsonb; tbl text; farm uuid; opid uuid; cols text; sets text; n int; out jsonb := '[]'::jsonb; bad text;
begin
  for o in select * from jsonb_array_elements(p_ops) loop
    begin
      opid := (o->>'op_id')::uuid;
      tbl := sync_table(o->>'table');
      r := o->'row';
      farm := (r->>'farm_id')::uuid;
      if tbl is null then raise exception 'table not synced: %', o->>'table' using errcode = 'insufficient_privilege'; end if;
      if farm is null or (o->>'farm_id')::uuid is distinct from farm then raise exception 'row and op name different farms' using errcode = 'check_violation'; end if;
      select k into bad from jsonb_object_keys(r) k where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = tbl and c.column_name = k) limit 1;
      if bad is not null then raise exception 'unknown column % on %', bad, tbl using errcode = 'undefined_column'; end if;
      if o->>'op' not in ('insert', 'update') then raise exception 'unknown op %', o->>'op' using errcode = 'check_violation'; end if;
      select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(r) k;

      -- the same op twice has ONE effect: record the op first; if it was already recorded, do nothing at all. A rejection below rolls this row back with the op.
      insert into applied_ops(op_id, farm_id, table_name) values (opid, farm, tbl) on conflict (op_id) do nothing;
      if not found then out := out || jsonb_build_object('op_id', opid, 'status', 'duplicate'); continue; end if;

      -- a write the caller's rights refuse raises here (RLS / triggers) and the op is rejected, not recorded
      if o->>'op' = 'insert' then
        if tbl = 'farm_settings' then
          select string_agg(format('%1$I = excluded.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('farm_id', 'key');
          execute format('insert into farm_settings (%1$s) select %1$s from jsonb_populate_record(null::farm_settings, $1) on conflict (farm_id, key) do update set %2$s', cols, sets) using r;
        else
          execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_record(null::%1$I, $1) on conflict (id) do nothing', tbl, cols) using r;
        end if;
      else
        if tbl = 'farm_settings' then
          select string_agg(format('%1$I = x.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('farm_id', 'key');
          execute format('update farm_settings t set %s from jsonb_populate_record(null::farm_settings, $1) x where t.farm_id = $2 and t.key = x.key', sets) using r, farm;
        else
          select string_agg(format('%1$I = x.%1$I', k), ',') into sets from jsonb_object_keys(r) k where k not in ('id', 'farm_id');
          execute format('update %1$I t set %2$s from jsonb_populate_record(null::%1$I, $1) x where t.id = x.id and t.farm_id = $2', tbl, sets) using r, farm;
        end if;
        get diagnostics n = row_count;
        if n = 0 then raise exception 'nothing to update (no such row in this farm)' using errcode = 'no_data_found'; end if;
      end if;

      out := out || jsonb_build_object('op_id', opid, 'status', 'applied');
    exception when others then
      out := out || jsonb_build_object('op_id', o->>'op_id', 'status', 'rejected', 'reason', sqlerrm, 'code', sqlstate);
    end;
  end loop;
  return out;
end $$;

-- pull: the rows of ONE farm changed after `p_after` (a server_seq), oldest first, at most p_limit in all; RLS (the caller's rights) decides what is visible.
create function pull(p_farm uuid, p_after bigint, p_limit integer) returns jsonb language plpgsql stable as $$
declare t text; q text := ''; out jsonb;
begin
  if p_limit is null or p_limit < 1 or p_after is null then raise exception 'pull needs a position and a positive limit' using errcode = 'invalid_parameter_value'; end if;
  foreach t in array array['parcels','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    q := q || case when q = '' then '' else ' union all ' end || format('select %L::text as tbl, server_seq, to_jsonb(x) as row from %I x where farm_id = $1 and server_seq > $2', t, t);
  end loop;
  execute format('select coalesce(jsonb_agg(jsonb_build_object(''table'', tbl, ''seq'', server_seq, ''row'', row) order by server_seq), ''[]''::jsonb) from (select * from (%s) u order by server_seq limit $3) w', q) into out using p_farm, p_after, p_limit;
  return out;
end $$;

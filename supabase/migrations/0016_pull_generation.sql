-- 0016_pull_generation.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings (b) and (d) of the team's independent review, 2026-11-18. A NEW file; builds on 0015.
--  b   the pull cursor carries a GENERATION: after a restore into a new project the phones start again from the beginning (bump_sync_generation()), and a server that
--      sees rows from its own future (a restored dump) refuses to serve instead of silently skipping them;
--  d   a job given to another worker: the cursor of a worker also carries the SET OF HER JOBS; when it changes she starts again, so she receives that job's plantings,
--      product, label use and the sprays on its fields.

-- ---------------------------------------------------------------- the generation of this server's sync data (b)
create table sync_meta (singleton boolean primary key default true check (singleton), generation uuid not null default gen_random_uuid());
insert into sync_meta default values;
alter table sync_meta enable row level security;      -- no policy: only the functions below read it

-- ---------------------------------------------------------------- the pull cursor {x, s, g, v}

create function sync_generation() returns text language sql stable security definer set search_path = public as $$ select generation::text from sync_meta $$;
-- what a user is allowed to SEE of the assignments: the owner sees everything (constant); a worker's value is the set of her jobs, so it changes when a job is given to her or taken away
create function sync_visibility(p_farm uuid) returns text language sql stable set search_path = public as $$
  select case when has_role(p_farm, array['owner']) then 'owner'
              else md5(coalesce((select string_agg(j.id::text, ',' order by j.id) from jobs j where j.farm_id = p_farm and j.assigned_to = auth.uid() and j.deleted_at is null), '')) end $$;

drop function pull(uuid, jsonb, integer);
create function pull(p_farm uuid, p_cursor jsonb, p_limit integer) returns jsonb language plpgsql stable set search_path = public as $$
declare
  t text; q text := ''; fq text := ''; cx xid8 := '0'::xid8; cs bigint := 0; got jsonb; more boolean; last_ jsonb; gen constant text := sync_generation(); vis constant text := sync_visibility(p_farm);
  reset_ boolean := false; future boolean; has_cursor boolean := p_cursor is not null and p_cursor <> 'null'::jsonb and p_cursor <> '{}'::jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'pull needs a limit from 1 to 1000' using errcode = 'invalid_parameter_value'; end if;
  if has_cursor then
    if p_cursor->>'g' is distinct from gen or p_cursor->>'v' is distinct from vis then reset_ := true;      -- another generation (a restore) or other visible jobs: start again
    else cx := (p_cursor->>'x')::xid8; cs := (p_cursor->>'s')::bigint; end if;
  end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
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
end $$;

-- The restore step (RUNBOOK 10.3): after a pg_dump has been restored into a NEW project, an administrator runs  select bump_sync_generation();  once.
-- It re-stamps every synced row with this server's transaction number and fresh sequence numbers (their triggers are switched off for that one statement each) and
-- starts a new generation, so every phone pulls again from the beginning. Nobody but an administrator can call it.
create function bump_sync_generation() returns text language plpgsql security definer set search_path = public as $$
declare t text; new_gen uuid := gen_random_uuid();
begin
  -- a second lock besides the missing EXECUTE right (a dump restored WITHOUT privileges would give it back to everyone): a signed-in end user is never an administrator
  if auth.uid() is not null then raise exception 'only an administrator (no end-user session) may run bump_sync_generation()' using errcode = 'insufficient_privilege'; end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen;
  return new_gen::text;
end $$;
revoke execute on function bump_sync_generation(), sync_generation() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function bump_sync_generation(), sync_generation(), sync_visibility(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function bump_sync_generation() from authenticated;
    grant execute on function sync_generation(), sync_visibility(uuid), pull(uuid, jsonb, integer), verify_spray_chain(uuid) to authenticated;
  end if;
end $$;
revoke execute on function sync_visibility(uuid) from public;

revoke insert, update, delete on sync_meta from authenticated;

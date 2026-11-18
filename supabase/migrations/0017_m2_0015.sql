-- 0017_m2_0015.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings m2-0015 of the team's review. A NEW file; builds on 0015/0016.
--  1  the harvest gate has a FLOOR: the waiting period of the SIGNED label use a spray names. A correction keeps the label use of the spray it corrects (it cannot point at
--     another one to lose the floor), and the gate itself reads the floor, so a short stored PHI (an old or restored row) never opens it;
--  2  received_at is ALWAYS the server's now(): what the writer sends is overwritten, so «late» cannot be dodged by sending a recent received_at;
--  3  the generation changes BY ITSELF on a restored server (the stored server identity differs from the live one): phones that held a cursor start again without waiting for an
--     administrator; bump_sync_generation() still re-stamps the rows and records the new identity;
--  4  a worker's cursor also covers WHICH product / label use / plantings her jobs point at: rows that became visible to her without changing themselves (an old product given to her job)
--     make her cursor restart, so they arrive;
--  5  tests/m2_0015.sql runs the flows as the REAL `authenticated` role.

-- ---------------------------------------------------------------- 1, 2
create or replace function check_spray_record() returns trigger language plpgsql security definer set search_path = public as $$
declare lu record; o job_spray%rowtype; sl record;
begin
  new.received_at := now();      -- the SERVER's clock, whatever the writer sent (m2-0015 finding 2)
  if new.sprayed_at > now() + interval '5 minutes' then raise exception 'the end of a spraying cannot be in the future' using errcode = 'check_violation'; end if;
  if new.phi_days is not null and new.phi_until is distinct from new.sprayed_at + make_interval(hours => new.phi_days * 24) then
    raise exception 'phi_until must be exactly sprayed_at + % days (in hours)', new.phi_days using errcode = 'check_violation';
  end if;
  if new.rei_hours is not null and new.rei_until is distinct from new.sprayed_at + make_interval(hours => new.rei_hours) then
    raise exception 'rei_until must be exactly sprayed_at + % hours', new.rei_hours using errcode = 'check_violation';
  end if;
  if new.phi_source = 'label' then
    select l.product_id, l.sign_off_by, l.phi_days, l.rei_hours into lu from label_uses l where l.id = new.label_use_id and l.farm_id = new.farm_id;
    if not found or lu.sign_off_by is null or lu.product_id is distinct from new.product_id or lu.phi_days is distinct from new.phi_days or lu.rei_hours is distinct from new.rei_hours then
      raise exception 'a label waiting period must equal the signed label use it names' using errcode = 'check_violation';
    end if;
  end if;

  if new.amends_id is not null then
    -- a correction touches its own spray and nothing else
    select * into o from job_spray where id = new.amends_id and farm_id = new.farm_id;
    if not found then raise exception 'the spray to correct does not exist in this farm' using errcode = 'check_violation'; end if;
    if o.job_id is distinct from new.job_id or o.product_id is distinct from new.product_id or o.sprayed_at is distinct from new.sprayed_at or o.applicator_id is distinct from new.applicator_id then
      raise exception 'a correction must be of the same job, product, applicator and end time as the spray it corrects' using errcode = 'check_violation';
    end if;
    if new.label_use_id is not null and new.label_use_id is distinct from o.label_use_id then raise exception 'a correction names no label use of its own, or the one of the spray it corrects' using errcode = 'check_violation'; end if;
    if o.phi_until is not null then raise exception 'only a spray whose waiting period is unknown can be corrected (a correction could only shorten it)' using errcode = 'check_violation'; end if;
    if new.phi_source = 'manual' then
      if new.phi_days is null or new.phi_days < 1 or new.rei_hours is null or new.rei_hours < 1 then raise exception 'a manual waiting period must be above zero' using errcode = 'check_violation'; end if;
      select l.phi_days, l.rei_hours into sl from label_uses l where l.id = o.label_use_id and l.farm_id = new.farm_id and l.sign_off_by is not null;
      if found and ((sl.phi_days is not null and new.phi_days < sl.phi_days) or (sl.rei_hours is not null and new.rei_hours < sl.rei_hours)) then
        raise exception 'a manual waiting period cannot be shorter than the signed label it points at' using errcode = 'check_violation';
      end if;
    end if;
  else
    -- «late» by the SERVER's clock: more than 7 days between the end of the spraying and the moment the server received it. Kept, never refused, always marked.
    if new.sprayed_at < new.received_at - interval '7 days' then
      if not ('late_entry' = any (new.flags)) then new.flags := array_append(new.flags, 'late_entry'); end if;
      if length(btrim(coalesce(new.late_reason, ''))) = 0 then new.late_reason := 'not stated: the record reached the server more than 7 days after the spraying'; end if;
    end if;
  end if;
  return new;
end $$;

create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']); t timestamptz; clash boolean; tolerance interval;
begin
  new.received_at := now();      -- the SERVER's clock (m2-0015 finding 2)
  tolerance := case when is_worker then interval '0' else interval '5 minutes' end;   -- a worker gets NO tolerance
  if new.harvested_at > now() + tolerance then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  foreach t in array case when is_worker then array[now(), new.harvested_at] when new.harvested_at >= now() - interval '5 minutes' then array[now()] else '{}'::timestamptz[] end loop
    select exists (
      select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
      left join label_uses lf on lf.id = coalesce(s.label_use_id, (select o.label_use_id from job_spray o where o.id = s.amends_id)) and lf.farm_id = s.farm_id and lf.sign_off_by is not null   -- the FLOOR: the signed label use the spray names
      where jp.planting_id = new.planting_id and s.sprayed_at <= t and not exists (select 1 from job_spray a where a.amends_id = s.id)
        and (s.phi_until is null or s.phi_until >= t or s.rei_until is null or s.rei_until >= t
             or (lf.phi_days is not null and s.sprayed_at + make_interval(hours => lf.phi_days * 24) >= t)
             or (lf.rei_hours is not null and s.sprayed_at + make_interval(hours => lf.rei_hours) >= t))) into clash;
    if clash then raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;

-- ---------------------------------------------------------------- 3: the identity of this server (RUNBOOK 10.3: after a restore the step is MANDATORY and verify_applied.sql fails until it was done)
create function server_identity() returns text language plpgsql stable security definer set search_path = public as $$
begin return (select system_identifier::text from pg_control_system()); exception when others then return null; end $$;
alter table sync_meta add column system_id text;
update sync_meta set system_id = server_identity();

-- the token a phone keeps: the stored generation, plus the LIVE identity when it is not the one stored (a dump restored on another server). Unreadable identity = no automatic detection.
create or replace function sync_generation() returns text language sql stable security definer set search_path = public as $$
  select case when server_identity() is null or system_id is not distinct from server_identity() then generation::text else generation::text || ':' || server_identity() end from sync_meta $$;

-- ---------------------------------------------------------------- 4: what a worker can see = her jobs AND what they point at
create or replace function sync_visibility(p_farm uuid) returns text language sql stable security definer set search_path = public as $$
  select case when has_role(p_farm, array['owner']) then 'owner'
    else md5(coalesce((select string_agg(j.id::text || ':' || coalesce(j.product_id::text, '') || ':' || coalesce(j.label_use_id::text, '') || ':'
             || coalesce((select string_agg(jp.planting_id::text, ',' order by jp.planting_id) from job_plantings jp where jp.job_id = j.id and jp.farm_id = j.farm_id), ''), ';' order by j.id)
           from jobs j where j.farm_id = p_farm and j.assigned_to = auth.uid() and j.deleted_at is null), '')) end $$;
revoke execute on function server_identity() from public;

create or replace function bump_sync_generation() returns text language plpgsql security definer set search_path = public as $$
declare t text; new_gen uuid := gen_random_uuid();
begin
  -- a second lock besides the missing EXECUTE right (a dump restored WITHOUT privileges would give it back to everyone): a signed-in end user is never an administrator
  if auth.uid() is not null then raise exception 'only an administrator (no end-user session) may run bump_sync_generation()' using errcode = 'insufficient_privilege'; end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity();
  return new_gen::text;
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function server_identity(), sync_visibility(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke execute on function server_identity() from authenticated; grant execute on function sync_visibility(uuid), sync_generation() to authenticated; end if;
end $$;

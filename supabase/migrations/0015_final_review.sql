-- 0015_final_review.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings of the team's independent review of 0001–0012, 2026-11-18. A NEW file (the pull cursor part is 0016).
--  a1  job_plantings can never be changed (a changed planting_id moved a spray away from the planting it covers: it opened the harvest gate for the owner);
--  a2  a correction row only touches ITS OWN spray (same job, product, applicator, end time), only while that spray's waiting period is unknown, with a manual PHI and
--      REI above zero and never shorter than the signed label it points at; one correction per spray;
--  c   a worker's times are bounded by the SERVER clock (no 5-minute tolerance), and a worker cannot write a harvest into a waiting period by dating it back;
--  e   «late» is judged by the server's received_at, not by the phone's created_at: a late record is kept and marked (never lost), with a reason or an honest «not stated»;
--  f   TRUNCATE is taken away from anon/authenticated (RLS does not cover it), the append-only tables refuse it for everyone, table rights are explicit;
--  g   verify_spray_chain never says «sound» to someone who cannot read the sprays.
-- The spray hash no longer covers server_seq / sync_xid (a later migration re-stamps them after a restore; the record itself is what the chain protects).

-- ---------------------------------------------------------------- f: rights
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke execute on all functions in schema public from anon;
    alter default privileges in schema public revoke all on tables from anon;
    alter default privileges in schema public revoke all on sequences from anon;
    alter default privileges in schema public revoke execute on functions from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke truncate, references, trigger on all tables in schema public from authenticated;
    alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
    -- explicit rights (least privilege; RLS still decides which rows): append-only ledgers get no update/delete right at all
    grant select, insert, update, delete on all tables in schema public to authenticated;
    revoke update, delete on job_spray, job_harvest, stock_movements, stock_lots, observations, applied_ops from authenticated;
    revoke insert, update, delete on audit_log from authenticated;
    revoke delete on media, parcels, plantings, products, label_uses, soil_tests, water_tests, workers, jobs, job_plantings, farm_settings, crops from authenticated;   -- archive with deleted_at
  end if;
end $$;
revoke execute on all functions in schema public from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function has_role(uuid, text[]), worker_sees_spray(uuid, uuid), sync_table(text), normalize_label_row(jsonb), apply_ops(jsonb), apply_one(jsonb), pull(uuid, jsonb, integer),
      complete_spray_job(uuid, timestamptz, text, text), verify_spray_chain(uuid) to authenticated;
  end if;
end $$;
alter default privileges revoke execute on functions from public;   -- every function created from now on is closed until it is granted on purpose

create function forbid_truncate() returns trigger language plpgsql as $$
begin raise exception '% is append-only: it cannot be emptied', tg_table_name using errcode = '42501'; end $$;
do $$
declare t text;
begin
  foreach t in array array['job_spray', 'job_harvest', 'stock_lots', 'stock_movements', 'observations', 'media', 'audit_log', 'applied_ops'] loop
    execute format('create trigger %I before truncate on %I for each statement execute function forbid_truncate()', t || '_no_truncate', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- a1: job_plantings are never changed (a different planting = a NEW row)
create function forbid_job_planting_change() returns trigger language plpgsql as $$
begin raise exception 'the plantings of a job are never changed: add a new row for another planting' using errcode = '42501'; end $$;
create trigger job_plantings_no_update before update on job_plantings for each row execute function forbid_job_planting_change();

-- ---------------------------------------------------------------- a2, e: the checks on a spray record
create unique index job_spray_one_correction on job_spray (amends_id) where amends_id is not null;

create or replace function check_spray_record() returns trigger language plpgsql security definer set search_path = public as $$
declare lu record; o job_spray%rowtype; sl record;
begin
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
    if o.phi_until is not null then raise exception 'only a spray whose waiting period is unknown can be corrected (a correction could only shorten it)' using errcode = 'check_violation'; end if;
    if new.phi_source = 'manual' then
      if new.phi_days is null or new.phi_days < 1 or new.rei_hours is null or new.rei_hours < 1 then raise exception 'a manual waiting period must be above zero' using errcode = 'check_violation'; end if;
      select l.phi_days, l.rei_hours into sl from label_uses l where l.id = coalesce(new.label_use_id, o.label_use_id) and l.farm_id = new.farm_id and l.sign_off_by is not null;
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

-- ---------------------------------------------------------------- c: a harvest by a worker is judged by the server clock, and also AT the time it claims
create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']); t timestamptz; clash boolean; tolerance interval;
begin
  tolerance := case when is_worker then interval '0' else interval '5 minutes' end;   -- a worker gets NO tolerance
  if new.harvested_at > now() + tolerance then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  foreach t in array case when is_worker then array[now(), new.harvested_at] when new.harvested_at >= now() - interval '5 minutes' then array[now()] else '{}'::timestamptz[] end loop
    select exists (
      select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
      where jp.planting_id = new.planting_id and s.sprayed_at <= t and not exists (select 1 from job_spray a where a.amends_id = s.id)
        and (s.phi_until is null or s.phi_until >= t or s.rei_until is null or s.rei_until >= t)) into clash;
    if clash then raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;

-- ---------------------------------------------------------------- the spray hash without the re-stampable columns; g: verification only for those who may read
create or replace function chain_hash() returns trigger language plpgsql security definer set search_path = public set timezone = 'UTC' as $$
declare prev text; prev_no bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || new.farm_id::text, 0));
  execute format('select hash, chain_no from %I where farm_id = $1 order by chain_no desc nulls last limit 1', tg_table_name) into prev, prev_no using new.farm_id;
  new.chain_no := coalesce(prev_no, 0) + 1;
  new.prev_hash := prev;
  new.hash := null;
  new.hash := encode(sha256(convert_to(coalesce(prev, '') || (to_jsonb(new) - 'hash' - 'prev_hash' - 'server_seq' - 'sync_xid')::text, 'UTF8')), 'hex');
  return new;
end $$;

create or replace function verify_spray_chain(p_farm uuid) returns table (id uuid, chain_no bigint, problem text) language plpgsql stable set search_path = public set timezone = 'UTC' as $$
begin
  -- an end user who is not this farm's owner would see no sprays and so «no problem»: that is NOT an answer, it is an error. (No session = an administrator.)
  if auth.uid() is not null and not has_role(p_farm, array['owner']) then raise exception 'only the owner of this farm can verify its spray chain' using errcode = 'insufficient_privilege'; end if;
  return query
  with s as (select j.*, lag(j.hash) over (order by j.chain_no) as want_prev, lag(j.chain_no) over (order by j.chain_no) as prev_no from job_spray j where j.farm_id = p_farm)
  select s.id, s.chain_no, case
      when s.chain_no is distinct from coalesce(s.prev_no, 0) + 1 then 'a row is missing or the numbering is broken'
      when s.prev_hash is distinct from s.want_prev then 'prev_hash does not match the previous row'
      else 'the row was changed after it was written' end
  from s where s.chain_no is distinct from coalesce(s.prev_no, 0) + 1 or s.prev_hash is distinct from s.want_prev
     or s.hash is distinct from encode(sha256(convert_to(coalesce(s.want_prev, '') || (to_jsonb(s) - 'hash' - 'prev_hash' - 'want_prev' - 'prev_no' - 'server_seq' - 'sync_xid')::text, 'UTF8')), 'hex')
  order by s.chain_no;
end $$;

-- ---------------------------------------------------------------- c: «Έγινε» — the same function as 0014, but a worker's end time may not be even one minute ahead of the SERVER clock
create or replace function complete_spray_job(p_job uuid, p_ended_at timestamptz, p_note text default null, p_late_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me constant uuid := auth.uid(); j jobs%rowtype; lu label_uses%rowtype; sid constant uuid := gen_random_uuid();
  state text; flags text[] := '{}'; phi int; rei int; src text; is_late boolean; spray job_spray%rowtype; is_live boolean; conflict boolean;
begin
  if me is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select * into j from jobs where id = p_job for update;     -- the row lock serialises two requests for the same job
  if not found or j.deleted_at is not null or j.assigned_to is distinct from me or not has_role(j.farm_id, array['worker']) then
    raise exception 'this job is not available to you' using errcode = 'insufficient_privilege';
  end if;
  if j.kind <> 'spray' then raise exception 'the job is not a spraying job' using errcode = 'check_violation'; end if;
  if j.status = 'done' then   -- a retry of a request that already succeeded: the same answer, nothing new
    select * into spray from job_spray where job_id = j.id and created_by = me and amends_id is null and sprayed_at = p_ended_at order by chain_no limit 1;
    if found then
      return jsonb_build_object('spray_id', spray.id, 'label_state', spray.label_state, 'flags', to_jsonb(spray.flags), 'phi_until', spray.phi_until, 'rei_until', spray.rei_until, 'repeat', true);
    end if;
    raise exception 'the job is already done' using errcode = 'check_violation';
  end if;
  if j.status <> 'planned' then raise exception 'the job is not open (it is %)', j.status using errcode = 'check_violation'; end if;
  if j.worker_id is null or j.product_id is null or j.dose_str is null or j.dose_unit is null then raise exception 'the job is incomplete: product, dose and worker are fixed by the manager' using errcode = 'check_violation'; end if;
  if p_ended_at is null or p_ended_at > now() then raise exception 'the end of a spraying cannot be missing or in the future (the server clock decides; a worker gets no tolerance)' using errcode = 'check_violation'; end if;
  is_late := p_ended_at < now() - interval '7 days';
  if is_late and length(btrim(coalesce(p_late_reason, ''))) = 0 then raise exception 'a spraying more than 7 days back needs the reason for the delay' using errcode = 'check_violation'; end if;

  -- the field's re-entry period AT THE MOMENT THE SPRAYING ENDED: a running or unknown REI of an earlier spray on a planting of this job
  is_live := p_ended_at >= now() - interval '5 minutes';
  select exists (
    select 1 from job_plantings mine join job_plantings other on other.planting_id = mine.planting_id and other.job_id <> j.id
      join job_spray s on s.job_id = other.job_id
    where mine.job_id = j.id and s.sprayed_at <= p_ended_at and not exists (select 1 from job_spray a where a.amends_id = s.id)
      and (s.rei_until is null or s.rei_until >= p_ended_at)
  ) into conflict;
  if conflict and is_live then raise exception 'the field is locked: a re-entry period (REI) is running or unknown' using errcode = 'check_violation'; end if;

  if j.label_use_id is null then state := 'none'; flags := array['label_none'];
  else
    select * into lu from label_uses where id = j.label_use_id and farm_id = j.farm_id and product_id = j.product_id and deleted_at is null;
    if not found then raise exception 'the label use of the job is missing' using errcode = 'check_violation'; end if;
    if lu.sign_off_by is null then state := 'unsigned'; flags := array['label_unsigned'];
    else state := 'signed'; phi := lu.phi_days; rei := lu.rei_hours; src := 'label'; end if;
    if lu.dose_min is not null then
      if lu.dose_unit is distinct from j.dose_unit then flags := array_append(flags, 'dose_unit_differs');
      elsif j.dose_str < lu.dose_min or j.dose_str > coalesce(lu.dose_max, lu.dose_min) then flags := array_append(flags, 'dose_outside_label'); end if;
    end if;
  end if;
  if is_late then flags := array_append(flags, 'late_entry'); end if;
  if conflict then flags := array_append(flags, 'rei_conflict'); end if;   -- only reachable for a spraying that ended earlier: kept, and visible

  insert into job_spray(id, farm_id, job_id, product_id, applicator_id, label_use_id, sprayed_at, dose_str, dose_unit, label_state, phi_days, rei_hours, phi_source, phi_until, rei_until, flags, note, late_reason, actor_id)
  values (sid, j.farm_id, j.id, j.product_id, j.worker_id, j.label_use_id, p_ended_at, j.dose_str, j.dose_unit, state, phi, rei, src,
          case when phi is not null then p_ended_at + make_interval(hours => phi * 24) end, case when rei is not null then p_ended_at + make_interval(hours => rei) end,
          flags, nullif(btrim(coalesce(p_note, '')), ''), case when is_late then btrim(p_late_reason) end, j.worker_id::text)
  returning * into spray;
  update jobs set status = 'done', done_at = p_ended_at where id = j.id;   -- jobs_identity sets done_by from the session
  return jsonb_build_object('spray_id', sid, 'label_state', state, 'flags', to_jsonb(flags), 'phi_until', spray.phi_until, 'rei_until', spray.rei_until, 'repeat', false);
end $$;


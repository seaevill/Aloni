-- 0025_start_bbch_prescription.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Reg. (EU) 2023/564 fields the spray record lacked. A NEW file; builds on 0001–0024.
--  started_at       the START of the spraying (the Annex: «date and, where relevant, start time»); never later than the end (sprayed_at). The SERVER now asks for it on every new spraying written by a
--                   signed-in user (team review m5-0027 finding 8; seeds and old rows written without a session are untouched), a correction cannot erase a recorded one, and the worker's
--                   «Έγινε» (complete_spray_job) takes the start as a parameter;
--  bbch             the BBCH growth stage as the two-digit code 00–99, optional («where relevant»);
--  prescription_no  the prescription number (Greek professional use), optional, never blank when present.
-- The check at the very top stops with a clear message if 0024 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('write_edit_history()') is null then raise exception '0025 stopped: 0024 is not applied (nothing was changed)'; end if;
end $$;

alter table job_spray add column started_at timestamptz, add column bbch text, add column prescription_no text;
alter table job_spray add constraint job_spray_start_before_end check (started_at is null or started_at <= sprayed_at);
alter table job_spray add constraint job_spray_bbch_code check (bbch is null or bbch ~ '^[0-9]{2}$');
alter table job_spray add constraint job_spray_prescription_not_blank check (prescription_no is null or length(btrim(prescription_no)) > 0);

-- team review m5-0027 finding 8: the start is required by the server for a signed-in writer, and a recorded start cannot be erased by a correction
create function check_spray_start() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare o job_spray%rowtype;
begin
  if new.amends_id is null then
    if new.started_at is null and auth.uid() is not null then raise exception 'the start of a spraying is required (Reg. (EU) 2023/564)' using errcode = 'check_violation'; end if;
  else
    select * into o from job_spray where id = new.amends_id and farm_id = new.farm_id;
    if found and o.started_at is not null and new.started_at is null then raise exception 'a correction cannot erase the recorded start of a spraying' using errcode = 'check_violation'; end if;
  end if;
  return new;
end $$;
create trigger job_spray_start before insert on job_spray for each row execute function check_spray_start();
revoke execute on function check_spray_start() from public, anon, authenticated;

-- the worker's «Έγινε» now carries the start (0015's version had the end only); the old signature goes. `p_started_at` is the LAST parameter (the old positional calls keep their meaning) and is
-- REQUIRED: a call without it is refused.
drop function complete_spray_job(uuid, timestamptz, text, text);
create function complete_spray_job(p_job uuid, p_ended_at timestamptz, p_note text default null, p_late_reason text default null, p_started_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
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
  if p_started_at is null or p_started_at > p_ended_at then raise exception 'the START of a spraying is required and cannot be after its end (Reg. (EU) 2023/564)' using errcode = 'check_violation'; end if;
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
    if not exists (select 1 from job_plantings jp where jp.job_id = j.id and jp.farm_id = j.farm_id)
       or exists (select 1 from job_plantings jp join plantings pl on pl.id = jp.planting_id where jp.job_id = j.id and jp.farm_id = j.farm_id and pl.crop_id <> lu.crop_id) then      -- m7 N1: the label must be of the crop of EVERY planting
      -- m6-0029 SHOULD 3 / m7 N1: the label belongs to ANOTHER crop (of at least one planting of the job): it is not the waiting period of these plantings. The spraying is kept, marked, and its waiting period stays UNKNOWN (blocked)
      state := 'none'; flags := array['label_none'];
    elsif lu.sign_off_by is null then state := 'unsigned'; flags := array['label_unsigned'];
    else state := 'signed'; phi := lu.phi_days; rei := lu.rei_hours; src := 'label'; end if;
    if lu.dose_min is not null then
      if lu.dose_unit is distinct from j.dose_unit then flags := array_append(flags, 'dose_unit_differs');
      elsif j.dose_str < lu.dose_min or j.dose_str > coalesce(lu.dose_max, lu.dose_min) then flags := array_append(flags, 'dose_outside_label'); end if;
    end if;
  end if;
  if is_late then flags := array_append(flags, 'late_entry'); end if;
  if conflict then flags := array_append(flags, 'rei_conflict'); end if;   -- only reachable for a spraying that ended earlier: kept, and visible

  insert into job_spray(id, farm_id, job_id, product_id, applicator_id, label_use_id, sprayed_at, started_at, dose_str, dose_unit, label_state, phi_days, rei_hours, phi_source, phi_until, rei_until, flags, note, late_reason, actor_id)
  values (sid, j.farm_id, j.id, j.product_id, j.worker_id, j.label_use_id, p_ended_at, p_started_at, j.dose_str, j.dose_unit, state, phi, rei, src,
          case when phi is not null then p_ended_at + make_interval(hours => phi * 24) end, case when rei is not null then p_ended_at + make_interval(hours => rei) end,
          flags, nullif(btrim(coalesce(p_note, '')), ''), case when is_late then btrim(p_late_reason) end, j.worker_id::text)
  returning * into spray;
  update jobs set status = 'done', done_at = p_ended_at where id = j.id;   -- jobs_identity sets done_by from the session
  return jsonb_build_object('spray_id', sid, 'label_state', state, 'flags', to_jsonb(flags), 'phi_until', spray.phi_until, 'rei_until', spray.rei_until, 'repeat', false);
end $$;
revoke execute on function complete_spray_job(uuid, timestamptz, text, text, timestamptz) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function complete_spray_job(uuid, timestamptz, text, text, timestamptz) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function complete_spray_job(uuid, timestamptz, text, text, timestamptz) to authenticated; end if;
end $$;
comment on function complete_spray_job(uuid, timestamptz, text, text, timestamptz) is 'OPEN TO SIGNED-IN USERS ON PURPOSE: the worker''s «Έγινε». It checks the session itself (assigned worker of this job, REI lock, label state, the required start time) and the server clock; see 0013–0015 and 0019.';

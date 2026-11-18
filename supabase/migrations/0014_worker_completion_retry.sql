-- 0014_worker_completion_retry.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Final review, 2026-11-18. A NEW file; 0013 is not touched.
-- complete_spray_job (0013) is made safe against a RETRIED request and made explicit about what it records and what it refuses:
--   * Retry: the phone cannot know whether its first request arrived. The same request sent again (same job, same worker, same end time) returns the ORIGINAL answer
--     and creates nothing (no second spray, no second job update). Two requests at the same moment are serialised by the row lock on the job: exactly one spray.
--     A second request with a DIFFERENT end time for a job that is already done is refused. (The function never creates a stock movement: the job carries no quantity;
--     the owner records the quantity used in his own spray/stock entry.)
--   * Record vs permission (PHI/REI): «Έγινε» is two different things. A spraying that ended just now (within 5 minutes) in a field whose re-entry period (REI) is running
--     or unknown is a NEW action started where it must not be: REFUSED. A spraying that ended earlier is a record of something that already happened: it is KEPT, never
--     lost, and marked `rei_conflict` so the owner sees it. The conflict is judged at the moment the spraying ended. A spraying is never refused because of a PHI
--     (a PHI only restricts harvesting; this spray starts its own PHI).

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
  if p_ended_at is null or p_ended_at > now() + interval '5 minutes' then raise exception 'the end of a spraying cannot be missing or in the future' using errcode = 'check_violation'; end if;
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

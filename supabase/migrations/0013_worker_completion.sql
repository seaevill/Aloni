-- 0013_worker_completion.sql  (WRITTEN, NOT APPLIED ANYWHERE)  M2-c, server half that needs no account, 2026-11-18. A NEW file.
-- «Έγινε»: the worker does NOT write a spray record. The SERVER writes it, from the job the manager fixed (product, label use, dose, unit), the worker from the
-- verified session, and the label's own waiting periods. The worker sends three things only: which job, when the spraying ended, an optional note (and a
-- reason when the end is more than 7 days back). If the dose really applied was different, the worker writes it in the note and the owner enters a correction row.
-- Accepted only: for a worker of this farm, for a job ASSIGNED to this account, that is still open (not done, not skipped/cancelled, not archived), whose
-- fields have no running or unknown re-entry period (REI). A spray is recorded with a weak label too (marked, PHI unknown), as everywhere else.

create function complete_spray_job(p_job uuid, p_ended_at timestamptz, p_note text default null, p_late_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me constant uuid := auth.uid(); j jobs%rowtype; lu label_uses%rowtype; sid constant uuid := gen_random_uuid();
  state text; flags text[] := '{}'; phi int; rei int; src text; is_late boolean; spray job_spray%rowtype;
begin
  if me is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select * into j from jobs where id = p_job for update;
  -- one answer for «no such job», «another farm's job», «someone else's job» and «archived»: nothing is revealed
  if not found or j.deleted_at is not null or j.assigned_to is distinct from me or not has_role(j.farm_id, array['worker']) then
    raise exception 'this job is not available to you' using errcode = 'insufficient_privilege';
  end if;
  if j.kind <> 'spray' or j.status <> 'planned' then raise exception 'the job is not open (it is %)', j.status using errcode = 'check_violation'; end if;
  if j.worker_id is null or j.product_id is null or j.dose_str is null or j.dose_unit is null then raise exception 'the job is incomplete: product, dose and worker are fixed by the manager' using errcode = 'check_violation'; end if;
  if p_ended_at is null or p_ended_at > now() + interval '5 minutes' then raise exception 'the end of a spraying cannot be missing or in the future' using errcode = 'check_violation'; end if;
  is_late := p_ended_at < now() - interval '7 days';
  if is_late and length(btrim(coalesce(p_late_reason, ''))) = 0 then raise exception 'a spraying more than 7 days back needs the reason for the delay' using errcode = 'check_violation'; end if;

  -- the field's re-entry period (from ANY earlier spray on a planting of this job) must be over and known
  if exists (
    select 1 from job_plantings mine join job_plantings other on other.planting_id = mine.planting_id and other.job_id <> j.id
      join job_spray s on s.job_id = other.job_id
    where mine.job_id = j.id and s.sprayed_at <= now() and not exists (select 1 from job_spray a where a.amends_id = s.id)
      and (s.rei_until is null or s.rei_until >= now())
  ) then raise exception 'the field is locked: a re-entry period (REI) is running or unknown' using errcode = 'check_violation'; end if;

  if j.label_use_id is null then state := 'none'; flags := array['label_none'];
  else
    select * into lu from label_uses where id = j.label_use_id and farm_id = j.farm_id and product_id = j.product_id and deleted_at is null;
    if not found then raise exception 'the label use of the job is missing' using errcode = 'check_violation'; end if;
    if lu.sign_off_by is null then state := 'unsigned'; flags := array['label_unsigned'];
    else state := 'signed'; phi := lu.phi_days; rei := lu.rei_hours; src := 'label'; end if;
    -- the dose is the job's own; the label only decides whether it is marked
    if lu.dose_min is not null then
      if lu.dose_unit is distinct from j.dose_unit then flags := array_append(flags, 'dose_unit_differs');
      elsif j.dose_str < lu.dose_min or j.dose_str > coalesce(lu.dose_max, lu.dose_min) then flags := array_append(flags, 'dose_outside_label'); end if;
    end if;
  end if;
  if is_late then flags := array_append(flags, 'late_entry'); end if;

  insert into job_spray(id, farm_id, job_id, product_id, applicator_id, label_use_id, sprayed_at, dose_str, dose_unit, label_state, phi_days, rei_hours, phi_source, phi_until, rei_until, flags, note, late_reason, actor_id)
  values (sid, j.farm_id, j.id, j.product_id, j.worker_id, j.label_use_id, p_ended_at, j.dose_str, j.dose_unit, state, phi, rei, src,
          case when phi is not null then p_ended_at + make_interval(hours => phi * 24) end, case when rei is not null then p_ended_at + make_interval(hours => rei) end,
          flags, nullif(btrim(coalesce(p_note, '')), ''), case when is_late then btrim(p_late_reason) end, j.worker_id::text)
  returning * into spray;
  update jobs set status = 'done', done_at = p_ended_at where id = j.id;   -- jobs_identity sets done_by from the session
  return jsonb_build_object('spray_id', sid, 'label_state', state, 'flags', to_jsonb(flags), 'phi_until', spray.phi_until, 'rei_until', spray.rei_until);
end $$;

revoke execute on function complete_spray_job(uuid, timestamptz, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function complete_spray_job(uuid, timestamptz, text, text) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function complete_spray_job(uuid, timestamptz, text, text) to authenticated; end if;
end $$;

-- ---- what a worker may READ for the job in front of them (nothing is writable: no policy for insert/update/delete on these)
create policy products_worker_read on products for select using (has_role(farm_id, array['worker'])
  and exists (select 1 from jobs j where j.farm_id = products.farm_id and j.product_id = products.id and j.assigned_to = auth.uid()));
create policy label_uses_worker_read on label_uses for select using (has_role(farm_id, array['worker'])
  and exists (select 1 from jobs j where j.farm_id = label_uses.farm_id and j.label_use_id = label_uses.id and j.assigned_to = auth.uid()));
create policy workers_self_read on workers for select using (user_id = auth.uid() and has_role(farm_id, array['worker']));

-- the sprays on the fields of a worker's own jobs (the phone shows the re-entry lock from them). The helper runs with the owner's rights because a worker
-- cannot read the other jobs' plantings.
create function worker_sees_spray(p_spray_job uuid, p_farm uuid) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and has_role(p_farm, array['worker']) and exists (
    select 1 from job_plantings a join job_plantings b on b.planting_id = a.planting_id join jobs j on j.id = b.job_id
    where a.job_id = p_spray_job and j.farm_id = p_farm and j.assigned_to = auth.uid() and j.deleted_at is null) $$;
create policy job_spray_worker_read on job_spray for select using (worker_sees_spray(job_id, farm_id));
revoke execute on function worker_sees_spray(uuid, uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function worker_sees_spray(uuid, uuid) to authenticated; end if;
end $$;

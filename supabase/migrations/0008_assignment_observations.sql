-- 0008_assignment_observations.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Night work, item 2, 2026-11-17.
-- The phone's job ASSIGNMENT (the manager fixes product, label use, dose and worker; the worker only says done / not done) and the worker's observations,
-- one to one with app/src/worker/jobs.ts. Same rules as 0006/0007: exact numbers, nothing converted or rounded, dose 0 refused.

alter table jobs
  add column dose_str numeric check (dose_str is null or dose_str > 0),
  add column dose_unit text check (dose_unit is null or dose_unit in ('ml/str','g/str','l/str','kg/str','ml/100l','g/100l'));
alter table jobs add constraint jobs_skip_reason check (skip_reason is null or status = 'skipped');
alter table jobs add constraint jobs_skipped_has_reason check (status <> 'skipped' or skip_reason is not null);
-- an OPEN spray job is complete: product, worker, dose and unit are all set by the manager (the worker cannot supply or change them)
alter table jobs add constraint jobs_open_spray_complete check (kind <> 'spray' or status <> 'planned' or (product_id is not null and worker_id is not null and dose_str is not null and dose_unit is not null));

-- observations: written by a worker (actor_id = the worker's own id), append-only (trigger from 0004)
alter table observations add column device_id text, add column actor_id text;

-- The server enforces what the phone only hides: a WORKER may only say done / not done (with time, note, photos). Product, label use, dose, unit, worker,
-- assignment, kind, plan and everything else of the job are the manager's and cannot be changed by a worker. Everything outside the allowed list is
-- compared, so a column added later is fixed by default. A worker can only close an OPEN job (planned -> done / skipped), never reopen or cancel one.
create function jobs_worker_guard() returns trigger language plpgsql as $$
declare allowed constant text[] := array['status','skip_reason','done_at','started_at','ended_at','done_by','photos','notes','weather_snapshot','updated_at','server_seq','device_id','actor_id'];
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
create trigger jobs_worker_guard before update on jobs for each row execute function jobs_worker_guard();

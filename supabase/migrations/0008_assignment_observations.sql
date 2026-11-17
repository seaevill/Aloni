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

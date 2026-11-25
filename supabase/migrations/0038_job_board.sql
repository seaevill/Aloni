-- 0038_job_board.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The job board: an OPEN spray job (no worker yet) is visible to every worker of the farm, and the first worker to take it gets it (one atomic statement; the loser is told «taken»).
-- A NEW file (0001–0035 are applied and frozen). Stacked after 0037 only in the order of the file numbers: it needs nothing from 0036/0037 (it does not touch the three fixed sync lists).
--  * jobs_open_spray_complete: a planned spray job still needs product, dose and unit; the WORKER may now be empty = open. (The manager fixes everything else; a worker still cannot change product or dose.)
--  * Read: workers see open spray jobs of their farm (jobs, their plantings, the product and the label use needed to read the card) — nothing else, and never another farm's.
--  * Take: claim_job(job) is the ONLY way a worker becomes the worker of an open job: `update … where worker_id is null` (zero rows = «taken»); jobs_worker_guard allows exactly that change and no other.
--  * sync_visibility(): the visible-job hash now includes open jobs, so a phone re-pulls when a job it could see was taken by someone else.
--  Nothing here chooses a worker, a product or a dose: the owner still assigns, reassigns (a normal update by the owner) or leaves a job open.
do $$ begin
  if to_regclass('public.jobs') is null then raise exception '0038 stopped: jobs is missing (nothing was changed)'; end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.jobs'::regclass and conname = 'jobs_open_spray_complete') then raise exception '0038 stopped: jobs_open_spray_complete is missing (nothing was changed)'; end if;
  if to_regprocedure('public.claim_job(uuid)') is not null then raise exception '0038 stopped: claim_job already exists (nothing was changed)'; end if;
  -- the two functions re-issued below must be EXACTLY the ones this file was written against
  if not exists (select 1 from pg_proc p where p.oid = 'public.jobs_worker_guard()'::regprocedure and md5(p.prosrc) = '404437ef0a4b966222cf3fd5d362aa24' and not p.prosecdef and p.provolatile = 'v' and p.proconfig = array['search_path=public, private'])
     or not exists (select 1 from pg_proc p where p.oid = 'private.sync_visibility(uuid)'::regprocedure and md5(p.prosrc) = 'd15e78a2549eb2bce0e6ac25d5f102c9' and p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=public, private, pg_temp']) then
    raise exception '0038 stopped: jobs_worker_guard / sync_visibility are not exactly the definitions this file was written against (nothing was changed)'; end if;
end $$;

-- a planned spray job needs product, dose and unit; the worker may be empty (= open on the board)
alter table public.jobs drop constraint jobs_open_spray_complete;
alter table public.jobs add constraint jobs_open_spray_complete check (kind <> 'spray' or status <> 'planned' or (product_id is not null and dose_str is not null and dose_unit is not null));

-- «open»: a planned spray job nobody has, not archived
create function private.job_is_open(p_job uuid, p_farm uuid) returns boolean language sql stable security definer set search_path = public, private, pg_temp as $$
  select has_role(p_farm, array['owner', 'worker']) and exists (select 1 from jobs j where j.id = p_job and j.farm_id = p_farm and j.worker_id is null and j.assigned_to is null and j.status = 'planned' and j.kind = 'spray' and j.deleted_at is null) $$;
revoke execute on function private.job_is_open(uuid, uuid) from public, anon;
grant execute on function private.job_is_open(uuid, uuid) to authenticated;

-- read policies: the worker's own jobs (as before) OR an open job of the farm
drop policy jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated using (
  private.has_role(farm_id, array['owner'])
  or (private.has_role(farm_id, array['worker']) and (assigned_to = (select auth.uid()) or (worker_id is null and assigned_to is null and status = 'planned' and kind = 'spray' and deleted_at is null))));
drop policy job_plantings_select on public.job_plantings;
create policy job_plantings_select on public.job_plantings for select to authenticated using (
  private.has_role(farm_id, array['owner'])
  or (private.has_role(farm_id, array['worker']) and (exists (select 1 from jobs j where j.id = job_plantings.job_id and j.assigned_to = (select auth.uid())) or private.job_is_open(job_plantings.job_id, job_plantings.farm_id))));
drop policy products_select on public.products;
create policy products_select on public.products for select to authenticated using (
  private.has_role(farm_id, array['owner'])
  or (private.has_role(farm_id, array['worker']) and exists (select 1 from jobs j where j.farm_id = products.farm_id and j.product_id = products.id and (j.assigned_to = (select auth.uid()) or private.job_is_open(j.id, j.farm_id)))));
drop policy label_uses_select on public.label_uses;
create policy label_uses_select on public.label_uses for select to authenticated using (
  private.has_role(farm_id, array['owner'])
  or (private.has_role(farm_id, array['worker']) and exists (select 1 from jobs j where j.farm_id = label_uses.farm_id and j.label_use_id = label_uses.id and (j.assigned_to = (select auth.uid()) or private.job_is_open(j.id, j.farm_id)))));

-- the guard: a worker still changes only done / not done, EXCEPT the one take of an open job (worker_id from empty to her own roster entry; assigned_to follows by the identity trigger)
create or replace function public.jobs_worker_guard() returns trigger language plpgsql set search_path = public, private as $$
declare allowed constant text[] := array['status','skip_reason','done_at','started_at','ended_at','done_by','photos','notes','weather_snapshot','updated_at','server_seq','sync_xid','device_id','actor_id'];
        take_allowed constant text[] := array['worker_id','assigned_to'];
begin
  if has_role(old.farm_id, array['worker']) and not has_role(old.farm_id, array['owner']) then
    if old.worker_id is null and old.assigned_to is null and old.status = 'planned' and old.kind = 'spray' and old.deleted_at is null
       and new.worker_id is not null and new.worker_id = (select w.id from workers w where w.user_id = auth.uid() and w.farm_id = old.farm_id and w.deleted_at is null order by w.created_at, w.id limit 1)
       and (to_jsonb(new) - allowed - take_allowed) is not distinct from (to_jsonb(old) - allowed - take_allowed) and new.status = old.status then
      return new;                                                             -- the take of an open job: nothing else changes
    end if;
    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'a worker cannot change the product, dose or assignment of a job' using errcode = 'insufficient_privilege';
    end if;
    if new.status is distinct from old.status and not (old.status = 'planned' and new.status in ('done','skipped')) then
      raise exception 'a worker can only close an open job' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

-- the take: the ONLY way a worker becomes the worker of an open job; the first statement to find worker_id empty wins, a second one finds zero rows
create function public.claim_job(p_job uuid) returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare me constant uuid := auth.uid(); j jobs%rowtype; w workers%rowtype; n int;
begin
  if me is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select * into j from jobs where id = p_job;
  -- one answer for «no such job», «another farm's job» and «archived»: nothing is revealed
  if not found or j.deleted_at is not null or not has_role(j.farm_id, array['worker']) then raise exception 'this job is not available to you' using errcode = 'insufficient_privilege'; end if;
  select * into w from workers x where x.farm_id = j.farm_id and x.user_id = me and x.deleted_at is null order by x.created_at, x.id limit 1;      -- the SAME pick as the guard (review SHOULD)
  if not found then raise exception 'you are not on the farm''s worker list' using errcode = 'insufficient_privilege'; end if;
  update jobs set worker_id = w.id where id = p_job and worker_id is null and assigned_to is null and status = 'planned' and kind = 'spray' and deleted_at is null;
  get diagnostics n = row_count;
  if n = 0 then
    select * into j from jobs where id = p_job;                                                                            -- re-read: «mine already» (a retry after a lost answer) is not «taken»
    if found and j.deleted_at is null and j.worker_id = w.id and j.assigned_to = me then return jsonb_build_object('status', 'claimed', 'job', p_job, 'worker', w.id); end if;
    return jsonb_build_object('status', 'taken');
  end if;
  return jsonb_build_object('status', 'claimed', 'job', p_job, 'worker', w.id);
end $$;
revoke execute on function public.claim_job(uuid) from public, anon;
grant execute on function public.claim_job(uuid) to authenticated;

-- the visible-job hash includes the open jobs: a phone re-pulls when one it could see was taken
create or replace function private.sync_visibility(p_farm uuid) returns text language sql stable security definer set search_path = public, private, pg_temp as $$
  select case when has_role(p_farm, array['owner']) then 'owner'
    else md5(coalesce((select string_agg(j.id::text || ':' || coalesce(j.product_id::text, '') || ':' || coalesce(j.label_use_id::text, '') || ':'
             || coalesce((select string_agg(jp.planting_id::text, ',' order by jp.planting_id) from job_plantings jp where jp.job_id = j.id and jp.farm_id = j.farm_id), ''), ';' order by j.id)
           from jobs j where j.farm_id = p_farm and (j.assigned_to = auth.uid() or (has_role(p_farm, array['worker']) and j.worker_id is null and j.assigned_to is null and j.status = 'planned' and j.kind = 'spray')) and j.deleted_at is null), '')) end $$;

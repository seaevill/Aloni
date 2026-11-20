-- 0032_planting_gate.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Team review m8 (docs/reviews/team/2026-11-20-m8-review.md): M1 + M2 (MUST), S1–S4, L1–L3. A NEW file; builds on 0031.
-- ONE source of truth for «may this planting be harvested / entered at time t?»: private.planting_gate(planting, t). For every effective spray on a job of the planting it takes the waiting (PHI) and the re-entry
-- (REI) period ONLY from the SIGNED label use of THAT PLANTING'S OWN CROP and the spray's own product, never from another crop's label, never from a typed waiting period. No signed label of that crop and product,
-- a label without a PHI (or REI), a spray whose OWN record says «unknown» (no stored end), or an unreadable value = UNKNOWN = closed. A stored or typed waiting period never OPENS anything (only the time from the label does), but a stored period LONGER than the label still CLOSES: a recorded period is never shortened (m8 review of 0032, MUST). The harvest gate, the worker's re-entry lock (complete_spray_job) and the view harvest_conflicts use ONLY this function; the older
-- calculations (spray_floor_planting, the stored phi_until/rei_until, the other-job REI query) are gone.
do $$ begin
  if to_regprocedure('forbid_link_after_spray()') is null or to_regprocedure('check_harvest_cut_by()') is null then raise exception '0032 stopped: 0022–0031 are not all there (nothing was changed)'; end if;
end $$;

create function private.planting_gate(p_planting uuid, p_at timestamptz)
  returns table(spray_id uuid, sprayed_at timestamptz, phi_problem text, rei_problem text)
  language sql stable security definer set search_path = public, private, pg_temp as $$
  select s.id, s.sprayed_at,
         case when lf.n = 0 or lf.phi_null or s.phi_until is null then 'phi_unknown' when s.sprayed_at + make_interval(hours => lf.phi * 24) >= p_at or s.phi_until >= p_at then 'phi_running' end,
         case when lf.n = 0 or lf.rei_null or s.rei_until is null then 'rei_unknown' when s.sprayed_at + make_interval(hours => lf.rei) >= p_at or s.rei_until >= p_at then 'rei_running' end
  from plantings pl
  join job_plantings jp on jp.planting_id = pl.id and jp.farm_id = pl.farm_id
  join job_spray s on s.job_id = jp.job_id and s.farm_id = pl.farm_id
  cross join lateral (select spray_first_end(s.farm_id, s.id) as fe) x
  cross join lateral (
    select count(*)::integer as n, max(l.phi_days)::integer as phi, max(l.rei_hours)::integer as rei,
           coalesce(bool_or(l.phi_days is null), false) as phi_null, coalesce(bool_or(l.rei_hours is null), false) as rei_null
    from label_uses l
    where l.farm_id = pl.farm_id and l.product_id = s.product_id and l.crop_id = pl.crop_id and l.sign_off_by is not null
      and (l.deleted_at is null
           or l.id = (select j.label_use_id from jobs j where j.id = s.job_id and j.farm_id = s.farm_id)
           or l.id in (with recursive chain(id, amends_id, label_use_id) as (
                         select a.id, a.amends_id, a.label_use_id from job_spray a where a.id = s.id and a.farm_id = s.farm_id
                         union all select a.id, a.amends_id, a.label_use_id from job_spray a join chain c on a.id = c.amends_id where a.farm_id = s.farm_id)
                       select c.label_use_id from chain c where c.label_use_id is not null))) lf
  where pl.id = p_planting
    and (x.fe <= p_at or p_at >= now())                 -- at «now» EVERY recorded spray counts, even one ending minutes ahead (m7 N2)
    and not exists (select 1 from job_spray a where a.amends_id = s.id)
$$;
revoke execute on function private.planting_gate(uuid, timestamptz) from public, anon, authenticated;

-- the harvest gate (the 5-minute owner window and the worker's two checks are unchanged)
create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']); t timestamptz; clash boolean; tolerance interval;
begin
  new.received_at := now();      -- the SERVER's clock (m2-0015 finding 2)
  tolerance := case when is_worker then interval '0' else interval '5 minutes' end;   -- a worker gets NO tolerance
  if new.harvested_at > now() + tolerance then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  foreach t in array case when is_worker then array[now(), new.harvested_at] when new.harvested_at >= now() - interval '5 minutes' then array[now()] else '{}'::timestamptz[] end loop
    select exists (select 1 from private.planting_gate(new.planting_id, t) g where g.phi_problem is not null or g.rei_problem is not null) into clash;
    if clash then raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;

-- the worker's «Έγινε»: the re-entry lock, through the same gate
create or replace function complete_spray_job(p_job uuid, p_ended_at timestamptz, p_note text default null, p_late_reason text default null, p_started_at timestamptz default null) returns jsonb
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
  -- m8 M2: the re-entry lock is the SAME single gate as the harvest: for EVERY planting of this job, the REI of that planting's own crop and product (private.planting_gate), unknown = locked
  select exists (
    select 1 from job_plantings mine cross join lateral (select * from private.planting_gate(mine.planting_id, p_ended_at) union all select * from private.planting_gate(mine.planting_id, now()) where is_live) g
    where mine.job_id = j.id and mine.farm_id = j.farm_id and g.rei_problem is not null
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

-- the record-then-show side: a harvest that was recorded in spite of a running or unknown period is listed here, by the SAME gate, at the time it says it was cut
drop view harvest_conflicts;
-- the gate is private (it takes ANY planting id), and a view cannot lend its owner's right to call a function: a small definer function does the reading and filters by the caller's own farm roles
create function private.harvest_conflicts_rows()
  returns table(harvest_id uuid, farm_id uuid, planting_id uuid, harvested_at timestamptz, spray_id uuid, sprayed_at timestamptz, phi_problem text, rei_problem text)
  language sql stable security definer set search_path = public, private, pg_temp as $$
  select h.id, h.farm_id, h.planting_id, h.harvested_at, g.spray_id, g.sprayed_at, g.phi_problem, g.rei_problem
  from job_harvest h cross join lateral private.planting_gate(h.planting_id, h.harvested_at) g
  where (private.has_role(h.farm_id, array['owner', 'worker']) or (auth.uid() is null and current_setting('role') in ('none', 'service_role')))      -- maintenance (the database owner, the service role) sees all; a signed-in person only her own farms
    and (g.phi_problem is not null or g.rei_problem is not null)
    and (not (private.has_role(h.farm_id, array['worker']) and not private.has_role(h.farm_id, array['owner'])) or h.created_by = auth.uid())      -- a worker-only caller sees only the harvests SHE recorded (as the old view did through RLS)
$$;
revoke execute on function private.harvest_conflicts_rows() from public, anon;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function private.harvest_conflicts_rows() to authenticated; end if;
end $$;
create view harvest_conflicts as select * from private.harvest_conflicts_rows();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on harvest_conflicts from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant select on harvest_conflicts to authenticated; end if;
end $$;

-- the typed correction (a person may type a waiting period only where a label of EVERY crop of the job gives both values, and never shorter than the label): m8 M1
create or replace function spray_floor_crops(p_farm uuid, p_job uuid, p_product uuid, p_spray uuid, p_crops uuid[], out phi integer, out rei integer, out n integer, out missing integer)
  language sql stable security definer set search_path = public, private, pg_temp as $$
  with recursive chain(id, amends_id, label_use_id) as (
    select s.id, s.amends_id, s.label_use_id from job_spray s where s.id = p_spray and s.farm_id = p_farm
    union all
    select s.id, s.amends_id, s.label_use_id from job_spray s join chain c on s.id = c.amends_id where s.farm_id = p_farm),
  applies(id, crop_id, phi_days, rei_hours) as (
    select l.id, l.crop_id, l.phi_days, l.rei_hours from label_uses l
    where l.farm_id = p_farm and l.product_id = p_product and l.crop_id = any (coalesce(p_crops, '{}'::uuid[])) and (
      l.id in (select c.label_use_id from chain c where c.label_use_id is not null)
      or l.id = (select j.label_use_id from jobs j where j.id = p_job and j.farm_id = p_farm)
      or l.deleted_at is null))
  select max(a.phi_days)::integer, max(a.rei_hours)::integer, count(*)::integer,
         -- a crop counts as MISSING unless it has a label with BOTH a waiting period and a re-entry period (a label with a hole is no label)
         (select count(*) from unnest(coalesce(p_crops, '{}'::uuid[])) c(crop) where not exists (select 1 from applies x where x.crop_id = c.crop and x.phi_days is not null and x.rei_hours is not null))::integer
  from applies a
$$;
drop function spray_floor_planting(uuid, uuid, uuid, uuid, uuid);

-- S1: the link trigger and the spray trigger take the SAME job row lock first, so «link a planting» and «record the spray» can never both pass their checks against each other
create or replace function forbid_link_after_spray() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  perform 1 from jobs where id = new.job_id and farm_id = new.farm_id for update;
  if auth.uid() is not null and exists (select 1 from job_spray s where s.job_id = new.job_id and s.farm_id = new.farm_id) then
    raise exception 'a planting cannot be added to a job that already has a spraying' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create function lock_job_before_spray() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  perform 1 from jobs where id = new.job_id and farm_id = new.farm_id for update;
  return new;
end $$;
create trigger job_spray_000_lock_job before insert on job_spray for each row execute function lock_job_before_spray();     -- «000»: it fires BEFORE the other before-insert triggers (by name)
revoke execute on function lock_job_before_spray() from public, anon, authenticated;

-- S3: a worker names ONLY herself as the cutter; the owner names any live worker of the farm
create or replace function check_harvest_cut_by() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']);
begin
  if auth.uid() is null then return new; end if;          -- fixtures / maintenance by the database owner only; every signed-in writer is checked
  if new.cut_by is null then raise exception 'a harvest needs the worker who cut it (cut_by)' using errcode = 'check_violation'; end if;
  if not exists (select 1 from workers w where w.id = new.cut_by and w.farm_id = new.farm_id and w.deleted_at is null and (not is_worker or w.user_id = auth.uid())) then
    raise exception 'the worker who cut must be a live worker of this farm (a worker can only name herself)' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- S4 + L1/L2: the scheduler uses its OWN narrow secret (`weather_cron_token`, created in the dashboard's Vault screen, never the service key), a 30 s timeout, and only calls an https Supabase function URL
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') or not exists (select 1 from pg_extension where extname = 'pg_net') or to_regclass('vault.decrypted_secrets') is null then
    raise notice '0032: pg_cron, pg_net or Vault is not enabled here: the weather schedule was NOT created (RUNBOOK §14, check with supabase/tests/verify_applied.sql)';
    return;
  end if;
  perform cron.schedule('weather-fetch', '7 */6 * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'weather_function_url'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'weather_cron_token')),
      body := '{}'::jsonb, timeout_milliseconds := 30000)
    where exists (select 1 from vault.decrypted_secrets where name = 'weather_function_url' and decrypted_secret like 'https://%.supabase.co/functions/v1/weather-fetch')
      and exists (select 1 from vault.decrypted_secrets where name = 'weather_cron_token')
  $job$);
end $$;

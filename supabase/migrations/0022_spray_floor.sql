-- 0022_spray_floor.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings of the team's 0021 review (m4-0021). A NEW file; builds on 0001–0021.
--  1  a spray whose label_use_id is EMPTY escaped the floor (a manual PHI 1 / REI 1 was accepted, the harvest opened on day 3). The floor now comes from every label that applies: the one the spray
--     names, the one its job names, and the ACTIVE label uses of the product on the crops of the job's plantings (the highest PHI and REI). With no such label the waiting period cannot be typed
--     by hand: unknown stays blocked;
--  4  every definer function of ours pins `pg_temp` last in its search_path (so a temporary object can never shadow one of ours).
-- The check at the very top stops with a clear message if 0021 is not there; it changes nothing.
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'label_uses_active_key' and indexdef ilike '%coalesce%') then
    raise exception '0022 stopped: 0021 is not applied (nothing was changed)';
  end if;
end $$;

-- team review m7 N1 (MUST): the labels are matched per PLANTING (per CROP), never per job. `spray_floor_crops` takes the crops that matter; `n` = the labels that apply to them, `missing` = how many of those crops have NO
-- label of this product at all (a crop without a label is UNKNOWN: harvest closed, a typed waiting period refused). The wrappers: `spray_floor` = all crops of the job's plantings (for a typed correction, which
-- covers the whole job), `spray_floor_planting` = the crop of ONE planting (for the harvest gate).
create function spray_floor_crops(p_farm uuid, p_job uuid, p_product uuid, p_spray uuid, p_crops uuid[], out phi integer, out rei integer, out n integer, out missing integer)
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
         (select count(*) from unnest(coalesce(p_crops, '{}'::uuid[])) c(crop) where not exists (select 1 from applies x where x.crop_id = c.crop))::integer
  from applies a
$$;
create function spray_floor(p_farm uuid, p_job uuid, p_product uuid, p_spray uuid, out phi integer, out rei integer, out n integer, out missing integer)
  language sql stable security definer set search_path = public, private, pg_temp as $$
  select f.phi, f.rei, f.n, f.missing from spray_floor_crops(p_farm, p_job, p_product, p_spray,
    (select array_agg(distinct pl.crop_id) from job_plantings jp join plantings pl on pl.id = jp.planting_id where jp.job_id = p_job and jp.farm_id = p_farm)) f
$$;
create function spray_floor_planting(p_farm uuid, p_job uuid, p_product uuid, p_spray uuid, p_planting uuid, out phi integer, out rei integer, out n integer, out missing integer)
  language sql stable security definer set search_path = public, private, pg_temp as $$
  select f.phi, f.rei, f.n, f.missing from spray_floor_crops(p_farm, p_job, p_product, p_spray, (select array[pl.crop_id] from plantings pl where pl.id = p_planting and pl.farm_id = p_farm)) f
$$;
revoke execute on function spray_floor_crops(uuid, uuid, uuid, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function spray_floor_planting(uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function spray_floor(uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- team review m6-0029 (MUST A1): the EARLIEST end of a spray's correction chain. The harvest gate asks «had this spraying ended by t?» of THIS moment, so a correction that moved the end can never make
-- the spraying «not yet happened» for the gate.
create function spray_first_end(p_farm uuid, p_spray uuid) returns timestamptz language sql stable security definer set search_path = public, private, pg_temp as $$
  with recursive chain(id, amends_id, sprayed_at) as (
    select s.id, s.amends_id, s.sprayed_at from job_spray s where s.id = p_spray and s.farm_id = p_farm
    union all
    select s.id, s.amends_id, s.sprayed_at from job_spray s join chain c on s.id = c.amends_id where s.farm_id = p_farm)
  select min(sprayed_at) from chain
$$;
revoke execute on function spray_first_end(uuid, uuid) from public, anon, authenticated;

create or replace function check_spray_record() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare lu record; o job_spray%rowtype; sl record;
begin
  new.received_at := now();      -- the SERVER's clock, whatever the writer sent (m2-0015 finding 2)
  if new.sprayed_at > now() then raise exception 'the end of a spraying cannot be in the future' using errcode = 'check_violation'; end if;
  if new.phi_days is not null and new.phi_until is distinct from new.sprayed_at + make_interval(hours => new.phi_days * 24) then
    raise exception 'phi_until must be exactly sprayed_at + % days (in hours)', new.phi_days using errcode = 'check_violation';
  end if;
  if new.rei_hours is not null and new.rei_until is distinct from new.sprayed_at + make_interval(hours => new.rei_hours) then
    raise exception 'rei_until must be exactly sprayed_at + % hours', new.rei_hours using errcode = 'check_violation';
  end if;
  if new.phi_source = 'label' then
    select l.product_id, l.sign_off_by, l.phi_days, l.rei_hours into lu from label_uses l where l.id = new.label_use_id and l.farm_id = new.farm_id
      and exists (select 1 from job_plantings jp where jp.job_id = new.job_id and jp.farm_id = new.farm_id)
      and not exists (select 1 from job_plantings jp join plantings pl on pl.id = jp.planting_id where jp.job_id = new.job_id and jp.farm_id = new.farm_id and pl.crop_id <> l.crop_id);   -- m7 N1: the label is of the crop of EVERY planting of the job
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
      select * into sl from spray_floor(new.farm_id, o.job_id, o.product_id, o.id);     -- the labels of THIS product on THIS job's crops, whether or not the spray names one (m5-0021 finding 1)
      if sl.n = 0 or sl.missing > 0 or sl.phi is null or sl.rei is null then
        raise exception 'no label with a known waiting period and re-entry period exists for this product and crop: it cannot be typed by hand (it stays unknown = blocked)' using errcode = 'check_violation';
      end if;
      if new.phi_days < sl.phi or new.rei_hours < sl.rei then
        raise exception 'a manual waiting period cannot be shorter than the label it points at' using errcode = 'check_violation';
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

create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']); t timestamptz; clash boolean; tolerance interval;
begin
  new.received_at := now();      -- the SERVER's clock (m2-0015 finding 2)
  tolerance := case when is_worker then interval '0' else interval '5 minutes' end;   -- a worker gets NO tolerance
  if new.harvested_at > now() + tolerance then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  foreach t in array case when is_worker then array[now(), new.harvested_at] when new.harvested_at >= now() - interval '5 minutes' then array[now()] else '{}'::timestamptz[] end loop
    select exists (
      select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
      left join lateral spray_floor_planting(s.farm_id, s.job_id, s.product_id, s.id, jp.planting_id) lf on true   -- the FLOOR: the labels of THIS PLANTING's crop (m7 N1)
      left join lateral (select spray_first_end(s.farm_id, s.id) as fe) x on true         -- the EARLIEST end of the chain (m6-0029 A1)
      where jp.planting_id = new.planting_id  and (x.fe <= t or t >= now()) and /* at «now» EVERY recorded spray counts (m7 N2), even one that ends a few minutes ahead */ not exists (select 1 from job_spray a where a.amends_id = s.id)
        and (s.phi_until is null or s.phi_until >= t or s.rei_until is null or s.rei_until >= t  or lf.n = 0 /* no label of this planting's crop = UNKNOWN = closed (m7 N1) */
             or (lf.phi is not null and s.sprayed_at + make_interval(hours => lf.phi * 24) >= t)
             or (lf.rei is not null and s.sprayed_at + make_interval(hours => lf.rei) >= t))) into clash;
    if clash then raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;



-- team review m7 N1 (b): a planting cannot be linked to a job that ALREADY has a spray (the plantings of a job are fixed when it is sprayed: linking one afterwards dodged the label match)
create function forbid_link_after_spray() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if auth.uid() is not null and exists (select 1 from job_spray s where s.job_id = new.job_id and s.farm_id = new.farm_id) then
    raise exception 'a planting cannot be added to a job that already has a spraying' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger job_plantings_no_link_after_spray before insert on job_plantings for each row execute function forbid_link_after_spray();
revoke execute on function forbid_link_after_spray() from public, anon, authenticated;

-- ---------------------------------------------------------------- 4
do $$ declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p
           where p.prosecdef and p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('alter function %s set search_path = public, private, pg_temp', r.f);
  end loop;
end $$;

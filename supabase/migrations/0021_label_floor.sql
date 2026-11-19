-- 0021_label_floor.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings of the team's 0020 review (m3-0020). A NEW file; builds on 0001–0020.
--  1  the floor of the harvest gate and of a manual correction came only from SIGNED label uses: next to an UNSIGNED label with PHI 7 a manual PHI of 1 was accepted and the harvest opened
--     on day 3. The floor is now the label use the spray names, signed or not (a missing value on the label = no floor from that value, as before; the unknown PHI still blocks);
--  5a the unique key (product, crop, target) let label uses WITHOUT a target escape (NULLs are distinct): a missing target counts as an empty one. The migration stops with a clear message
--     if such duplicates already exist (it never changes or deletes data by itself);
--  5b the freeze check (0020) read job_spray with the CALLER's rights, so a caller who may not see a spray could dodge it: it now runs with definer rights (search_path pinned, no EXECUTE for anyone).

create or replace function check_spray_record() returns trigger language plpgsql security definer set search_path = public, private as $$
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
      select l.phi_days, l.rei_hours into sl from label_uses l where l.id = o.label_use_id and l.farm_id = new.farm_id;   -- signed OR NOT: the label's own values are the floor (m4-0020 finding 1)
      if found and ((sl.phi_days is not null and new.phi_days < sl.phi_days) or (sl.rei_hours is not null and new.rei_hours < sl.rei_hours)) then
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

create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public, private as $$
declare is_worker boolean := auth.uid() is not null and has_role(new.farm_id, array['worker']) and not has_role(new.farm_id, array['owner']); t timestamptz; clash boolean; tolerance interval;
begin
  new.received_at := now();      -- the SERVER's clock (m2-0015 finding 2)
  tolerance := case when is_worker then interval '0' else interval '5 minutes' end;   -- a worker gets NO tolerance
  if new.harvested_at > now() + tolerance then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  foreach t in array case when is_worker then array[now(), new.harvested_at] when new.harvested_at >= now() - interval '5 minutes' then array[now()] else '{}'::timestamptz[] end loop
    select exists (
      select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
      left join label_uses lf on lf.id = coalesce(s.label_use_id, (select o.label_use_id from job_spray o where o.id = s.amends_id)) and lf.farm_id = s.farm_id   -- the FLOOR: the label use the spray names, signed or not
      where jp.planting_id = new.planting_id and s.sprayed_at <= t and not exists (select 1 from job_spray a where a.amends_id = s.id)
        and (s.phi_until is null or s.phi_until >= t or s.rei_until is null or s.rei_until >= t
             or (lf.phi_days is not null and s.sprayed_at + make_interval(hours => lf.phi_days * 24) >= t)
             or (lf.rei_hours is not null and s.sprayed_at + make_interval(hours => lf.rei_hours) >= t))) into clash;
    if clash then raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;


-- ---------------------------------------------------------------- 5a
do $$ begin
  if exists (select 1 from label_uses where deleted_at is null group by product_id, crop_id, coalesce(target, '') having count(*) > 1) then
    raise exception '0021 stopped: active label uses without a target exist twice for one product and crop; archive the duplicate (nothing was changed)';
  end if;
end $$;
drop index label_uses_active_key;
create unique index label_uses_active_key on label_uses (product_id, crop_id, coalesce(target, '')) where deleted_at is null;

-- ---------------------------------------------------------------- 5b
create or replace function forbid_used_label_change() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if old.sign_off_by is not null then return new; end if;     -- a signed label is already immutable (forbid_signed_label_change)
  if (new.product_id, new.crop_id, new.dose_kind, new.dose_unit, new.dose_min, new.dose_max, new.phi_days, new.rei_hours, new.max_apps, new.dose_min_not_on_label, new.dose_max_not_on_label, new.phi_days_not_on_label, new.rei_hours_not_on_label, new.max_apps_not_on_label)
     is distinct from (old.product_id, old.crop_id, old.dose_kind, old.dose_unit, old.dose_min, old.dose_max, old.phi_days, old.rei_hours, old.max_apps, old.dose_min_not_on_label, old.dose_max_not_on_label, old.phi_days_not_on_label, old.rei_hours_not_on_label, old.max_apps_not_on_label)
     and exists (select 1 from job_spray s where s.label_use_id = old.id) then
    raise exception 'a label use that a spray has already used cannot change its values: add a NEW label use (supersedes_id + change_reason) instead' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke execute on function forbid_used_label_change() from public, anon, authenticated;

-- 0023_spray_corrections.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Beta list item 7: a spray record can be corrected in EVERY field. A NEW file; builds on 0001–0022.
--  The record stays append-only: a correction is a NEW row that amends the one in force (one correction per row), with a REQUIRED reason; who and when stay on the row (actor, device, server time).
--  Every field may change except the JOB and the PRODUCT (a wrong product = a new spraying). Safety: a correction can never END the waiting period (PHI) or the re-entry period (REI) earlier than the
--  original ended, and a known period can not become unknown; a typed (manual) period still has the label floor of 0022 (no label = it cannot be typed).
-- The check at the very top stops with a clear message if 0022 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('spray_floor(uuid,uuid,uuid,uuid)') is null then raise exception '0023 stopped: 0022 is not applied (nothing was changed)'; end if;
end $$;

-- the old rule «a correction is always a MANUAL waiting period» no longer holds: a correction of the dose of a labelled spray keeps its label source. What stays: a correction always has a reason.
alter table job_spray drop constraint job_spray_amends_manual;
alter table job_spray add constraint job_spray_amends_reason check (amends_id is null or length(btrim(coalesce(amend_reason, ''))) > 0) not valid;

create or replace function check_spray_record() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
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
    -- a correction is a NEW row that amends the one in force (one correction per row, job_spray_one_correction); every field may differ EXCEPT the job and the product
    select * into o from job_spray where id = new.amends_id and farm_id = new.farm_id;
    if not found then raise exception 'the spray to correct does not exist in this farm' using errcode = 'check_violation'; end if;
    if o.job_id is distinct from new.job_id or o.product_id is distinct from new.product_id then
      raise exception 'a correction must be of the same job and product as the spray it corrects' using errcode = 'check_violation';
    end if;
    if length(btrim(coalesce(new.amend_reason, ''))) = 0 then raise exception 'a correction needs a reason' using errcode = 'check_violation'; end if;
    if new.label_use_id is not null and new.label_use_id is distinct from o.label_use_id then raise exception 'a correction names no label use of its own, or the one of the spray it corrects' using errcode = 'check_violation'; end if;
    -- the waiting periods can never END earlier than the original ended, and a known one cannot become unknown
    if o.phi_until is not null and (new.phi_until is null or new.phi_until < o.phi_until) then raise exception 'a correction cannot end the waiting period (PHI) earlier than the original, nor make it unknown' using errcode = 'check_violation'; end if;
    if o.rei_until is not null and (new.rei_until is null or new.rei_until < o.rei_until) then raise exception 'a correction cannot end the re-entry period (REI) earlier than the original, nor make it unknown' using errcode = 'check_violation'; end if;
    if new.phi_source = 'manual' then
      if new.phi_days is null or new.phi_days < 1 or new.rei_hours is null or new.rei_hours < 1 then raise exception 'a manual waiting period must be above zero' using errcode = 'check_violation'; end if;
      select * into sl from spray_floor(new.farm_id, o.job_id, o.product_id, o.label_use_id);     -- the labels of THIS product on THIS job's crops, whether or not the spray names one (m5-0021 finding 1)
      if sl.n = 0 or sl.phi is null or sl.rei is null then
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


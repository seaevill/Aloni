-- 0023_spray_corrections.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Beta list item 7: a spray record can be corrected in EVERY field. A NEW file; builds on 0001–0022.
--  The record stays append-only: a correction is a NEW row that amends the one in force (one correction per row), with a REQUIRED reason; who and when stay on the row (actor, device, server time).
--  Every field may change except the JOB and the PRODUCT (a wrong product = a new spraying). Safety: a correction can never END the waiting period (PHI) or the re-entry period (REI) earlier than the
--  original ended, and a known period can not become unknown; a typed (manual) period still has the label floor of 0022 (no label = it cannot be typed).
-- The check at the very top stops with a clear message if 0022 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('spray_floor(uuid,uuid,uuid,uuid)') is null then raise exception '0023 stopped: 0022 is not applied (nothing was changed)'; end if;
end $$;

-- the old rule «a correction is always a MANUAL waiting period» no longer holds: a correction of the dose of a labelled spray keeps its label source. What stays: a correction always has a
-- reason (job_spray_amend_reason, 0011: it is NOT added a second time here).
alter table job_spray drop constraint job_spray_amends_manual;

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
    select l.product_id, l.sign_off_by, l.phi_days, l.rei_hours into lu from label_uses l where l.id = new.label_use_id and l.farm_id = new.farm_id
      and l.crop_id in (select pl.crop_id from job_plantings jp join plantings pl on pl.id = jp.planting_id where jp.job_id = new.job_id and jp.farm_id = new.farm_id);   -- m6-0029: the label of a crop of THIS job
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
    -- team review m5-0024 MUST 1: the END of a spraying can never move earlier by a correction (an unknown wait could be back-dated past the late-entry rule and the harvest opened at once).
    -- A LATER end is fine (a longer wait). The floor of the harvest gate is therefore always counted from the LATEST of the original and the corrected end.
    -- team review m6-0029 MUST A1: nor LATER than the server's clock (the original may carry the 5-minute tolerance, a correction never goes beyond it or beyond now): the spray stays in the harvest gate
    if new.sprayed_at > greatest(now(), o.sprayed_at) then raise exception 'a correction cannot move the end of a spraying later than now' using errcode = 'check_violation'; end if;
    if new.sprayed_at < o.sprayed_at then raise exception 'a correction cannot move the end of a spraying earlier than it was recorded' using errcode = 'check_violation'; end if;
    -- review SHOULD 2: a correction that names no label keeps the label of the record it corrects (the chain keeps it; the floor reads every label of the chain)
    if new.label_use_id is null then new.label_use_id := o.label_use_id; end if;
    if new.label_use_id is not null and new.label_use_id is distinct from o.label_use_id then raise exception 'a correction names no label use of its own, or the one of the spray it corrects' using errcode = 'check_violation'; end if;
    -- the waiting periods can never END earlier than the original ended, and a known one cannot become unknown
    if o.phi_until is not null and (new.phi_until is null or new.phi_until < o.phi_until) then raise exception 'a correction cannot end the waiting period (PHI) earlier than the original, nor make it unknown' using errcode = 'check_violation'; end if;
    if o.rei_until is not null and (new.rei_until is null or new.rei_until < o.rei_until) then raise exception 'a correction cannot end the re-entry period (REI) earlier than the original, nor make it unknown' using errcode = 'check_violation'; end if;
    if new.phi_source = 'manual' then
      if new.phi_days is null or new.phi_days < 1 or new.rei_hours is null or new.rei_hours < 1 then raise exception 'a manual waiting period must be above zero' using errcode = 'check_violation'; end if;
      select * into sl from spray_floor(new.farm_id, o.job_id, o.product_id, o.id);     -- the labels of THIS product on THIS job's crops, whether or not the spray names one (m5-0021 finding 1)
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


-- review LOW 8: a correction that changes the QUANTITY or the LOT of a spraying must come with its stock movements IN THE SAME TRANSACTION (the old quantity goes back in, the new one comes out).
-- The check is deferred to the end of the transaction, so the phone's one-transaction group (record + movements) passes and a lone record does not.
create function check_spray_correction_stock() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare o job_spray%rowtype; back boolean; taken boolean;
begin
  if new.amends_id is null then return null; end if;
  select * into o from job_spray where id = new.amends_id and farm_id = new.farm_id;
  if not found or (new.qty_str is not distinct from o.qty_str and new.lot_key is not distinct from o.lot_key) then return null; end if;
  -- m6-0029 SHOULD A2: the movements are recognised by WHAT they are (job, lot, quantity, reason, not older than the record they correct), not by the transaction number: inside apply_ops
  -- (every op in a savepoint) xmin is the sub-transaction's, so the old check rejected a correct phone group at COMMIT.
  select exists (select 1 from stock_movements m where m.farm_id = new.farm_id and m.job_id = new.job_id and m.direction = 'in' and m.reason = 'spray_correction' and m.lot_key is not distinct from o.lot_key and m.qty_str is not distinct from o.qty_str and m.created_at >= o.created_at),
         exists (select 1 from stock_movements m where m.farm_id = new.farm_id and m.job_id = new.job_id and m.direction = 'out' and m.reason = 'spray' and m.lot_key is not distinct from new.lot_key and m.qty_str is not distinct from new.qty_str and m.created_at >= o.created_at) into back, taken;
  if o.qty_str is not null and not back then raise exception 'a correction of the quantity or the lot needs the old quantity put back in the stock (a movement) in the same transaction' using errcode = 'check_violation'; end if;
  if new.qty_str is not null and not taken then raise exception 'a correction of the quantity or the lot needs the new quantity taken out of the stock (a movement) in the same transaction' using errcode = 'check_violation'; end if;
  return null;
end $$;
create constraint trigger job_spray_correction_stock after insert on job_spray deferrable initially deferred for each row execute function check_spray_correction_stock();
revoke execute on function check_spray_correction_stock() from public, anon, authenticated;

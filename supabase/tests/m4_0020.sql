-- Findings of the team's 0019 review (migration 0020): (b) an ARCHIVED label use no longer blocks a new one for the same product × crop × target; (c) the values of an unsigned
-- label use that a spray has already used are FROZEN (they could be lowered and then signed). Runs AFTER m3_0019.sql on the same database. Written BEFORE 0020: against 0001–0019 both fail.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
-- (b)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; crop constant uuid := 'cccccccc-0000-0000-0000-000000000002';
begin
  insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps) values ('cccccccc-1111-0000-0000-000000000a01', f, prod, crop, 'm4 key', 'single', 'ml/str', 0.025, 7, 24, 3);
  begin insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps) values (gen_random_uuid(), f, prod, crop, 'm4 key', 'single', 'ml/str', 0.025, 7, 24, 3);
    raise exception '(b) two ACTIVE label uses for one product, crop and target'; exception when unique_violation then null; end;
  update label_uses set deleted_at = now() where id = 'cccccccc-1111-0000-0000-000000000a01';      -- archive it
  insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps) values ('cccccccc-1111-0000-0000-000000000a02', f, prod, crop, 'm4 key', 'single', 'ml/str', 0.025, 7, 24, 3);
end $$;
-- (c)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; crop constant uuid := 'cccccccc-0000-0000-0000-000000000002'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000a03';
begin
  insert into label_uses(id, farm_id, product_id, crop_id, target, dose_kind, dose_unit, dose_min, phi_days, rei_hours, max_apps) values (lu, f, prod, crop, 'm4 used', 'single', 'ml/str', 0.025, 7, 24, 3);
  update label_uses set phi_days = 5 where id = lu;                                    -- not used yet: free to edit
  insert into job_spray(id, farm_id, job_id, product_id, applicator_id, label_use_id, sprayed_at, dose_str, dose_unit, label_state)
    values ('55555555-0000-0000-0000-000000000a03', f, 'eeeeeeee-0000-0000-0000-000000000901', prod, w1, lu, now() - interval '1 hour', 0.025, 'ml/str', 'unsigned');
  begin update label_uses set phi_days = 1 where id = lu; raise exception '(c) the PHI of a USED unsigned label was lowered'; exception when check_violation then null; end;
  begin update label_uses set rei_hours = 1 where id = lu; raise exception '(c) the REI of a used unsigned label was lowered'; exception when check_violation then null; end;
  begin update label_uses set max_apps = 9 where id = lu; raise exception '(c) the max applications of a used unsigned label were changed'; exception when check_violation then null; end;
  begin update label_uses set dose_min = 0.5 where id = lu; raise exception '(c) the dose of a used unsigned label was changed'; exception when check_violation then null; end;
  update label_uses set sign_off_by = 'agronomist', sign_off_on = current_date, sign_off_fingerprint = 'fp' where id = lu;    -- signing the values AS THEY ARE stays possible
  update label_uses set deleted_at = now() where id = lu;                                                                   -- and archiving
end $$;
do $$ begin raise notice 'm4-0020 tests passed'; end $$;

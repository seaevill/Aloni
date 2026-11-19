-- Migration 0023: a spray record can be corrected in EVERY field (dose, unit, quantity, water, note, applicator, end time, waiting periods) by a NEW row that amends the original and says why;
-- the original stays; a correction can never END a waiting period earlier than the original did, nor make a known waiting period unknown; the product and the job stay. Runs AFTER m5_0022.sql.
-- Written BEFORE 0023: against 0001–0022 these fail (the server only accepted a correction of an unknown waiting period).
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; t timestamptz := now() - interval '2 hours';
begin
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-000000000951',f,p,crop2,0.25,'2026-11-01','growing');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at,label_use_id) values ('eeeeeeee-0000-0000-0000-000000000951',f,'spray','done',w1,prod,t,lu);
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000951','dddddddd-0000-0000-0000-000000000951');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
    values ('55555555-0000-0000-0000-000000000951',f,'eeeeeeee-0000-0000-0000-000000000951',prod,w1,lu,t,0.025,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours');
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        j constant uuid := 'eeeeeeee-0000-0000-0000-000000000951'; s1 constant uuid := '55555555-0000-0000-0000-000000000951'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000951');
begin
  -- no reason: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id)
    values (f,j,prod,w1,lu,t,0.03,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',s1); raise exception '(5) a correction without a reason was accepted';
  exception when check_violation then null; end;
  -- an END EARLIER than the original (the waiting period would end earlier): refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,j,prod,w1,lu,t - interval '1 day',0.025,'ml/str','signed',7,24,'label',t - interval '1 day' + interval '168 hours',t - interval '1 day' + interval '24 hours',s1,'typo'); raise exception '(5) a correction made the waiting period end earlier';
  exception when check_violation then null; end;
  -- a known waiting period made unknown: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,amends_id,amend_reason)
    values (f,j,prod,w1,lu,t,0.025,'ml/str','unsigned',s1,'x'); raise exception '(5) a correction erased a known waiting period';
  exception when check_violation then null; end;
  -- another product: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,j,'aaaaaaaa-0000-0000-0000-000000000009',w1,lu,t,0.025,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',s1,'x'); raise exception '(5) a correction changed the product';
  exception when check_violation then null; end;
  -- a correction of the DOSE (every field is correctable), same waiting periods, with a reason: accepted
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-000000000952',f,j,prod,w1,lu,t,0.03,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',s1,'dose was typed wrong');
  -- the original is still there, unchanged
  if (select dose_str from job_spray where id = s1) <> 0.025 then raise exception '(5) the original was changed'; end if;
  -- a LATER end time (the waiting period ends later): accepted; a correction of that correction chains
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-000000000953',f,j,prod,w1,lu,t + interval '30 minutes',0.03,'ml/str','signed',7,24,'label',t + interval '30 minutes' + interval '168 hours',t + interval '30 minutes' + interval '24 hours','55555555-0000-0000-0000-000000000952','the spraying ended 30 minutes later');
  -- the same original corrected twice: refused (one correction per row)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,j,prod,w1,lu,t,0.04,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',s1,'again'); raise exception '(5) the same row was corrected twice';
  exception when unique_violation then null; end;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm5-0023 tests passed'; end $$;

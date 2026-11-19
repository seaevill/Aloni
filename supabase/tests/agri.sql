-- Agricultural record tests (review part B, 2026-11-18). Runs AFTER smoke.sql / review.sql on the same database, as the table owner (the checks are triggers).
\set ON_ERROR_STOP on
set time zone 'Europe/Athens';   -- the farm's own zone: the waiting periods must NOT depend on it

do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; j constant uuid := gen_random_uuid(); sp uuid; unk uuid; t timestamptz;
begin
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values (j,f,'spray','done',w,prod,'2026-10-24 22:00+00');
  -- the job's plantings tell which label uses apply (0022): without them a manual waiting period has no label to be compared with
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-0000000008a1',f,p,crop2,0.25,'2026-10-01','growing');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,j,'dddddddd-0000-0000-0000-0000000008a1');
  -- PHI/REI are absolute hours from the entered end time. The spraying ended 2026-10-24 22:00 UTC = 25 Oct 01:00 Athens; the clocks go back that morning.
  t := '2026-10-24 22:00+00';
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (gen_random_uuid(),f,j,prod,w,lu,t,0.025,'ml/str','signed',7,24,'label', t + interval '168 hours', t + interval '24 hours', t + interval '1 hour') returning id into sp;
  -- the «calendar days» answer (a day is 25 h across the change in Athens: 169 h) and a shorter one are both refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,lu,t,0.025,'ml/str','signed',7,24,'label', t + interval '7 days', t + interval '24 hours', t + interval '1 hour'); raise exception 'PHI counted in calendar days accepted';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,lu,t,0.025,'ml/str','signed',7,24,'label', t + interval '167 hours', t + interval '24 hours', t + interval '1 hour'); raise exception 'a shortened PHI accepted';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,lu,t,0.025,'ml/str','signed',7,24,'label', t + interval '168 hours', t + interval '23 hours', t + interval '1 hour'); raise exception 'a shortened REI accepted';
  exception when check_violation then null; end;
  -- a label waiting period must be the SIGNED label use's own value
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,lu,t,0.025,'ml/str','signed',3,24,'label', t + interval '72 hours', t + interval '24 hours', t + interval '1 hour'); raise exception 'PHI different from the label accepted';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,t,0.025,'ml/str','signed',7,24,'label', t + interval '168 hours', t + interval '24 hours', t + interval '1 hour'); raise exception 'label PHI without a label use accepted';
  exception when check_violation then null; end;
  -- a missing label value is NOT a zero wait: NULLs stay NULL together, and a «0» needs its own days value
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_until,created_at) values (f,j,prod,w,t,0.025,'ml/str','unsigned', t, t + interval '1 hour'); raise exception 'a PHI end without days accepted';
  exception when check_violation then null; end;
  -- the end of a spraying cannot be in the future
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values (f,j,prod,w,now() + interval '1 hour',0.025,'ml/str','unsigned'); raise exception 'a spraying that ends in the future accepted';
  exception when check_violation then null; end;
  -- late entries are judged by the SERVER's clock (received_at; 0015): kept and marked, never refused (the details are in final.sql, block e)
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at,flags,late_reason) values (f,j,prod,w,'2026-10-01 08:00+00',0.025,'ml/str','unsigned','2026-10-08 08:00:01+00',array['late_entry'],'Forgot to write it down');
  -- an UNSIGNED spray (waiting period unknown) to be corrected, written long ago
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at) values (gen_random_uuid(),f,j,prod,w,t,0.025,'ml/str','unsigned',t + interval '1 hour') returning id into unk;
  -- a correction written long after the spraying is NOT a late entry (it names the label's values whenever they are found)
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,j,prod,w,t,0.025,'ml/str','unsigned',7,24,'manual', t + interval '168 hours', t + interval '24 hours', unk, 'values read from the label', t + interval '30 days');
  -- a correction says WHY, and a «manual» waiting period exists only as a correction
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,created_at)
    values (f,j,prod,w,t,0.025,'ml/str','signed',7,24,'manual', t + interval '168 hours', t + interval '24 hours', sp, t + interval '2 hours'); raise exception 'an amending row without a reason accepted';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j,prod,w,t,0.025,'ml/str','unsigned',7,24,'manual', t + interval '168 hours', t + interval '24 hours', t + interval '2 hours'); raise exception 'a manual waiting period that corrects nothing accepted';
  exception when check_violation then null; end;
end $$;

-- recording vs permission
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        lu constant uuid := 'cccccccc-1111-0000-0000-000000000001';
        pl_rei constant uuid := 'dddddddd-0000-0000-0000-0000000000b1'; j_rei constant uuid := 'eeeeeeee-0000-0000-0000-0000000000b1';
        pl_old constant uuid := 'dddddddd-0000-0000-0000-0000000000b2'; j_old constant uuid := 'eeeeeeee-0000-0000-0000-0000000000b2'; n int;
begin
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (pl_rei,f,p,crop2,0.25,'2026-11-17','growing'), (pl_old,f,p,crop2,0.25,'2026-11-17','growing');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values (j_rei,f,'spray','done',w,prod,now() - interval '1 hour'), (j_old,f,'spray','done',w,prod,now());
  insert into job_plantings(farm_id,job_id,planting_id) values (f,j_rei,pl_rei), (f,j_old,pl_old);
  -- PHI is over (0 days from a signed label that really says 0) but the REI of 24 h still runs: no NEW harvest
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint)
    values ('cccccccc-1111-0000-0000-000000000002',f,prod,crop2,'zero-phi','single','ml/str',0.025,0,24,3,'Test Agronomist','2026-11-01','fp');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,j_rei,prod,w,'cccccccc-1111-0000-0000-000000000002', now() - interval '1 hour',0.025,'ml/str','signed',0,24,'label', now() - interval '1 hour', now() + interval '23 hours', now() - interval '1 hour' + interval '1 minute');
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl_rei,5,now()); raise exception 'a new harvest started during the REI'; exception when check_violation then null; end;
  -- a harvest that REALLY happened earlier is recorded, never lost: it is entered later, inside the PHI of a spray (here: 30 minutes ago), and it shows as a conflict
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl_rei,5,now() - interval '30 minutes');
  select count(*) into n from harvest_conflicts where planting_id = pl_rei and rei_problem = 'rei_running'; if n <> 1 then raise exception 'conflict not visible (%)', n; end if;
  -- a spray entered LATER that conflicts with an older harvest: both records stay, the conflict is visible
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl_old,7,now() - interval '2 hours');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at) values (f,j_old,prod,w,now() - interval '3 hours',0.025,'ml/str','unsigned',now() - interval '3 hours' + interval '1 minute');
  select count(*) into n from harvest_conflicts where planting_id = pl_old and phi_problem = 'phi_unknown'; if n <> 1 then raise exception 'late spray conflict not visible (%)', n; end if;
  select count(*) into n from job_harvest where planting_id in (pl_rei, pl_old); if n <> 2 then raise exception 'a conflicting record was lost'; end if;
  -- a spray AFTER the harvest is no conflict
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl_old,1,now() - interval '4 hours');
  select count(*) into n from harvest_conflicts where planting_id = pl_old and harvested_at < now() - interval '3 hours 30 minutes'; if n <> 0 then raise exception 'a harvest BEFORE the spray was called a conflict'; end if;
end $$;

-- the hash chain verifies, and notices a change made behind its back
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; n int; first_id uuid;
begin
  select count(*) into n from verify_spray_chain(f); if n <> 0 then raise exception 'an honest chain reported % problems: %', n, (select string_agg(problem, '; ') from verify_spray_chain(f)); end if;
  select id into first_id from job_spray where farm_id = f order by chain_no limit 1;
  -- change a row behind the chain's back, look, and undo it (the sub-transaction rolls the change and the trigger switch back)
  begin
    alter table job_spray disable trigger job_spray_append_only;
    update job_spray set dose_str = 9 where id = first_id;
    alter table job_spray enable trigger job_spray_append_only;
    select count(*) into n from verify_spray_chain(f) where problem like 'the row was changed%';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if;
  end;
  if n <> 1 then raise exception 'tampering not detected (%)', n; end if;
  if (select count(*) from verify_spray_chain(f)) <> 0 then raise exception 'the undo did not restore the chain'; end if;
end $$;

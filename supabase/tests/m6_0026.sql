-- Migration 0026: TANK MIX. Each product of a mix is its OWN spray record (own label, dose, PHI/REI); the records share a mix_id. The time and the applicator belong to the whole mix.
-- Attacks: a product of the mix dated EARLIER (to shorten the wait), a correction that moves one product's end time or applicator, a correction that moves a record in or out of a mix,
-- and the harvest gate: the LONGEST waiting period of the mix blocks. Runs AFTER m6_0025.sql. Written BEFORE 0026: against 0001–0025 the column does not exist.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; w2 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002'; pa constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; pb constant uuid := 'aaaaaaaa-0000-0000-0000-000000000971';
        la constant uuid := 'cccccccc-1111-0000-0000-000000000001'; lb constant uuid := 'cccccccc-1111-0000-0000-000000000971'; mix constant uuid := '99999999-0000-0000-0000-000000000971'; t timestamptz := now() - interval '8 days';
begin
  insert into workers(id,farm_id,name) values (w2,f,'second applicator') on conflict do nothing;
  insert into products(id,farm_id,name,type,unit) values (pb,f,'m6 product B (PHI 14)','insecticide','kg');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values (lb,f,pb,crop2,'m6','single','ml/str',0.05,14,24,3);
  update label_uses set sign_off_by = 'agronomist', sign_off_on = current_date, sign_off_fingerprint = 'fp' where id = lb;
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-000000000971',f,p,crop2,0.25,'2026-11-01','growing');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at,label_use_id) values ('eeeeeeee-0000-0000-0000-00000000097a',f,'spray','done',w1,pa,t,la), ('eeeeeeee-0000-0000-0000-00000000097b',f,'spray','done',w1,pb,t,lb);
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-00000000097a','dddddddd-0000-0000-0000-000000000971'), (f,'eeeeeeee-0000-0000-0000-00000000097b','dddddddd-0000-0000-0000-000000000971');
  -- product A (PHI 7, signed) and product B (PHI 14, signed), the same tank: accepted
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,mix_id)
    values ('55555555-0000-0000-0000-00000000097a',f,'eeeeeeee-0000-0000-0000-00000000097a',pa,w1,la,t,0.025,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',mix);
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,mix_id)
    values ('55555555-0000-0000-0000-00000000097b',f,'eeeeeeee-0000-0000-0000-00000000097b',pb,w1,lb,t,0.05,'ml/str','signed',14,24,'label',t + interval '336 hours',t + interval '24 hours',mix);
  -- ATTACK: a third product of the same mix dated an hour EARLIER (a shorter wait): refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,mix_id)
    values (f,'eeeeeeee-0000-0000-0000-00000000097b',pb,w1,t - interval '1 hour',0.05,'ml/str','unsigned',mix); raise exception '(0026) a mix member with another end time was accepted';
  exception when check_violation then null; end;
  -- ATTACK: another applicator inside the mix: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,mix_id)
    values (f,'eeeeeeee-0000-0000-0000-00000000097b',pb,w2,t,0.05,'ml/str','unsigned',mix); raise exception '(0026) a mix member with another applicator was accepted';
  exception when check_violation then null; end;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pa constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; la constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        w2 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002'; mix constant uuid := '99999999-0000-0000-0000-000000000971'; j constant uuid := 'eeeeeeee-0000-0000-0000-00000000097a'; s1 constant uuid := '55555555-0000-0000-0000-00000000097a';
        t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-00000000097a');
begin
  -- the harvest gate: day 8, product A's wait (7 days) is over, product B's (14 days) is not: the LONGEST wait of the mix blocks
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001',f,'dddddddd-0000-0000-0000-000000000971',now(),1);
    raise exception '(0026) the harvest passed although a product of the mix still has a running waiting period';
  exception when check_violation then null; end;
  -- ATTACK: correcting ONE product's end time (later) or applicator: refused (they belong to the whole mix)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,mix_id)
    values (f,j,pa,w1,la,t + interval '1 hour',0.025,'ml/str','signed',7,24,'label',t + interval '1 hour' + interval '168 hours',t + interval '25 hours','55555555-0000-0000-0000-00000000097a','x',mix);
    raise exception '(0026) one product of a mix had its end time corrected alone';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,mix_id)
    values (f,j,pa,w2,la,t,0.025,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours','55555555-0000-0000-0000-00000000097a','x',mix);
    raise exception '(0026) one product of a mix had its applicator corrected alone';
  exception when check_violation then null; end;
  -- ATTACK: a correction that LEAVES the mix: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,j,pa,w1,la,t,0.025,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours','55555555-0000-0000-0000-00000000097a','x');
    raise exception '(0026) a correction left the mix';
  exception when check_violation then null; end;
  -- a correction of ONE product's dose, staying in the mix: accepted, and the other product is untouched
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,mix_id)
    values ('55555555-0000-0000-0000-00000000097c',f,j,pa,w1,la,t,0.03,'ml/str','signed',7,24,'label',t + interval '168 hours',t + interval '24 hours',s1,'dose typed wrong',mix);
  if (select count(*) from job_spray where mix_id = mix) <> 3 then raise exception '(0026) the mix does not show original + correction + the other product'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm6-0026 tests passed'; end $$;

-- Findings of the team's 0020 review (migration 0021): (1) the floor of the harvest gate and of manual corrections comes from the label use a spray names WHETHER OR NOT it is signed;
-- (5) a label use without a target also counts for the unique key; the freeze check runs with definer rights. Runs AFTER m4_0020.sql. Written BEFORE 0021: against 0001–0020 these fail.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
        crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := now() - interval '3 days';
begin
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-000000000921',f,p,crop2,0.25,'2026-11-01','growing');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-000000000921',f,prod,crop2,'m4 floor','single','ml/str',0.025,7,24,3);   -- UNSIGNED, PHI 7 / REI 24
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000921',f,'spray','done',w1,prod,now() - interval '1 hour');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000921','dddddddd-0000-0000-0000-000000000921');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-000000000921',f,'eeeeeeee-0000-0000-0000-000000000921',prod,w1,'cccccccc-1111-0000-0000-000000000921',t,0.025,'ml/str','unsigned');
end $$;
-- (1a) as the real signed-in owner: a manual correction SHORTER than the (unsigned) label it points at is refused; one at or above it is accepted
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000921');
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000921',prod,w1,t,0.025,'ml/str','unsigned',1,24,'manual',t + interval '1 day',t + interval '24 hours','55555555-0000-0000-0000-000000000921','x');
    raise exception '(1a) a manual PHI of 1 day was accepted against an unsigned label with PHI 7';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000921',prod,w1,t,0.025,'ml/str','unsigned',7,1,'manual',t + interval '7 days',t + interval '1 hour','55555555-0000-0000-0000-000000000921','x');
    raise exception '(1a) a manual REI of 1 hour was accepted against an unsigned label with REI 24';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
-- (1b) the gate itself: a short correction that got in with the triggers off does not open the gate on day 3, because the floor is read from the unsigned label too
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000921');
begin
  set session_replication_role = replica;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-000000000922',f,'eeeeeeee-0000-0000-0000-000000000921',prod,w1,'cccccccc-1111-0000-0000-000000000921',t,0.025,'ml/str','unsigned',1,1,'manual',t + interval '1 day',t + interval '1 hour','55555555-0000-0000-0000-000000000921','x');
  set session_replication_role = origin;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into job_harvest(farm_id,planting_id,harvested_at,crates_str) values (f,'dddddddd-0000-0000-0000-000000000921',now(),1); raise exception '(1b) the harvest gate opened on day 3 against an unsigned label with PHI 7';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
-- (5a) two ACTIVE label uses with NO target for one product and crop are one too many
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
begin
  insert into label_uses(id,farm_id,product_id,crop_id,dose_kind,dose_unit,dose_min) values ('cccccccc-1111-0000-0000-000000000931',f,prod,crop2,'single','ml/str',0.025);
  begin insert into label_uses(id,farm_id,product_id,crop_id,dose_kind,dose_unit,dose_min) values (gen_random_uuid(),f,prod,crop2,'single','ml/str',0.025);
    raise exception '(5a) two active label uses without a target';
  exception when unique_violation then null; end;
end $$;
-- (5b) the freeze check does not depend on what the caller may see
do $$ begin
  if not (select prosecdef from pg_proc where proname = 'forbid_used_label_change' and pronamespace = 'public'::regnamespace) then raise exception '(5b) forbid_used_label_change runs with the caller''s rights'; end if;
end $$;
do $$ begin raise notice 'm4-0021 tests passed'; end $$;

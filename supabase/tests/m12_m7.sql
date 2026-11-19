-- Team review m7-recheck (docs/reviews/team/2026-11-19-m7-recheck.md): N1 (labels per PLANTING, not per job), N2 (no spray end in the future, the gate never skips an unknown PHI), N3 (stock check tied to the
-- top-level transaction), LOWs. Real `authenticated` owner and worker; only the fixtures run as superuser. Written BEFORE the fixes. Runs after m11_cut_by.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; ca constant uuid := 'cccccccc-0000-0000-0000-0000000012a1'; cb constant uuid := 'cccccccc-0000-0000-0000-0000000012a2';
        lb constant uuid := 'cccccccc-1111-0000-0000-0000000012a2'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000012a0';
begin
  insert into crops(id,farm_id,slug,name_el) values (ca,f,'m12a','Μ12α'), (cb,f,'m12b','Μ12β');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m12 product','fungicide','kg');
  insert into stock_lots(id,lot_key,farm_id,product_id,expiry) values (lot,lot,f,pq,'2030-01-01');
  insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason) values (f,lot,pq,'in',50,'receipt');
  -- crop B has a SIGNED label (PHI 3 / REI 24); crop A has NO label
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint) values (lb,f,pq,cb,'m12','single','ml/str',0.025,3,24,3,'agronomist',current_date,'fp');
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-0000000012a1',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000012b1',f,p,cb,0.25,'2026-11-01','growing'),
    ('dddddddd-0000-0000-0000-0000000012a2',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000012a3',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000012a4',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000012b2',f,p,cb,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000012b3',f,p,cb,0.25,'2026-11-01','growing');
  -- jobs: 1 = A + B (a) label of the other crop; 2 = only B (b) A linked afterwards; 3 = A + B (c) a typed PHI; 4 = worker's «Έγινε» on A + B with the B label; 5 = a spray ending in the future (fixture) for the gate
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-0000000012a1',f,'spray','done',w1,pq,now() - interval '30 minutes'), ('eeeeeeee-0000-0000-0000-0000000012a2',f,'spray','done',w1,pq,now() - interval '30 minutes'),
    ('eeeeeeee-0000-0000-0000-0000000012a3',f,'spray','done',w1,pq,now() - interval '30 minutes'), ('eeeeeeee-0000-0000-0000-0000000012a5',f,'spray','done',w1,pq,now() - interval '30 minutes'), ('eeeeeeee-0000-0000-0000-0000000012a6',f,'spray','done',w1,pq,now() - interval '30 minutes');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-0000000012a4',f,'spray','planned',w1,pq,lb,0.025,'ml/str',current_date);
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000012a1','dddddddd-0000-0000-0000-0000000012a1'), (f,'eeeeeeee-0000-0000-0000-0000000012a1','dddddddd-0000-0000-0000-0000000012b1'),
    (f,'eeeeeeee-0000-0000-0000-0000000012a2','dddddddd-0000-0000-0000-0000000012b1'),
    (f,'eeeeeeee-0000-0000-0000-0000000012a3','dddddddd-0000-0000-0000-0000000012a2'), (f,'eeeeeeee-0000-0000-0000-0000000012a3','dddddddd-0000-0000-0000-0000000012b1'),
    (f,'eeeeeeee-0000-0000-0000-0000000012a4','dddddddd-0000-0000-0000-0000000012a3'), (f,'eeeeeeee-0000-0000-0000-0000000012a4','dddddddd-0000-0000-0000-0000000012b2'),
    (f,'eeeeeeee-0000-0000-0000-0000000012a5','dddddddd-0000-0000-0000-0000000012a4'), (f,'eeeeeeee-0000-0000-0000-0000000012a6','dddddddd-0000-0000-0000-0000000012b3');
  -- unknown sprays (no label named) of jobs 3 and 5; job 5's ends 4 minutes in the FUTURE (a fixture: the rule below refuses it for a signed-in person)
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000012a3',f,'eeeeeeee-0000-0000-0000-0000000012a3',pq,w1,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','none');
  set local session_replication_role = replica;      -- the future end can no longer be recorded through the checks: the fixture bypasses them (the gate must hold even so)
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000012a5',f,'eeeeeeee-0000-0000-0000-0000000012a5',pq,w1,now() + interval '4 minutes',now() - interval '40 minutes',0.025,'ml/str','none');
  set local session_replication_role = origin;
  -- job 2: a valid spray of ONLY crop B with the signed B label, ended 30 minutes ago
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
    values ('55555555-0000-0000-0000-0000000012a2',f,'eeeeeeee-0000-0000-0000-0000000012a2',pq,w1,lb,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','signed',3,24,'label',now() - interval '30 minutes' + interval '72 hours',now() - interval '30 minutes' + interval '24 hours');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,lot_key,qty_str)
    values ('55555555-0000-0000-0000-0000000012a6',f,'eeeeeeee-0000-0000-0000-0000000012a6',pq,w1,lb,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','signed',3,24,'label',now() - interval '30 minutes' + interval '72 hours',now() - interval '30 minutes' + interval '24 hours',lot,1);
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';

-- N1 (a): a spray of a job that holds a crop-A and a crop-B planting cannot take the crop-B label
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lb constant uuid := 'cccccccc-1111-0000-0000-0000000012a2';
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
        values (f,'eeeeeeee-0000-0000-0000-0000000012a1',pq,w1,lb,now() - interval '20 minutes',now() - interval '30 minutes',0.025,'ml/str','signed',3,24,'label',now() - interval '20 minutes' + interval '72 hours',now() - interval '20 minutes' + interval '24 hours');
        raise exception '(N1a) the label of crop B was taken for a job that also holds a crop-A planting';
  exception when check_violation then null; end;
end $$;
-- N1 (b): a planting cannot be linked to a job that already has a spray
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000012a2','dddddddd-0000-0000-0000-0000000012a1');
        raise exception '(N1b) a crop-A planting was linked to a job after its spray (day-4 harvest)';
  exception when check_violation then null; end;
end $$;
-- N1 (c): a typed PHI 3 / REI 24 on a spray of a job with a crop-A planting (no label for A) is refused
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000012a3');
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
        values (f,'eeeeeeee-0000-0000-0000-0000000012a3',pq,w1,t,t - interval '10 minutes',0.025,'ml/str','none',3,24,'manual',t + interval '72 hours',t + interval '24 hours','55555555-0000-0000-0000-0000000012a3','typed 3');
        raise exception '(N1c) a typed PHI 3 was accepted although crop A has no label';
  exception when check_violation then null; end;
  -- and the harvest of the crop-A planting stays closed (the spray is unknown for it)
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001',f,'dddddddd-0000-0000-0000-0000000012a2',now(),1); raise exception '(N1c) the crop-A planting was harvested';
  exception when check_violation then null; end;
end $$;
-- N1 (worker's «Έγινε»): a job with crop A and crop B plantings and the B label: the spray is kept but its waiting period is UNKNOWN, and the crop-A planting stays closed
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare r jsonb; begin
  r := complete_spray_job('eeeeeeee-0000-0000-0000-0000000012a4', now() - interval '5 minutes', p_started_at => (now() - interval '5 minutes') - interval '30 minutes');
  if r->>'label_state' = 'signed' or r->>'phi_until' is not null then raise exception '(N1 worker) the worker''s spray took the label of another crop: %', r; end if;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-0000000012a3',now(),1); raise exception '(N1 worker) the crop-A planting was harvested after the worker''s spray';
  exception when check_violation then null; end;
end $$;

-- N2: the owner cannot record a spray that ends after now (the worker's rule), and the gate never skips an unknown PHI that is on record, even one that ends 4 minutes ahead
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values (f,'eeeeeeee-0000-0000-0000-0000000012a1',pq,w1,now() + interval '4 minutes',now() - interval '30 minutes',0.025,'ml/str','none');
        raise exception '(N2) the owner recorded a spray ending 4 minutes in the future';
  exception when check_violation then null; end;
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values (w1,f,'dddddddd-0000-0000-0000-0000000012a4',now(),1); raise exception '(N2) the gate skipped an unknown-PHI spray that ends 4 minutes ahead';
  exception when check_violation then null; end;
end $$;

-- N3: a stock movement of an EARLIER, separate transaction cannot satisfy a later correction (the check is tied to the top-level transaction, not to a time the phone can send)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000012a0';
begin
  perform apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'stock_movements', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'lot_key', lot, 'product_id', pq, 'direction', 'in', 'qty_str', '1', 'reason', 'spray_correction', 'job_id', 'eeeeeeee-0000-0000-0000-0000000012a6', 'created_at', '2099-01-01T00:00:00Z')),
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'stock_movements', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'lot_key', lot, 'product_id', pq, 'direction', 'out', 'qty_str', '9', 'reason', 'spray', 'job_id', 'eeeeeeee-0000-0000-0000-0000000012a6', 'created_at', '2099-01-01T00:00:00Z'))));
end $$;
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000012a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000012a0';
        lb constant uuid := 'cccccccc-1111-0000-0000-0000000012a2'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000012a6');
begin
  begin
    perform apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_spray', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'job_id', 'eeeeeeee-0000-0000-0000-0000000012a6', 'product_id', pq, 'applicator_id', w1,
      'label_use_id', lb, 'sprayed_at', t, 'started_at', t - interval '10 minutes', 'dose_str', '0.025', 'dose_unit', 'ml/str', 'label_state', 'signed', 'phi_days', 3, 'rei_hours', 24, 'phi_source', 'label', 'phi_until', t + interval '72 hours', 'rei_until', t + interval '24 hours',
      'lot_key', lot, 'qty_str', '9', 'amends_id', '55555555-0000-0000-0000-0000000012a6', 'amend_reason', 'qty 9'))));
    set constraints job_spray_correction_stock immediate;
    raise exception '(N3) a quantity correction was satisfied by the stock movements of an earlier, separate transaction';
  exception when check_violation then null; end;
end $$;

-- LOW: a new PLANTING cannot carry a made-up history either; LOW N4: the fetch state's farm must be the parcel's farm
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pl constant uuid := 'dddddddd-0000-0000-0000-0000000012f1';
begin
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status,edits) values (pl,f,'33333333-3333-3333-3333-333333333333','cccccccc-0000-0000-0000-0000000012a1',0.1,'2026-11-01','growing','[{"forged":1}]'::jsonb);
  if (select edits from plantings where id = pl) <> '[]'::jsonb then raise exception '(LOW) a new planting kept a forged edit history'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin
  insert into parcels(id,farm_id,name,area_str) values ('33333333-3333-3333-3333-3333333312f9','11111111-1111-1111-1111-111111111111','N4',1);
  begin insert into weather_fetch_state(parcel_id, farm_id) values ('33333333-3333-3333-3333-3333333312f9', '22222222-2222-2222-2222-222222222222'); raise exception '(N4) a fetch state of the wrong farm was accepted';
  exception when foreign_key_violation then null; end;
  raise notice 'm12-m7 tests passed';
end $$;

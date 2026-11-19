-- Team review m6-0029 (docs/reviews/team/2026-11-19-m6-0029.md): every finding as a test, run as the REAL `authenticated` owner / worker (never a superuser, except the fixtures). Written BEFORE the fixes.
-- 0022–0029 are applied nowhere, so the fixes are made IN PLACE in those files. Runs after m9_0029.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000010a1'; ca constant uuid := 'cccccccc-0000-0000-0000-0000000010a1'; cb constant uuid := 'cccccccc-0000-0000-0000-0000000010a2';
        lb constant uuid := 'cccccccc-1111-0000-0000-0000000010a2'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000010a0';
begin
  insert into crops(id,farm_id,slug,name_el) values (ca,f,'m10a','Μ10α'), (cb,f,'m10b','Μ10β');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m10 product','fungicide','kg');
  insert into stock_lots(id,lot_key,farm_id,product_id,expiry) values (lot,lot,f,pq,'2030-01-01');
  insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason) values (f,lot,pq,'in',50,'receipt');
  -- a SIGNED label for crop B only (PHI 3 / REI 24); crop A has NO label
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint) values (lb,f,pq,cb,'m10','single','ml/str',0.025,3,24,3,'agronomist',current_date,'fp');
  -- plantings of crop A; jobs: 1 = unknown spray for the end-time test, 2 = quantity correction through apply_ops, 3 = wrong-crop label tests
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-0000000010a1',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000010a3',f,p,ca,0.25,'2026-11-01','growing');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-0000000010a1',f,'spray','done',w1,pq,now() - interval '30 minutes'),
    ('eeeeeeee-0000-0000-0000-0000000010a2',f,'spray','done',w1,pq,now() - interval '30 minutes'), ('eeeeeeee-0000-0000-0000-0000000010a3',f,'spray','done',w1,pq,now() - interval '30 minutes');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000010a1','dddddddd-0000-0000-0000-0000000010a1'), (f,'eeeeeeee-0000-0000-0000-0000000010a2','dddddddd-0000-0000-0000-0000000010a1'), (f,'eeeeeeee-0000-0000-0000-0000000010a3','dddddddd-0000-0000-0000-0000000010a3');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000010a1',f,'eeeeeeee-0000-0000-0000-0000000010a1',pq,w1,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','none');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,lot_key,qty_str) values ('55555555-0000-0000-0000-0000000010a2',f,'eeeeeeee-0000-0000-0000-0000000010a2',pq,w1,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','none',lot,1);
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000010a3',f,'eeeeeeee-0000-0000-0000-0000000010a3',pq,w1,now() - interval '30 minutes',now() - interval '40 minutes',0.025,'ml/str','none');
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';

-- A1 (MUST): a correction's end can not be later than the server's clock (it moved to now+5 min and dropped the spray out of the harvest gate)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000010a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  begin
    insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,amends_id,amend_reason)
      values (f,'eeeeeeee-0000-0000-0000-0000000010a1',pq,w1,now() + interval '4 minutes',now() - interval '40 minutes',0.025,'ml/str','none','55555555-0000-0000-0000-0000000010a1','later');
    raise exception '(A1) a correction moved the end into the future (now + 4 minutes)';
  exception when check_violation then null; end;
  -- an end up to now stays possible
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-0000000010b1',f,'eeeeeeee-0000-0000-0000-0000000010a1',pq,w1,now() - interval '1 minute',now() - interval '40 minutes',0.025,'ml/str','none','55555555-0000-0000-0000-0000000010a1','later, not in the future');
  -- the harvest gate keeps the spray (still unknown): harvest refused
  begin insert into job_harvest(farm_id,planting_id,harvested_at,crates_str) values (f,'dddddddd-0000-0000-0000-0000000010a1',now(),1); raise exception '(A1) the harvest opened after the correction';
  exception when check_violation then null; end;
end $$;
do $$ begin
  if to_regprocedure('spray_first_end(uuid,uuid)') is null then raise exception '(A1) the gate needs the EARLIEST end of the correction chain (spray_first_end)'; end if;
end $$;

-- A2 (SHOULD): the stock check must hold inside apply_ops (savepoints): a correct group = correction + stock back in + stock out is applied, not rejected at COMMIT
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000010a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000010a0';
        j constant uuid := 'eeeeeeee-0000-0000-0000-0000000010a2'; g constant uuid := 'ffffffff-0000-0000-0000-0000000010a2'; r jsonb; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000010a2');
begin
  r := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'group_id', g, 'group_size', 3, 'farm_id', f, 'table', 'job_spray', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'job_id', j, 'product_id', pq, 'applicator_id', w1,
      'sprayed_at', t, 'started_at', t - interval '10 minutes', 'dose_str', '0.025', 'dose_unit', 'ml/str', 'label_state', 'none', 'lot_key', lot, 'qty_str', '2', 'amends_id', '55555555-0000-0000-0000-0000000010a2', 'amend_reason', 'quantity')),
    jsonb_build_object('op_id', gen_random_uuid(), 'group_id', g, 'group_size', 3, 'farm_id', f, 'table', 'stock_movements', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'lot_key', lot, 'product_id', pq, 'direction', 'in', 'qty_str', '1', 'reason', 'spray_correction', 'job_id', j)),
    jsonb_build_object('op_id', gen_random_uuid(), 'group_id', g, 'group_size', 3, 'farm_id', f, 'table', 'stock_movements', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'lot_key', lot, 'product_id', pq, 'direction', 'out', 'qty_str', '2', 'reason', 'spray', 'job_id', j))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(A2) a correct correction group was not applied: %', r; end if;
end $$;
-- and the group WITHOUT its movements is still refused as a whole
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000010a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lot constant uuid := 'dddddddd-0000-0000-0000-0000000010a0';
        j constant uuid := 'eeeeeeee-0000-0000-0000-0000000010a2'; sid constant uuid := gen_random_uuid(); t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000010a2');
        prev uuid := (select id from job_spray where amends_id = '55555555-0000-0000-0000-0000000010a2');
begin
  begin
    perform apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'job_spray', 'op', 'insert', 'row', jsonb_build_object('id', sid, 'farm_id', f, 'job_id', j, 'product_id', pq, 'applicator_id', w1,
      'sprayed_at', t, 'started_at', t - interval '10 minutes', 'dose_str', '0.025', 'dose_unit', 'ml/str', 'label_state', 'none', 'lot_key', lot, 'qty_str', '5', 'amends_id', prev, 'amend_reason', 'again without movements'))));
    set constraints job_spray_correction_stock immediate;       -- the deferred check at once (COMMIT cannot be caught in a block)
    raise exception '(A2) a quantity correction without stock movements was applied';
  exception when check_violation then null; end;
end $$;

-- A4 (SHOULD): weather rows are written by the service role ONLY: the owner can read, not insert / update / delete
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; n int;
begin
  begin insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model,tmin,tmax) values (p,f,current_date,'station',now(),'fake',-50,-40); raise exception '(A4) the owner inserted a weather row';
  exception when insufficient_privilege then null; end;
  begin insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model,temp_c) values (p,f,now(),'station',now(),'fake',-50); raise exception '(A4) the owner inserted an hourly weather row';
  exception when insufficient_privilege then null; end;
  begin update weather_daily set tmin = -50 where farm_id = f; raise exception '(A4) the owner changed weather rows'; exception when insufficient_privilege then null; end;
  begin delete from weather_daily where farm_id = f; raise exception '(A4) the owner deleted weather rows'; exception when insufficient_privilege then null; end;
  begin delete from weather_hourly where farm_id = f; raise exception '(A4) the owner deleted hourly weather rows'; exception when insufficient_privilege then null; end;
  if (select count(*) from weather_daily where farm_id = f) < 1 then raise exception '(A4) the owner can no longer READ the weather rows'; end if;
end $$;

-- A3 (SHOULD): a stored object is exactly <farm>/<photo id>: no extra names under the photo (neither for a worker nor for the owner); a photo's size is capped in `media` too (5 MB)
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/77777777-0000-0000-0000-000000000281/n.jpg'); raise exception '(A3) a worker stored an extra, unhashed object under her photo';
  exception when insufficient_privilege then null; end;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/77777777-0000-0000-0000-000000000282/n.jpg'); raise exception '(A3) the owner stored an object with a third path segment';
  exception when insufficient_privilege then null; end;
  begin insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('77777777-0000-0000-0000-0000000010c1',f,repeat('7',64),'image/jpeg',4,3,5242881); raise exception '(A3) a photo of more than 5 MB was accepted';
  exception when check_violation then null; end;
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('77777777-0000-0000-0000-0000000010c2',f,repeat('6',64),'image/jpeg',4,3,5242880);
end $$;

-- SHOULD 3: a label of ANOTHER crop is not the waiting period of this planting: it can not be used for the spray and does not make a typed PHI possible
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000010a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lb constant uuid := 'cccccccc-1111-0000-0000-0000000010a2';
        j constant uuid := 'eeeeeeee-0000-0000-0000-0000000010a3'; t timestamptz := now() - interval '30 minutes';
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
        values (f,j,pq,w1,lb,now() - interval '20 minutes',now() - interval '30 minutes',0.025,'ml/str','signed',3,24,'label',now() - interval '20 minutes' + interval '72 hours',now() - interval '20 minutes' + interval '24 hours');
        raise exception '(S3) a spray took the waiting period of a label of ANOTHER crop';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
        values (f,j,pq,w1,t,t - interval '10 minutes',0.025,'ml/str','none',3,24,'manual',t + interval '72 hours',t + interval '24 hours','55555555-0000-0000-0000-0000000010a3','typed 3');
        raise exception '(S3) a typed PHI 3 was accepted although only a label of another crop exists';
  exception when check_violation then null; end;
  -- a job that names the other crop's label: the floor must not come from it either
  update jobs set label_use_id = lb where id = j;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
        values (f,j,pq,w1,t,t - interval '10 minutes',0.025,'ml/str','none',3,24,'manual',t + interval '72 hours',t + interval '24 hours','55555555-0000-0000-0000-0000000010a3','typed 3');
        raise exception '(S3) a typed PHI 3 was accepted with the job naming a label of another crop';
  exception when check_violation then null; end;
end $$;

-- 0024: an INSERT can not carry a made-up history; LOW: an empty polygon is refused
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pid constant uuid := '33333333-3333-3333-3333-3333333310a1';
begin
  insert into parcels(id,farm_id,name,area_str,edits) values (pid,f,'forged history',1,'[{"at":"2020-01-01","reason":"forged","before":{}}]'::jsonb);
  if (select edits from parcels where id = pid) <> '[]'::jsonb then raise exception '(0024) a new row kept a forged edit history: %', (select edits from parcels where id = pid); end if;
  begin insert into parcels(farm_id,name,area_str,boundary) values (f,'empty',1,'{"type":"Polygon","coordinates":[]}'::jsonb); raise exception '(LOW) an empty polygon was accepted';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm10-review tests passed'; end $$;

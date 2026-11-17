-- Smoke test for the migrations on a throwaway Postgres+PostGIS (CI). Fails loudly via exceptions.
\set ON_ERROR_STOP on
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b2');
insert into farms(id,name) values ('11111111-1111-1111-1111-111111111111','F'),('22222222-2222-2222-2222-222222222222','Other');
insert into farm_members(farm_id,user_id,role) values
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','owner'),
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000b2','worker');
insert into parcels(id,farm_id,name,area_str) values
 ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','P',1.5),
 ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','Foreign',2);
insert into products(id,farm_id,name,type,unit) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Seed product','fungicide','kg');
insert into workers(id,farm_id,name) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Giorgos');
insert into jobs(id,farm_id,parcel_id,kind,status) values ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','spray','done');
insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','2026-11-17 08:00+00',0.19,'ml/str','unsigned');
insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','2026-11-17 09:00+00',0.06,'ml/str','unsigned');

do $$
declare n int; ok boolean;
begin
  -- hash chain links the second record to the first
  select (select hash from job_spray order by server_seq limit 1) = (select prev_hash from job_spray order by server_seq desc limit 1) into ok;
  if not ok then raise exception 'hash chain broken'; end if;
  -- spray records are append-only
  begin update job_spray set dose_str = 1; raise exception 'update allowed'; exception when insufficient_privilege then null; end;
  begin delete from job_spray; raise exception 'delete allowed'; exception when insufficient_privilege then null; end;
  -- unknown label data stays NULL (never defaulted)
  select count(*) into n from job_spray where phi_until is not null or rei_until is not null;
  if n <> 0 then raise exception 'phi/rei defaulted'; end if;
  -- audit rows exist
  select count(*) into n from audit_log where table_name = 'job_spray';
  if n <> 2 then raise exception 'audit missing (%)', n; end if;
end $$;

-- 0005: weather kinds, topo class, languages (run as the table owner, before `set role`)
do $$
begin
  begin insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',now(),'observed',now(),'x'); raise exception 'old kind observed accepted';
  exception when check_violation then null; end;
  -- the NEW kinds must really be insertable (they would be rejected by the old observed/forecast constraint)
  insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model,model_run,cell_elev_m)
    values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-17 06:00+00','analysis','2026-11-17 06:10+00','icon_eu','2026-11-17 03:00+00',42);
  insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model)
    values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-17','station','2026-11-17 06:10+00','meteo_gr');
  insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model) values
    ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-17 06:00+00','sensor','2026-11-17 06:10+00','ecowitt');
  -- two models side by side for the same parcel/time/kind/issue
  insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model) values
    ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-18 00:00+00','forecast','2026-11-17 06:10+00','icon_eu'),
    ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-18 00:00+00','forecast','2026-11-17 06:10+00','ifs_hres');
  begin  -- the same model twice is a duplicate
    insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-18 00:00+00','forecast','2026-11-17 06:10+00','icon_eu');
    raise exception 'duplicate model row accepted';
  exception when unique_violation then null; end;
  begin  -- no model = rejected, no default
    insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',now(),'forecast',now());
    raise exception 'null model accepted';
  exception when not_null_violation then null; end;
  begin  -- an old kind on the daily table is rejected too
    insert into weather_daily(parcel_id,farm_id,day,kind,issued_at,model)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','2026-11-19','observed',now(),'x');
    raise exception 'old daily kind accepted';
  exception when check_violation then null; end;
  begin update parcels set topo_class = 'ridge' where id = '33333333-3333-3333-3333-333333333333'; raise exception 'topo ridge accepted';
  exception when check_violation then null; end;
  update parcels set topo_class = 'plain' where id = '33333333-3333-3333-3333-333333333333';
  begin update farms set lang = 'xx'; raise exception 'bad lang accepted'; exception when check_violation then null; end;
  update farms set lang = 'sq' where id = '11111111-1111-1111-1111-111111111111';
end $$;

-- 0006: the phone's data model, one to one (run as the table owner, before `set role`)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        prod constant uuid := '66666666-6666-6666-6666-666666666666'; crop constant uuid := '77777777-7777-7777-7777-777777777777';
        ph constant uuid := '88888888-8888-8888-8888-888888888888'; lot constant uuid := '99999999-9999-9999-9999-999999999999';
        v numeric;
begin
  -- the typed area is never rounded
  update parcels set area_str = 0.625, lat = 38.0012, lng = 23.3501, pin_accuracy_m = 12.5, device_id = 'dev', actor_id = 'act' where id = p;
  select area_str into v from parcels where id = p; if v <> 0.625 then raise exception 'area rounded: %', v; end if;
  begin update parcels set lat = 95; raise exception 'bad latitude accepted'; exception when check_violation then null; end;
  begin update parcels set lat = null; raise exception 'half a pin accepted'; exception when check_violation then null; end;
  begin update parcels set area_str = 0; raise exception 'area 0 accepted'; exception when check_violation then null; end;
  -- a photo, once per farm
  insert into media(id,farm_id,sha256,mime,width,height,bytes,device_id,actor_id) values (ph,f,repeat('a',64),'image/jpeg',2000,1000,5000,'dev','act');
  begin insert into media(farm_id,sha256,mime,width,height,bytes) values (f,repeat('a',64),'image/jpeg',1,1,1); raise exception 'same photo twice accepted'; exception when unique_violation then null; end;
  begin update media set bytes = 1; raise exception 'media update allowed'; exception when insufficient_privilege then null; end;
  -- crop, product, planting with the phone's words
  insert into crops(id,farm_id,slug,name_el) values (crop,f,'spinach','Σπανάκι');
  insert into products(id,farm_id,name,type,unit,label_photo_id) values (prod,f,'Kocide 2000','fungicide','kg',ph);
  begin insert into products(farm_id,name,type,unit) values (f,'x','sprayer','kg'); raise exception 'bad type accepted'; exception when check_violation then null; end;
  insert into plantings(farm_id,parcel_id,crop_id,area_str,sown_on,status) values (f,p,crop,0.25,'2026-11-17','finished');
  begin insert into plantings(farm_id,parcel_id,crop_id,area_str,sown_on,status) values (f,p,crop,0.25,'2026-11-17','done'); raise exception 'old status accepted'; exception when check_violation then null; end;
  -- label use: exact decimals, three states
  insert into label_uses(farm_id,product_id,crop_id,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,max_apps_not_on_label)
    values (f,prod,crop,'single','ml/str',0.025,7,24,null,true);
  select dose_min into v from label_uses where product_id = prod; if v::text <> '0.025' then raise exception 'dose changed: %', v; end if;
  begin insert into label_uses(farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min) values (f,prod,crop,'x','single','ml/str',0); raise exception 'dose 0 accepted'; exception when check_violation then null; end;
  begin insert into label_uses(farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,dose_max) values (f,prod,crop,'y','single','ml/str',1,2); raise exception 'second dose on single accepted'; exception when check_violation then null; end;
  begin insert into label_uses(farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,dose_max) values (f,prod,crop,'z','range','ml/str',3,2); raise exception 'min above max accepted'; exception when check_violation then null; end;
  begin insert into label_uses(farm_id,product_id,crop_id,target,dose_unit) values (f,prod,crop,'u','%'); raise exception 'unit percent accepted'; exception when check_violation then null; end;
  begin insert into label_uses(farm_id,product_id,crop_id,target,phi_days,phi_days_not_on_label) values (f,prod,crop,'w',7,true); raise exception 'value and not-on-label both accepted'; exception when check_violation then null; end;
  begin  -- an incomplete label (max applications «not on label») cannot be signed
    update label_uses set sign_off_by = 'Agronomist', sign_off_on = '2026-11-17', sign_off_fingerprint = 'x' where product_id = prod and target is null; raise exception 'incomplete label signed';
  exception when check_violation then null; end;
  insert into label_uses(farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint)
    values (f,prod,crop,'complete','single','g/str',0.5,7,24,3,'Agronomist','2026-11-17','fp');
  -- analyses: EC keeps the unit of the report
  insert into soil_tests(farm_id,parcel_id,sampled_on,ph,ec,ec_unit,notes,photo_id) values (f,p,'2026-11-10',7.4,1.2,'mS/cm','OM 2,1 %',ph);
  insert into water_tests(farm_id,parcel_id,sampled_on,ec,ec_unit) values (f,p,'2026-11-12',850,'uS/cm');
  begin insert into soil_tests(farm_id,parcel_id,sampled_on,ec) values (f,p,'2026-11-10',1.2); raise exception 'EC without unit accepted'; exception when check_violation then null; end;
  begin insert into soil_tests(farm_id,parcel_id,sampled_on,ph) values (f,p,'2026-11-10',15); raise exception 'pH 15 accepted'; exception when check_violation then null; end;
  begin insert into water_tests(farm_id,sampled_on) values (f,'2026-11-10'); raise exception 'water test without parcel accepted'; exception when not_null_violation then null; end;
  -- stock ledger: balance = sum, negative is shown, lots and movements are append-only
  insert into stock_lots(id,lot_key,farm_id,product_id,batch,expiry) values (lot,lot,f,prod,'A123','2028-03-31');
  begin insert into stock_lots(id,lot_key,farm_id,product_id,expiry) values (gen_random_uuid(),gen_random_uuid(),f,prod,'2028-03-31'); raise exception 'lot_key different from id accepted'; exception when check_violation then null; end;
  insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason) values (f,lot,prod,'in',4.5,'receipt'),(f,lot,prod,'out',0.25,'spilled'),(f,lot,prod,'out',5,'count');
  select qty into v from stock_balance where lot_id = lot; if v <> -0.75 then raise exception 'balance %', v; end if;
  begin insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason) values (f,lot,prod,'out',0,'x'); raise exception 'quantity 0 accepted'; exception when check_violation then null; end;
  begin update stock_movements set qty_str = 1; raise exception 'movement update allowed'; exception when insufficient_privilege then null; end;
  begin delete from stock_lots; raise exception 'lot delete allowed'; exception when insufficient_privilege then null; end;
  -- owner settings
  insert into farm_settings(farm_id,key,value) values (f,'controller','{"name":"Test"}');
end $$;

-- 0007: spray, harvest and roster, as the phone writes them (run as the table owner, before `set role`)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        pl constant uuid := 'dddddddd-0000-0000-0000-000000000001'; job2 constant uuid := 'eeeeeeee-0000-0000-0000-000000000002'; sp1 uuid; n int;
begin
  insert into crops(id,farm_id,slug,name_el) values (crop2,f,'rocket','Ρόκα');
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (pl,f,p,crop2,0.25,'2026-11-17','growing');
  begin insert into workers(farm_id,name) values (f,'  '); raise exception 'blank worker name accepted'; exception when check_violation then null; end;
  -- a job without a parcel of its own, its plantings, a spray with a SIGNED label (waiting periods from the label)
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at,device_id,actor_id) values (job2,f,'spray','done',w,prod,'2026-11-20 08:00+00','dev','act');
  insert into job_plantings(farm_id,job_id,planting_id,area_str_treated) values (f,job2,pl,0.25);
  begin insert into job_plantings(farm_id,job_id,planting_id) values (f,job2,pl); raise exception 'same planting twice accepted'; exception when unique_violation then null; end;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,qty_str,flags,device_id,actor_id)
    values (gen_random_uuid(),f,job2,prod,w,'2026-11-20 08:00+00',0.025,'ml/str','signed',7,24,'label','2026-11-27 08:00+00','2026-11-21 08:00+00',0.25,array['dose_outside_label'],'dev','act') returning id into sp1;
  -- an UNSIGNED label leaves the waiting period NULL (unknown); it cannot claim a label PHI
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values (f,job2,prod,w,'2026-11-20 09:00+00',0.025,'ml/str','unsigned');
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,phi_source,phi_until) values (f,job2,prod,w,now(),0.025,'ml/str','unsigned',7,'label',now()); raise exception 'label PHI on an unsigned label accepted'; exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,phi_source) values (f,job2,prod,w,now(),0.025,'ml/str','signed',7,'label'); raise exception 'PHI without its end accepted'; exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values (f,job2,prod,w,now(),0,'ml/str','signed'); raise exception 'dose 0 accepted'; exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values (f,job2,prod,w,now(),1,'%','signed'); raise exception 'unit percent accepted'; exception when check_violation then null; end;
  -- Bora's entry of the label's PHI: a NEW row that amends the original; the original is untouched (append-only)
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id)
    select f,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,7,24,'manual',sprayed_at + interval '7 days',sprayed_at + interval '24 hours',id from job_spray where label_state = 'unsigned' and phi_days is null and job_id = job2;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,amends_id) values (f,job2,prod,w,now(),0.025,'ml/str','unsigned',sp1); raise exception 'amending row that is not a manual entry accepted'; exception when check_violation then null; end;
  begin update job_spray set note = 'x'; raise exception 'spray update allowed'; exception when insufficient_privilege then null; end;
  -- harvest: crates as a whole number above zero
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at,note,device_id,actor_id) values (f,pl,12,'2026-11-28 08:00+00','x','dev','act');
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl,0,now()); raise exception 'zero crates accepted'; exception when check_violation then null; end;
  begin update job_harvest set crates_str = 99; raise exception 'harvest update allowed'; exception when insufficient_privilege then null; end;
  select count(*) into n from job_spray where job_id = job2; if n <> 3 then raise exception 'spray rows %', n; end if;
end $$;

-- 0008: job assignment and observations as the phone writes them (run as the table owner, before `set role`)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333';
        prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; j constant uuid := 'ffffffff-0000-0000-0000-000000000001';
begin
  insert into jobs(id,farm_id,kind,status,product_id,worker_id,dose_str,dose_unit,planned_for) values (j,f,'spray','planned',prod,w,0.025,'ml/str','2026-11-18');
  begin insert into jobs(farm_id,kind,status,product_id,worker_id,dose_str) values (f,'spray','planned',prod,w,0.025); raise exception 'open spray without a dose unit accepted'; exception when check_violation then null; end;
  begin insert into jobs(farm_id,kind,status,worker_id,dose_str,dose_unit) values (f,'spray','planned',w,0.025,'ml/str'); raise exception 'open spray without a product accepted'; exception when check_violation then null; end;
  begin insert into jobs(farm_id,kind,status,product_id,worker_id,dose_str,dose_unit) values (f,'spray','planned',prod,w,0,'ml/str'); raise exception 'job dose 0 accepted'; exception when check_violation then null; end;
  update jobs set status = 'skipped', skip_reason = 'rain' where id = j;
  begin update jobs set skip_reason = null where id = j; raise exception 'skipped job without a reason accepted'; exception when check_violation then null; end;
  begin insert into jobs(farm_id,kind,status,product_id,worker_id,dose_str,dose_unit,skip_reason) values (f,'spray','planned',prod,w,0.025,'ml/str','rain'); raise exception 'reason on an open job accepted'; exception when check_violation then null; end;
  insert into observations(farm_id,parcel_id,kind,note,observed_at,device_id,actor_id) values (f,p,'pest','aphids','2026-11-20 08:00+00','dev',w::text);
  begin insert into observations(farm_id,parcel_id,kind) values (f,p,'rumour'); raise exception 'bad observation kind accepted'; exception when check_violation then null; end;
  begin update observations set note = 'x'; raise exception 'observation update allowed'; exception when insufficient_privilege then null; end;
end $$;

create role app_user nologin;
grant usage on schema public, auth to app_user;
grant all on all tables in schema public to app_user;
grant all on all sequences in schema public to app_user;
grant execute on all functions in schema auth to app_user;

set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';   -- owner
do $$ declare n int; begin
  select count(*) into n from parcels; if n <> 1 then raise exception 'owner sees % parcels (want 1: own farm only)', n; end if;
end $$;

set test.uid = '00000000-0000-0000-0000-0000000000b2';   -- worker
do $$ declare n int; begin
  select count(*) into n from parcels; if n <> 1 then raise exception 'worker parcels %', n; end if;
  select count(*) into n from job_spray; if n <> 0 then raise exception 'worker can read spray records'; end if;
  select count(*) into n from jobs; if n <> 0 then raise exception 'worker sees unassigned jobs'; end if;
  begin insert into products(farm_id,name,type,unit) values ('11111111-1111-1111-1111-111111111111','x','fungicide','kg'); raise exception 'worker can insert products';
  exception when insufficient_privilege then null; end;
  select count(*) into n from workers; if n <> 0 then raise exception 'worker sees the roster'; end if;
  select count(*) into n from media; if n <> 0 then raise exception 'worker sees photos'; end if;
  select count(*) into n from farm_settings; if n <> 0 then raise exception 'worker sees settings'; end if;
  delete from parcels; get diagnostics n = row_count; if n <> 0 then raise exception 'worker deleted parcels'; end if;
end $$;
\echo 'SQL smoke test OK'

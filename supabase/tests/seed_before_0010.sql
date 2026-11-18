-- Data written through the schema of migrations 0001–0009 (as an EARLIER state of a real database would hold it), used by upgrade.sh to prove that 0010–0013
-- can be applied over existing rows without losing or rejecting them. Dates are fixed and in the past.
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000a1');
insert into farms(id,name) values ('11111111-1111-1111-1111-111111111111','Old farm');
insert into farm_members(farm_id,user_id,role) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','owner');
insert into parcels(id,farm_id,name,area_str,lat,lng) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Old parcel',0.625,37.99,23.35);
insert into crops(id,farm_id,slug,name_el) values ('cccccccc-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','rocket','Ρόκα');
insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','cccccccc-0000-0000-0000-000000000002',0.25,'2026-10-01','growing');
insert into products(id,farm_id,name,type,unit) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Old product','fungicide','kg');
insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint)
  values ('cccccccc-1111-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','t','single','ml/str',0.025,7,24,3,'Agronomist','2026-10-01','fp');
insert into stock_lots(id,lot_key,farm_id,product_id,expiry) values ('99999999-0000-0000-0000-000000000001','99999999-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','2028-03-31');
insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason) values ('11111111-1111-1111-1111-111111111111','99999999-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','in',4.5,'receipt');
insert into workers(id,farm_id,name) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Old worker');
insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','spray','done','bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-10-10 08:00+00');
insert into job_plantings(farm_id,job_id,planting_id,area_str_treated) values ('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',0.25);
-- a signed spray, an unsigned one, and the owner's amending row WITHOUT a reason (the old schema had no such column)
insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
  values ('55555555-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','cccccccc-1111-0000-0000-000000000001','2026-10-10 08:00+00',0.025,'ml/str','signed',7,24,'label','2026-10-17 08:00+00','2026-10-11 08:00+00','2026-10-10 09:00+00');
insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at)
  values ('55555555-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','2026-10-10 09:00+00',0.025,'ml/str','unsigned','2026-10-10 10:00+00');
insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,created_at)
  values ('55555555-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','2026-10-10 09:00+00',0.025,'ml/str','unsigned',7,24,'manual','2026-10-17 09:00+00','2026-10-11 09:00+00','55555555-0000-0000-0000-000000000002','2026-10-12 09:00+00');
insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000001',12,'2026-10-20 08:00+00');
insert into observations(farm_id,parcel_id,kind,note) values ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','pest','aphids');
insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('88888888-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',repeat('a',64),'image/jpeg',4,3,1);
insert into farm_settings(farm_id,key,value) values ('11111111-1111-1111-1111-111111111111','controller','{"name":"T"}');

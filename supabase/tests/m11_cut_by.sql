-- Migration 0031: «Ποιος έκοψε» (who cut the crop) is required on every harvest a signed-in person records, and it must be a live worker of the same farm. Real `authenticated` owner. Written BEFORE 0031.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regclass('public.job_harvest') is null or not exists (select 1 from information_schema.columns where table_name = 'job_harvest' and column_name = 'cut_by') then raise exception '(0031) job_harvest.cut_by does not exist yet'; end if;
end $$;
do $$ begin
  insert into workers(id,farm_id,name) values ('bbbbbbbb-0000-0000-0000-0000000011a1','11111111-1111-1111-1111-111111111111','Cutter'), ('bbbbbbbb-0000-0000-0000-0000000011a2','22222222-2222-2222-2222-222222222222','Other farm worker');
  insert into workers(id,farm_id,name,deleted_at) values ('bbbbbbbb-0000-0000-0000-0000000011a3','11111111-1111-1111-1111-111111111111','Archived',now());
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) select 'dddddddd-0000-0000-0000-0000000011a1','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',id,0.25,'2026-11-01','growing' from crops where farm_id = '11111111-1111-1111-1111-111111111111' limit 1;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pl constant uuid := 'dddddddd-0000-0000-0000-0000000011a1';
begin
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values (f,pl,3,now()); raise exception '(0031) a harvest without «who cut» was accepted'; exception when check_violation then null; end;
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at,cut_by) values (f,pl,3,now(),'bbbbbbbb-0000-0000-0000-0000000011a2'); raise exception '(0031) the cutter of ANOTHER farm was accepted'; exception when check_violation then null; end;
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at,cut_by) values (f,pl,3,now(),'bbbbbbbb-0000-0000-0000-0000000011a3'); raise exception '(0031) an archived worker was accepted as the cutter'; exception when check_violation then null; end;
  insert into job_harvest(id,farm_id,planting_id,crates_str,harvested_at,cut_by) values ('66666666-0000-0000-0000-0000000011a1',f,pl,3,now(),'bbbbbbbb-0000-0000-0000-0000000011a1');
  if (select cut_by from job_harvest where id = '66666666-0000-0000-0000-0000000011a1') <> 'bbbbbbbb-0000-0000-0000-0000000011a1' then raise exception '(0031) cut_by was not kept'; end if;
  -- the record stays append-only (no change of who cut)
  begin update job_harvest set cut_by = 'bbbbbbbb-0000-0000-0000-0000000011a2' where id = '66666666-0000-0000-0000-0000000011a1'; raise exception '(0031) a harvest record was changed'; exception when insufficient_privilege or check_violation or raise_exception then if sqlerrm like '(0031)%' then raise; end if; end;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm11-cut-by tests passed'; end $$;

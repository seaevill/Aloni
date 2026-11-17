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
insert into jobs(id,farm_id,parcel_id,kind) values ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','spray');
insert into job_spray(farm_id,job_id,dose_per_str) values ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555',0.19);
insert into job_spray(farm_id,job_id,dose_per_str) values ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555',0.06);

do $$
declare n int; ok boolean;
begin
  -- hash chain links the second record to the first
  select (select hash from job_spray order by server_seq limit 1) = (select prev_hash from job_spray order by server_seq desc limit 1) into ok;
  if not ok then raise exception 'hash chain broken'; end if;
  -- spray records are append-only
  begin update job_spray set dose_per_str = 1; raise exception 'update allowed'; exception when insufficient_privilege then null; end;
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
  begin insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',now(),'observed',now()); raise exception 'old kind observed accepted';
  exception when check_violation then null; end;
  insert into weather_hourly(parcel_id,farm_id,at,kind,issued_at,model,model_run,cell_elev_m)
    values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',now(),'forecast',now(),'icon_eu',now(),42);
  begin update parcels set topo_class = 'ridge' where id = '33333333-3333-3333-3333-333333333333'; raise exception 'topo ridge accepted';
  exception when check_violation then null; end;
  update parcels set topo_class = 'plain' where id = '33333333-3333-3333-3333-333333333333';
  begin update farms set lang = 'xx'; raise exception 'bad lang accepted'; exception when check_violation then null; end;
  update farms set lang = 'sq' where id = '11111111-1111-1111-1111-111111111111';
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
  begin insert into products(farm_id,trade_name,type,unit) values ('11111111-1111-1111-1111-111111111111','x','fungicide','kg'); raise exception 'worker can insert products';
  exception when insufficient_privilege then null; end;
  delete from parcels; get diagnostics n = row_count; if n <> 0 then raise exception 'worker deleted parcels'; end if;
end $$;
\echo 'SQL smoke test OK'

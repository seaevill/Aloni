-- Migration 0042: the ΚΑΕΚ of a parcel, the cut / clean records and the fertilising / irrigation records. OWNER ONLY (a worker and a stranger get nothing); a record is never edited: the owner may only
-- tombstone it (deleted_at); no hard delete. Real `authenticated` roles. Written BEFORE 0042. The ΚΑΕΚ numbers below are FICTIONAL.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regclass('public.field_cuts') is null then raise exception '(0042) field_cuts does not exist'; end if;
  if to_regclass('public.field_work') is null then raise exception '(0042) field_work does not exist'; end if;
  if sync_table('field_cuts') is null or sync_table('field_work') is null then raise exception '(0042) sync_table does not know the new tables'; end if;
  if not exists (select 1 from information_schema.columns where table_name = 'parcels' and column_name = 'kaek') then raise exception '(0042) parcels.kaek does not exist'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p uuid; other uuid;
begin
  select id into p from parcels where farm_id = f limit 1;
  -- ΚΑΕΚ: exactly 12 digits or nothing
  update parcels set kaek = '111111111111', edit_reason = 'kaek' where id = p;
  if (select kaek from parcels where id = p) <> '111111111111' then raise exception '(0042) the ΚΑΕΚ was not stored'; end if;
  begin update parcels set kaek = '12345', edit_reason = 'kaek' where id = p; raise exception '(0042) a short ΚΑΕΚ was accepted'; exception when check_violation then null; end;
  begin update parcels set kaek = '1111111111111', edit_reason = 'kaek' where id = p; raise exception '(0042) a 13-digit ΚΑΕΚ was accepted'; exception when check_violation then null; end;
  begin update parcels set kaek = '11111111111a', edit_reason = 'kaek' where id = p; raise exception '(0042) a ΚΑΕΚ with a letter was accepted'; exception when check_violation then null; end;
  update parcels set kaek = null, edit_reason = 'kaek' where id = p;
  -- cut / clean records
  insert into field_cuts(id,farm_id,parcel_id,day,method) values ('88888888-0000-0000-0000-0000000022a1',f,p,'2026-11-21','shredder');
  begin insert into field_cuts(farm_id,parcel_id,day,method) values (f,p,'2026-11-21','fire'); raise exception '(0042) an unknown cut method was accepted'; exception when check_violation then null; end;
  begin update field_cuts set method = 'hand' where id = '88888888-0000-0000-0000-0000000022a1'; raise exception '(0042) a cut record was edited'; exception when check_violation then null; end;
  begin update field_cuts set farm_id = '22222222-2222-2222-2222-222222222222' where id = '88888888-0000-0000-0000-0000000022a1'; raise exception '(0042) a cut record moved farm'; exception when check_violation or insufficient_privilege or foreign_key_violation then null; end;
  update field_cuts set deleted_at = now() where id = '88888888-0000-0000-0000-0000000022a1';       -- the undo: a tombstone
  begin update field_cuts set deleted_at = null where id = '88888888-0000-0000-0000-0000000022a1'; raise exception '(0042) a removed cut record was brought back'; exception when check_violation then null; end;
  begin delete from field_cuts where id = '88888888-0000-0000-0000-0000000022a1'; raise exception '(0042) a cut record was hard-deleted'; exception when insufficient_privilege then null; end;
  select id into other from parcels where farm_id = '22222222-2222-2222-2222-222222222222' limit 1;
  if other is null then raise exception '(0042) the test needs a parcel of the other farm'; end if;
  begin insert into field_cuts(farm_id,parcel_id,day,method) values (f,other,'2026-11-21','hand'); raise exception '(0042) a cut for ANOTHER farm''s parcel was accepted'; exception when foreign_key_violation then null; end;
  -- fertilising: the N form is mandatory (urea and nitrate behave differently); amounts are numbers above 0 as typed (a comma is allowed)
  insert into field_work(id,farm_id,parcel_id,kind,day,n_form,n_kg_per_str,weather) values ('88888888-0000-0000-0000-0000000022b1',f,p,'fertilise','2026-11-20','urea','4,5','{"tmin":4,"tmax":14.5}');
  begin insert into field_work(farm_id,parcel_id,kind,day) values (f,p,'fertilise','2026-11-20'); raise exception '(0042) a fertilising record without the N form was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,n_form) values (f,p,'fertilise','2026-11-20',E' \t '); raise exception '(0042) a blank N form was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,n_form,n_kg_per_str) values (f,p,'fertilise','2026-11-20','urea','abc'); raise exception '(0042) an amount that is not a number was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,n_form,n_kg_per_str) values (f,p,'fertilise','2026-11-20','urea','0'); raise exception '(0042) an amount of 0 was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,n_form,minutes_str) values (f,p,'fertilise','2026-11-20','urea','30'); raise exception '(0042) minutes on a fertilising record were accepted'; exception when check_violation then null; end;
  -- irrigation: minutes (whole) and/or m3, at least one
  insert into field_work(id,farm_id,parcel_id,kind,day,minutes_str,m3_str) values ('88888888-0000-0000-0000-0000000022b2',f,p,'irrigate','2026-11-21','90','3,5');
  insert into field_work(farm_id,parcel_id,kind,day,m3_str) values (f,p,'irrigate','2026-11-21','2');
  begin insert into field_work(farm_id,parcel_id,kind,day) values (f,p,'irrigate','2026-11-21'); raise exception '(0042) an irrigation record without minutes or m3 was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,minutes_str) values (f,p,'irrigate','2026-11-21','12.5'); raise exception '(0042) fractional minutes were accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,minutes_str,n_form) values (f,p,'irrigate','2026-11-21','10','urea'); raise exception '(0042) an N form on an irrigation record was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,n_form) values (f,p,'spray','2026-11-20','urea'); raise exception '(0042) an unknown work kind was accepted'; exception when check_violation then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,minutes_str,weather) values (f,p,'irrigate','2026-11-21','10','[1,2]'); raise exception '(0042) a weather snapshot that is not an object was accepted'; exception when check_violation then null; end;
  begin update field_work set n_form = 'nitrate' where id = '88888888-0000-0000-0000-0000000022b1'; raise exception '(0042) a work record was edited'; exception when check_violation then null; end;
  update field_work set deleted_at = now() where id = '88888888-0000-0000-0000-0000000022b2';
  begin update field_work set deleted_at = null where id = '88888888-0000-0000-0000-0000000022b2'; raise exception '(0042) a removed work record was brought back'; exception when check_violation then null; end;
  begin delete from field_work where id = '88888888-0000-0000-0000-0000000022b1'; raise exception '(0042) a work record was hard-deleted'; exception when insufficient_privilege then null; end;
end $$;
-- the phone's way in: apply_ops (the records the app builds)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p uuid; r jsonb;
begin
  select id into p from parcels where farm_id = f limit 1;
  r := apply_ops(jsonb_build_array(
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'field_cuts', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'parcel_id', p, 'day', '2026-11-21', 'method', 'shredder')),
    jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', f, 'table', 'field_work', 'op', 'insert', 'row', jsonb_build_object('id', gen_random_uuid(), 'farm_id', f, 'parcel_id', p, 'kind', 'irrigate', 'day', '2026-11-21', 'minutes_str', '90', 'm3_str', '3,5', 'weather', jsonb_build_object('tmin', 4, 'rain', 0)))));
  if r::text like '%rejected%' then raise exception '(0042) apply_ops rejected the app''s records: %', r; end if;
end $$;
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' = 'field_cuts'; if n < 2 then raise exception '(0042) the owner''s pull lacks the cut records (%)', n; end if;
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' = 'field_work'; if n < 3 then raise exception '(0042) the owner''s pull lacks the work records (%)', n; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';       -- a worker of the farm
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; n int; p uuid;
begin
  select id into p from parcels where farm_id = f limit 1;
  select count(*) into n from field_cuts; if n <> 0 then raise exception '(0042) a worker reads the cut records'; end if;
  select count(*) into n from field_work; if n <> 0 then raise exception '(0042) a worker reads the work records'; end if;
  select count(*) into n from jsonb_array_elements(pull(f, null, 1000)->'rows') r where r->>'table' in ('field_cuts','field_work'); if n <> 0 then raise exception '(0042) a worker pulled the field records'; end if;
  begin insert into field_cuts(farm_id,parcel_id,day,method) values (f,p,'2026-11-21','hand'); raise exception '(0042) a worker wrote a cut record'; exception when insufficient_privilege then null; end;
  begin insert into field_work(farm_id,parcel_id,kind,day,minutes_str) values (f,p,'irrigate','2026-11-21','10'); raise exception '(0042) a worker wrote a work record'; exception when insufficient_privilege then null; end;
  update parcels set kaek = '111111111111', edit_reason = 'kaek' where id = p;
  if (select kaek from parcels where id = p) is not null then raise exception '(0042) a worker set a ΚΑΕΚ'; end if;
  if not has_column_privilege('authenticated', 'public.parcels', 'kaek', 'select') then raise exception '(0042) the ΚΑΕΚ column is not readable (documented: workers can read it)'; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000d5';       -- the owner of ANOTHER farm
do $$ declare n int; begin
  select count(*) into n from field_cuts; if n <> 0 then raise exception '(0042) a stranger reads the cut records'; end if;
  select count(*) into n from field_work; if n <> 0 then raise exception '(0042) a stranger reads the work records'; end if;
end $$;
reset role; set test.uid = '';
do $$ declare g text; begin g := bump_sync_generation(); if g is null then raise exception '(0042) bump_sync_generation returned nothing'; end if; end $$;
do $$ begin raise notice 'm22-field-records tests passed'; end $$;

-- Migration 0039: notes for the next days. `from_worker` is set by the SERVER; workers insert and read, only the owner changes a note; pull carries the table. Real `authenticated` owner, worker and stranger roles. Written BEFORE 0039.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regclass('public.day_notes') is null then raise exception '(0039) day_notes does not exist'; end if;
  if sync_table('day_notes') is null then raise exception '(0039) sync_table does not know day_notes'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';       -- a worker of farm 1111
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into day_notes(id,farm_id,for_day,text,from_worker,status) values ('99999999-0000-0000-0000-0000000019a1',f,'2026-11-25','Να φέρουμε κλούβες',false,'confirmed');   -- she tries to look like the owner
  if (select from_worker from day_notes where id = '99999999-0000-0000-0000-0000000019a1') is not true then raise exception '(0039) a worker note was not marked from_worker'; end if;
  if (select status from day_notes where id = '99999999-0000-0000-0000-0000000019a1') <> 'open' then raise exception '(0039) a worker note did not start open'; end if;
  begin insert into day_notes(farm_id,for_day,text) values (f,'2026-11-25',' '); raise exception '(0039) a blank note was accepted'; exception when check_violation then null; end;
  begin insert into day_notes(farm_id,for_day,text) values (f,'2026-11-25',repeat('x',281)); raise exception '(0039) a 281-character note was accepted'; exception when check_violation then null; end;
  begin update day_notes set status = 'confirmed' where id = '99999999-0000-0000-0000-0000000019a1'; if found then raise exception '(0039) a worker confirmed a note'; end if; exception when insufficient_privilege then null; end;
  begin update day_notes set from_worker = false where id = '99999999-0000-0000-0000-0000000019a1'; if found then raise exception '(0039) a worker changed the from_worker flag'; end if; exception when insufficient_privilege then null; end;
  begin delete from day_notes where id = '99999999-0000-0000-0000-0000000019a1'; raise exception '(0039) a note was hard-deleted'; exception when insufficient_privilege or raise_exception then if sqlerrm like '(0039)%' then raise; end if; end;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';          -- the owner
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  if (select count(*) from day_notes where id = '99999999-0000-0000-0000-0000000019a1') <> 1 then raise exception '(0039) the owner cannot read a worker note'; end if;
  update day_notes set status = 'confirmed' where id = '99999999-0000-0000-0000-0000000019a1';
  if (select status from day_notes where id = '99999999-0000-0000-0000-0000000019a1') <> 'confirmed' then raise exception '(0039) the owner could not confirm a note'; end if;
  if (select from_worker from day_notes where id = '99999999-0000-0000-0000-0000000019a1') is not true then raise exception '(0039) the confirmation changed from_worker'; end if;
  insert into day_notes(id,farm_id,for_day,text,from_worker) values ('99999999-0000-0000-0000-0000000019a2',f,'2026-11-25','Ποτίστε',true);           -- the owner tries to look like a worker
  if (select from_worker from day_notes where id = '99999999-0000-0000-0000-0000000019a2') is not false then raise exception '(0039) an owner note was marked from_worker'; end if;
  update day_notes set status = 'deleted', deleted_at = now() where id = '99999999-0000-0000-0000-0000000019a2';
end $$;
-- pull() serves only rows of transactions that are over: asked in a LATER block
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' = 'day_notes'; if n < 2 then raise exception '(0039) the owner''s pull lacks the notes (%)', n; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' = 'day_notes'; if n < 1 then raise exception '(0039) a worker''s pull lacks the notes'; end if;
end $$;
-- the owner of ANOTHER farm sees nothing and writes nothing
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000d5';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; n int;
begin
  select count(*) into n from day_notes; if n <> 0 then raise exception '(0039) a stranger reads notes'; end if;
  begin insert into day_notes(farm_id,for_day,text) values (f,'2026-11-25','Sneaky'); raise exception '(0039) a stranger wrote a note'; exception when insufficient_privilege or check_violation then null; end;
end $$;

-- Codex MUST: a note stays in its farm, even for a person who owns BOTH farms
reset role; set test.uid = '';
insert into farm_members(farm_id,user_id,role) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin update day_notes set farm_id = '22222222-2222-2222-2222-222222222222' where id = '99999999-0000-0000-0000-0000000019a1'; raise exception '(0039) a note was moved to another farm'; exception when check_violation then null; end;
  if (select farm_id from day_notes where id = '99999999-0000-0000-0000-0000000019a1') <> '11111111-1111-1111-1111-111111111111' then raise exception '(0039) the note left its farm'; end if;
end $$;
-- Codex SHOULD: the normal sync path (apply_ops): a worker inserts, the owner confirms
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare r jsonb; begin
  r := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', '11111111-1111-1111-1111-111111111111', 'table', 'day_notes', 'op', 'insert', 'row', jsonb_build_object('id', '99999999-0000-0000-0000-0000000019b1', 'farm_id', '11111111-1111-1111-1111-111111111111', 'for_day', '2026-11-26', 'text', 'Via apply_ops', 'from_worker', false, 'status', 'confirmed'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(0039) a worker note through apply_ops was not applied: %', r; end if;
  if (select from_worker from day_notes where id = '99999999-0000-0000-0000-0000000019b1') is not true or (select status from day_notes where id = '99999999-0000-0000-0000-0000000019b1') <> 'open' then raise exception '(0039) apply_ops let a worker forge the flag or the status'; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ declare r jsonb; begin
  r := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', '11111111-1111-1111-1111-111111111111', 'table', 'day_notes', 'op', 'update', 'row_id', '99999999-0000-0000-0000-0000000019b1', 'row', jsonb_build_object('id', '99999999-0000-0000-0000-0000000019b1', 'farm_id', '11111111-1111-1111-1111-111111111111', 'status', 'confirmed'))));
  if exists (select 1 from jsonb_array_elements(r) e where e->>'status' <> 'applied') then raise exception '(0039) the owner''s confirmation through apply_ops was not applied: %', r; end if;
  if (select status from day_notes where id = '99999999-0000-0000-0000-0000000019b1') <> 'confirmed' then raise exception '(0039) the note was not confirmed'; end if;
end $$;
reset role; set test.uid = '';
do $$ declare g text; begin g := bump_sync_generation(); if g is null then raise exception '(0039) bump_sync_generation returned nothing'; end if; end $$;
do $$ begin raise notice 'm19-day-notes tests passed'; end $$;

-- Migration 0038: the job board. An OPEN spray job (no worker) is visible to every worker of the farm; claim_job() gives it to the first one; real `authenticated` owner and worker roles. Written BEFORE 0038.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regprocedure('public.claim_job(uuid)') is null then raise exception '(0038) claim_job does not exist'; end if;
  insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000c4'), ('00000000-0000-0000-0000-0000000000d5'), ('00000000-0000-0000-0000-0000000000e6') on conflict do nothing;
  insert into farm_members(farm_id,user_id,role) values
    ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c4','worker'),
    ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000e6','worker'),
    ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000d5','owner') on conflict do nothing;
  insert into workers(id,farm_id,name,user_id) values
    ('bbbbbbbb-0000-0000-0000-0000000018b2','11111111-1111-1111-1111-111111111111','Board B2','00000000-0000-0000-0000-0000000000b2'),
    ('bbbbbbbb-0000-0000-0000-0000000018c4','11111111-1111-1111-1111-111111111111','Board C4','00000000-0000-0000-0000-0000000000c4');
  update workers set user_id = null where user_id in ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000c4') and id not in ('bbbbbbbb-0000-0000-0000-0000000018b2','bbbbbbbb-0000-0000-0000-0000000018c4');   -- one account = one roster entry on a farm
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) select 'dddddddd-0000-0000-0000-0000000018a1','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',id,0.25,'2026-11-01','growing' from crops where farm_id = '11111111-1111-1111-1111-111111111111' limit 1;
end $$;
-- the owner makes an OPEN job (no worker): product, dose and unit are still required
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
begin
  insert into jobs(id,farm_id,kind,status,product_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-0000000018a1',f,'spray','planned',prod,0.025,'ml/str','2026-11-25');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000018a1','dddddddd-0000-0000-0000-0000000018a1');
  begin insert into jobs(farm_id,kind,status,planned_for) values (f,'spray','planned','2026-11-25'); raise exception '(0038) an open spray job without product and dose was accepted'; exception when check_violation then null; end;
end $$;
-- a worker of the farm sees the open job, its planting link and its product; a worker's list never shows another farm's
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if (select count(*) from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') <> 1 then raise exception '(0038) a worker cannot see an open job'; end if;
  if (select count(*) from job_plantings where job_id = 'eeeeeeee-0000-0000-0000-0000000018a1') <> 1 then raise exception '(0038) a worker cannot see the plantings of an open job'; end if;
  if (select count(*) from products where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 1 then raise exception '(0038) a worker cannot read the product of an open job'; end if;
  begin update jobs set worker_id = 'bbbbbbbb-0000-0000-0000-0000000018b2' where id = 'eeeeeeee-0000-0000-0000-0000000018a1'; if found then raise exception '(0038) a worker took an open job by a plain update'; end if; exception when insufficient_privilege or check_violation then null; end;
end $$;
-- a real owner of ANOTHER farm sees nothing and cannot claim
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000d5';
do $$ begin
  if (select count(*) from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') <> 0 then raise exception '(0038) a stranger sees an open job'; end if;
  begin perform claim_job('eeeeeeee-0000-0000-0000-0000000018a1'); raise exception '(0038) a stranger claimed a job'; exception when insufficient_privilege then null; end;
  if private.job_is_open('eeeeeeee-0000-0000-0000-0000000018a1', '11111111-1111-1111-1111-111111111111') then raise exception '(0038) the open-job helper answered a stranger'; end if;
  if private.sync_visibility('11111111-1111-1111-1111-111111111111') <> md5('') then raise exception '(0038) the visibility hash of a stranger is not empty'; end if;
end $$;
-- a worker WITHOUT a roster entry cannot claim
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000e6';
do $$ begin begin perform claim_job('eeeeeeee-0000-0000-0000-0000000018a1'); raise exception '(0038) a worker without a roster entry claimed a job'; exception when insufficient_privilege then null; end; end $$;
-- the first worker takes it; the second is told «taken» and no longer sees it
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare r jsonb; begin
  r := claim_job('eeeeeeee-0000-0000-0000-0000000018a1');
  if r->>'status' <> 'claimed' then raise exception '(0038) the first claim was not accepted: %', r; end if;
  if (select worker_id from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') is distinct from 'bbbbbbbb-0000-0000-0000-0000000018b2' then raise exception '(0038) the job has the wrong worker'; end if;
  if (select assigned_to from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') is distinct from '00000000-0000-0000-0000-0000000000b2'::uuid then raise exception '(0038) the account did not follow the worker'; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000c4';
do $$ declare r jsonb; begin
  if (select count(*) from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') <> 0 then raise exception '(0038) a taken job is still visible to the loser'; end if;
  r := claim_job('eeeeeeee-0000-0000-0000-0000000018a1');
  if r->>'status' <> 'taken' then raise exception '(0038) the second claim was not refused: %', r; end if;
end $$;
-- a retry by the winner (the answer was lost on the way) is «claimed» again, not «taken»
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin if (claim_job('eeeeeeee-0000-0000-0000-0000000018a1'))->>'status' <> 'claimed' then raise exception '(0038) a retry by the winner was told «taken»'; end if; end $$;
-- the worker who has it cannot hand it on, change product or dose; only the owner reassigns
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin update jobs set worker_id = 'bbbbbbbb-0000-0000-0000-0000000018c4' where id = 'eeeeeeee-0000-0000-0000-0000000018a1'; raise exception '(0038) a worker handed her job on'; exception when insufficient_privilege then null; end;
  begin update jobs set dose_str = 0.5 where id = 'eeeeeeee-0000-0000-0000-0000000018a1'; raise exception '(0038) a worker changed the dose'; exception when insufficient_privilege then null; end;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  update jobs set worker_id = 'bbbbbbbb-0000-0000-0000-0000000018c4' where id = 'eeeeeeee-0000-0000-0000-0000000018a1';
  if (select assigned_to from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') is distinct from '00000000-0000-0000-0000-0000000000c4'::uuid then raise exception '(0038) the owner could not reassign the job'; end if;
  update jobs set worker_id = null where id = 'eeeeeeee-0000-0000-0000-0000000018a1';          -- the owner puts it back on the board
  if (select assigned_to from jobs where id = 'eeeeeeee-0000-0000-0000-0000000018a1') is not null then raise exception '(0038) the account stayed after the job went back to the board'; end if;
end $$;
-- the visible-job hash of a worker changes when an open job she could see is taken by someone else (her phone re-pulls)
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
create temp table vis18 as select private.sync_visibility('11111111-1111-1111-1111-111111111111') as h;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000c4';
do $$ begin if (claim_job('eeeeeeee-0000-0000-0000-0000000018a1'))->>'status' <> 'claimed' then raise exception '(0038) the second worker could not take the returned job'; end if; end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin if (select h from vis18) = private.sync_visibility('11111111-1111-1111-1111-111111111111') then raise exception '(0038) the visibility hash of the loser did not change when the job was taken'; end if; end $$;

-- the normal pull round trip (Codex SHOULD): the loser's phone had the open job; after another worker takes it her old cursor is reset and a fresh pull no longer carries the job
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin update jobs set worker_id = null where id = 'eeeeeeee-0000-0000-0000-0000000018a1'; end $$;                  -- the owner puts it back on the board
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
create temp table cur18 as select pull('11111111-1111-1111-1111-111111111111', null, 1000) as p;
do $$ begin
  if not exists (select 1 from jsonb_array_elements((select p from cur18)->'rows') r where r->>'table' = 'jobs' and r->'row'->>'id' = 'eeeeeeee-0000-0000-0000-0000000018a1') then raise exception '(0038) the loser''s first pull lacks the open job'; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000c4';
do $$ begin perform claim_job('eeeeeeee-0000-0000-0000-0000000018a1'); end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ declare again jsonb; fresh jsonb; begin
  again := pull('11111111-1111-1111-1111-111111111111', (select p from cur18)->'cursor', 1000);
  if (again->>'reset')::boolean is not true then raise exception '(0038) the old cursor was not reset after the job was taken'; end if;
  fresh := pull('11111111-1111-1111-1111-111111111111', null, 1000);
  if exists (select 1 from jsonb_array_elements(fresh->'rows') r where r->>'table' = 'jobs' and r->'row'->>'id' = 'eeeeeeee-0000-0000-0000-0000000018a1') then raise exception '(0038) a taken job is still in the loser''s fresh pull'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm18-job-board tests passed'; end $$;

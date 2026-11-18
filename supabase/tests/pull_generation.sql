-- Findings (b) and (d) of the independent review (migration 0016): the pull cursor carries a GENERATION and the SET OF A WORKER'S JOBS. Runs AFTER final.sql.
-- (The dump → restore → pull cycle itself is restore.sh.) Written BEFORE 0016: against 0001–0015 every block fails.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
-- (b) the pull cursor survives a restore into a NEW database: dump → restore → the rows are not lost, a phone that held a cursor starts from the beginning
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; g1 text; res jsonb; cur jsonb;
begin
  res := pull(f, null, 1);
  if not (res->'cursor' ? 'g') then raise exception '(b) the cursor carries no generation'; end if;
  cur := res->'cursor'; g1 := cur->>'g';
  -- a cursor of ANOTHER generation: the position is ignored, everything is served again, and the answer says so
  res := pull(f, jsonb_build_object('x', '999999999', 's', 999999999, 'g', 'some-old-generation', 'v', cur->>'v'), 1000);
  if (res->>'reset')::boolean is not true or jsonb_array_length(res->'rows') < 10 then raise exception '(b) a cursor of an old generation was not reset (reset=%, rows=%)', res->>'reset', jsonb_array_length(res->'rows'); end if;
  if res->'cursor'->>'g' <> g1 then raise exception '(b) the answer does not carry the current generation'; end if;
  -- the same generation: no reset
  if (pull(f, cur, 1000)->>'reset')::boolean is not false then raise exception '(b) a cursor of the current generation was reset'; end if;
end $$;

-- (d) a job given to ANOTHER worker: the new worker's phone receives the job's plantings, product and label use, and the old worker's no longer lists the job
reset role;
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000706',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000706','dddddddd-0000-0000-0000-000000000706');
end $$;
create temp table cur_ (who text primary key, c jsonb);
grant all on cur_ to app_user;
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000c3';
insert into cur_ select 'c3', pull('11111111-1111-1111-1111-111111111111', null, 1000)->'cursor';
set test.uid = '00000000-0000-0000-0000-0000000000b2';
insert into cur_ select 'b2', pull('11111111-1111-1111-1111-111111111111', null, 1000)->'cursor';
reset role;
set test.uid = '00000000-0000-0000-0000-0000000000a1';   -- the owner reassigns
update jobs set worker_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'eeeeeeee-0000-0000-0000-000000000706';
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000c3';
do $$
declare res jsonb; c jsonb;
begin
  select cur_.c into c from cur_ where who = 'c3';
  res := pull('11111111-1111-1111-1111-111111111111', c, 1000);
  if (res->>'reset')::boolean is not true then raise exception '(d) the new worker''s old cursor was not reset'; end if;
  if not exists (select 1 from jsonb_array_elements(res->'rows') x where x->>'table' = 'job_plantings' and x->'row'->>'job_id' = 'eeeeeeee-0000-0000-0000-000000000706') then raise exception '(d) the reassigned job''s plantings did not reach the new worker'; end if;
  if not exists (select 1 from jsonb_array_elements(res->'rows') x where x->>'table' = 'jobs' and x->'row'->>'id' = 'eeeeeeee-0000-0000-0000-000000000706') then raise exception '(d) the reassigned job did not reach the new worker'; end if;
  if not exists (select 1 from jsonb_array_elements(res->'rows') x where x->>'table' = 'label_uses' and x->'row'->>'id' = 'cccccccc-1111-0000-0000-000000000001') then raise exception '(d) the label use did not reach the new worker'; end if;
  if (pull('11111111-1111-1111-1111-111111111111', res->'cursor', 1000)->>'reset')::boolean is not false then raise exception '(d) the fresh cursor was reset again'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$
declare res jsonb; c jsonb;
begin
  select cur_.c into c from cur_ where who = 'b2';
  res := pull('11111111-1111-1111-1111-111111111111', c, 1000);
  if (res->>'reset')::boolean is not true then raise exception '(d) the old worker''s cursor was not reset when her visible jobs changed'; end if;
  if exists (select 1 from jsonb_array_elements(res->'rows') x where x->>'table' = 'jobs' and x->'row'->>'id' = 'eeeeeeee-0000-0000-0000-000000000706') then raise exception '(d) the old worker still receives the job'; end if;
end $$;


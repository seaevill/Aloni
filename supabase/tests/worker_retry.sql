-- 0014: a RETRIED «Έγινε» creates nothing new; record vs permission for the re-entry period. Runs after worker.sql (reuses its farm, label use and workers b2 = w1, c3 = w2).
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
        crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; w2 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002'; i int;
begin
  for i in 1..4 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid,f,p,crop2,0.25,'2026-11-01','growing');
    insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values (('eeeeeeee-0000-0000-0000-0000000004' || lpad(i::text, 2, '0'))::uuid,f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18');
    insert into job_plantings(farm_id,job_id,planting_id) values (f, ('eeeeeeee-0000-0000-0000-0000000004' || lpad(i::text, 2, '0'))::uuid, ('dddddddd-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid);
  end loop;
  -- planting 3 and 4: an earlier spray (3 hours ago) whose REI runs until 21 hours from now (3) / is unknown (4)
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000503',f,'spray','done',w2,prod,now() - interval '3 hours'), ('eeeeeeee-0000-0000-0000-000000000504',f,'spray','done',w2,prod,now() - interval '3 hours');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000503','dddddddd-0000-0000-0000-000000000203'), (f,'eeeeeeee-0000-0000-0000-000000000504','dddddddd-0000-0000-0000-000000000204');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000503',prod,w2,lu,now() - interval '3 hours',0.025,'ml/str','signed',7,24,'label',now() - interval '3 hours' + interval '168 hours',now() - interval '3 hours' + interval '24 hours',now() - interval '170 minutes');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at) values (f,'eeeeeeee-0000-0000-0000-000000000504',prod,w2,now() - interval '3 hours',0.025,'ml/str','unsigned',now() - interval '170 minutes');
end $$;
create temp table moves_before as select count(*) as n from stock_movements;

set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
create temp table res (k text primary key, v jsonb);
do $$
declare t constant timestamptz := now() - interval '30 minutes'; first_ jsonb; again jsonb;
begin
  -- 1. the same request twice
  first_ := complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', t, 'note', p_started_at => (t) - interval '30 minutes');
  again := complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', t, 'note', p_started_at => (t) - interval '30 minutes');
  if (again->>'repeat')::boolean is not true or (first_->>'repeat')::boolean is not false or again->>'spray_id' <> first_->>'spray_id' then raise exception 'a retry did not return the original answer: % / %', first_, again; end if;
  -- three more times: still the same
  perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', t, p_started_at => (t) - interval '30 minutes'); perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', t, p_started_at => (t) - interval '30 minutes');
  -- 2. another end time for a job that is already done: refused
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', t + interval '1 minute', p_started_at => (t + interval '1 minute') - interval '30 minutes'); raise exception 'second completion with another time accepted'; exception when check_violation then null; end;
  -- 3. a spraying that ended 2 hours ago in a field whose REI was running then: the RECORD is kept and marked; the same field «just now» is refused
  insert into res values ('past_locked', complete_spray_job('eeeeeeee-0000-0000-0000-000000000403', now() - interval '2 hours', p_started_at => (now() - interval '2 hours') - interval '30 minutes'));
  insert into res values ('past_unknown', complete_spray_job('eeeeeeee-0000-0000-0000-000000000404', now() - interval '2 hours', p_started_at => (now() - interval '2 hours') - interval '30 minutes'));
  insert into res values ('before_the_other_spray', complete_spray_job('eeeeeeee-0000-0000-0000-000000000402', now() - interval '4 hours', p_started_at => (now() - interval '4 hours') - interval '30 minutes'));
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000c3';
do $$ begin
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000401', now() - interval '30 minutes', p_started_at => (now() - interval '30 minutes') - interval '30 minutes'); raise exception 'another account used the retry path'; exception when insufficient_privilege then null; end;
end $$;
reset role; set test.uid = '';
do $$
declare n int; m int; s job_spray%rowtype;
begin
  select count(*) into n from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000401'; if n <> 1 then raise exception 'retries created % sprays', n; end if;
  select count(*) into n from stock_movements; select moves_before.n into m from moves_before; if n <> m then raise exception 'a stock movement appeared (% vs %)', n, m; end if;
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000403'; if 'rei_conflict' <> all (s.flags) then raise exception 'a past spraying in a locked field is not marked: %', to_jsonb(s); end if;
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000404'; if 'rei_conflict' <> all (s.flags) then raise exception 'unknown REI at that time is not marked: %', to_jsonb(s); end if;
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000402'; if s.id is null then raise exception 'a spraying before the other spray was lost'; end if;
  if (select count(*) from verify_spray_chain('11111111-1111-1111-1111-111111111111')) <> 0 then raise exception 'chain broken'; end if;
end $$;
-- permission: a spraying that ends NOW in a field under a running REI is still refused
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
reset role; set test.uid = '';
insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000405','11111111-1111-1111-1111-111111111111','spray','planned','bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-1111-0000-0000-000000000001',0.025,'ml/str','2026-11-18');
insert into job_plantings(farm_id,job_id,planting_id) values ('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000405','dddddddd-0000-0000-0000-000000000203');
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000405', now() - interval '1 minute', p_started_at => (now() - interval '1 minute') - interval '30 minutes'); raise exception 'a live spraying in a locked field was accepted'; exception when check_violation then if sqlerrm not like '%locked%' then raise; end if; end;
end $$;

-- M2-c: the worker's «Έγινε» is written by the SERVER (complete_spray_job), from the job's fixed values and the verified session. Runs AFTER smoke/review/agri/phone
-- on the same database (it reuses the farm, the signed label use, the roster worker whose account is b2, and a second product).
\set ON_ERROR_STOP on
reset role; set test.uid = '';
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000c3');
insert into farm_members(farm_id,user_id,role) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c3','worker');
insert into products(id,farm_id,name,type,unit) values ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Nobody''s product','fungicide','kg');
insert into workers(id,farm_id,name,user_id) values ('bbbbbbbb-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Ahmet','00000000-0000-0000-0000-0000000000c3');
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
        prod2 constant uuid := 'aaaaaaaa-0000-0000-0000-000000000002'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001';
        w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; w2 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002'; i int;
begin
  -- a label use WITHOUT a signature, and a dose that is outside the signed label's
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-000000000003',f,prod,crop2,'unsigned','single','ml/str',0.025,7,24,3);
  -- plantings (one field each) and the open jobs; the job ids are readable on purpose (1 = the happy path ... )
  for i in 1..12 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid,f,p,crop2,0.25,'2026-11-01','growing');
  end loop;
  -- jobs 1..12: (assigned worker, product, label use, dose) as the manager fixed them
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values
    ('eeeeeeee-0000-0000-0000-000000000101',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18'),                       -- 1 happy path
    ('eeeeeeee-0000-0000-0000-000000000102',f,'spray','planned',w2,prod2,null,0.5,'ml/str','2026-11-18'),                       -- 2 somebody else's
    ('eeeeeeee-0000-0000-0000-000000000106',f,'spray','planned',w1,prod,'cccccccc-1111-0000-0000-000000000003',0.9,'ml/str','2026-11-18'), -- 6 unsigned label, dose differs
    ('eeeeeeee-0000-0000-0000-000000000107',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18'),                       -- 7 field under REI
    ('eeeeeeee-0000-0000-0000-000000000108',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18'),                       -- 8 field with unknown REI
    ('eeeeeeee-0000-0000-0000-000000000109',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18'),                       -- 9 late
    ('eeeeeeee-0000-0000-0000-000000000110',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18'),                       -- 10 owner tries
    ('eeeeeeee-0000-0000-0000-000000000111',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18');                       -- 11 same field as job 1
  insert into jobs(id,farm_id,kind,status,skip_reason,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000104',f,'spray','skipped','rain',w1,prod,lu,0.025,'ml/str','2026-11-18'); -- 4 cancelled
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for,deleted_at) values ('eeeeeeee-0000-0000-0000-000000000105',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18',now()); -- 5 archived
  insert into jobs(id,farm_id,kind,status,planned_for,parcel_id) values ('eeeeeeee-0000-0000-0000-000000000103',f,'other','planned','2026-11-18',p);                                  -- 3 nobody
  insert into job_plantings(farm_id,job_id,planting_id) select f, ('eeeeeeee-0000-0000-0000-000000000' || lpad((100 + n)::text, 3, '0'))::uuid, ('dddddddd-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid from generate_series(1, 10) n;
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000111','dddddddd-0000-0000-0000-000000000101');   -- 11 shares planting 1
  -- an earlier spray on planting 7: REI still running; on planting 8: REI unknown
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000207',f,'spray','done',w2,prod,now() - interval '1 hour'), ('eeeeeeee-0000-0000-0000-000000000208',f,'spray','done',w2,prod,now() - interval '1 hour');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000207','dddddddd-0000-0000-0000-000000000107'), (f,'eeeeeeee-0000-0000-0000-000000000208','dddddddd-0000-0000-0000-000000000108');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000207',prod,w2,lu,now() - interval '1 hour',0.025,'ml/str','signed',7,24,'label',now() - interval '1 hour' + interval '168 hours',now() - interval '1 hour' + interval '24 hours',now() - interval '59 minutes');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at) values (f,'eeeeeeee-0000-0000-0000-000000000208',prod,w2,now() - interval '1 hour',0.025,'ml/str','unsigned',now() - interval '59 minutes');
end $$;

-- the worker (account b2)
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
create temp table out_ (k text primary key, v jsonb);
do $$
declare r jsonb; j text; why text;
  procedure_dummy int;
begin
  -- happy path
  r := complete_spray_job('eeeeeeee-0000-0000-0000-000000000101', now() - interval '10 minutes', '  dose was a little higher  ');
  insert into out_ values ('happy', r);
  -- every refusal below must raise; nothing may be recorded for it
  foreach j in array array['eeeeeeee-0000-0000-0000-000000000101', 'eeeeeeee-0000-0000-0000-000000000102', 'eeeeeeee-0000-0000-0000-000000000103', 'eeeeeeee-0000-0000-0000-000000000104', 'eeeeeeee-0000-0000-0000-000000000105', 'eeeeeeee-0000-0000-0000-00000000ffff'] loop
    begin perform complete_spray_job(j::uuid, now()); raise exception 'accepted: %', j; exception when insufficient_privilege or check_violation then null; end;
  end loop;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000107', now()); raise exception 'accepted: field under REI'; exception when check_violation then if sqlerrm not like '%locked%' then raise; end if; end;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000108', now()); raise exception 'accepted: unknown REI'; exception when check_violation then if sqlerrm not like '%locked%' then raise; end if; end;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000111', now()); raise exception 'accepted: field of job 1 is under its REI'; exception when check_violation then if sqlerrm not like '%locked%' then raise; end if; end;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000109', now() + interval '1 hour'); raise exception 'accepted: future end'; exception when check_violation then null; end;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000109', now() - interval '10 days'); raise exception 'accepted: late without a reason'; exception when check_violation then null; end;
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000109', now() - interval '10 days', null, '   '); raise exception 'accepted: late with a blank reason'; exception when check_violation then null; end;
  insert into out_ values ('late', complete_spray_job('eeeeeeee-0000-0000-0000-000000000109', now() - interval '10 days', null, 'forgot to tell'));
  insert into out_ values ('unsigned', complete_spray_job('eeeeeeee-0000-0000-0000-000000000106', now() - interval '5 minutes'));
  -- the worker can neither write a spray herself nor change a job's values
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values ('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000110','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',now(),0.025,'ml/str','unsigned'); raise exception 'worker wrote a spray'; exception when insufficient_privilege then null; end;
  begin update jobs set dose_str = 0.001 where id = 'eeeeeeee-0000-0000-0000-000000000110'; raise exception 'worker changed a dose'; exception when insufficient_privilege then null; end;
end $$;

-- what was recorded, and by whom
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; b2 constant uuid := '00000000-0000-0000-0000-0000000000b2'; s job_spray%rowtype; j jobs%rowtype; n int; o jsonb;
begin
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000101';
  if s.product_id <> 'aaaaaaaa-0000-0000-0000-000000000001' or s.dose_str <> 0.025 or s.dose_unit <> 'ml/str' or s.label_use_id <> 'cccccccc-1111-0000-0000-000000000001' then raise exception 'the record does not carry the JOB''s values: %', to_jsonb(s); end if;
  if s.applicator_id <> 'bbbbbbbb-0000-0000-0000-000000000001' or s.created_by is distinct from b2 then raise exception 'applicator/creator not from the roster/session: %', to_jsonb(s); end if;
  if s.label_state <> 'signed' or s.phi_days <> 7 or s.rei_hours <> 24 or s.phi_until <> s.sprayed_at + interval '168 hours' or s.rei_until <> s.sprayed_at + interval '24 hours' or s.phi_source <> 'label' then raise exception 'waiting periods wrong: %', to_jsonb(s); end if;
  if s.note <> 'dose was a little higher' or s.flags <> '{}' then raise exception 'note/flags wrong: %', to_jsonb(s); end if;
  select * into j from jobs where id = 'eeeeeeee-0000-0000-0000-000000000101'; if j.status <> 'done' or j.done_by is distinct from b2 or j.done_at <> s.sprayed_at then raise exception 'job not closed by the worker: %', to_jsonb(j); end if;
  select count(*) into n from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000101'; if n <> 1 then raise exception 'two sprays for one job (%)', n; end if;
  -- the refused jobs left nothing behind
  select count(*) into n from job_spray where job_id in ('eeeeeeee-0000-0000-0000-000000000102','eeeeeeee-0000-0000-0000-000000000104','eeeeeeee-0000-0000-0000-000000000105','eeeeeeee-0000-0000-0000-000000000107','eeeeeeee-0000-0000-0000-000000000108','eeeeeeee-0000-0000-0000-000000000110','eeeeeeee-0000-0000-0000-000000000111'); if n <> 0 then raise exception 'a refused job left % sprays', n; end if;
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000109'; if 'late_entry' <> all (s.flags) or s.late_reason <> 'forgot to tell' then raise exception 'late entry not marked: %', to_jsonb(s); end if;
  select * into s from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000106';
  if s.label_state <> 'unsigned' or s.phi_until is not null or s.rei_until is not null or s.phi_days is not null or not (s.flags @> array['label_unsigned','dose_outside_label']) then raise exception 'weak label not recorded as weak (PHI must stay unknown): %', to_jsonb(s); end if;
  if (select count(*) from verify_spray_chain(f)) <> 0 then raise exception 'chain broken by the server-written sprays'; end if;
end $$;

-- the owner is not a worker of this job; another worker's account cannot complete it; anon cannot call at all
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000110', now()); raise exception 'the owner completed a worker''s job'; exception when insufficient_privilege then null; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000c3';
do $$ begin
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000110', now()); raise exception 'another worker completed the job'; exception when insufficient_privilege then null; end;
  -- reads: the worker sees her own job's product, not the other worker's product, and her own roster row only
  if not exists (select 1 from products where id = 'aaaaaaaa-0000-0000-0000-000000000002') then raise exception 'worker c3 cannot read her job''s product'; end if;
  if exists (select 1 from products where id = 'aaaaaaaa-0000-0000-0000-000000000003') then raise exception 'worker c3 reads a product that is on no job of hers'; end if;
  if (select count(*) from workers) <> 1 then raise exception 'worker sees the roster'; end if;
  if exists (select 1 from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000101') then raise exception 'worker c3 sees a spray on a field that is not hers'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if not exists (select 1 from products where id = 'aaaaaaaa-0000-0000-0000-000000000001') then raise exception 'worker b2 cannot read her job''s product'; end if;
  if exists (select 1 from products where id = 'aaaaaaaa-0000-0000-0000-000000000002') then raise exception 'worker b2 reads a product that is not on her jobs'; end if;
  if not exists (select 1 from label_uses where id = 'cccccccc-1111-0000-0000-000000000001') then raise exception 'worker b2 cannot read her job''s label use'; end if;
  if not exists (select 1 from job_spray where job_id = 'eeeeeeee-0000-0000-0000-000000000207') then raise exception 'worker b2 cannot see the spray that locks her field'; end if;
  begin insert into products(farm_id,name,type,unit) values ('11111111-1111-1111-1111-111111111111','x','fungicide','kg'); raise exception 'worker wrote a product'; exception when insufficient_privilege then null; end;
end $$;
reset role; set test.uid = '';
do $$ begin
  if has_function_privilege('anon', 'complete_spray_job(uuid,timestamptz,text,text)', 'execute') or has_function_privilege('public', 'complete_spray_job(uuid,timestamptz,text,text)', 'execute') then raise exception 'anon/PUBLIC can call complete_spray_job'; end if;
end $$;

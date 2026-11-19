-- Pre-apply findings of the team's independent review of 0001–0012 (items a1, a2, c, e, f, g; b and d are pull_generation.sql). Each block names its finding. Runs AFTER worker_retry.sql on the same database.
-- Written BEFORE migration 0015: against 0001–0014 every block below must fail (the red run is in the PR), against 0015 all must pass.
\set ON_ERROR_STOP on
reset role;
-- fixtures: a clean planting/job set (farm f, parcel p, product prod, signed label lu (PHI 7 / REI 24), workers w1 = account b2, w2 = account c3)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
        crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; i int;
begin
  for i in 1..8 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-0000000007' || lpad(i::text, 2, '0'))::uuid,f,p,crop2,0.25,'2026-11-01','growing');
  end loop;
  -- jobs 1 (victim: spray with an UNKNOWN waiting period on planting 1) and 2 (unrelated job)
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000701',f,'spray','done',w1,prod,now() - interval '1 day'), ('eeeeeeee-0000-0000-0000-000000000702',f,'spray','done',w1,prod,now() - interval '1 day');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000701','dddddddd-0000-0000-0000-000000000701'), (f,'eeeeeeee-0000-0000-0000-000000000702','dddddddd-0000-0000-0000-000000000702');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at) values
    ('55555555-0000-0000-0000-000000000701',f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,now() - interval '1 day',0.025,'ml/str','unsigned',now() - interval '1 day' + interval '1 minute'),
    ('55555555-0000-0000-0000-000000000702',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,now() - interval '1 day',0.025,'ml/str','unsigned',now() - interval '1 day' + interval '1 minute');
end $$;

-- (a1) job_plantings can no longer be re-pointed to another planting (it would let the owner move a spray away from the planting it covers)
do $$ begin
  begin update job_plantings set planting_id = 'dddddddd-0000-0000-0000-000000000703' where job_id = 'eeeeeeee-0000-0000-0000-000000000701'; raise exception '(a1) job_plantings.planting_id was changed'; exception when insufficient_privilege then null; end;
  begin update job_plantings set area_str_treated = 9 where job_id = 'eeeeeeee-0000-0000-0000-000000000701'; raise exception '(a1) job_plantings.area_str_treated was changed'; exception when insufficient_privilege then null; end;
end $$;

-- (a2) a correction row only touches ITS OWN spray: same job, same product, same end time; the original must have an unknown PHI; manual PHI/REI above zero;
--      never shorter than a signed label; one correction per original
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz;
begin
  select sprayed_at into t from job_spray where id = '55555555-0000-0000-0000-000000000701';
  -- the attack: «correct» spray 701 from an UNRELATED job with a PHI of 0
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,t,0.025,'ml/str','unsigned',0,24,'manual',t,t + interval '24 hours','55555555-0000-0000-0000-000000000701','x',now()); raise exception '(a2) a correction from an unrelated job was accepted';
  exception when check_violation then null; end;
  -- right job but PHI 0 / REI 0
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,t,0.025,'ml/str','unsigned',0,24,'manual',t,t + interval '24 hours','55555555-0000-0000-0000-000000000701','x',now()); raise exception '(a2) a manual PHI of 0 was accepted';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,t,0.025,'ml/str','unsigned',7,0,'manual',t + interval '168 hours',t,'55555555-0000-0000-0000-000000000701','x',now()); raise exception '(a2) a manual REI of 0 was accepted';
  exception when check_violation then null; end;
  -- (0023: a correction may now carry another end time or applicator; a CHANGED product or job stays refused and a waiting period may never end earlier than the original's: tested in m5_0023.sql)
  -- the honest correction: accepted ...
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values ('55555555-0000-0000-0000-000000000711',f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,t,0.025,'ml/str','unsigned',7,24,'manual',t + interval '168 hours',t + interval '24 hours','55555555-0000-0000-0000-000000000701','values from the label',now());
  -- ... only once per original
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,t,0.025,'ml/str','unsigned',9,24,'manual',t + interval '216 hours',t + interval '24 hours','55555555-0000-0000-0000-000000000701','again',now()); raise exception '(a2) a second correction of the same spray was accepted';
  exception when unique_violation or check_violation then null; end;
  -- an original whose PHI is already KNOWN cannot be «corrected» (it could only shorten it)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000701',prod,w1,t,0.025,'ml/str','unsigned',1,1,'manual',t + interval '24 hours',t + interval '1 hour','55555555-0000-0000-0000-000000000711','shorter',now()); raise exception '(a2) a correction of a spray with a known PHI was accepted';
  exception when check_violation then null; end;
  -- shorter than the SIGNED label the spray points at: refused (label PHI 7 / REI 24)
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,created_at)
    values ('55555555-0000-0000-0000-000000000703',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,'cccccccc-1111-0000-0000-000000000001',t + interval '1 hour',0.025,'ml/str','changed',now());
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,'cccccccc-1111-0000-0000-000000000001',t + interval '1 hour',0.025,'ml/str','changed',3,24,'manual',t + interval '1 hour' + interval '72 hours',t + interval '25 hours','55555555-0000-0000-0000-000000000703','shorter than the label',now()); raise exception '(a2) a manual PHI shorter than the signed label was accepted';
  exception when check_violation then null; end;
end $$;

-- (c) a worker's times are bounded by the SERVER clock: nothing in the future (no 5-minute tolerance), and a harvest cannot be written into a waiting period by dating it back
reset role;
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; lu constant uuid := 'cccccccc-1111-0000-0000-000000000001';
begin
  -- planting 4: a spray 3 hours ago with a signed label (PHI 7 days, REI 24 h): both periods run now AND were running 2 hours ago
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-000000000704',f,'spray','done',w1,prod,now() - interval '3 hours');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000704','dddddddd-0000-0000-0000-000000000704');
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,created_at)
    values (f,'eeeeeeee-0000-0000-0000-000000000704',prod,w1,lu,now() - interval '3 hours',0.025,'ml/str','signed',7,24,'label',now() - interval '3 hours' + interval '168 hours',now() - interval '3 hours' + interval '24 hours',now() - interval '170 minutes');
  -- planting 5: free of any spray
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-000000000705',f,'spray','planned',w1,prod,lu,0.025,'ml/str','2026-11-18');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-000000000705','dddddddd-0000-0000-0000-000000000705');
end $$;
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000705',1,now() + interval '2 minutes'); raise exception '(c) a worker harvest 2 minutes in the future was accepted'; exception when check_violation then null; end;
  begin insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000704',1,now() - interval '2 hours'); raise exception '(c) a worker harvest dated back INTO a running PHI/REI was accepted'; exception when check_violation then null; end;
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000705',1,now() - interval '1 hour');   -- a free planting: fine
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-000000000705', now() + interval '2 minutes'); raise exception '(c) a worker spraying that ends 2 minutes in the future was accepted'; exception when check_violation then null; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  -- the owner keeps his tolerance of 5 minutes, and may RECORD an earlier harvest that conflicts (it is kept and shown, see harvest_conflicts)
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000705',2,now() + interval '2 minutes');
  insert into job_harvest(farm_id,planting_id,crates_str,harvested_at) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000704',3,now() - interval '2 hours');
end $$;

-- (e) «late» is judged by the SERVER's clock (the server's clock, now()): a spraying that reached the server more than 7 days after it ended is kept and marked, whatever the phone's clock said
reset role;
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; s job_spray%rowtype;
begin
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at)
    values ('55555555-0000-0000-0000-000000000721',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,now() - interval '9 days',0.025,'ml/str','unsigned',now() - interval '9 days' + interval '1 hour');
  select * into s from job_spray where id = '55555555-0000-0000-0000-000000000721';
  if 'late_entry' <> all (s.flags) or length(btrim(coalesce(s.late_reason, ''))) = 0 then raise exception '(e) a spraying received 8 days late was not marked: %', to_jsonb(s); end if;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at)
    values ('55555555-0000-0000-0000-000000000722',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,now() - interval '7 days',0.025,'ml/str','unsigned',now() - interval '7 days');
  select * into s from job_spray where id = '55555555-0000-0000-0000-000000000722'; if 'late_entry' = any (s.flags) then raise exception '(e) exactly 7 days was called late'; end if;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at)
    values ('55555555-0000-0000-0000-000000000723',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,now() - interval '20 days',0.025,'ml/str','unsigned',now() - interval '20 days');
  select * into s from job_spray where id = '55555555-0000-0000-0000-000000000723'; if 'late_entry' <> all (s.flags) then raise exception '(e) a backdated created_at hid a late entry'; end if;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,created_at,flags,late_reason)
    values ('55555555-0000-0000-0000-000000000724',f,'eeeeeeee-0000-0000-0000-000000000702',prod,w1,now() - interval '30 days',0.025,'ml/str','unsigned',now() - interval '29 days',array['late_entry'],'forgot');
  select * into s from job_spray where id = '55555555-0000-0000-0000-000000000724'; if s.late_reason <> 'forgot' then raise exception '(e) the phone''s own reason was overwritten'; end if;
end $$;

-- (f) TRUNCATE is not covered by RLS: nobody but the table owner may truncate, the append-only tables refuse it for everyone; table rights are explicit
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'spatial_ref_sys' loop   -- spatial_ref_sys is PostGIS's own table (open to PUBLIC by PostGIS; on Supabase PostGIS lives in the extensions schema)
    if has_table_privilege('authenticated', format('public.%I', t), 'truncate') then raise exception '(f) authenticated can TRUNCATE %', t; end if;
    if has_table_privilege('anon', format('public.%I', t), 'select') or has_table_privilege('anon', format('public.%I', t), 'insert') or has_table_privilege('anon', format('public.%I', t), 'truncate') then raise exception '(f) anon has a right on %', t; end if;
  end loop;
  if not has_table_privilege('authenticated', 'public.parcels', 'select') or not has_table_privilege('authenticated', 'public.parcels', 'insert') or not has_table_privilege('authenticated', 'public.parcels', 'update') then raise exception '(f) authenticated lacks an explicit right on parcels'; end if;
  begin truncate job_spray; raise exception '(f) job_spray was truncated'; exception when insufficient_privilege then null; end;
  begin truncate job_harvest; raise exception '(f) job_harvest was truncated'; exception when insufficient_privilege then null; end;
  begin truncate audit_log; raise exception '(f) audit_log was truncated'; exception when insufficient_privilege then null; end;
  begin truncate stock_movements; raise exception '(f) stock_movements was truncated'; exception when insufficient_privilege then null; end;
end $$;

-- (g) verify_spray_chain never says «sound» to someone who cannot read the sprays
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin perform * from verify_spray_chain('11111111-1111-1111-1111-111111111111'); raise exception '(g) a worker got an answer from verify_spray_chain'; exception when insufficient_privilege then null; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin perform * from verify_spray_chain('22222222-2222-2222-2222-222222222222'); raise exception '(g) the owner of another farm got an answer'; exception when insufficient_privilege then null; end;
  if (select count(*) from verify_spray_chain('11111111-1111-1111-1111-111111111111')) <> 0 then raise exception '(g) the owner''s own chain does not verify'; end if;
end $$;
reset role;

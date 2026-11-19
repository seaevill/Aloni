-- Findings of the team's 0021 review (migration 0022): (1) the floor of a manual correction and of the harvest gate also comes from jobs.label_use_id and from the active label uses
-- of the product × the job's crops, so an EMPTY spray.label_use_id no longer escapes it; no label at all = the waiting period cannot be typed by hand (unknown = blocked);
-- (4) every definer function pins pg_temp in its search_path. Runs AFTER m4_0021.sql. Written BEFORE 0022: against 0001–0021 these fail.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; crop2 constant uuid := 'cccccccc-0000-0000-0000-000000000002';
        w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; pa constant uuid := 'aaaaaaaa-0000-0000-0000-000000000941'; pb constant uuid := 'aaaaaaaa-0000-0000-0000-000000000942'; t timestamptz := now() - interval '3 days'; i int;
begin
  insert into products(id,farm_id,name,type,unit) values (pa,f,'m5 product with a label','fungicide','kg'), (pb,f,'m5 product without any label','fungicide','kg');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-000000000941',f,pa,crop2,'m5','single','ml/str',0.025,7,24,3);  -- UNSIGNED
  for i in 1..3 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-00000000094' || i)::uuid,f,p,crop2,0.25,'2026-11-01','growing');
    insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values (('eeeeeeee-0000-0000-0000-00000000094' || i)::uuid,f,'spray','done',w1,case when i = 3 then pb else pa end,now() - interval '1 hour');
    insert into job_plantings(farm_id,job_id,planting_id) values (f,('eeeeeeee-0000-0000-0000-00000000094' || i)::uuid,('dddddddd-0000-0000-0000-00000000094' || i)::uuid);
    insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state)       -- label_use_id EMPTY
      values (('55555555-0000-0000-0000-00000000094' || i)::uuid,f,('eeeeeeee-0000-0000-0000-00000000094' || i)::uuid,case when i = 3 then pb else pa end,w1,t,0.025,'ml/str','none');
  end loop;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; pa constant uuid := 'aaaaaaaa-0000-0000-0000-000000000941'; pb constant uuid := 'aaaaaaaa-0000-0000-0000-000000000942';
        t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000941');
begin
  -- (1a) a spray with an empty label_use_id: PHI 1 / REI 1 by hand is refused (the floor comes from the active label of the product × crop)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000941',pa,w1,t,0.025,'ml/str','none',1,24,'manual',t + interval '1 day',t + interval '24 hours','55555555-0000-0000-0000-000000000941','x');
    raise exception '(1a) PHI 1 accepted for a spray with an empty label_use_id although the label says 7';
  exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000941',pa,w1,t,0.025,'ml/str','none',7,1,'manual',t + interval '7 days',t + interval '1 hour','55555555-0000-0000-0000-000000000941','x');
    raise exception '(1a) REI 1 accepted against a label that says 24';
  exception when check_violation then null; end;
  -- (1b) NO label for the product at all: the waiting period cannot be typed by hand (unknown stays blocked)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000943',pb,w1,t,0.025,'ml/str','none',30,48,'manual',t + interval '30 days',t + interval '48 hours','55555555-0000-0000-0000-000000000943','x');
    raise exception '(1b) a manual waiting period was accepted although no label is known';
  exception when check_violation then null; end;
  -- (1c) at or above the label: accepted
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000941',pa,w1,t,0.025,'ml/str','none',7,24,'manual',t + interval '7 days',t + interval '24 hours','55555555-0000-0000-0000-000000000941','from the label');
end $$;
reset role; set test.uid = '';
-- (1d) the gate: a short correction that got in with the triggers off does not open the gate on day 3 (floor from the product × crop label)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; pa constant uuid := 'aaaaaaaa-0000-0000-0000-000000000941';
        t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-000000000942');
begin
  set session_replication_role = replica;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-000000000992',f,'eeeeeeee-0000-0000-0000-000000000942',pa,w1,t,0.025,'ml/str','none',1,1,'manual',t + interval '1 day',t + interval '1 hour','55555555-0000-0000-0000-000000000942','x');
  set session_replication_role = origin;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001',f,'dddddddd-0000-0000-0000-000000000942',now(),1);
    raise exception '(1d) the harvest gate opened on day 3 for a spray with an empty label_use_id (label PHI 7)';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
-- (4) every definer function of ours pins pg_temp last
do $$ declare bad text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into bad from pg_proc p
    where p.prosecdef and p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%pg_temp');
  if bad is not null then raise exception '(4) definer functions without pg_temp in search_path: %', bad; end if;
end $$;
do $$ begin raise notice 'm5-0022 tests passed'; end $$;

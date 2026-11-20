-- Team review m8 (docs/reviews/team/2026-11-20-m8-review.md): M1 + M2 (MUST), S1 (race), S2 (harvest_conflicts), S3 (cut_by), and the INVARIANT behind all of them: no planting is open to harvest or entry
-- before the waiting / re-entry period of ITS OWN crop's SIGNED label for the spray's own product has passed (unknown = closed). Real `authenticated` owner and worker; only the fixtures run as superuser.
-- Written BEFORE 0032 (red against 0031), then green. Runs after m12_m7.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000013a1'; ca constant uuid := 'cccccccc-0000-0000-0000-0000000013a1'; cb constant uuid := 'cccccccc-0000-0000-0000-0000000013a2'; cc constant uuid := 'cccccccc-0000-0000-0000-0000000013a3';
begin
  insert into crops(id,farm_id,slug,name_el) values (ca,f,'m13a','Μ13α'), (cb,f,'m13b','Μ13β'), (cc,f,'m13c','Μ13γ');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m13 product','fungicide','kg');
  -- A: signed PHI 14 / REI 48; B: signed PHI 3 / REI 24; C: only an UNSIGNED draft label with NO waiting period (a hole)
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint) values
    ('cccccccc-1111-0000-0000-0000000013a1',f,pq,ca,'m13','single','ml/str',0.025,14,48,3,'agronomist',current_date,'fp1'),
    ('cccccccc-1111-0000-0000-0000000013a2',f,pq,cb,'m13','single','ml/str',0.025,3,24,3,'agronomist',current_date,'fp2');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min) values ('cccccccc-1111-0000-0000-0000000013a3',f,pq,cc,'m13','single','ml/str',0.025);
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values
    ('dddddddd-0000-0000-0000-0000000013a1',f,p,ca,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000013b1',f,p,cb,0.25,'2026-11-01','growing'),
    ('dddddddd-0000-0000-0000-0000000013c1',f,p,cc,0.25,'2026-11-01','growing'), ('dddddddd-0000-0000-0000-0000000013a2',f,p,ca,0.25,'2026-11-01','growing');
  -- job 1 = C + B (M1): an UNKNOWN spray (no label named) 4 days old; job 2 = A + B (M2): a legacy row with the B label (REI 24) ended 30 h ago; job 3 = planned for the worker on the A planting
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-0000000013a1',f,'spray','done',w1,pq,now() - interval '4 days'), ('eeeeeeee-0000-0000-0000-0000000013a2',f,'spray','done',w1,pq,now() - interval '30 hours');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('eeeeeeee-0000-0000-0000-0000000013a3',f,'spray','planned',w1,pq,'cccccccc-1111-0000-0000-0000000013a1',0.025,'ml/str',current_date);
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000013a1','dddddddd-0000-0000-0000-0000000013c1'), (f,'eeeeeeee-0000-0000-0000-0000000013a1','dddddddd-0000-0000-0000-0000000013b1'),
    (f,'eeeeeeee-0000-0000-0000-0000000013a2','dddddddd-0000-0000-0000-0000000013a1'), (f,'eeeeeeee-0000-0000-0000-0000000013a2','dddddddd-0000-0000-0000-0000000013b1'),
    (f,'eeeeeeee-0000-0000-0000-0000000013a3','dddddddd-0000-0000-0000-0000000013a1');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000013a1',f,'eeeeeeee-0000-0000-0000-0000000013a1',pq,w1,now() - interval '4 days',now() - interval '4 days' - interval '10 minutes',0.025,'ml/str','none');
  set local session_replication_role = replica;      -- the legacy row (a crop-B label on a job that also holds crop A) could be written before 0022: the fixture bypasses the checks
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
    values ('55555555-0000-0000-0000-0000000013a2',f,'eeeeeeee-0000-0000-0000-0000000013a2',pq,w1,'cccccccc-1111-0000-0000-0000000013a2',now() - interval '30 hours',now() - interval '31 hours',0.025,'ml/str','signed',3,24,'label',now() - interval '30 hours' + interval '72 hours',now() - interval '30 hours' + interval '24 hours');
  set local session_replication_role = origin;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';

-- M1: a typed PHI 3 / REI 24 on the unknown spray of a job holding crop C (a label with a hole) and crop B is REFUSED
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000013a1'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000013a1');
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
        values (f,'eeeeeeee-0000-0000-0000-0000000013a1',pq,w1,t,t - interval '10 minutes',0.025,'ml/str','none',3,24,'manual',t + interval '72 hours',t + interval '24 hours','55555555-0000-0000-0000-0000000013a1','typed');
        raise exception '(M1) a typed PHI was accepted although the crop-C label has no waiting period';
  exception when check_violation then if sqlerrm not like '%no label with a known waiting period%' then raise; end if; end;
end $$;
-- M1: the crop-C planting stays closed on day 4 for the OWNER and for the WORKER (the hole never reads as «no floor»)
do $$ begin
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-0000000013c1',now(),1);
        raise exception '(M1 owner) the crop-C planting opened on day 4';
  exception when check_violation then if sqlerrm not like 'harvest blocked%' then raise; end if; end;
end $$;
-- M2: the legacy row (B label, REI 24) ended 30 h ago; crop A's OWN signed REI is 48 h (18 h left): the worker's «Έγινε» must be refused (the gate itself is private: it is tested through its users)
-- M1 as the WORKER too: the crop-C planting stays closed on day 4
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  begin perform complete_spray_job('eeeeeeee-0000-0000-0000-0000000013a3', now() - interval '1 minute', p_started_at => now() - interval '20 minutes');
        raise exception '(M2) the worker entered a field whose crop-A re-entry period (REI 48 h) still runs (the legacy row carried the crop-B REI of 24 h)';
  exception when check_violation then if sqlerrm not like '%field is locked%' then raise; end if; end;
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-0000000013c1',now(),1);
        raise exception '(M1 worker) the crop-C planting opened on day 4';
  exception when check_violation then if sqlerrm not like 'harvest blocked%' then raise; end if; end;
end $$;
-- S3: the worker names only herself as the cutter
do $$
begin
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-0000000011a1','11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-0000000013b1',now() - interval '1 hour',1);
        raise exception '(S3) a worker named ANOTHER roster entry as the cutter';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
-- S2: a harvest RECORDED (fixture, dated 10 minutes back) on the crop-A planting while its REI runs shows up in harvest_conflicts, READ AS THE OWNER (and not by a stranger)
insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-0000000013a1',now() - interval '10 minutes',1);
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ declare n int; begin
  select count(*) into n from harvest_conflicts where planting_id = 'dddddddd-0000-0000-0000-0000000013a1' and rei_problem = 'rei_running';
  if n < 1 then raise exception '(S2) the owner sees nothing in harvest_conflicts for a harvest recorded inside the crop-A REI'; end if;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000f9';     -- a signed-in stranger (no member of the farm)
do $$ declare n int; begin
  select count(*) into n from harvest_conflicts;
  if n <> 0 then raise exception '(S2) a stranger reads % rows of harvest_conflicts', n; end if;
end $$;
reset role; set test.uid = '';
-- MUST (review of 0032): a typed PHI LONGER than the label still closes: label PHI 14, typed 30, ended 15 days ago: the day-15 harvest is refused for the owner
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000013a1';
begin
  insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('dddddddd-0000-0000-0000-0000000013a9',f,p,'cccccccc-0000-0000-0000-0000000013a1',0.25,'2026-11-01','growing');
  insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values ('eeeeeeee-0000-0000-0000-0000000013a9',f,'spray','done',w1,pq,now() - interval '15 days');
  insert into job_plantings(farm_id,job_id,planting_id) values (f,'eeeeeeee-0000-0000-0000-0000000013a9','dddddddd-0000-0000-0000-0000000013a9');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000013a9',f,'eeeeeeee-0000-0000-0000-0000000013a9',pq,w1,now() - interval '15 days',now() - interval '15 days' - interval '10 minutes',0.025,'ml/str','none');
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000013a1'; t timestamptz := now() - interval '15 days'; late text := 'typed PHI longer than the label';
begin
  insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason,late_reason)
    values (f,'eeeeeeee-0000-0000-0000-0000000013a9',pq,w1,t,t - interval '10 minutes',0.025,'ml/str','none',30,48,'manual',t + interval '30 days',t + interval '48 hours','55555555-0000-0000-0000-0000000013a9','the agronomist asked for 30 days',late);
  begin insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values (w1,f,'dddddddd-0000-0000-0000-0000000013a9',now(),1);
        raise exception '(MUST-1) a typed PHI of 30 days opened on day 15 (the label says 14)';
  exception when check_violation then if sqlerrm not like 'harvest blocked%' then raise; end if; end;
end $$;
reset role; set test.uid = '';

-- THE INVARIANT: random jobs, plantings, products, labels (with holes and unsigned), legacy rows, corrections: nothing is accepted for harvest before the planting's own label says it may be
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        i int; k int; crops uuid[]; prods uuid[]; c uuid; pr uuid; pls uuid[]; pl uuid; j uuid; s uuid; lab record; r double precision; ph int; re int; ended timestamptz;
        accepted int := 0; refused int := 0; oracle_open boolean; got_open boolean; sp record;
begin
  begin      -- everything the random fixtures write is rolled back at the end: nothing of it stays for the tests that follow (the sync cursor test needs a quiet table)
  perform setseed(0.42);
  for i in 1..120 loop
    crops := array[]::uuid[]; prods := array[]::uuid[]; pls := array[]::uuid[];
    for k in 1..3 loop
      c := gen_random_uuid(); insert into crops(id,farm_id,slug,name_el) values (c,f,'inv'||i||'-'||k,'inv'); crops := crops || c;
    end loop;
    for k in 1..2 loop
      pr := gen_random_uuid(); insert into products(id,farm_id,name,type,unit) values (pr,f,'inv p'||i||k,'fungicide','kg'); prods := prods || pr;
      foreach c in array crops loop
        r := random();
        if r < 0.25 then null;                                                                            -- no label at all
        elsif r < 0.45 then insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min) values (gen_random_uuid(),f,pr,c,'inv','single','ml/str',0.025);    -- an unsigned draft with a hole
        else insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint)
               values (gen_random_uuid(),f,pr,c,'inv','single','ml/str',0.025,1 + floor(random()*14)::int,1 + floor(random()*72)::int,3,'agronomist',current_date,'fp');
        end if;
      end loop;
    end loop;
    foreach c in array crops loop
      pl := gen_random_uuid(); insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (pl,f,p,c,0.25,'2026-11-01','growing'); pls := pls || pl;
    end loop;
    -- one or two sprays, each on a job holding a random non-empty subset of the plantings; the fixture writes the rows as a legacy writer could (typed periods random, maybe SHORTER than the label, maybe empty)
    for k in 1..2 loop
      j := gen_random_uuid(); pr := prods[1 + floor(random()*2)::int]; ended := now() - make_interval(hours => floor(random()*400)::int);
      insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values (j,f,'spray','done',w1,pr,ended);
      foreach pl in array pls loop if random() < 0.6 then insert into job_plantings(farm_id,job_id,planting_id) values (f,j,pl); end if; end loop;
      if not exists (select 1 from job_plantings where job_id = j) then insert into job_plantings(farm_id,job_id,planting_id) values (f,j,pls[1]); end if;
      ph := case when random() < 0.3 then null else 1 + floor(random()*10)::int end; re := case when random() < 0.3 then null else 1 + floor(random()*48)::int end;
      s := gen_random_uuid();
      set local session_replication_role = replica;
      insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until)
        values (s,f,j,pr,w1,ended,ended - interval '10 minutes',0.025,'ml/str',case when ph is not null then 'signed' else 'none' end,ph,re,case when ph is not null then 'label' end,
                case when ph is not null then ended + make_interval(hours => ph*24) end, case when re is not null then ended + make_interval(hours => re) end);
      set local session_replication_role = origin;
    end loop;
    -- ask the real harvest trigger (as the owner) for every planting, and compare with an INDEPENDENT oracle
    foreach pl in array pls loop
      -- the oracle, written plainly: open iff EVERY spray on the planting has a signed complete label of the planting's own crop, a recorded end of both periods, and both labelled periods have passed
      oracle_open := not exists (
        select 1 from job_plantings jp join job_spray s2 on s2.job_id = jp.job_id join plantings x on x.id = jp.planting_id
        where jp.planting_id = pl
          and not exists (select 1 from label_uses l where l.product_id = s2.product_id and l.crop_id = x.crop_id and l.sign_off_by is not null and l.phi_days is not null and l.rei_hours is not null
                          and s2.phi_until is not null and s2.rei_until is not null and s2.phi_until < now() and s2.rei_until < now() and s2.sprayed_at + make_interval(hours => l.phi_days*24) < now() and s2.sprayed_at + make_interval(hours => l.rei_hours) < now()
                          and not exists (select 1 from label_uses l2 where l2.product_id = s2.product_id and l2.crop_id = x.crop_id and l2.sign_off_by is not null and (l2.phi_days is null or l2.rei_hours is null))));
      reset role; set role authenticated;
      got_open := true;
      begin
        perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', true);
        insert into job_harvest(cut_by,farm_id,planting_id,harvested_at,crates_str) values (w1,f,pl,now(),1);
        raise exception 'ROLLBACK_PROBE';
      exception when check_violation then if sqlerrm not like 'harvest blocked%' then raise; end if; got_open := false; when raise_exception then null; end;
      reset role;
      if got_open and not oracle_open then raise exception 'INVARIANT BROKEN: planting % opened although its own label does not allow it yet (iteration %)', pl, i; end if;
      if got_open then accepted := accepted + 1; else refused := refused + 1; end if;
    end loop;
  end loop;
    raise exception 'M13_ROLLBACK';
  exception when raise_exception then if sqlerrm <> 'M13_ROLLBACK' then raise; end if; reset role; end;
  if accepted = 0 or refused = 0 then raise exception 'the invariant test is vacuous (accepted %, refused %)', accepted, refused; end if;
  raise notice 'm13 invariant: % accepted (all allowed by their own label), % refused', accepted, refused;
end $$;
reset role; set test.uid = '';

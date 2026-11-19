-- Team review of 0022–0027 (docs/reviews/team/2026-11-19-m5-0024.md and ...-m5-0027.md): every finding as a test, run as the REAL `authenticated` owner. Written BEFORE the fixes: against the
-- migrations as they were, each block failed. 0022–0027 were applied nowhere, so the fixes are made IN PLACE in those files. Runs AFTER m6_0027.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; p constant uuid := '33333333-3333-3333-3333-333333333333'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; cb constant uuid := 'cccccccc-0000-0000-0000-000000000991'; cc constant uuid := 'cccccccc-0000-0000-0000-000000000992'; i int;
begin
  insert into crops(id,farm_id,slug,name_el) values (cb,f,'m7crop','Μ7'), (cc,f,'m7other','Μ7β');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m7 product','fungicide','kg');
  insert into stock_lots(id,lot_key,farm_id,product_id,expiry) values ('dddddddd-0000-0000-0000-000000000099','dddddddd-0000-0000-0000-000000000099',f,pq,'2030-01-01');
  -- unsigned label PHI 14 / REI 24 on crop B
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-000000000991',f,pq,cb,'m7','single','ml/str',0.025,14,24,3);
  for i in 1..4 loop
    insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values (('dddddddd-0000-0000-0000-00000000099' || i)::uuid,f,p,cb,0.25,'2026-11-01','growing');
    insert into jobs(id,farm_id,kind,status,worker_id,product_id,done_at) values (('eeeeeeee-0000-0000-0000-00000000099' || i)::uuid,f,'spray','done',w1,pq,now() - interval '30 minutes');
    insert into job_plantings(farm_id,job_id,planting_id) values (f,('eeeeeeee-0000-0000-0000-00000000099' || i)::uuid,('dddddddd-0000-0000-0000-00000000099' || i)::uuid);
  end loop;
  -- 1: an UNKNOWN spray (no label named), 30 minutes ago;  2: a spray that NAMES the label (waiting period still unknown);  3: for the plantings / quantity tests
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000009d1',f,'eeeeeeee-0000-0000-0000-000000000991',pq,w1,now() - interval '30 minutes',0.025,'ml/str','none');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000009d2',f,'eeeeeeee-0000-0000-0000-000000000992',pq,w1,'cccccccc-1111-0000-0000-000000000991',now() - interval '30 minutes',0.025,'ml/str','unsigned');
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,dose_str,dose_unit,label_state,lot_key,qty_str) values ('55555555-0000-0000-0000-0000000009d3',f,'eeeeeeee-0000-0000-0000-000000000993',pq,w1,'cccccccc-1111-0000-0000-000000000991',now() - interval '30 minutes',0.025,'ml/str','unsigned','dddddddd-0000-0000-0000-000000000099',1);
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        s1 constant uuid := '55555555-0000-0000-0000-0000000009d1'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000009d1');
begin
  -- MUST 1: the end of an UNKNOWN spray moved 20 days back with a manual PHI 14: refused (no late-entry dodge, no instant harvest)
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000991',pq,w1,t - interval '20 days',0.025,'ml/str','unsigned',14,24,'manual',t - interval '6 days',t - interval '20 days' + interval '24 hours',s1,'x');
    raise exception '(MUST 1) a correction moved the end of an unknown spray 20 days back';
  exception when check_violation then null; end;
  -- the same end, and a LATER end, stay possible
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-0000000009a1',f,'eeeeeeee-0000-0000-0000-000000000991',pq,w1,t + interval '10 minutes',0.025,'ml/str','unsigned',14,24,'manual',t + interval '10 minutes' + interval '336 hours',t + interval '10 minutes' + interval '24 hours',s1,'the end was 10 minutes later');
end $$;
-- the harvest gate: the latest of the original and the corrected end counts (here 14 days from the corrected end)
do $$ declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into job_harvest(farm_id,planting_id,harvested_at,crates_str) values (f,'dddddddd-0000-0000-0000-000000000991',now(),1); raise exception '(MUST 1) the harvest opened after a correction';
  exception when check_violation then null; end;
end $$;
-- SHOULD 2: a correction that names no label keeps the chain's label; the label is archived; a later typed PHI 10 against label 14 is refused
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        s2 constant uuid := '55555555-0000-0000-0000-0000000009d2'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000009d2');
begin
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,amends_id,amend_reason)
    values ('55555555-0000-0000-0000-0000000009b1',f,'eeeeeeee-0000-0000-0000-000000000992',pq,w1,t,0.03,'ml/str','unsigned',s2,'dose typo');   -- c1: no label named
end $$;
reset role; set test.uid = '';
update label_uses set deleted_at = now() where id = 'cccccccc-1111-0000-0000-000000000991';       -- the label is archived (a superseding label would be a new row)
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000009d2');
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,phi_days,rei_hours,phi_source,phi_until,rei_until,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000992',pq,w1,t,0.03,'ml/str','unsigned',10,24,'manual',t + interval '240 hours',t + interval '24 hours','55555555-0000-0000-0000-0000000009b1','x');
    raise exception '(SHOULD 2) a typed PHI 10 passed against a label of 14 that the chain had named';
  exception when check_violation then null; end;
end $$;
-- SHOULD 3: the crop of a SPRAYED planting cannot change (the floor would drop its label)
do $$ begin
  begin update plantings set crop_id = 'cccccccc-0000-0000-0000-000000000992', edit_reason = 'x' where id = 'dddddddd-0000-0000-0000-000000000991'; raise exception '(SHOULD 3) the crop of a sprayed planting changed';
  exception when check_violation then null; end;
  update plantings set crop_id = 'cccccccc-0000-0000-0000-000000000992', edit_reason = 'wrong crop' where id = 'dddddddd-0000-0000-0000-000000000994';   -- never sprayed: allowed
end $$;
-- SHOULD 4: the history is written by the SERVER: an edit without a reason is refused; a client-supplied history is ignored; the entry holds the DB's own previous value and the server time
do $$
declare p constant uuid := '33333333-3333-3333-3333-333333333333'; before_area text := (select area_str::text from parcels where id = '33333333-3333-3333-3333-333333333333'); e jsonb;
begin
  begin update parcels set area_str = 9.9 where id = p; raise exception '(SHOULD 4) an edit without a reason was accepted'; exception when check_violation then null; end;
  update parcels set area_str = 9.9, edit_reason = 'remeasured', edits = '[{"at":"2000-01-01T00:00:00Z","reason":"forged","before":{"area_str":"1"}}]'::jsonb where id = p;
  select edits -> (jsonb_array_length(edits) - 1) into e from parcels where id = p;
  if e ->> 'reason' <> 'remeasured' or (e -> 'before' ->> 'area_str') is distinct from before_area or (e ->> 'at')::timestamptz < now() - interval '1 minute' then raise exception '(SHOULD 4) the entry was not written by the server: %', e; end if;
  if exists (select 1 from jsonb_array_elements((select edits from parcels where id = p)) x where x ->> 'reason' = 'forged') then raise exception '(SHOULD 4) a forged history entry survived'; end if;
end $$;
-- SHOULD 5: a parcel or a planting cannot move to another farm
do $$ begin
  begin update parcels set farm_id = '22222222-2222-2222-2222-222222222222' where id = '33333333-3333-3333-3333-333333333333'; raise exception '(SHOULD 5) a parcel moved to another farm'; exception when check_violation or insufficient_privilege or foreign_key_violation then null; end;
  begin update plantings set farm_id = '22222222-2222-2222-2222-222222222222' where id = 'dddddddd-0000-0000-0000-000000000993'; raise exception '(SHOULD 5) a planting moved to another farm'; exception when check_violation or insufficient_privilege or foreign_key_violation then null; end;
end $$;
-- LOW 8: a correction that changes the quantity needs the stock movements in the SAME transaction (the old quantity back in, the new one out). The check is deferred to the end of the
-- transaction; `set constraints ... immediate` runs it at once so the test can catch it.
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000009d3');
begin
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,lot_key,qty_str,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000993',pq,w1,'cccccccc-1111-0000-0000-000000000991',t,t - interval '10 minutes',0.025,'ml/str','unsigned','dddddddd-0000-0000-0000-000000000099',2,'55555555-0000-0000-0000-0000000009d3','qty');
  set constraints job_spray_correction_stock immediate;
  raise exception '(LOW 8) a quantity change without stock movements was accepted';
exception when check_violation then null;
end $$;
-- ... and WITH the movements in the same transaction the same correction passes
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001'; t timestamptz := (select sprayed_at from job_spray where id = '55555555-0000-0000-0000-0000000009d3');
begin
  insert into job_spray(farm_id,job_id,product_id,applicator_id,label_use_id,sprayed_at,started_at,dose_str,dose_unit,label_state,lot_key,qty_str,amends_id,amend_reason)
    values (f,'eeeeeeee-0000-0000-0000-000000000993',pq,w1,'cccccccc-1111-0000-0000-000000000991',t,t - interval '10 minutes',0.025,'ml/str','unsigned','dddddddd-0000-0000-0000-000000000099',2,'55555555-0000-0000-0000-0000000009d3','qty');
  insert into stock_movements(farm_id,lot_key,product_id,direction,qty_str,reason,job_id) values (f,'dddddddd-0000-0000-0000-000000000099',pq,'in',1,'spray_correction','eeeeeeee-0000-0000-0000-000000000993'), (f,'dddddddd-0000-0000-0000-000000000099',pq,'out',2,'spray','eeeeeeee-0000-0000-0000-000000000993');
  set constraints job_spray_correction_stock immediate;
end $$;
do $$ begin
  if (select count(*) from pg_constraint where conrelid = 'job_spray'::regclass and conname in ('job_spray_amend_reason', 'job_spray_amends_reason')) <> 1 then raise exception '(LOW 8) the amend-reason constraint is duplicated'; end if;
  if position('pg_advisory_xact_lock' in pg_get_functiondef('check_tank_mix()'::regprocedure)) = 0 then raise exception '(LOW 8) two first members of a mix are not serialised'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm7-review tests passed'; end $$;

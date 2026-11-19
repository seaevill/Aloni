-- Team review m5-0027 finding 8 (SHOULD 7): the SERVER asks for the start of every new spraying and a correction cannot erase a recorded start; complete_spray_job takes the start.
-- Real `authenticated` owner. Uses the fixtures of m7_review.sql (runs AFTER it).
\set ON_ERROR_STOP on
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
-- SHOULD 7: the SERVER asks for the start of every new spraying, and a correction cannot erase a recorded one
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-000000000991'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state) values (f,'eeeeeeee-0000-0000-0000-000000000994',pq,w1,now() - interval '10 minutes',0.025,'ml/str','unsigned');
    raise exception '(SHOULD 7) a spraying without a start time was accepted'; exception when check_violation then null; end;
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values ('55555555-0000-0000-0000-0000000009c1',f,'eeeeeeee-0000-0000-0000-000000000994',pq,w1,now() - interval '10 minutes',now() - interval '40 minutes',0.025,'ml/str','unsigned');
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,dose_str,dose_unit,label_state,amends_id,amend_reason)
    select f,job_id,product_id,applicator_id,sprayed_at,0.03,'ml/str','unsigned',id,'x' from job_spray where id = '55555555-0000-0000-0000-0000000009c1';
    raise exception '(SHOULD 7) a correction erased the start time'; exception when check_violation then null; end;
  if to_regprocedure('complete_spray_job(uuid,timestamptz,text,text,timestamptz)') is null then raise exception '(SHOULD 7) complete_spray_job has no start parameter'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm7-start tests passed'; end $$;

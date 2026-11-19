-- Migration 0025: the spray record holds the fields of Reg. (EU) 2023/564 that were missing: START time, BBCH stage, prescription number (Greek professional use).
-- Written BEFORE 0025: against 0001–0024 the columns do not exist. Runs AFTER m5_0024.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; prod constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        j constant uuid := 'eeeeeeee-0000-0000-0000-000000000951'; t timestamptz := now() - interval '1 hour';
begin
  -- a start AFTER the end: refused
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,dose_str,dose_unit,label_state) values (f,j,prod,w1,t,t + interval '1 hour',0.025,'ml/str','unsigned');
    raise exception '(0025) a start after the end was accepted'; exception when check_violation then null; end;
  -- BBCH must be a two-digit stage 00–99
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,bbch,dose_str,dose_unit,label_state) values (f,j,prod,w1,t,'abc',0.025,'ml/str','unsigned');
    raise exception '(0025) an unreadable BBCH was accepted'; exception when check_violation then null; end;
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,bbch,dose_str,dose_unit,label_state) values (f,j,prod,w1,t,'7',0.025,'ml/str','unsigned');
    raise exception '(0025) a one-digit BBCH was accepted'; exception when check_violation then null; end;
  -- an empty prescription number is not a number
  begin insert into job_spray(farm_id,job_id,product_id,applicator_id,sprayed_at,prescription_no,dose_str,dose_unit,label_state) values (f,j,prod,w1,t,'  ',0.025,'ml/str','unsigned');
    raise exception '(0025) a blank prescription number was accepted'; exception when check_violation then null; end;
  -- all three, valid: accepted
  insert into job_spray(id,farm_id,job_id,product_id,applicator_id,sprayed_at,started_at,bbch,prescription_no,dose_str,dose_unit,label_state)
    values ('55555555-0000-0000-0000-000000000961',f,j,prod,w1,t,t - interval '30 minutes','14','ΣΥΝΤ-123/2026',0.025,'ml/str','unsigned');
end $$;
do $$ begin raise notice 'm6-0025 tests passed'; end $$;

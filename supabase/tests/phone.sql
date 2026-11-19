-- The phone's REAL records through apply_ops (supabase/tests/phone-ops.json, written by app/tests/unit/phone-contract.test.ts from the app's own builders).
-- Runs AFTER smoke/review/agri on the same database, from the repository root (run.sh). The caller is a signed-in OWNER (stub auth: see auth_stub.sql).
\set ON_ERROR_STOP on
\set ops `cat supabase/tests/phone-ops.json`
reset role;
insert into farms(id,name) values ('11111111-1111-4111-8111-111111111111','Phone farm');
insert into farm_members(farm_id,user_id,role) values ('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-0000000000a1','owner');

set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
create temp table ops_t as select value as o from jsonb_array_elements(:'ops'::jsonb);
create temp table first_run as select x.ord, x.v from jsonb_array_elements(apply_ops(:'ops'::jsonb)) with ordinality as x(v, ord);
create temp table second_run as select x.ord, x.v from jsonb_array_elements(apply_ops(:'ops'::jsonb)) with ordinality as x(v, ord);
do $$
declare farm constant uuid := '11111111-1111-4111-8111-111111111111'; n int; num numeric; t text; lab record; res jsonb; edit jsonb;
begin
  select count(*) into n from first_run where v->>'status' <> 'applied';
  if n <> 0 then raise exception 'the phone''s own records were rejected: %', (select jsonb_agg(v) from first_run where v->>'status' <> 'applied'); end if;
  select count(*) into n from second_run where v->>'status' <> 'duplicate'; if n <> 0 then raise exception 'a repeat was not recognised: %', (select jsonb_agg(v) from second_run where v->>'status' <> 'duplicate'); end if;
  -- values arrive exactly as typed
  select area_str into num from parcels where farm_id = farm; if num <> 0.5 then raise exception 'parcel area %', num; end if;
  select dose_str into num from job_spray where farm_id = farm and amends_id is null order by chain_no limit 1; if num <> 0.025 then raise exception 'dose %', num; end if;
  select count(*) into n from job_spray where farm_id = farm and phi_source = 'label' and phi_until = sprayed_at + interval '168 hours'; if n < 1 then raise exception 'label PHI not stored exactly'; end if;
  select count(*) into n from job_spray where farm_id = farm and amends_id is not null and phi_source = 'manual' and amend_reason = 'label values entered'; if n <> 1 then raise exception 'the amending row (manual PHI + reason) was not stored (%)', n; end if;
  -- «not on the label» is a flag, not a made-up number; the signature is three columns
  select * into lab from label_uses where farm_id = farm and target = 'u';
  if lab.phi_days is not null or not lab.phi_days_not_on_label or lab.rei_hours is not null or not lab.rei_hours_not_on_label or lab.max_apps is not null or not lab.max_apps_not_on_label then raise exception 'not-on-label values not stored as flags: %', to_jsonb(lab); end if;
  select * into lab from label_uses where farm_id = farm and target = 't';
  if lab.sign_off_by <> 'Agronomist' or lab.sign_off_on is null or lab.sign_off_fingerprint is null then raise exception 'signature not stored: %', to_jsonb(lab); end if;
  if not exists (select 1 from farm_settings where farm_id = farm and key = 'controller') then raise exception 'owner setting not stored'; end if;
  if not exists (select 1 from crops where farm_id = farm) then raise exception 'crop not stored'; end if;
  if (select count(*) from verify_spray_chain(farm)) <> 0 then raise exception 'the chain of the phone''s sprays does not verify'; end if;

  -- the phone sends the WHOLE row on an update. A SIGNED label cannot be changed any more (0019): the edit that drops the signature is REFUSED, with the reason, and the signed row stays as it was
  select o into edit from ops_t where o->>'table' = 'label_uses' and o->'row'->>'target' = 't' limit 1;
  res := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', farm, 'table', 'label_uses', 'op', 'update', 'row', (edit->'row') - 'sign_off')));
  if res->0->>'status' <> 'rejected' or res->0->>'code' <> '23514' then raise exception 'an edit of a signed label was not refused: %', res; end if;
  select * into lab from label_uses where farm_id = farm and target = 't';
  if lab.sign_off_by <> 'Agronomist' or lab.sign_off_fingerprint is null then raise exception 'the signature was lost although the edit was refused: %', to_jsonb(lab); end if;
  -- an optional field the phone emptied is emptied here
  select o into edit from ops_t where o->>'table' = 'plantings' limit 1;
  res := apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', farm, 'table', 'plantings', 'op', 'update', 'row', ((edit->'row') - 'variety') || jsonb_build_object('edit_reason', 'variety removed'))));
  if res->0->>'status' <> 'applied' then raise exception 'planting edit rejected: %', res; end if;
  if (select variety from plantings where farm_id = farm) is not null then raise exception 'an emptied optional field kept its old value'; end if;
end $$;
drop table first_run, second_run, ops_t;

-- and every record reaches the other phones through pull (a later transaction)
do $$
declare farm constant uuid := '11111111-1111-4111-8111-111111111111'; res jsonb; tables text[];
begin
  res := pull(farm, null, 1000);
  select array_agg(distinct x->>'table') into tables from jsonb_array_elements(res->'rows') x;
  if not tables @> array['parcels','crops','plantings','products','label_uses','stock_lots','stock_movements','soil_tests','workers','jobs','job_plantings','job_spray','job_harvest','observations','media','farm_settings'] then raise exception 'pull misses tables: %', tables; end if;
end $$;

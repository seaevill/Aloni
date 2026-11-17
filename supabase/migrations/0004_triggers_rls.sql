-- 0004_triggers_rls.sql  (WRITTEN, NOT APPLIED)  Attach triggers, enable RLS, per-role policies.
-- Roles (TECH-SPEC §6): owner = everything; worker = read parcels/crops/plantings/own jobs,
-- insert completions, harvests, observations; no delete, no stock/orders/prices.

-- ---- triggers ----
do $$
declare t text;
begin
  -- server_seq + updated_at on every sync-able table
  foreach t in array array[
    'farms','farm_members','parcels','crops','plantings','products','label_uses','soil_tests','water_tests',
    'stock_lots','stock_movements','jobs','job_plantings','job_spray','job_fertilise','job_irrigate','job_sow',
    'job_harvest','observations','weather_daily','weather_hourly','rule_params','recommendations','orders_weekly']
  loop
    execute format('create trigger %I before insert or update on %I for each row execute function set_server_seq()', t||'_seq', t);
  end loop;
  -- audit on all farm data
  foreach t in array array[
    'farms','farm_members','parcels','crops','plantings','products','label_uses','soil_tests','water_tests',
    'stock_lots','stock_movements','jobs','job_plantings','job_spray','job_fertilise','job_irrigate','job_sow',
    'job_harvest','observations','rule_params','recommendations','orders_weekly']
  loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function write_audit()', t||'_audit', t);
  end loop;
  -- append-only
  foreach t in array array['job_spray','job_harvest','stock_movements','job_fertilise','job_irrigate','job_sow','observations']
  loop
    execute format('create trigger %I before update or delete on %I for each row execute function forbid_change()', t||'_append_only', t);
  end loop;
end $$;

create trigger job_spray_chain before insert on job_spray for each row execute function chain_hash();

-- ---- RLS ----
do $$
declare t text;
begin
  foreach t in array array[
    'farms','profiles','farm_members','parcels','crops','plantings','products','label_uses','soil_tests','water_tests',
    'stock_lots','stock_movements','jobs','job_plantings','job_spray','job_fertilise','job_irrigate','job_sow',
    'job_harvest','observations','weather_daily','weather_hourly','rules','rule_params','recommendations','orders_weekly','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Owner: full access on every farm table.
do $$
declare t text;
begin
  foreach t in array array[
    'parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements',
    'jobs','job_plantings','job_spray','job_fertilise','job_irrigate','job_sow','job_harvest','observations',
    'weather_daily','weather_hourly','rule_params','recommendations','orders_weekly']
  loop
    execute format('create policy %I on %I for all using (has_role(farm_id, array[''owner''])) with check (has_role(farm_id, array[''owner'']))', t||'_owner', t);
  end loop;
end $$;

create policy farms_owner on farms for all using (has_role(id, array['owner'])) with check (has_role(id, array['owner']));
create policy farms_member_read on farms for select using (has_role(id, array['worker']));
create policy members_owner on farm_members for all using (has_role(farm_id, array['owner'])) with check (has_role(farm_id, array['owner']));
create policy members_self on farm_members for select using (user_id = auth.uid());
create policy profiles_self on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rules_read on rules for select using (auth.uid() is not null);
create policy audit_owner_read on audit_log for select using (farm_id is not null and has_role(farm_id, array['owner']));

-- Worker: read what today's job needs.
create policy parcels_worker_read   on parcels   for select using (has_role(farm_id, array['worker']));
create policy crops_worker_read     on crops     for select using (has_role(farm_id, array['worker']));
create policy plantings_worker_read on plantings for select using (has_role(farm_id, array['worker']));
create policy jobs_worker_read      on jobs      for select using (has_role(farm_id, array['worker']) and assigned_to = auth.uid());
create policy jobs_worker_complete  on jobs      for update using (has_role(farm_id, array['worker']) and assigned_to = auth.uid())
                                                 with check (has_role(farm_id, array['worker']) and assigned_to = auth.uid());
create policy job_plantings_worker_read on job_plantings for select using (
  has_role(farm_id, array['worker']) and exists (select 1 from jobs j where j.id = job_id and j.assigned_to = auth.uid()));
create policy harvest_worker_insert on job_harvest  for insert with check (has_role(farm_id, array['worker']) and created_by = auth.uid());
create policy harvest_worker_read   on job_harvest  for select using (has_role(farm_id, array['worker']) and created_by = auth.uid());
create policy obs_worker_insert     on observations for insert with check (has_role(farm_id, array['worker']) and created_by = auth.uid());
-- Workers get NO policy on: products, label_uses, stock_*, orders_weekly, soil/water tests, recommendations, job_spray.
-- (Spray logging by workers is decided in M2 together with "own phones vs shared phone".)
-- TODO(M0 account step): per-role RLS tests run in CI against a real Supabase/Postgres (needs the project).

-- 0011_agri_records.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Pre-Supabase review part B, 2026-11-18. A NEW file; builds on 0010.
--   * Recording what happened is separate from permission to do something new: a spray or a harvest that REALLY happened is never refused for safety reasons
--     (the legal record must not lose it); a NEW harvest right now is refused while a waiting period (PHI) or a re-entry period (REI) runs or is unknown.
--   * The server recomputes what the phone claims: phi_until / rei_until must be exactly sprayed_at + days×24 h / hours (absolute hours: no daylight-saving
--     drift, whatever the session time zone), and a «label» waiting period must equal the SIGNED label use it names.
--   * A spray entered more than 7 days after it happened carries the `late_entry` flag and a reason (same threshold as the phone: strictly more than 7 days).
--   * A correction (amending row) says WHY. `received_at` is the server's clock, next to the phone's `created_at`.
--   * A harvest that conflicts with a spray (entered earlier or LATER) stays in the record and shows up in the view `harvest_conflicts`.
--   * The spray hash chain is verifiable (verify_spray_chain) and covers the final values (identity, sequence numbers).

alter table job_spray   add column received_at timestamptz not null default now(), add column amend_reason text, add column chain_no bigint;
alter table job_harvest add column received_at timestamptz not null default now();
alter table job_spray add constraint job_spray_amend_reason check (amends_id is null or length(btrim(coalesce(amend_reason, ''))) > 0);
alter table job_spray add constraint job_spray_manual_amends check (phi_source is distinct from 'manual' or amends_id is not null);

-- ---------------------------------------------------------------- the hash chain: last trigger, own sequence, verifiable
drop trigger job_spray_chain on job_spray;
-- `set timezone`: timestamps inside the hashed JSON are written in the session's zone; the hash must not depend on whose session wrote or verifies the row
create or replace function chain_hash() returns trigger language plpgsql security definer set search_path = public set timezone = 'UTC' as $$
declare prev text; prev_no bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || new.farm_id::text, 0));
  execute format('select hash, chain_no from %I where farm_id = $1 order by chain_no desc nulls last limit 1', tg_table_name) into prev, prev_no using new.farm_id;
  new.chain_no := coalesce(prev_no, 0) + 1;
  new.prev_hash := prev;
  new.hash := null;
  new.hash := encode(sha256(convert_to(coalesce(prev, '') || (to_jsonb(new) - 'hash' - 'prev_hash')::text, 'UTF8')), 'hex');
  return new;
end $$;
-- «zz_»: fires AFTER every other BEFORE trigger (identity, sequence numbers), so the hash covers the values that are really stored
create trigger zz_job_spray_chain before insert on job_spray for each row execute function chain_hash();

create function verify_spray_chain(p_farm uuid) returns table (id uuid, chain_no bigint, problem text) language sql stable set search_path = public set timezone = 'UTC' as $$
  with s as (select j.*, lag(j.hash) over (order by j.chain_no) as want_prev, lag(j.chain_no) over (order by j.chain_no) as prev_no from job_spray j where j.farm_id = p_farm)
  select s.id, s.chain_no, case
      when s.chain_no is distinct from coalesce(s.prev_no, 0) + 1 then 'a row is missing or the numbering is broken'
      when s.prev_hash is distinct from s.want_prev then 'prev_hash does not match the previous row'
      when s.hash is distinct from encode(sha256(convert_to(coalesce(s.want_prev, '') || (to_jsonb(s) - 'hash' - 'prev_hash' - 'want_prev' - 'prev_no')::text, 'UTF8')), 'hex') then 'the row was changed after it was written'
    end
  from s where s.chain_no is distinct from coalesce(s.prev_no, 0) + 1 or s.prev_hash is distinct from s.want_prev
     or s.hash is distinct from encode(sha256(convert_to(coalesce(s.want_prev, '') || (to_jsonb(s) - 'hash' - 'prev_hash' - 'want_prev' - 'prev_no')::text, 'UTF8')), 'hex')
  order by s.chain_no
$$;

-- ---------------------------------------------------------------- the server recomputes what the phone claims
create function check_spray_record() returns trigger language plpgsql security definer set search_path = public as $$
declare lu record;
begin
  if new.sprayed_at > now() + interval '5 minutes' then raise exception 'the end of a spraying cannot be in the future' using errcode = 'check_violation'; end if;
  -- waiting periods: absolute hours from the entered end time (never calendar days: a time zone with daylight saving would move them by an hour)
  if new.phi_days is not null and new.phi_until is distinct from new.sprayed_at + make_interval(hours => new.phi_days * 24) then
    raise exception 'phi_until must be exactly sprayed_at + % days (in hours)', new.phi_days using errcode = 'check_violation';
  end if;
  if new.rei_hours is not null and new.rei_until is distinct from new.sprayed_at + make_interval(hours => new.rei_hours) then
    raise exception 'rei_until must be exactly sprayed_at + % hours', new.rei_hours using errcode = 'check_violation';
  end if;
  -- a waiting period «from the label» is the SIGNED label use's own value, not a number the phone made up
  if new.phi_source = 'label' then
    select l.product_id, l.sign_off_by, l.phi_days, l.rei_hours into lu from label_uses l where l.id = new.label_use_id and l.farm_id = new.farm_id;
    if not found or lu.sign_off_by is null or lu.product_id is distinct from new.product_id or lu.phi_days is distinct from new.phi_days or lu.rei_hours is distinct from new.rei_hours then
      raise exception 'a label waiting period must equal the signed label use it names' using errcode = 'check_violation';
    end if;
  end if;
  -- late entry: strictly more than 7 days between the end of the spraying and the record (the phone's created_at), same as the phone. A CORRECTION (amends_id) is not a late entry: it is written whenever the label's values are found
  if new.amends_id is null and new.sprayed_at < new.created_at - interval '7 days' and not ('late_entry' = any (new.flags)) then
    raise exception 'an entry more than 7 days late must carry the late_entry flag and its reason' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger job_spray_check before insert on job_spray for each row execute function check_spray_record();

-- ---------------------------------------------------------------- recording vs permission
-- A harvest the phone says happened more than 5 minutes ago is a RECORD: it is stored whatever the sprays say, and the conflict is shown (harvest_conflicts).
-- A harvest happening NOW is a permission: refused while any effective spray on the planting has a running or unknown PHI, or a running or unknown REI.
create or replace function check_harvest_phi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.harvested_at > now() + interval '5 minutes' then raise exception 'harvest time is in the future' using errcode = 'check_violation'; end if;
  if new.harvested_at >= now() - interval '5 minutes' and exists (
    select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id
    where jp.planting_id = new.planting_id and s.sprayed_at <= now()
      and not exists (select 1 from job_spray a where a.amends_id = s.id)
      and (s.phi_until is null or s.phi_until >= now() or s.rei_until is null or s.rei_until >= now())   -- AT the end instant it is still blocked, as on the phone
  ) then
    raise exception 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create view harvest_conflicts with (security_invoker = true) as
  select h.id as harvest_id, h.farm_id, h.planting_id, h.harvested_at, s.id as spray_id, s.sprayed_at,
         case when s.phi_until is null then 'phi_unknown' when s.phi_until >= h.harvested_at then 'phi_running' end as phi_problem,
         case when s.rei_until is null then 'rei_unknown' when s.rei_until >= h.harvested_at then 'rei_running' end as rei_problem
  from job_harvest h
  join job_plantings jp on jp.planting_id = h.planting_id
  join job_spray s on s.job_id = jp.job_id and s.farm_id = h.farm_id and s.sprayed_at <= h.harvested_at
  where not exists (select 1 from job_spray a where a.amends_id = s.id)
    and (s.phi_until is null or s.phi_until >= h.harvested_at or s.rei_until is null or s.rei_until >= h.harvested_at);

revoke execute on function verify_spray_chain(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function verify_spray_chain(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function verify_spray_chain(uuid) to authenticated; end if;
end $$;

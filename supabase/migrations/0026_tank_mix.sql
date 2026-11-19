-- 0026_tank_mix.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Tank mix. A NEW file; builds on 0001–0025.
--  Each product of a mix is its OWN spray record (own label use, dose, PHI and REI, own correction chain); the records of one mix share a `mix_id`.
--  The END time, the START time and the APPLICATOR belong to the whole mix: a record with a mix_id must equal the first record of that mix in them, and a correction of ONE product cannot change
--  them or move the record into or out of a mix (that would let one product's wait be shortened by dating it differently).
--  The harvest gate needs no change: it blocks while ANY spray on the planting has a running wait, so the LONGEST PHI/REI of a mix blocks (tested in m6_0026.sql).
-- The check at the very top stops with a clear message if 0025 is not there; it changes nothing.
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_spray' and column_name = 'prescription_no') then raise exception '0026 stopped: 0025 is not applied (nothing was changed)'; end if;
end $$;

alter table job_spray add column mix_id uuid;
create index job_spray_mix on job_spray (farm_id, mix_id) where mix_id is not null;

create function check_tank_mix() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare o job_spray%rowtype; m record;
begin
  if new.amends_id is not null then
    select * into o from job_spray where id = new.amends_id and farm_id = new.farm_id;
    if found then
      if new.mix_id is distinct from o.mix_id then raise exception 'a correction cannot move a record into or out of a tank mix' using errcode = 'check_violation'; end if;
      if o.mix_id is not null and (new.sprayed_at is distinct from o.sprayed_at or new.started_at is distinct from o.started_at or new.applicator_id is distinct from o.applicator_id) then
        raise exception 'the end time, the start time and the applicator belong to the whole tank mix: the correction of one product cannot change them' using errcode = 'check_violation';
      end if;
    end if;
    return new;
  end if;
  if new.mix_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.mix_id::text, 0));   -- team review m5-0027 (low): two FIRST members written at the same moment are serialised, so the second sees the first
    select s.sprayed_at, s.started_at, s.applicator_id into m from job_spray s where s.mix_id = new.mix_id and s.farm_id = new.farm_id and s.amends_id is null order by s.created_at, s.id limit 1;
    if found and (m.sprayed_at is distinct from new.sprayed_at or m.started_at is distinct from new.started_at or m.applicator_id is distinct from new.applicator_id) then
      raise exception 'every product of a tank mix has the same end time, start time and applicator' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger job_spray_tank_mix before insert on job_spray for each row execute function check_tank_mix();
revoke execute on function check_tank_mix() from public, anon, authenticated;

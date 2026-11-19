-- 0024_edit_history.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Beta list item 10: parcels and plantings can be edited, append-only. A NEW file; builds on 0001–0023.
--  The row holds the CURRENT values (other records point at its id), and an append-only history `edits` next to it: every change adds ONE entry {at, reason, before:{previous values}}.
--  The history is written by the SERVER (team review m5-0024 finding 4): the phone only says WHY (`edit_reason`); the server takes the previous values from the database and the time from
--  its own clock, and ignores any history the phone sends. A change of a field without a reason is refused. Archiving (deleted_at) and updates that change no field are unchanged.
--  A parcel or a planting never changes FARM (finding 5: a REST update could move them into another farm and leave their plantings behind), and the CROP of a planting that was sprayed
--  never changes (finding 3: the harvest floor reads the labels of the crop; changing it dropped the label). A different crop is a new planting.
-- The check at the very top stops with a clear message if 0023 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('check_spray_correction_stock()') is null then raise exception '0024 stopped: 0023 is not applied (nothing was changed)'; end if;
end $$;

alter table parcels add column edits jsonb not null default '[]'::jsonb check (jsonb_typeof(edits) = 'array'), add column edit_reason text;
alter table plantings add column edits jsonb not null default '[]'::jsonb check (jsonb_typeof(edits) = 'array'), add column edit_reason text;

create function write_edit_history() returns trigger language plpgsql set search_path = public, extensions, private, pg_temp as $$   -- `extensions`: to_jsonb(row) of a parcel needs the PostGIS types (Supabase keeps them there)
declare ignored constant text[] := array['updated_at', 'deleted_at', 'edits', 'edit_reason', 'server_seq', 'sync_xid', 'device_id', 'actor_id', 'created_by', 'created_at'];
        before_ jsonb; why text := btrim(coalesce(new.edit_reason, ''));
begin
  if new.farm_id is distinct from old.farm_id then raise exception 'a % never changes farm', tg_table_name using errcode = 'check_violation'; end if;
  select jsonb_object_agg(o.key, o.value) into before_ from jsonb_each(to_jsonb(old)) o
    where o.key <> all (ignored) and to_jsonb(new) -> o.key is distinct from o.value;
  new.edits := old.edits;                       -- whatever the phone sent as history is ignored
  new.edit_reason := null;
  if before_ is null then return new; end if;   -- nothing changed (an archive, a restore, a sync write)
  if why = '' then raise exception 'a change of a % needs a reason (edit_reason)', tg_table_name using errcode = 'check_violation'; end if;
  new.edits := old.edits || jsonb_build_array(jsonb_build_object('at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'reason', why, 'before', before_));
  return new;
end $$;
-- team review m6-0029 (SHOULD, 0024:29–30): a NEW row starts with an empty history, whatever the phone sent
create function start_edit_history() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.edits := '[]'::jsonb; new.edit_reason := null; return new; end $$;
create trigger parcels_edit_history_new before insert on parcels for each row execute function start_edit_history();
create trigger plantings_edit_history_new before insert on plantings for each row execute function start_edit_history();
revoke execute on function start_edit_history() from public, anon, authenticated;
create trigger parcels_edit_history before update on parcels for each row execute function write_edit_history();
create trigger plantings_edit_history before update on plantings for each row execute function write_edit_history();
revoke execute on function write_edit_history() from public, anon, authenticated;

create function forbid_crop_change_when_sprayed() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if new.crop_id is distinct from old.crop_id and exists (select 1 from job_plantings jp join job_spray s on s.job_id = jp.job_id and s.farm_id = jp.farm_id where jp.planting_id = old.id and jp.farm_id = old.farm_id) then
    raise exception 'the crop of a planting that was sprayed cannot change: add a new planting' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger plantings_crop_guard before update on plantings for each row execute function forbid_crop_change_when_sprayed();
revoke execute on function forbid_crop_change_when_sprayed() from public, anon, authenticated;

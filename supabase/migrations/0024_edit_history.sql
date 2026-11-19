-- 0024_edit_history.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Beta list item 10: parcels and plantings can be edited, append-only. A NEW file; builds on 0001–0023.
--  The row holds the CURRENT values (other records point at its id), and an append-only history `edits` next to it: every change adds ONE entry {at, reason, before:{previous values}}.
--  The server refuses a history that is shortened, rewritten, grown by more than one entry per update, or whose new entry has no reason. (Changes are also written to the audit log as before.)
--  Archiving (deleted_at) and updates that do not touch `edits` are unchanged.
-- The check at the very top stops with a clear message if 0023 is not there; it changes nothing.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'job_spray_amends_reason') then raise exception '0024 stopped: 0023 is not applied (nothing was changed)'; end if;
end $$;

alter table parcels add column edits jsonb not null default '[]'::jsonb check (jsonb_typeof(edits) = 'array');
alter table plantings add column edits jsonb not null default '[]'::jsonb check (jsonb_typeof(edits) = 'array');

create function check_edit_history() returns trigger language plpgsql set search_path = public, private, pg_temp as $$
declare n_old integer := jsonb_array_length(old.edits); n_new integer := jsonb_array_length(new.edits);
begin
  if new.edits is not distinct from old.edits then return new; end if;
  if n_new <> n_old + 1 then raise exception 'the edit history can only grow, by exactly one entry per change' using errcode = 'check_violation'; end if;
  if (new.edits - (n_new - 1)) is distinct from old.edits then raise exception 'an earlier entry of the edit history cannot be changed' using errcode = 'check_violation'; end if;
  if length(btrim(coalesce(new.edits -> (n_new - 1) ->> 'reason', ''))) = 0 then raise exception 'an edit needs a reason' using errcode = 'check_violation'; end if;
  if coalesce(new.edits -> (n_new - 1) ->> 'at', '') = '' then raise exception 'an edit entry needs its date' using errcode = 'check_violation'; end if;
  return new;
end $$;
create trigger parcels_edit_history before update on parcels for each row execute function check_edit_history();
create trigger plantings_edit_history before update on plantings for each row execute function check_edit_history();
revoke execute on function check_edit_history() from public, anon, authenticated;

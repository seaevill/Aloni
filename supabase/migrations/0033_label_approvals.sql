-- 0033_label_approvals.sql  (WRITTEN, NOT APPLIED ANYWHERE)  «Έγκριση γεωπόνου»: the owner records the agronomist's approval of a label use. A NEW file (0001–0032 are applied and frozen).
--  * `label_approvals` is an append-only, audited ledger: approver's name, date, a note, an optional photo, the label's fingerprint, who recorded it. Owner only (workers and strangers see and write nothing).
--  * An approval makes the label «signed» (sign_off_by / on / fingerprint) in the SAME step. The waiting-period gate (0032) is unchanged: unsigned = unknown = closed.
--  * NOT in this file (stage 2, a later migration, after the phone writes its approvals into this ledger): refusing a DIRECT write of the sign_off columns. Until then the old phone path (apply_ops with label_uses.sign_off) still works.
do $$ begin
  if to_regclass('public.label_uses') is null or to_regclass('public.media') is null or to_regprocedure('private.has_role(uuid,text[])') is null then
    raise exception '0033 stopped: label_uses, media or private.has_role is missing (nothing was changed)';
  end if;
end $$;

create table label_approvals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  label_use_id uuid not null references label_uses(id),
  label_seq bigint not null,                           -- the label's server_seq the approver LOOKED AT: an approval covers exactly that version (a label edited since is refused)
  -- the name must hold a real character: all the whitespace JavaScript trim() removes on the phone, plus the zero-width space
  approver_name text not null check (length(btrim(approver_name, E' \t\n\u000b\u000c\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\u200b')) > 0 and length(approver_name) <= 120),
  approved_on date not null,
  note text check (note is null or length(note) <= 2000),
  photo_id uuid references media(id),
  fingerprint text not null check (length(btrim(fingerprint)) > 0),
  label_snapshot jsonb not null,                       -- the label's own values AT approval, written by the server (what was approved stays readable even after a superseding label)
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  server_seq bigint
);
create unique index label_approvals_one_per_label on label_approvals (label_use_id);      -- a label is approved once; a change is a NEW label use (supersedes_id) with its own approval
alter table label_approvals enable row level security;
create policy label_approvals_select on label_approvals for select to authenticated using (private.has_role(farm_id, array['owner']));
create policy label_approvals_insert on label_approvals for insert to authenticated with check (private.has_role(farm_id, array['owner']));
create trigger label_approvals_seq before insert on label_approvals for each row execute function set_server_seq();
create trigger label_approvals_audit after insert or update or delete on label_approvals for each row execute function write_audit();
create trigger label_approvals_append_only before update or delete on label_approvals for each row execute function forbid_change();
create trigger label_approvals_no_truncate before truncate on label_approvals for each statement execute function forbid_change();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on label_approvals from authenticated; grant select, insert on label_approvals to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on label_approvals from anon; end if;
end $$;

-- the phone's fingerprint of a label (packages/rules-core/src/label.ts: JSON.stringify([scope, dose, phi, rei, maxApps])), built the same way here from the locked row. Locked to the phone by ONE file of examples
-- (supabase/tests/label-fingerprint.json: the phone's unit test and m14_approval.sql both read it). Only a COMPLETE label has one.
create function private.label_fingerprint(lu public.label_uses) returns text language sql immutable set search_path = public, pg_temp as $$
  select '[' || to_jsonb('[' || to_jsonb(lu.product_id::text)::text || ',' || to_jsonb(lu.crop_id::text)::text || ',' || to_jsonb(coalesce(lu.target, ''))::text || ']')::text
      || ',{"known":true,"value":{"kind":' || to_jsonb(lu.dose_kind)::text || ',"unit":' || to_jsonb(lu.dose_unit)::text || ',"min":' || to_jsonb(lu.dose_min::text)::text
      || ',"max":' || to_jsonb(case when lu.dose_kind = 'single' then lu.dose_min::text else lu.dose_max::text end)::text || '}}'
      || ',{"known":true,"value":' || lu.phi_days::text || '},{"known":true,"value":' || lu.rei_hours::text || '},{"known":true,"value":' || lu.max_apps::text || '}]' $$;
grant execute on function private.label_fingerprint(public.label_uses) to authenticated;

-- what an approval must satisfy (the label belongs to the farm, is live and COMPLETE; the date is not in the future by the Athens clock; the photo is the farm's own)
create function check_label_approval() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare lu public.label_uses;
begin
  -- the role check comes FIRST: a BEFORE trigger runs before the row-level-security check, and a worker or a stranger must not learn anything about a label from our messages
  if auth.uid() is not null and not private.has_role(new.farm_id, array['owner']) then raise exception 'new row violates row-level security policy for table "label_approvals"' using errcode = 'insufficient_privilege'; end if;
  -- provenance is written by the server, never taken from the request
  new.created_by := auth.uid(); new.created_at := now();
  select * into lu from public.label_uses where id = new.label_use_id and farm_id = new.farm_id for update;      -- the lock also serialises two approvals of one label
  if not found or lu.deleted_at is not null then raise exception 'the label use is not a live label of this farm' using errcode = 'check_violation'; end if;
  if lu.sign_off_by is not null then raise exception 'this label use is already signed: a change is a NEW label use with its own approval' using errcode = 'check_violation'; end if;
  if new.label_seq is distinct from lu.server_seq then raise exception 'the label use changed since it was read (version % now, approval names %): read it again and approve what you see', lu.server_seq, new.label_seq using errcode = 'check_violation'; end if;
  if lu.dose_kind is null or lu.dose_unit is null or lu.dose_min is null or (lu.dose_kind = 'range' and lu.dose_max is null) or lu.phi_days is null or lu.rei_hours is null or lu.max_apps is null then
    raise exception 'an incomplete label use cannot be approved (kind, unit, dose, PHI, REI and max applications are all needed)' using errcode = 'check_violation';
  end if;
  -- a stored value the PHONE cannot read as a known value must stay unsigned (the server gate counts a signature as present; the phone would reject it): plain decimals only, and «1.500» is ambiguous (thousands or
  -- decimals?) exactly as in packages/rules-core parseDecimal; whole numbers of at most 4 digits as in parseWhole. Shared negative examples: supabase/tests/label-fingerprint.json («refused»).
  if lu.dose_min::text !~ '^\d+(\.\d+)?$' or (lu.dose_kind = 'range' and lu.dose_max::text !~ '^\d+(\.\d+)?$')
     or (lu.dose_min::text ~ '^\d+\.\d{3}$' and split_part(lu.dose_min::text, '.', 1) <> '0')
     or (lu.dose_kind = 'range' and lu.dose_max::text ~ '^\d+\.\d{3}$' and split_part(lu.dose_max::text, '.', 1) <> '0')
     or lu.phi_days not between 0 and 9999 or lu.rei_hours not between 0 and 9999 or lu.max_apps not between 0 and 9999 then
    raise exception 'a stored value cannot be read the way the phone reads it (an ambiguous decimal or a whole number of more than 4 digits): correct the label use first' using errcode = 'check_violation';
  end if;
  if new.approved_on > (now() at time zone 'Europe/Athens')::date then raise exception 'the approval date cannot be in the future' using errcode = 'check_violation'; end if;
  if new.approved_on < date '2020-01-01' then raise exception 'the approval date is implausibly old' using errcode = 'check_violation'; end if;
  if new.photo_id is not null and not exists (select 1 from public.media m where m.id = new.photo_id and m.farm_id = new.farm_id and m.job_id is null) then
    raise exception 'the photo is not a photo of this farm (or it belongs to a job)' using errcode = 'check_violation';
  end if;
  if new.fingerprint is distinct from private.label_fingerprint(lu) then raise exception 'the fingerprint does not match the label as the server holds it (it must be the phone''s fingerprint of exactly this version)' using errcode = 'check_violation'; end if;
  new.label_snapshot := to_jsonb(lu) - array['created_at', 'updated_at', 'server_seq', 'sync_xid', 'device_id', 'actor_id'];
  return new;
end $$;
create trigger label_approvals_check before insert on label_approvals for each row execute function check_label_approval();

-- the approval signs the label in the same step (a label that is already signed is REFUSED above, so ledger and label never disagree)
create function apply_label_approval() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  update label_uses set sign_off_by = new.approver_name, sign_off_on = new.approved_on, sign_off_fingerprint = new.fingerprint
   where id = new.label_use_id and farm_id = new.farm_id and sign_off_by is null;
  if not found then raise exception 'the label use could not be signed' using errcode = 'check_violation'; end if;
  return new;
end $$;
create trigger label_approvals_apply after insert on label_approvals for each row execute function apply_label_approval();

revoke execute on function check_label_approval(), apply_label_approval() from public, anon, authenticated;

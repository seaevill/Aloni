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
  approver_name text not null check (length(btrim(approver_name)) > 0 and length(approver_name) <= 120),
  approved_on date not null,
  note text check (note is null or length(note) <= 2000),
  photo_id uuid references media(id),
  fingerprint text not null check (length(btrim(fingerprint)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  server_seq bigint
);
create index label_approvals_label on label_approvals (farm_id, label_use_id);
alter table label_approvals enable row level security;
create policy label_approvals_select on label_approvals for select to authenticated using (private.has_role(farm_id, array['owner']));
create policy label_approvals_insert on label_approvals for insert to authenticated with check (private.has_role(farm_id, array['owner']));
create trigger label_approvals_seq before insert on label_approvals for each row execute function set_server_seq();
create trigger label_approvals_audit after insert or update or delete on label_approvals for each row execute function write_audit();
create trigger label_approvals_append_only before update or delete on label_approvals for each row execute function forbid_change();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on label_approvals from authenticated; grant select, insert on label_approvals to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on label_approvals from anon; end if;
end $$;

-- what an approval must satisfy (the label belongs to the farm, is live and COMPLETE; the date is not in the future by the Athens clock; the photo is the farm's own)
create function check_label_approval() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare lu record;
begin
  select * into lu from label_uses where id = new.label_use_id and farm_id = new.farm_id for update;
  if not found or lu.deleted_at is not null then raise exception 'the label use is not a live label of this farm' using errcode = 'check_violation'; end if;
  if lu.dose_kind is null or lu.dose_unit is null or lu.dose_min is null or (lu.dose_kind = 'range' and lu.dose_max is null) or lu.phi_days is null or lu.rei_hours is null or lu.max_apps is null then
    raise exception 'an incomplete label use cannot be approved (kind, unit, dose, PHI, REI and max applications are all needed)' using errcode = 'check_violation';
  end if;
  if new.approved_on > (now() at time zone 'Europe/Athens')::date then raise exception 'the approval date cannot be in the future' using errcode = 'check_violation'; end if;
  if new.photo_id is not null and not exists (select 1 from media m where m.id = new.photo_id and m.farm_id = new.farm_id) then
    raise exception 'the photo is not a photo of this farm' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger label_approvals_check before insert on label_approvals for each row execute function check_label_approval();

-- the approval signs the label in the same step (a label that is already signed keeps its signature; the ledger still gets the row)
create function apply_label_approval() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  update label_uses set sign_off_by = new.approver_name, sign_off_on = new.approved_on, sign_off_fingerprint = new.fingerprint
   where id = new.label_use_id and farm_id = new.farm_id and sign_off_by is null;
  return new;
end $$;
create trigger label_approvals_apply after insert on label_approvals for each row execute function apply_label_approval();

revoke execute on function check_label_approval(), apply_label_approval() from public, anon, authenticated;

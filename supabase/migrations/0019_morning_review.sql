-- 0019_morning_review.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Findings of the team's morning review (m3-morning) and the advisors' lists. A NEW file; builds on 0001–0018.
--  1  a SIGNED label use never changes (the review lowered PHI 7 → 1 and a PHI-1 correction then passed). A change is a NEW row that names the one it replaces and says why;
--     archiving stays possible; nothing can shorten an old harvest block;
--  2  every function in `public` has a fixed search_path;
--  3  trigger functions are not callable through the API; the helpers RLS needs (has_role, worker_sees_spray, sync_generation, sync_visibility) move to the schema `private`,
--     which the API does not expose. complete_spray_job and accept_invitation stay open ON PURPOSE (they are the worker's «Έγινε» and the worker's first sign-in);
--  4  policies: only `to authenticated`, auth.uid() through a sub-select (evaluated once per query), ONE permissive policy per table and command (owner and worker rules are OR-ed);
--  5  accept_invitation reads auth.users (a CONFIRMED address), not an e-mail claim in the token;
--  6  an invitation's expiry and creation time are the server's; an expired invitation does not block a new one for the same address; the owner can withdraw an open one (the delete policy);
--  7  server_identity() fails loudly when the identity cannot be read (no silent null); the last bump_sync_generation() is recorded (bumped_at) so the verification can ask for one after a restart/restore.

-- ---------------------------------------------------------------- 1
alter table label_uses add column supersedes_id uuid references label_uses(id), add column change_reason text;
alter table label_uses add constraint label_uses_supersede_reason check (supersedes_id is null or length(btrim(coalesce(change_reason, ''))) > 0);
drop trigger label_uses_same_farm on label_uses;
create trigger label_uses_same_farm before insert or update on label_uses for each row execute function check_same_farm('product_id:products', 'crop_id:crops', 'supersedes_id:label_uses');

create function forbid_signed_label_change() returns trigger language plpgsql set search_path = public as $$
declare bookkeeping constant text[] := array['deleted_at', 'updated_at', 'server_seq', 'sync_xid', 'device_id', 'actor_id'];
begin
  if old.sign_off_by is null then return new; end if;          -- not signed yet: free to edit, and it may be signed with the values as they are
  if (to_jsonb(new) - bookkeeping) is distinct from (to_jsonb(old) - bookkeeping) then
    raise exception 'a signed label use cannot be changed: add a NEW label use (supersedes_id + change_reason) instead' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger label_uses_signed_guard before update on label_uses for each row execute function forbid_signed_label_change();

-- ---------------------------------------------------------------- 3a: the RLS helpers leave the exposed schema
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter function has_role(uuid, text[]) set schema private;
alter function worker_sees_spray(uuid, uuid) set schema private;
alter function sync_generation() set schema private;
alter function sync_visibility(uuid) set schema private;

-- ---------------------------------------------------------------- 7 (before the search_path loop: it uses the new server_identity)
create or replace function server_identity() returns text language plpgsql stable security definer set search_path = public as $$
declare id text;
begin
  select system_identifier::text into id from pg_control_system();
  if id is null then raise exception 'the identity of this server cannot be read: the restore safeguard would not work' using errcode = 'object_not_in_prerequisite_state'; end if;
  return id;
end $$;
alter table sync_meta add column bumped_at timestamptz not null default now();
update sync_meta set system_id = server_identity(), bumped_at = now();
create or replace function private.sync_generation() returns text language sql stable security definer set search_path = public as $$
  select case when system_id is not distinct from server_identity() then generation::text else generation::text || ':' || server_identity() end from sync_meta $$;
create or replace function bump_sync_generation() returns text language plpgsql security definer set search_path = public as $$
declare t text; new_gen uuid := gen_random_uuid();
begin
  if auth.uid() is not null then raise exception 'only an administrator (no end-user session) may run bump_sync_generation()' using errcode = 'insufficient_privilege'; end if;
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings'] loop
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set sync_xid = pg_current_xact_id(), server_seq = nextval(''server_seq_seq'')', t);
    execute format('alter table %I enable trigger user', t);
  end loop;
  update sync_meta set generation = new_gen, system_id = server_identity(), bumped_at = now();
  return new_gen::text;
end $$;

-- ---------------------------------------------------------------- 2 + 3a: every function of ours has a fixed search_path that can reach the private helpers
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'private') and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('alter function %s set search_path = public, private', r.f);
  end loop;
end $$;

-- ---------------------------------------------------------------- 3b: trigger functions are not callable through the API; the helpers only by signed-in users
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke execute on function %s from public', r.f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', r.f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', r.f); end if;
  end loop;
end $$;
revoke execute on function private.has_role(uuid, text[]), private.worker_sees_spray(uuid, uuid), private.sync_generation(), private.sync_visibility(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function private.has_role(uuid, text[]), private.worker_sees_spray(uuid, uuid), private.sync_generation(), private.sync_visibility(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function private.has_role(uuid, text[]), private.worker_sees_spray(uuid, uuid), private.sync_generation(), private.sync_visibility(uuid) to authenticated; end if;
end $$;
comment on function complete_spray_job(uuid, timestamptz, text, text) is 'OPEN TO SIGNED-IN USERS ON PURPOSE: the worker''s «Έγινε». It checks the session itself (assigned worker of this job, REI lock, label state) and the server writes the spray record.';
comment on function accept_invitation() is 'OPEN TO SIGNED-IN USERS ON PURPOSE: the worker''s first sign-in claims the invitation written for her CONFIRMED e-mail address.';

-- ---------------------------------------------------------------- 4: policies (rewritten from what the database holds, after the helpers moved)
do $$
declare t record; c text; p record; us text[]; cs text[]; chk text;
  wrap constant text := '(?<!SELECT )auth\.uid\(\)';
begin
  for t in select distinct tablename from pg_policies where schemaname = 'public' loop
    foreach c in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      us := '{}'; cs := '{}';
      for p in select * from pg_policies where schemaname = 'public' and tablename = t.tablename and permissive = 'PERMISSIVE' and (cmd = c or cmd = 'ALL') order by policyname loop
        if p.qual is not null then us := us || ('(' || regexp_replace(regexp_replace(p.qual, wrap, '(select auth.uid())', 'g'), '(?<!SELECT )current_setting\(([^()]*)\)', '(select current_setting(\1))', 'g') || ')'); end if;
        chk := coalesce(p.with_check, p.qual);
        if chk is not null then cs := cs || ('(' || regexp_replace(regexp_replace(chk, wrap, '(select auth.uid())', 'g'), '(?<!SELECT )current_setting\(([^()]*)\)', '(select current_setting(\1))', 'g') || ')'); end if;
      end loop;
      if c in ('SELECT', 'UPDATE', 'DELETE') and array_length(us, 1) is not null then
        execute format('create policy %I on %I for %s to authenticated using (%s)%s', t.tablename || '_' || lower(c) || '_new', t.tablename, c, array_to_string(us, ' OR '),
                       case when c = 'UPDATE' then format(' with check (%s)', array_to_string(cs, ' OR ')) else '' end);
      elsif c = 'INSERT' and array_length(cs, 1) is not null then
        execute format('create policy %I on %I for INSERT to authenticated with check (%s)', t.tablename || '_insert_new', t.tablename, array_to_string(cs, ' OR '));
      end if;
    end loop;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename and policyname not like '%\_new' loop
      execute format('drop policy %I on %I', p.policyname, t.tablename);
    end loop;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename and policyname like '%\_new' loop
      execute format('alter policy %I on %I rename to %I', p.policyname, t.tablename, regexp_replace(p.policyname, '_new$', ''));
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------- 5 + 6: invitations
create or replace function check_invitation() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  new.created_by := auth.uid(); new.accepted_at := null; new.accepted_by := null;
  new.created_at := now(); new.expires_at := now() + interval '14 days';          -- the server's clock and the server's term
  delete from invitations where farm_id = new.farm_id and email = new.email and accepted_at is null and expires_at <= now();   -- an expired one never blocks a new one
  if not controller_complete(new.farm_id) then raise exception 'enter the data controller details (name, address, phone) before inviting anyone' using errcode = 'check_violation'; end if;
  if new.worker_id is not null and not exists (select 1 from workers w where w.id = new.worker_id and w.farm_id = new.farm_id and w.deleted_at is null) then
    raise exception 'the roster worker does not belong to this farm' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create or replace function accept_invitation() returns jsonb language plpgsql security definer set search_path = public, private as $$
declare me constant uuid := auth.uid(); mail text; r record; farms jsonb := '[]'::jsonb;
begin
  if me is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  select lower(btrim(u.email)) into mail from auth.users u where u.id = me and u.email_confirmed_at is not null;   -- the account's CONFIRMED address, not a claim in the token
  if mail is null or mail = '' then raise exception 'sign in with a confirmed e-mail address first' using errcode = 'insufficient_privilege'; end if;
  for r in select * from invitations where email = mail and accepted_at is null and expires_at > now() order by created_at for update loop
    insert into farm_members (farm_id, user_id, role) values (r.farm_id, me, 'worker') on conflict (farm_id, user_id) do nothing;
    if r.worker_id is not null then update workers set user_id = me where id = r.worker_id and user_id is null; end if;
    update invitations set accepted_at = now(), accepted_by = me where id = r.id;
    farms := farms || to_jsonb(r.farm_id);
  end loop;
  if jsonb_array_length(farms) = 0 then raise exception 'there is no open invitation for this account' using errcode = 'no_data_found'; end if;
  return jsonb_build_object('farms', farms);
end $$;
revoke execute on function check_invitation(), forbid_signed_label_change() from public, anon, authenticated;

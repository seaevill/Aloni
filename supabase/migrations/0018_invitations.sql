-- 0018_invitations.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Inviting a worker. A NEW file; builds on 0001–0017.
-- The owner writes an invitation (an e-mail address, optionally the roster worker it is for). The worker signs in with that address (Supabase Auth e-mail code, which proves the
-- mailbox is theirs) and the app calls accept_invitation(): the account becomes a WORKER member of that farm and is linked to the roster entry. Nothing else grants membership.
--   * closed until the data controller's name, address and phone are entered (farm_settings 'controller'): the same gate the app has, kept on the server too;
--   * an invitation lives 14 days, is used once, and can be withdrawn by the owner until it is used;
--   * accepting never changes an existing membership (an owner is not turned into a worker), and only the address named in the invitation can accept it.
create table invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  worker_id uuid references workers(id),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz, accepted_by uuid references auth.users(id)
);
create unique index invitations_one_open on invitations (farm_id, email) where accepted_at is null;
alter table invitations enable row level security;

create function controller_complete(p_farm uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select length(btrim(coalesce(value->>'name', ''))) > 0 and length(btrim(coalesce(value->>'address', ''))) > 0 and length(btrim(coalesce(value->>'phone', ''))) > 0
                   from farm_settings where farm_id = p_farm and key = 'controller'), false) $$;

create function check_invitation() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := auth.uid(); new.accepted_at := null; new.accepted_by := null;
  if not controller_complete(new.farm_id) then raise exception 'enter the data controller details (name, address, phone) before inviting anyone' using errcode = 'check_violation'; end if;
  if new.worker_id is not null and not exists (select 1 from workers w where w.id = new.worker_id and w.farm_id = new.farm_id and w.deleted_at is null) then
    raise exception 'the roster worker does not belong to this farm' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger invitations_check before insert on invitations for each row execute function check_invitation();

create policy invitations_owner_read on invitations for select using (has_role(farm_id, array['owner']));
create policy invitations_owner_insert on invitations for insert with check (has_role(farm_id, array['owner']));
create policy invitations_owner_withdraw on invitations for delete using (has_role(farm_id, array['owner']) and accepted_at is null);

create function accept_invitation() returns jsonb language plpgsql security definer set search_path = public as $$
declare me constant uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', ''))); r record; farms jsonb := '[]'::jsonb;
begin
  if me is null or mail = '' then raise exception 'sign in with the invited e-mail address first' using errcode = 'insufficient_privilege'; end if;
  for r in select * from invitations where email = mail and accepted_at is null and expires_at > now() order by created_at for update loop
    insert into farm_members (farm_id, user_id, role) values (r.farm_id, me, 'worker') on conflict (farm_id, user_id) do nothing;
    if r.worker_id is not null then update workers set user_id = me where id = r.worker_id and user_id is null; end if;
    update invitations set accepted_at = now(), accepted_by = me where id = r.id;
    farms := farms || to_jsonb(r.farm_id);
  end loop;
  if jsonb_array_length(farms) = 0 then raise exception 'there is no open invitation for this account' using errcode = 'no_data_found'; end if;
  return jsonb_build_object('farms', farms);
end $$;

-- rights: Supabase gives new tables to anon/authenticated by default; take back what is not needed
revoke all on invitations from anon, authenticated;
revoke execute on function controller_complete(uuid), check_invitation(), accept_invitation() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function controller_complete(uuid), check_invitation(), accept_invitation() from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, delete on invitations to authenticated;
    revoke execute on function controller_complete(uuid), check_invitation() from authenticated;
    grant execute on function accept_invitation() to authenticated;
  end if;
end $$;

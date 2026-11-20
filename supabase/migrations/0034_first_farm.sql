-- 0034_first_farm.sql  (WRITTEN, NOT APPLIED ANYWHERE)  «Δημιουργία κτήματος»: a signed-in person with no membership sets up their FIRST farm through ONE checked function — nobody inserts farm and owner rows by hand in production.
-- A NEW file (0001–0032 are applied and frozen; 0033 is the label-approval ledger, a separate PR: apply 0033 first or together with this file, never after it).
--  * create_first_farm(p_farm, p_name): needs a signed-in user with a CONFIRMED e-mail; refuses a user who already belongs to any farm (an invited worker accepts the invitation instead) or has an open invitation;
--    one farm per Auth ACCOUNT over its lifetime (farm_creations is unique per user, also after the membership is gone; it goes only with the Auth account itself); the farm id is the PHONE's id and an id that already exists cannot be taken; name 1–120 characters;
--    at most 20 new farms per hour on the whole server; the creation is audited. Farm and owner membership are written in one step by the function (the table policies still give a user no insert on farms).
do $$ begin
  if to_regclass('public.farms') is null or to_regclass('public.farm_members') is null or to_regclass('public.invitations') is null then
    raise exception '0034 stopped: farms, farm_members or invitations is missing (nothing was changed)';
  end if;
end $$;

create table farm_creations (
  user_id uuid primary key references auth.users(id) on delete cascade,      -- ONE farm per user, for good
  farm_id uuid not null,                                                      -- (no foreign key: the log must outlive a deleted farm)
  created_at timestamptz not null default now()
);
create index farm_creations_recent on farm_creations (created_at);
alter table farm_creations enable row level security;                          -- only the function (definer) reads and writes it; callers get an explicit DENY (and no grants)
create policy farm_creations_deny on farm_creations for all to authenticated using (false) with check (false);
create trigger farm_creations_audit after insert or update or delete on farm_creations for each row execute function write_audit();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on farm_creations from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on farm_creations from anon; end if;
end $$;

create function create_first_farm(p_farm uuid, p_name text) returns uuid language plpgsql security definer set search_path = public, private, pg_temp as $$
declare me constant uuid := auth.uid(); nm text := btrim(coalesce(p_name, ''), E' \t\r\n​ '); mail text;
begin
  if me is null then raise exception 'sign in first' using errcode = 'insufficient_privilege'; end if;
  perform pg_advisory_xact_lock(hashtextextended('create_first_farm:' || me::text, 0));       -- two taps at once: one wins, the other sees its row
  select lower(btrim(coalesce(u.email, ''))) into mail from auth.users u where u.id = me and u.email_confirmed_at is not null;
  if not found then raise exception 'confirm your e-mail address first' using errcode = 'insufficient_privilege'; end if;
  if p_farm is null then raise exception 'the farm id is missing' using errcode = 'check_violation'; end if;
  -- a retry after a lost answer: the same person asking again for the farm they CURRENTLY own (active owner, live farm) with THIS id gets the same success, not an error
  if exists (select 1 from farm_creations c join farm_members m on m.farm_id = c.farm_id and m.user_id = c.user_id and m.role = 'owner' and m.active join farms f on f.id = c.farm_id and f.deleted_at is null where c.user_id = me and c.farm_id = p_farm) then return p_farm; end if;
  if length(nm) < 1 or length(nm) > 120 then raise exception 'the farm name must be 1–120 characters' using errcode = 'check_violation'; end if;
  if exists (select 1 from farm_members m where m.user_id = me) then raise exception 'you already belong to a farm' using errcode = 'check_violation'; end if;
  if exists (select 1 from farm_creations c where c.user_id = me) then raise exception 'one farm per person: you have set up a farm before' using errcode = 'check_violation'; end if;
  if exists (select 1 from invitations i where i.email = mail and i.accepted_at is null and i.expires_at > now()) then raise exception 'you have an open invitation: accept it instead of setting up a farm' using errcode = 'check_violation'; end if;
  if exists (select 1 from farms f where f.id = p_farm) then raise exception 'a farm with this id already exists' using errcode = 'check_violation'; end if;
  perform pg_advisory_xact_lock(hashtextextended('create_first_farm:quota', 0));                -- ONE server-wide queue for the hourly cap: the count and the insert below cannot overlap across users
  if (select count(*) from farm_creations c where c.created_at > now() - interval '1 hour') >= 20 then raise exception 'too many new farms in the last hour: try again later' using errcode = 'check_violation'; end if;
  insert into farms (id, name) values (p_farm, nm);
  insert into farm_members (farm_id, user_id, role) values (p_farm, me, 'owner');
  insert into farm_creations (user_id, farm_id) values (me, p_farm);
  return p_farm;
end $$;
revoke execute on function create_first_farm(uuid, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function create_first_farm(uuid, text) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function create_first_farm(uuid, text) to authenticated; end if;
end $$;

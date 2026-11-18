-- Inviting a worker (migration 0018), as the REAL `authenticated` role and with no session at all. Runs AFTER m2_0015.sql on the same database.
\set ON_ERROR_STOP on
reset role; set test.uid = ''; set test.jwt = '';
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000d4'), ('00000000-0000-0000-0000-0000000000e5');
insert into workers(id, farm_id, name) values ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Invited Worker');   -- a roster entry nobody has an account for yet
-- the data controller details are incomplete here (phone ops stored only a name): an invitation must be refused until they are complete
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into invitations(farm_id, email) values (f, 'new.worker@example.org'); raise exception '(inv1) invited before the data controller details were complete';
  exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
update farm_settings set value = '{"name":"Test Farm","address":"Megara","phone":"+30 000"}' where farm_id = '11111111-1111-1111-1111-111111111111' and key = 'controller';

-- the owner invites; a worker, an anonymous caller and a stranger cannot
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; w3 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
begin
  insert into invitations(farm_id, email, worker_id) values (f, 'new.worker@example.org', w3);
  insert into invitations(farm_id, email) values (f, 'expired@example.org'), (f, 'owner.again@example.org');
  begin insert into invitations(farm_id, email) values (f, 'new.worker@example.org'); raise exception '(inv2) two open invitations for one address'; exception when unique_violation then null; end;
  begin insert into invitations(farm_id, email) values (f, 'Not An Address'); raise exception '(inv2) a malformed address was accepted'; exception when check_violation then null; end;
  begin insert into invitations(farm_id, email, worker_id) values (f, 'x@example.org', gen_random_uuid()); raise exception '(inv2) a worker of nowhere'; exception when foreign_key_violation or check_violation then null; end;
  if (select count(*) from invitations) <> 3 then raise exception '(inv2) the owner does not see his invitations'; end if;
end $$;
reset role; set test.uid = '';
update invitations set expires_at = now() - interval '1 day' where email = 'expired@example.org';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';   -- a worker of this farm
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  if (select count(*) from invitations) <> 0 then raise exception '(inv3) a worker can read invitations'; end if;
  begin insert into invitations(farm_id, email) values (f, 'sneaky@example.org'); raise exception '(inv3) a worker invited somebody'; exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role; set test.uid = ''; set role anon;
do $$ begin
  begin perform accept_invitation(); raise exception '(inv4) anon called accept_invitation'; exception when insufficient_privilege then null; end;
  begin perform count(*) from invitations; raise exception '(inv4) anon read invitations'; exception when insufficient_privilege then null; end;
end $$;

-- the invited person signs in and accepts: a WORKER member, linked to the roster entry; used once; only the invited address works
reset role;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000e5'; set test.jwt = '{"email":"stranger@example.org"}';
do $$ begin begin perform accept_invitation(); raise exception '(inv5) an address nobody invited got in'; exception when no_data_found then null; end; end $$;
set test.uid = '00000000-0000-0000-0000-0000000000d4'; set test.jwt = '{"email":"New.Worker@Example.org"}';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; r jsonb;
begin
  if exists (select 1 from parcels where farm_id = f) then raise exception '(inv6) the invitee could read the farm before accepting'; end if;
  r := accept_invitation();
  if r->'farms'->>0 <> f::text then raise exception '(inv6) accept gave %', r; end if;
  if not exists (select 1 from farm_members where farm_id = f and user_id = '00000000-0000-0000-0000-0000000000d4' and role = 'worker') then raise exception '(inv6) no worker membership'; end if;
  if (select user_id from workers where id = 'bbbbbbbb-0000-0000-0000-000000000003') is distinct from '00000000-0000-0000-0000-0000000000d4' then raise exception '(inv6) the roster entry was not linked'; end if;
  begin perform accept_invitation(); raise exception '(inv6) an invitation was used twice'; exception when no_data_found then null; end;
  begin insert into products(farm_id, name, type, unit) values (f, 'x', 'fungicide', 'kg'); raise exception '(inv6) the new worker added a product'; exception when insufficient_privilege or check_violation then null; end;
end $$;
-- an owner who is invited again stays an owner; an expired invitation does nothing
reset role; set test.jwt = ''; insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000f6') on conflict do nothing;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1'; set test.jwt = '{"email":"owner.again@example.org"}';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform accept_invitation();
  if (select role from farm_members where farm_id = f and user_id = '00000000-0000-0000-0000-0000000000a1') <> 'owner' then raise exception '(inv7) an owner was turned into a worker'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000e5'; set test.jwt = '{"email":"expired@example.org"}';
do $$ begin begin perform accept_invitation(); raise exception '(inv7) an expired invitation was accepted'; exception when no_data_found then null; end; end $$;
reset role; set test.uid = ''; set test.jwt = '';
do $$ begin raise notice 'invitation tests passed'; end $$;

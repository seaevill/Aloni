-- «Δημιουργία κτήματος» (0034): a signed-in user with NO membership sets up their FIRST farm through one checked function, create_first_farm(p_farm, p_name) — no SQL by hand in production. Rules: confirmed e-mail; not
-- already a member of any farm (an invited worker must accept the invitation instead); one farm per user for good; a farm id that already exists cannot be taken; name 1–120 characters; at most 20 new farms per
-- hour on the whole server; every creation is audited. Real `authenticated` users; only the fixtures run as superuser. Written BEFORE 0034 (red against 0033), then green. Runs after m14_approval.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = ''; set test.jwt = '';
insert into auth.users(id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000015a1', 'first.owner@example.org', now()),    -- a new user: no farm
  ('00000000-0000-0000-0000-0000000015a2', 'invited@example.org', now()),        -- has an OPEN invitation
  ('00000000-0000-0000-0000-0000000015a3', 'unconfirmed@example.org', null),     -- e-mail not confirmed
  ('00000000-0000-0000-0000-0000000015a4', 'late@example.org', now());           -- tries after the hourly cap
update auth.users set email = coalesce(email, 'worker.b2@example.org'), email_confirmed_at = coalesce(email_confirmed_at, now()) where id = '00000000-0000-0000-0000-0000000000b2';   -- the existing worker has a confirmed address too
insert into invitations(farm_id, email) values ('11111111-1111-1111-1111-111111111111', 'invited@example.org');
set role authenticated;

-- F1: the function exists for signed-in users only; anon has no EXECUTE
reset role; do $$ begin
  if has_function_privilege('anon', 'create_first_farm(uuid,text)', 'EXECUTE') then raise exception '(F1) anon can execute create_first_farm'; end if;
  if not has_function_privilege('authenticated', 'create_first_farm(uuid,text)', 'EXECUTE') then raise exception '(F1) authenticated cannot execute it'; end if;
end $$;
set role authenticated;

-- F2: refusals, each for its own reason and each leaving NOTHING behind
set test.uid = '00000000-0000-0000-0000-0000000015a3';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000001', 'Unconfirmed farm'); raise exception '(F2) an unconfirmed e-mail created a farm';
  exception when insufficient_privilege then if sqlerrm not like '%confirm%' then raise; end if; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000015a2';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000002', 'Invited farm'); raise exception '(F2) an invited person created a farm';
  exception when check_violation then if sqlerrm not like '%invitation%' then raise; end if; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000b2';                           -- the existing WORKER of farm 1111
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000003', 'Worker farm'); raise exception '(F2) a member of a farm created a farm';
  exception when check_violation then if sqlerrm not like '%already belong%' then raise; end if; end;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000015a1';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000004', '   '); raise exception '(F2) a blank name was accepted';
  exception when check_violation then if sqlerrm not like '%name%' then raise; end if; end;
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000004', repeat('x', 121)); raise exception '(F2) a 121-character name was accepted';
  exception when check_violation then if sqlerrm not like '%name%' then raise; end if; end;
  begin perform create_first_farm('11111111-1111-1111-1111-111111111111', 'Take over'); raise exception '(F2) an existing farm id was taken over';
  exception when check_violation then if sqlerrm not like '%already exists%' then raise; end if; end;
  begin perform create_first_farm(null, 'No id'); raise exception '(F2) a missing farm id was accepted';
  exception when check_violation then if sqlerrm not like '%farm id%' then raise; end if; end;
  if exists (select 1 from farm_members where user_id = '00000000-0000-0000-0000-0000000015a1') then raise exception '(F2) a refused call left a membership'; end if;
end $$;
-- no session at all
set test.uid = '';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-000000000005', 'Nobody'); raise exception '(F2) a call without a user created a farm';
  exception when insufficient_privilege then null; end;
end $$;

-- F3: the good path: the farm (with the PHONE's id) and the owner membership exist; the new owner can work in it at once; a stranger cannot see it
set test.uid = '00000000-0000-0000-0000-0000000015a1';
do $$
declare got uuid;
begin
  got := create_first_farm('aaaa1500-0000-0000-0000-0000000000f1', '  Bora''s farm  ');
  if got is distinct from 'aaaa1500-0000-0000-0000-0000000000f1' then raise exception '(F3) the function returned %', got; end if;
  if (select name from farms where id = got) is distinct from 'Bora''s farm' then raise exception '(F3) the name was not trimmed or not stored'; end if;
  if (select role from farm_members where farm_id = got and user_id = '00000000-0000-0000-0000-0000000015a1') is distinct from 'owner' then raise exception '(F3) no owner membership'; end if;
  if (select is_demo from farms where id = got) then raise exception '(F3) a real farm was created as a demo farm'; end if;
  insert into parcels(id, farm_id, name, area_str) values (gen_random_uuid(), got, 'First parcel', 0.5);       -- RLS lets the new owner write at once
end $$;
-- F3b: a retry after a LOST answer: the same person asking again for the farm they already own with THIS id gets the same success (no second farm, no error)
do $$ begin
  if create_first_farm('aaaa1500-0000-0000-0000-0000000000f1', 'Bora''s farm') is distinct from 'aaaa1500-0000-0000-0000-0000000000f1' then raise exception '(F3b) the retry did not return the same farm'; end if;
end $$;
reset role; set test.uid = '';
do $$ begin
  if (select count(*) from farms where id = 'aaaa1500-0000-0000-0000-0000000000f1') <> 1 or (select count(*) from farm_creations where user_id = '00000000-0000-0000-0000-0000000015a1') <> 1 then raise exception '(F3b) the retry created something'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000015a1';
-- F4: ONE farm per user for good: a second call fails (also after the first membership is gone)
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-0000000000f2', 'Second farm'); raise exception '(F4) a second farm was created';
  exception when check_violation then if sqlerrm not like '%already belong%' and sqlerrm not like '%one farm%' then raise; end if; end;
end $$;
reset role; set test.uid = '';
delete from farm_members where farm_id = 'aaaa1500-0000-0000-0000-0000000000f1';                     -- fixture: the membership is gone (a farm owner who left)
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000015a1';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-0000000000f3', 'Third farm'); raise exception '(F4) a user who once created a farm created another';
  exception when check_violation then if sqlerrm not like '%one farm%' then raise; end if; end;
end $$;
-- F5: a stranger sees nothing of it; nobody can read or write the creation log
set test.uid = '00000000-0000-0000-0000-0000000015a4';
do $$ begin
  if exists (select 1 from farms where id = 'aaaa1500-0000-0000-0000-0000000000f1') then raise exception '(F5) a stranger sees the new farm'; end if;
  begin perform 1 from farm_creations; raise exception '(F5) a user can read the creation log';
  exception when insufficient_privilege then null; end;
  begin insert into farm_creations(user_id, farm_id) values ('00000000-0000-0000-0000-0000000015a4', gen_random_uuid()); raise exception '(F5) a user wrote the creation log';
  exception when insufficient_privilege then null; end;
  begin insert into farms(id, name) values (gen_random_uuid(), 'Direct'); raise exception '(F5) a user inserted a farm directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role; set test.uid = '';
do $$ begin
  if not exists (select 1 from pg_policy p where p.polrelid = 'farm_creations'::regclass and p.polname = 'farm_creations_deny') then raise exception '(F5) no explicit deny policy on farm_creations'; end if;
end $$;
-- F6: audited: the creation is in the audit log with the user
reset role; set test.uid = '';
do $$ begin
  if (select count(*) from audit_log where table_name = 'farm_creations' and op = 'INSERT' and by_user = '00000000-0000-0000-0000-0000000015a1') <> 1 then raise exception '(F6) the creation is not in the audit log'; end if;
end $$;
-- F7: the hourly cap: 20 farms in the last hour on the whole server, then the next user is refused (fixtures fill the log)
do $$ begin
  for i in 1..19 loop
    insert into auth.users(id) values (('00000000-0000-0000-0000-00000015' || lpad(i::text, 4, '0'))::uuid);
    insert into farm_creations(user_id, farm_id) values (('00000000-0000-0000-0000-00000015' || lpad(i::text, 4, '0'))::uuid, gen_random_uuid());
  end loop;
end $$;                                                                                                 -- 19 + the one above = 20 in the last hour
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000015a4';
do $$ begin
  begin perform create_first_farm('aaaa1500-0000-0000-0000-0000000000f9', 'Too many'); raise exception '(F7) the hourly cap did not hold';
  exception when others then if sqlerrm not like '%too many%' then raise; end if; end;
end $$;
reset role; set test.uid = '';
\echo m15 first-farm tests passed

-- «Έγκριση γεωπόνου» (0033): the OWNER records the agronomist's approval of a label use: approver's name, date, a note, an optional photo. The record is append-only and audited; an approval signs the label in
-- the same step; without one the label stays unknown = closed. Real `authenticated` owner (a1), worker (b2), a stranger (e9) and the owner of ANOTHER farm (f4); only the fixtures run as superuser.
-- Written BEFORE 0033 (red against 0032), strengthened after the independent review (forged who/when, snapshot, already-signed, truncate, grants), then green. Runs after m13_m8.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; f2 constant uuid := '22222222-2222-2222-2222-2222222222f4'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000014a1'; ca constant uuid := 'cccccccc-0000-0000-0000-0000000014a1';
begin
  insert into crops(id,farm_id,slug,name_el) values (ca,f,'m14a','Μ14α');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m14 product','fungicide','kg');
  -- L1 complete unsigned; L2 incomplete (no waiting period); L3 complete but soft-deleted; L4 complete and ALREADY signed
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-0000000014a1',f,pq,ca,'m14','single','ml/str',0.025,7,24,3);
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min) values ('cccccccc-1111-0000-0000-0000000014a2',f,pq,ca,'m14b','single','ml/str',0.025);
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,deleted_at) values ('cccccccc-1111-0000-0000-0000000014a3',f,pq,ca,'m14c','single','ml/str',0.025,7,24,3,now());
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps,sign_off_by,sign_off_on,sign_off_fingerprint) values ('cccccccc-1111-0000-0000-0000000014a4',f,pq,ca,'m14d','single','ml/str',0.025,7,24,3,'Old Agronomist',current_date,'old-fp');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-0000000014a5',f,pq,ca,'m14e','single','ml/str',0.025,7,24,3);
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('dddddddd-0000-0000-0000-0000000014f1',f,repeat('e',63) || '4','image/jpeg',100,100,1000);
  -- another farm with its own owner, label and photo
  insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000f4') on conflict do nothing;
  insert into farms(id,name) values (f2,'m14 other farm');
  insert into farm_members(farm_id,user_id,role) values (f2,'00000000-0000-0000-0000-0000000000f4','owner');
  insert into products(id,farm_id,name,type,unit) values ('aaaaaaaa-0000-0000-0000-0000000014b1',f2,'m14 other product','fungicide','kg');
  insert into crops(id,farm_id,slug,name_el) values ('cccccccc-0000-0000-0000-0000000014b1',f2,'m14o','Μ14ο');
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-0000000014b1',f2,'aaaaaaaa-0000-0000-0000-0000000014b1','cccccccc-0000-0000-0000-0000000014b1','m14o','single','ml/str',0.025,7,24,3);
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('dddddddd-0000-0000-0000-0000000014f2',f2,repeat('e',63) || '5','image/jpeg',100,100,1000);
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';

-- A1: before any approval the label is unsigned (unknown = closed)
do $$ begin
  if (select sign_off_by from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1') is not null then raise exception '(A1) the label was signed before any approval'; end if;
end $$;
-- A3: refused approvals, each for ITS OWN reason (the message is checked, not just the class)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; l1 constant uuid := 'cccccccc-1111-0000-0000-0000000014a1';
begin
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l1,(select server_seq from label_uses where id = l1),'   ',current_date,private.label_fingerprint((select lbl from label_uses lbl where lbl.id = l1))); raise exception '(A3) a blank name was accepted';
  exception when check_violation then if sqlerrm not like '%approver_name%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l1,(select server_seq from label_uses where id = l1),E'\t \n',current_date,private.label_fingerprint((select lbl from label_uses lbl where lbl.id = l1))); raise exception '(A3) a tab/newline-only name was accepted';
  exception when check_violation then if sqlerrm not like '%approver_name%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l1,(select server_seq from label_uses where id = l1),U&'\200B','2026-01-01',private.label_fingerprint((select lbl from label_uses lbl where lbl.id = l1))); raise exception '(A3) a zero-width name was accepted';
  exception when check_violation then if sqlerrm not like '%approver_name%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l1,(select server_seq from label_uses where id = l1),'Agronomist',current_date + 3,'fp'); raise exception '(A3) a future date was accepted';
  exception when check_violation then if sqlerrm not like '%in the future%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l1,(select server_seq from label_uses where id = l1),'Agronomist','1990-01-01','fp'); raise exception '(A3) a date of 1990 was accepted';
  exception when check_violation then if sqlerrm not like '%implausibly old%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a2',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a2'),'Agronomist',current_date,'fp'); raise exception '(A3) an incomplete label was approved';
  exception when check_violation then if sqlerrm not like '%incomplete label use%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a3',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a3'),'Agronomist',current_date,'fp'); raise exception '(A3) a soft-deleted label was approved';
  exception when check_violation then if sqlerrm not like '%not a live label%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a4',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a4'),'Agronomist',current_date,'fp'); raise exception '(A3) an already signed label was approved again';
  exception when check_violation then if sqlerrm not like '%already signed%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014b1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014b1'),'Agronomist',current_date,'fp'); raise exception '(A3) a label of another farm was approved';
  exception when check_violation then if sqlerrm not like '%not a live label of this farm%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint,photo_id) values (f,l1,(select server_seq from label_uses where id = l1),'Agronomist',current_date,'fp','dddddddd-0000-0000-0000-0000000014f2'); raise exception '(A3) another farm''s photo was accepted';
  exception when check_violation then if sqlerrm not like '%not a photo of this farm%' then raise; end if; end;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint,photo_id) values (f,l1,(select server_seq from label_uses where id = l1),'Agronomist',current_date,'fp',gen_random_uuid()); raise exception '(A3) a photo that does not exist was accepted';
  exception when check_violation then if sqlerrm not like '%not a photo of this farm%' then raise; end if; end;
  if exists (select 1 from label_approvals) then raise exception '(A3) a refused approval left a row'; end if;
  if (select sign_off_by from label_uses where id = l1) is not null then raise exception '(A3) a refused approval signed the label'; end if;
end $$;
-- A4: a good approval: the ledger row and the signature are written in ONE step; the note and photo are kept; the server writes WHO and WHEN (a forged created_by / created_at is overwritten) and a SNAPSHOT of the label
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; l record; a record;
begin
  insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint,note,photo_id,created_by,created_at)
    values (f,'cccccccc-1111-0000-0000-0000000014a1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1'),'Agronomist Test',current_date,private.label_fingerprint((select lbl from label_uses lbl where lbl.id = 'cccccccc-1111-0000-0000-0000000014a1')),'seen at the shop','dddddddd-0000-0000-0000-0000000014f1','00000000-0000-0000-0000-0000000000b2','2001-01-01');
  select sign_off_by, sign_off_on, sign_off_fingerprint into l from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1';
  if l.sign_off_by is distinct from 'Agronomist Test' or l.sign_off_on is distinct from current_date or l.sign_off_fingerprint is distinct from private.label_fingerprint((select lbl from label_uses lbl where lbl.id = 'cccccccc-1111-0000-0000-0000000014a1')) then raise exception '(A4) the label did not become signed with the approval''s values: %', l; end if;
  select * into a from label_approvals where label_use_id = 'cccccccc-1111-0000-0000-0000000014a1';
  if a.note is distinct from 'seen at the shop' or a.photo_id is null then raise exception '(A4) note or photo lost'; end if;
  if a.created_by is distinct from '00000000-0000-0000-0000-0000000000a1' then raise exception '(A4) created_by was forged: %', a.created_by; end if;
  if a.created_at < now() - interval '1 minute' then raise exception '(A4) created_at was forged: %', a.created_at; end if;
  if (a.label_snapshot->>'phi_days') <> '7' or (a.label_snapshot->>'rei_hours') <> '24' or (a.label_snapshot->>'id') <> 'cccccccc-1111-0000-0000-0000000014a1' then raise exception '(A4) the label snapshot is wrong: %', a.label_snapshot; end if;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1'),'Second',current_date,'fp2'); raise exception '(A4) a second approval of the same label was accepted';
  exception when check_violation then if sqlerrm not like '%already signed%' then raise; end if; end;
  if (select count(*) from label_approvals where label_use_id = 'cccccccc-1111-0000-0000-0000000014a1') <> 1 then raise exception '(A4) the ledger has more than one row for the label'; end if;
end $$;
-- A4b: STALE approval: the approver looked at version N of a label; the label was edited (version N+1); the approval that names N is refused and changes NOTHING (neither the ledger nor the signature); the fresh version is accepted
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; l5 constant uuid := 'cccccccc-1111-0000-0000-0000000014a5'; seen bigint := (select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a5'); n int := (select count(*) from label_approvals);
begin
  update label_uses set phi_days = 9 where id = l5;                                    -- an unsigned label is still editable
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l5,seen,'Agronomist Test',current_date,'fp-old'); raise exception '(A4b) a stale approval was accepted';
  exception when check_violation then if sqlerrm not like '%changed since it was read%' then raise; end if; end;
  if (select count(*) from label_approvals) <> n then raise exception '(A4b) the stale approval left a ledger row'; end if;
  if (select sign_off_by from label_uses where id = l5) is not null then raise exception '(A4b) the stale approval signed the label'; end if;
  insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l5,(select server_seq from label_uses where id = l5),'Agronomist Test',current_date,private.label_fingerprint((select lbl from label_uses lbl where lbl.id = l5)));
  if (select (label_snapshot->>'phi_days') from label_approvals where label_use_id = l5) <> '9' then raise exception '(A4b) the snapshot is not the version that was approved'; end if;
  if (select sign_off_fingerprint from label_uses where id = l5) is distinct from private.label_fingerprint((select lbl from label_uses lbl where lbl.id = l5)) then raise exception '(A4b) the label carries the wrong signature'; end if;
end $$;
reset role; set test.uid = '';
-- A4c: the CURRENT version with a fingerprint the phone would reject is refused, and nothing changes (Codex M2: the server and the phone agree on what is signed)
\set golden `cat supabase/tests/label-fingerprint.json`
create temp table golden(j jsonb); insert into golden values (:'golden');
insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-0000000014a6','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-0000000014a1','cccccccc-0000-0000-0000-0000000014a1','m14f','single','ml/str',0.025,7,24,3);
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; l6 constant uuid := 'cccccccc-1111-0000-0000-0000000014a6'; n int := (select count(*) from label_approvals);
begin
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values (f,l6,(select server_seq from label_uses where id = l6),'Agronomist Test',current_date,'fp-a1'); raise exception '(A4c) an arbitrary fingerprint signed the current version';
  exception when check_violation then if sqlerrm not like '%fingerprint does not match%' then raise; end if; end;
  if (select count(*) from label_approvals) <> n or (select sign_off_by from label_uses where id = l6) is not null then raise exception '(A4c) the refused approval changed something'; end if;
end $$;
reset role; set test.uid = '';
-- A4d: the server's fingerprint is the phone's, byte for byte, on the examples the phone's unit test is locked to (supabase/tests/label-fingerprint.json)
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; v jsonb; r jsonb; got text; n int := 0;
begin
  for v in select jsonb_array_elements(j) from golden loop
    r := v->'row'; n := n + 1;
    insert into products(id,farm_id,name,type,unit) values ((r->>'product_id')::uuid, f, 'golden p', 'fungicide', 'kg') on conflict do nothing;
    insert into crops(id,farm_id,slug,name_el) values ((r->>'crop_id')::uuid, f, 'golden', 'γκ') on conflict do nothing;
    insert into label_uses(farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,dose_max,phi_days,rei_hours,max_apps)
      values (f,(r->>'product_id')::uuid,(r->>'crop_id')::uuid,nullif(r->>'target',''),r->>'dose_kind',r->>'dose_unit',(r->>'dose_min')::numeric,(r->>'dose_max')::numeric,(r->>'phi_days')::int,(r->>'rei_hours')::int,(r->>'max_apps')::int);
    select private.label_fingerprint(l) into got from label_uses l where l.farm_id = f and l.product_id = (r->>'product_id')::uuid and l.crop_id = (r->>'crop_id')::uuid and coalesce(l.target,'') = r->>'target' order by l.created_at desc limit 1;
    if got is distinct from v->>'fingerprint' then raise exception '(A4d) the server fingerprint differs from the phone''s on example %: % <> %', n, got, v->>'fingerprint'; end if;
  end loop;
  if n < 4 then raise exception '(A4d) too few examples'; end if;
end $$;
-- A5: grants: authenticated may only select and insert; anon has nothing
reset role; set test.uid = '';
do $$ begin
  if has_table_privilege('authenticated','label_approvals','UPDATE') or has_table_privilege('authenticated','label_approvals','DELETE') or has_table_privilege('authenticated','label_approvals','TRUNCATE') then raise exception '(A5) authenticated can change or truncate the ledger'; end if;
  if exists (select 1 from pg_roles where rolname = 'anon') and (has_table_privilege('anon','label_approvals','SELECT') or has_table_privilege('anon','label_approvals','INSERT')) then raise exception '(A5) anon has access to the ledger'; end if;
end $$;
-- A5b: append-only holds even for the database owner (the trigger itself, not only the missing grant): update, delete and truncate are refused
do $$ begin
  begin update label_approvals set note = 'changed'; raise exception '(A5b) an approval was updated';
  exception when insufficient_privilege then if sqlerrm not like '%append-only%' then raise; end if; end;
  begin delete from label_approvals; raise exception '(A5b) an approval was deleted';
  exception when insufficient_privilege then if sqlerrm not like '%append-only%' then raise; end if; end;
  begin truncate label_approvals; raise exception '(A5b) the ledger was truncated';
  exception when insufficient_privilege then if sqlerrm not like '%append-only%' then raise; end if; end;
end $$;
-- A6: audited: exactly one INSERT with the user and the note; the refused changes left no audit row
do $$ begin
  if (select count(*) from audit_log where table_name = 'label_approvals') <> 2 then raise exception '(A6) expected exactly two audit rows (two approvals, nothing else)'; end if;
  if (select count(*) from audit_log where table_name = 'label_approvals' and op = 'INSERT' and by_user = '00000000-0000-0000-0000-0000000000a1' and new_row->>'note' = 'seen at the shop') <> 1 then raise exception '(A6) the audit row lacks the user or the note'; end if;
end $$;
-- A7: the WORKER, a STRANGER and the owner of ANOTHER farm see nothing and write nothing (a refusal by RLS, not by a trigger)
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if (select count(*) from label_approvals) <> 0 then raise exception '(A7) a worker can read approvals'; end if;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values ('11111111-1111-1111-1111-111111111111','cccccccc-1111-0000-0000-0000000014a1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1'),'Worker',current_date,'fp'); raise exception '(A7) a worker recorded an approval';
  exception when insufficient_privilege then if sqlerrm not like '%row-level security%' then raise; end if; end;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000e9';
do $$ begin
  if (select count(*) from label_approvals) <> 0 then raise exception '(A7) a stranger can read approvals'; end if;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values ('11111111-1111-1111-1111-111111111111','cccccccc-1111-0000-0000-0000000014a1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1'),'Stranger',current_date,'fp'); raise exception '(A7) a stranger recorded an approval';
  exception when insufficient_privilege then if sqlerrm not like '%row-level security%' then raise; end if; end;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000f4';
do $$ begin
  if (select count(*) from label_approvals) <> 0 then raise exception '(A7) the owner of another farm can read this farm''s approvals'; end if;
  begin insert into label_approvals(farm_id,label_use_id,label_seq,approver_name,approved_on,fingerprint) values ('11111111-1111-1111-1111-111111111111','cccccccc-1111-0000-0000-0000000014a1',(select server_seq from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1'),'Other owner',current_date,'fp'); raise exception '(A7) the owner of another farm recorded an approval here';
  exception when insufficient_privilege then if sqlerrm not like '%row-level security%' then raise; end if; end;
end $$;
reset role; set test.uid = '';
\echo m14 approval tests passed

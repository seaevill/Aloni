-- «Έγκριση γεωπόνου» (0033): the OWNER records the agronomist's approval of a label use: approver's name, date, a note, an optional photo. The record is append-only and audited, and it is the ONLY way a signed-in
-- person makes a label «signed»; without it the label stays unknown = closed. Real `authenticated` owner (a1), worker (b2) and a stranger (e9); only the fixtures run as superuser.
-- Written BEFORE 0033 (red against 0032), then green. Runs after m13_m8.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; pq constant uuid := 'aaaaaaaa-0000-0000-0000-0000000014a1'; ca constant uuid := 'cccccccc-0000-0000-0000-0000000014a1';
begin
  insert into crops(id,farm_id,slug,name_el) values (ca,f,'m14a','Μ14α');
  insert into products(id,farm_id,name,type,unit) values (pq,f,'m14 product','fungicide','kg');
  -- L1: a COMPLETE unsigned label; L2: an INCOMPLETE one (no waiting period)
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min,phi_days,rei_hours,max_apps) values ('cccccccc-1111-0000-0000-0000000014a1',f,pq,ca,'m14','single','ml/str',0.025,7,24,3);
  insert into label_uses(id,farm_id,product_id,crop_id,target,dose_kind,dose_unit,dose_min) values ('cccccccc-1111-0000-0000-0000000014a2',f,pq,ca,'m14b','single','ml/str',0.025);
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('dddddddd-0000-0000-0000-0000000014f1',f,repeat('e',63) || '4','image/jpeg',100,100,1000);
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';

-- A1: before any approval the label is unsigned (unknown = closed)
do $$ begin
  if (select sign_off_by from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1') is not null then raise exception '(A1) the label was signed before any approval'; end if;
end $$;
-- A2 (stage 2, NOT here): refusing a direct write of the sign_off columns comes with the migration after the phone writes its approvals into this ledger; the old phone path still works until then.
-- A3: refused approvals: blank name, a date in the future, an incomplete label, a photo of another farm / a photo that does not exist
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a1','   ',current_date,'fp');
        raise exception '(A3) a blank approver name was accepted';
  exception when check_violation then null; end;
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a1','Agronomist',current_date + 3,'fp');
        raise exception '(A3) an approval dated in the future was accepted';
  exception when check_violation then null; end;
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint) values (f,'cccccccc-1111-0000-0000-0000000014a2','Agronomist',current_date,'fp');
        raise exception '(A3) an approval of an INCOMPLETE label was accepted';
  exception when check_violation then null; end;
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint,photo_id) values (f,'cccccccc-1111-0000-0000-0000000014a1','Agronomist',current_date,'fp',gen_random_uuid());
        raise exception '(A3) a photo that does not exist was accepted';
  exception when check_violation or foreign_key_violation then null; end;
  if exists (select 1 from label_approvals) then raise exception '(A3) a refused approval left a row'; end if;
end $$;
-- A4: a good approval: the ledger row is written AND the label becomes signed with the same name / date / fingerprint, in one step; the note and the photo are kept
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; l record;
begin
  insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint,note,photo_id) values (f,'cccccccc-1111-0000-0000-0000000014a1','Agronomist Test',current_date,'fp-a1','seen at the shop','dddddddd-0000-0000-0000-0000000014f1');
  select sign_off_by, sign_off_on, sign_off_fingerprint into l from label_uses where id = 'cccccccc-1111-0000-0000-0000000014a1';
  if l.sign_off_by is distinct from 'Agronomist Test' or l.sign_off_on is distinct from current_date or l.sign_off_fingerprint is distinct from 'fp-a1' then raise exception '(A4) the label did not become signed with the approval''s values: %', l; end if;
  if (select count(*) from label_approvals where note = 'seen at the shop' and photo_id is not null and created_by = '00000000-0000-0000-0000-0000000000a1') <> 1 then raise exception '(A4) the ledger row (note, photo, who) is missing'; end if;
end $$;
-- A5: append-only: an approval is never changed or deleted, not even by its owner
do $$ begin
  begin update label_approvals set note = 'changed'; raise exception '(A5) an approval was updated';
  exception when others then if sqlerrm not like '%append-only%' and sqlerrm not like '%cannot%' and sqlstate <> '0A000' and sqlstate <> '42501' then raise; end if; end;
  begin delete from label_approvals; raise exception '(A5) an approval was deleted';
  exception when others then if sqlerrm not like '%append-only%' and sqlerrm not like '%cannot%' and sqlstate <> '0A000' and sqlstate <> '42501' then raise; end if; end;
end $$;
reset role; set test.uid = '';
-- A6: audited: the insert is in the audit log with the user
do $$ begin
  if (select count(*) from audit_log where table_name = 'label_approvals' and op = 'INSERT' and by_user = '00000000-0000-0000-0000-0000000000a1') <> 1 then raise exception '(A6) the approval is not in the audit log'; end if;
end $$;
-- A7: the WORKER and a STRANGER see nothing and write nothing
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if (select count(*) from label_approvals) <> 0 then raise exception '(A7) a worker can read approvals'; end if;
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint) values ('11111111-1111-1111-1111-111111111111','cccccccc-1111-0000-0000-0000000014a1','Worker',current_date,'fp');
        raise exception '(A7) a worker recorded an approval';
  exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role; set test.uid = ''; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000e9';
do $$ begin
  if (select count(*) from label_approvals) <> 0 then raise exception '(A7) a stranger can read approvals'; end if;
  begin insert into label_approvals(farm_id,label_use_id,approver_name,approved_on,fingerprint) values ('11111111-1111-1111-1111-111111111111','cccccccc-1111-0000-0000-0000000014a1','Stranger',current_date,'fp');
        raise exception '(A7) a stranger recorded an approval';
  exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role; set test.uid = '';
\echo m14 approval tests passed

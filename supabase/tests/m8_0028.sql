-- Migration 0028: the photo store (Supabase Storage bucket `photos`): private, one folder per farm, owner of the farm full read/write, a WORKER only the photos of her OWN jobs, no overwrite and no
-- delete by anyone (append-only), JPEG only, size limit. Real `authenticated` roles. Written BEFORE 0028: the bucket and the policies do not exist.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; o constant uuid := '22222222-2222-2222-2222-222222222222'; w1 constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
begin
  if not exists (select 1 from storage.buckets where id = 'photos' and public = false and file_size_limit is not null and file_size_limit <= 10485760 and allowed_mime_types = array['image/jpeg']) then raise exception '(0028) the photos bucket is missing, public, unlimited or not JPEG-only'; end if;
  insert into media(id,farm_id,sha256,mime,width,height,bytes,job_id) values ('77777777-0000-0000-0000-000000000281',f,repeat('e',64),'image/jpeg',4,3,10,
    (select id from jobs where farm_id = f and assigned_to = '00000000-0000-0000-0000-0000000000b2' and deleted_at is null limit 1));     -- the photo of the test worker's own job
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('77777777-0000-0000-0000-000000000282',f,repeat('f',64),'image/jpeg',4,3,10);   -- a photo of no worker's job
  insert into media(id,farm_id,sha256,mime,width,height,bytes) values ('77777777-0000-0000-0000-000000000283',o,repeat('9',64),'image/jpeg',4,3,10);
  if (select job_id from media where id = '77777777-0000-0000-0000-000000000281') is null then raise exception '(0028) fixture: no job assigned to the test worker'; end if;
end $$;
-- the OWNER of farm F
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/77777777-0000-0000-0000-000000000282');
  begin insert into storage.objects(bucket_id, name) values ('photos', '22222222-2222-2222-2222-222222222222/77777777-0000-0000-0000-000000000283'); raise exception '(0028) the owner wrote into another farm''s folder';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id, name) values ('other', '11111111-1111-1111-1111-111111111111/x'); raise exception '(0028) the owner wrote into another bucket'; exception when insufficient_privilege or foreign_key_violation then null; end;
  if (select count(*) from storage.objects where bucket_id = 'photos') < 1 then raise exception '(0028) the owner cannot read the farm''s photos'; end if;
  update storage.objects set name = name || 'x' where bucket_id = 'photos';
  if exists (select 1 from storage.objects where name like '%x') then raise exception '(0028) a photo was overwritten (renamed)'; end if;
  delete from storage.objects where bucket_id = 'photos';
  if (select count(*) from storage.objects where bucket_id = 'photos') < 1 then raise exception '(0028) a photo was deleted'; end if;
end $$;
-- the WORKER (uid ...b2): only the photo of her own job
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/77777777-0000-0000-0000-000000000281');
  begin insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/77777777-0000-0000-0000-000000000282'); raise exception '(0028) a worker wrote a photo that is not of her job';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from storage.objects where name like '%282') then raise exception '(0028) a worker reads a photo that is not of her job'; end if;
  if (select count(*) from storage.objects where name like '%281') <> 1 then raise exception '(0028) a worker cannot read the photo of her own job'; end if;
end $$;
-- anon: nothing
reset role; set test.uid = '';
set role anon;
do $$ begin
  if (select count(*) from storage.objects) <> 0 then raise exception '(0028) anon reads photos'; end if;
  begin insert into storage.objects(bucket_id, name) values ('photos', '11111111-1111-1111-1111-111111111111/zzz'); raise exception '(0028) anon wrote a photo'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin raise notice 'm8-0028 tests passed'; end $$;

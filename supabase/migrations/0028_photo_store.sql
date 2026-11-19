-- 0028_photo_store.sql  (WRITTEN, NOT APPLIED ANYWHERE)  The photo store. A NEW file; builds on 0001–0027.
--  Supabase Storage bucket `photos`: PRIVATE, JPEG only, at most 5 MB per file, one folder per farm (`<farm id>/<photo id>`). The owner of the farm reads and writes its folder; a WORKER only the photos
--  of the jobs ASSIGNED to her (`media.job_id`); nobody overwrites or deletes a photo (no update/delete policy: append-only like the records). The SHA-256 of each photo is kept in `media` (checked as
--  64 hex characters, unique per farm) and the phone compares it after uploading; Storage itself does not hash the bytes.
-- The check at the very top stops with a clear message if 0027 or Storage is missing; it changes nothing.
do $$ begin
  if to_regprocedure('check_parcel_boundary()') is null then raise exception '0028 stopped: 0027 is not applied (nothing was changed)'; end if;
  if to_regclass('storage.objects') is null or to_regclass('storage.buckets') is null then raise exception '0028 stopped: Supabase Storage is not there (nothing was changed)'; end if;
end $$;

alter table media add column job_id uuid references jobs(id);
create index media_job on media (job_id) where job_id is not null;

-- media: the owner as before; a worker may read and add the photo rows of her own jobs (one permissive policy per command, the rules OR-ed, as in 0019)
drop policy media_select on media; drop policy media_insert on media;
create policy media_select on media for select to authenticated using (
  private.has_role(farm_id, array['owner'])
  or (job_id is not null and exists (select 1 from jobs j where j.id = media.job_id and j.farm_id = media.farm_id and j.assigned_to = (select auth.uid()) and j.deleted_at is null and private.has_role(j.farm_id, array['worker']))));
create policy media_insert on media for insert to authenticated with check (
  private.has_role(farm_id, array['owner'])
  or (job_id is not null and exists (select 1 from jobs j where j.id = media.job_id and j.farm_id = media.farm_id and j.assigned_to = (select auth.uid()) and j.deleted_at is null and private.has_role(j.farm_id, array['worker']))));

-- the bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('photos', 'photos', false, 5242880, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

-- who may touch the objects: the first folder is the farm, the file name is the photo id
create policy photos_select on storage.objects for select to authenticated using (
  bucket_id = 'photos' and (
    private.has_role(((storage.foldername(name))[1])::uuid, array['owner'])
    or exists (select 1 from public.media m join public.jobs j on j.id = m.job_id
               where m.id::text = (string_to_array(name, '/'))[2] and m.farm_id::text = (storage.foldername(name))[1]
                 and j.assigned_to = (select auth.uid()) and j.deleted_at is null and private.has_role(j.farm_id, array['worker']))));
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'photos' and (
    private.has_role(((storage.foldername(name))[1])::uuid, array['owner'])
    or exists (select 1 from public.media m join public.jobs j on j.id = m.job_id
               where m.id::text = (string_to_array(name, '/'))[2] and m.farm_id::text = (storage.foldername(name))[1]
                 and j.assigned_to = (select auth.uid()) and j.deleted_at is null and private.has_role(j.farm_id, array['worker']))));
-- no update and no delete policy on purpose: a stored photo is never overwritten or removed (an RLS-enabled table with no policy for a command refuses it)

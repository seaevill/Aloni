-- 0036_harvest_destination.sql  (WRITTEN, NOT APPLIED ANYWHERE)  «Πού πήγε η συγκομιδή»: where a harvest went. A NEW file (0001–0034 are applied and frozen; 0035 is separate).
--  A harvest record gets `destination`: 'store' (to the shop / stock) or 'direct' (straight to a buyer). EMPTY = UNKNOWN: records made before this file and by phones that do not send it stay empty
--  and are shown as «άγνωστο»; the database never turns an empty value into 'store' (a default would be an invented fact). job_harvest is append-only since 0011: a destination is never changed afterwards
--  (a correction is a new record). Buyer name/phone are personal data and are NOT here (a later, owner-only table). Nothing here changes who may read or write harvests.
do $$ begin
  if to_regclass('public.job_harvest') is null then raise exception '0036 stopped: job_harvest is missing (nothing was changed)'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_harvest' and column_name = 'destination') then raise exception '0036 stopped: job_harvest.destination already exists (nothing was changed)'; end if;
end $$;

alter table job_harvest add column destination text;
alter table job_harvest add constraint job_harvest_destination_check check (destination is null or destination in ('store', 'direct'));

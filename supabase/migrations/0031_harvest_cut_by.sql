-- 0031_harvest_cut_by.sql  (WRITTEN, NOT APPLIED ANYWHERE)  «Ποιος έκοψε»: who cut the crop. A NEW file (0022–0029 are frozen); builds on 0030.
--  A harvest record gets `cut_by`, a worker of the roster. Every harvest a SIGNED-IN person records must name one live worker of the same farm (the owner picks, the worker's phone sends her own roster
--  entry). Records made before this migration keep it empty (shown as «—»); a record is never changed afterwards (job_harvest is append-only since 0011). Nothing here is a table.
do $$ begin
  if to_regclass('public.job_harvest') is null then raise exception '0031 stopped: job_harvest is missing (nothing was changed)'; end if;
end $$;

alter table job_harvest add column cut_by uuid references workers(id);
create index job_harvest_cut_by on job_harvest (farm_id, cut_by) where cut_by is not null;

create function check_harvest_cut_by() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if auth.uid() is null then return new; end if;          -- fixtures / maintenance by the database owner only; every signed-in writer is checked
  if new.cut_by is null then raise exception 'a harvest needs the worker who cut it (cut_by)' using errcode = 'check_violation'; end if;
  if not exists (select 1 from workers w where w.id = new.cut_by and w.farm_id = new.farm_id and w.deleted_at is null) then
    raise exception 'the worker who cut must be a live worker of this farm' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger job_harvest_cut_by_check before insert on job_harvest for each row execute function check_harvest_cut_by();
revoke execute on function check_harvest_cut_by() from public, anon, authenticated;

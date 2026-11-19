-- 0025_start_bbch_prescription.sql  (WRITTEN, NOT APPLIED ANYWHERE)  Reg. (EU) 2023/564 fields the spray record lacked. A NEW file; builds on 0001–0024.
--  started_at       the START of the spraying (the Annex: «date and, where relevant, start time»); never later than the end (sprayed_at). The phone REQUIRES it for a new spraying; the server cannot
--                   (a worker's «Έγινε» is completed by the RPC with the end time only, and old rows have none): a missing start is shown as «fill in» in the audit export, never invented;
--  bbch             the BBCH growth stage as the two-digit code 00–99, optional («where relevant»);
--  prescription_no  the prescription number (Greek professional use), optional, never blank when present.
-- The check at the very top stops with a clear message if 0024 is not there; it changes nothing.
do $$ begin
  if to_regprocedure('write_edit_history()') is null then raise exception '0025 stopped: 0024 is not applied (nothing was changed)'; end if;
end $$;

alter table job_spray add column started_at timestamptz, add column bbch text, add column prescription_no text;
alter table job_spray add constraint job_spray_start_before_end check (started_at is null or started_at <= sprayed_at);
alter table job_spray add constraint job_spray_bbch_code check (bbch is null or bbch ~ '^[0-9]{2}$');
alter table job_spray add constraint job_spray_prescription_not_blank check (prescription_no is null or length(btrim(prescription_no)) > 0);

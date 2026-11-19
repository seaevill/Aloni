-- Migration 0024: parcels and plantings keep an append-only EDIT HISTORY (column `edits`) WRITTEN BY THE SERVER from `edit_reason` (team review m5-0024 finding 4; the details of the
-- attacks are in m7_review.sql). Here: the basic flow as the real authenticated owner. Runs AFTER m5_0023.sql.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare p constant uuid := '33333333-3333-3333-3333-333333333333'; n0 integer := (select jsonb_array_length(edits) from parcels where id = '33333333-3333-3333-3333-333333333333');
begin
  update parcels set area_str = 0.7, edit_reason = 'area measured again' where id = p;
  if (select jsonb_array_length(edits) from parcels where id = p) <> n0 + 1 then raise exception '(7) the edit entry was not stored'; end if;
  begin update parcels set area_str = 0.8 where id = p; raise exception '(7) an edit without a reason was accepted'; exception when check_violation then null; end;
  update parcels set area_str = 0.75, edit_reason = 'typo' where id = p;
  if (select jsonb_array_length(edits) from parcels where id = p) <> n0 + 2 then raise exception '(7) the second entry was not appended'; end if;
  -- the history can never be shortened or rewritten from outside
  update parcels set edits = '[]'::jsonb where id = p;
  if (select jsonb_array_length(edits) from parcels where id = p) <> n0 + 2 then raise exception '(7) the edit history was emptied'; end if;
  -- archiving (deleted_at) and other updates that change no field stay possible without a reason
  update parcels set deleted_at = now() where id = p; update parcels set deleted_at = null where id = p;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm5-0024 tests passed'; end $$;

-- Migration 0024: parcels and plantings keep an append-only EDIT HISTORY (column `edits`): every change of a field is recorded with the previous values, a date and a REASON;
-- the history can never be shortened, rewritten or grown by more than one entry per update. Runs AFTER m5_0023.sql. Written BEFORE 0024: against 0001–0023 the column does not exist.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare p constant uuid := '33333333-3333-3333-3333-333333333333'; e1 jsonb := '[{"at":"2026-11-19T10:00:00Z","reason":"area measured again","before":{"area_str":"0.625"}}]'::jsonb;
        e2 jsonb;
begin
  -- one entry with a reason: accepted
  update parcels set area_str = 0.7, edits = e1, updated_at = now() where id = p;
  if (select jsonb_array_length(edits) from parcels where id = p) <> 1 then raise exception '(7) the edit entry was not stored'; end if;
  e2 := e1 || '[{"at":"2026-11-19T11:00:00Z","reason":"typo","before":{"area_str":"0.7"}}]'::jsonb;
  -- no reason: refused
  begin update parcels set edits = e1 || '[{"at":"2026-11-19T11:00:00Z","reason":" ","before":{}}]'::jsonb where id = p; raise exception '(7) an edit without a reason was accepted';
  exception when check_violation then null; end;
  -- two entries at once: refused
  begin update parcels set edits = e2 || '[{"at":"2026-11-19T12:00:00Z","reason":"x","before":{}}]'::jsonb where id = p; raise exception '(7) two entries at once were accepted';
  exception when check_violation then null; end;
  -- the history shortened or emptied: refused
  begin update parcels set edits = '[]'::jsonb where id = p; raise exception '(7) the edit history was emptied';
  exception when check_violation then null; end;
  -- an old entry rewritten: refused
  begin update parcels set edits = '[{"at":"2026-11-19T10:00:00Z","reason":"changed afterwards","before":{"area_str":"9"}},{"at":"2026-11-19T11:00:00Z","reason":"typo","before":{}}]'::jsonb where id = p; raise exception '(7) an old entry was rewritten';
  exception when check_violation then null; end;
  -- the second honest entry: accepted
  update parcels set edits = e2 where id = p;
  -- archiving (deleted_at) and other updates that do not touch the history stay possible
  update parcels set deleted_at = now() where id = p; update parcels set deleted_at = null where id = p;
end $$;
-- the same for plantings
do $$
declare pl constant uuid := 'dddddddd-0000-0000-0000-000000000951';
begin
  update plantings set area_str = 0.3, edits = '[{"at":"2026-11-19T10:00:00Z","reason":"remeasured","before":{"area_str":"0.25"}}]'::jsonb where id = pl;
  begin update plantings set edits = '[]'::jsonb where id = pl; raise exception '(7) planting history emptied'; exception when check_violation then null; end;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm5-0024 tests passed'; end $$;

-- Migration 0041: the season target per crop. Owner only, insert-only (a change is a new row); a worker and a stranger get nothing. Real `authenticated` roles. Written BEFORE 0041.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regclass('public.crop_targets') is null then raise exception '(0041) crop_targets does not exist'; end if;
  if sync_table('crop_targets') is null then raise exception '(0041) sync_table does not know crop_targets'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; crop uuid; other uuid;
begin
  select id into crop from crops where farm_id = f limit 1;
  insert into crop_targets(id,farm_id,crop_id,season_start,target_crates) values ('77777777-0000-0000-0000-0000000021a1',f,crop,'2026-09-01',500);
  insert into crop_targets(id,farm_id,crop_id,season_start,target_crates,note) values ('77777777-0000-0000-0000-0000000021a2',f,crop,'2026-09-01',650,'raised');            -- an amendment is a NEW row
  if (select count(*) from crop_targets where crop_id = crop and season_start = '2026-09-01') <> 2 then raise exception '(0041) the history of a target was lost'; end if;
  begin insert into crop_targets(farm_id,crop_id,season_start,target_crates) values (f,crop,'2026-09-01',0); raise exception '(0041) a target of 0 was accepted'; exception when check_violation then null; end;
  begin update crop_targets set target_crates = 1 where id = '77777777-0000-0000-0000-0000000021a1'; raise exception '(0041) a target row was changed'; exception when insufficient_privilege then null; end;
  begin delete from crop_targets where id = '77777777-0000-0000-0000-0000000021a1'; raise exception '(0041) a target row was deleted'; exception when insufficient_privilege then null; end;
  select id into other from crops where farm_id = '22222222-2222-2222-2222-222222222222' limit 1;
  if other is not null then begin insert into crop_targets(farm_id,crop_id,season_start,target_crates) values (f,other,'2026-09-01',10); raise exception '(0041) a target for ANOTHER farm''s crop was accepted'; exception when foreign_key_violation then null; end; end if;
end $$;
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' = 'crop_targets'; if n < 2 then raise exception '(0041) the owner''s pull lacks the targets (%)', n; end if;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';       -- a worker of the farm
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; n int;
begin
  select count(*) into n from crop_targets; if n <> 0 then raise exception '(0041) a worker reads the targets'; end if;
  select count(*) into n from jsonb_array_elements(pull(f, null, 1000)->'rows') r where r->>'table' = 'crop_targets'; if n <> 0 then raise exception '(0041) a worker pulled the targets'; end if;
  begin insert into crop_targets(farm_id,crop_id,season_start,target_crates) select f,id,'2026-09-01',5 from crops where farm_id = f limit 1; raise exception '(0041) a worker wrote a target'; exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000d5';       -- the owner of ANOTHER farm
do $$ declare n int; begin select count(*) into n from crop_targets; if n <> 0 then raise exception '(0041) a stranger reads the targets'; end if; end $$;
reset role; set test.uid = '';
do $$ declare g text; begin g := bump_sync_generation(); if g is null then raise exception '(0041) bump_sync_generation returned nothing'; end if; end $$;
do $$ begin raise notice 'm21-crop-targets tests passed'; end $$;

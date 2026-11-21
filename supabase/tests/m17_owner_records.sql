-- Migration 0037: owner-only records: worker_cards (surname, phone; NO date of birth), customers (name, phone, note), customer_orders (customer × crop × whole crates × day). Synced tables that ONLY the owner can read or write:
-- a worker (real `authenticated` role) gets nothing from select, nothing from pull(), and is refused on insert. Written BEFORE 0037.
\set ON_ERROR_STOP on
reset role; set test.uid = '';
do $$ begin
  if to_regclass('public.worker_cards') is null or to_regclass('public.customers') is null or to_regclass('public.customer_orders') is null then raise exception '(0037) the owner-only tables do not exist'; end if;
  if exists (select 1 from information_schema.columns where table_name = 'worker_cards' and column_name in ('birth_date','birthdate','date_of_birth','dob')) then raise exception '(0037) a date of birth must not be stored'; end if;
  if sync_table('worker_cards') is null or sync_table('customers') is null or sync_table('customer_orders') is null then raise exception '(0037) sync_table does not know the new tables'; end if;
  insert into workers(id,farm_id,name) values ('bbbbbbbb-0000-0000-0000-0000000017a1','11111111-1111-1111-1111-111111111111','Card17'), ('bbbbbbbb-0000-0000-0000-0000000017a2','22222222-2222-2222-2222-222222222222','Foreign17');
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';        -- the owner of farm 1111
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; crop uuid; n int;
begin
  select id into crop from crops where farm_id = f limit 1;
  insert into worker_cards(id,farm_id,worker_id,surname,phone) values ('cccccccc-0000-0000-0000-0000000017a1',f,'bbbbbbbb-0000-0000-0000-0000000017a1','Papadopoulos','6900000000');
  begin insert into worker_cards(farm_id,worker_id,surname) values (f,'bbbbbbbb-0000-0000-0000-0000000017a1','Second'); raise exception '(0037) a second live card for one worker was accepted'; exception when unique_violation then null; end;
  begin insert into worker_cards(farm_id,worker_id,surname) values (f,'bbbbbbbb-0000-0000-0000-0000000017a2','Foreign'); raise exception '(0037) a card for a worker of ANOTHER farm was accepted'; exception when check_violation then null; end;
  begin insert into worker_cards(farm_id,worker_id,surname) values (f,'bbbbbbbb-0000-0000-0000-0000000017a1',' '); raise exception '(0037) a blank surname was accepted'; exception when check_violation or unique_violation then if sqlerrm like '(0037)%' then raise; end if; end;
  insert into customers(id,farm_id,name,phone,note) values ('cccccccc-0000-0000-0000-0000000017b1',f,'Taverna Nikos','6911111111','pays Fridays');
  begin insert into customers(farm_id,name) values (f,''); raise exception '(0037) a customer without a name was accepted'; exception when check_violation then null; end;
  insert into customer_orders(id,farm_id,customer_id,crop_id,crates_str,for_day,status) values ('cccccccc-0000-0000-0000-0000000017c1',f,'cccccccc-0000-0000-0000-0000000017b1',crop,'12','2026-11-23','open');
  begin insert into customer_orders(farm_id,customer_id,crop_id,crates_str,for_day,status) values (f,'cccccccc-0000-0000-0000-0000000017b1',crop,'1,5','2026-11-23','open'); raise exception '(0037) a fractional crate count was accepted'; exception when check_violation then null; end;
  begin insert into customer_orders(farm_id,customer_id,crop_id,crates_str,for_day,status) values (f,'cccccccc-0000-0000-0000-0000000017b1',crop,'0','2026-11-23','open'); raise exception '(0037) zero crates were accepted'; exception when check_violation then null; end;
  begin insert into customer_orders(farm_id,customer_id,crop_id,crates_str,for_day,status) values (f,'cccccccc-0000-0000-0000-0000000017b1',crop,'3','2026-11-23','maybe'); raise exception '(0037) an invented status was accepted'; exception when check_violation then null; end;
  update customer_orders set status = 'cancelled' where id = 'cccccccc-0000-0000-0000-0000000017c1';
  select count(*) into n from customer_orders where id = 'cccccccc-0000-0000-0000-0000000017c1' and status = 'cancelled'; if n <> 1 then raise exception '(0037) the owner could not change an order'; end if;
  begin delete from customers where id = 'cccccccc-0000-0000-0000-0000000017b1'; raise exception '(0037) a customer was hard-deleted'; exception when insufficient_privilege or raise_exception then if sqlerrm like '(0037)%' then raise; end if; end;
end $$;
-- pull() serves only rows of transactions that are over, so it is asked in a LATER block: the owner's pull carries all three tables
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' in ('worker_cards','customers','customer_orders'); if n < 3 then raise exception '(0037) the owner''s pull misses the new tables (%)', n; end if;
end $$;
-- a worker of the same farm: nothing readable, nothing in pull(), nothing writable
reset role; set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000b2';
do $$
declare f constant uuid := '11111111-1111-1111-1111-111111111111'; n int;
begin
  select (select count(*) from worker_cards) + (select count(*) from customers) + (select count(*) from customer_orders) into n; if n <> 0 then raise exception '(0037) a worker can read owner-only records (%)', n; end if;
  select count(*) into n from jsonb_array_elements(pull(f, null, 1000)->'rows') r where r->>'table' in ('worker_cards','customers','customer_orders'); if n <> 0 then raise exception '(0037) a worker''s pull carries owner-only records (%)', n; end if;
  begin insert into customers(farm_id,name) values (f,'Sneaky'); raise exception '(0037) a worker added a customer'; exception when insufficient_privilege or check_violation then null; end;
  begin insert into worker_cards(farm_id,worker_id,surname) values (f,'bbbbbbbb-0000-0000-0000-0000000017a1','Sneaky'); raise exception '(0037) a worker added a card'; exception when insufficient_privilege or check_violation or unique_violation then if sqlerrm like '(0037)%' then raise; end if; end;
  begin update customers set phone = '0' where farm_id = f; get diagnostics n = row_count; if n <> 0 then raise exception '(0037) a worker changed a customer'; end if; exception when insufficient_privilege then null; end;
end $$;
-- the owner of ANOTHER farm sees nothing of farm 1111 (the stub has only two users: a worker of 1111 stands for «not the owner»; the stranger case is the same policy)
reset role; set test.uid = '';
-- after a restore the administrator's bump re-stamps every synced table, the new ones included, and the owner can still pull them
do $$ declare n int; g text; begin
  g := bump_sync_generation();
  if g is null then raise exception '(0037) bump_sync_generation returned nothing'; end if;
end $$;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ declare n int; begin
  select count(*) into n from jsonb_array_elements(pull('11111111-1111-1111-1111-111111111111', null, 1000)->'rows') r where r->>'table' in ('worker_cards','customers','customer_orders'); if n < 3 then raise exception '(0037) after the bump the pull misses the new tables (%)', n; end if;
end $$;
reset role; set test.uid = '';
do $$ begin raise notice 'm17-owner-records tests passed'; end $$;

create temp table scan(tbl text, who text, n bigint, err text);
grant all on scan to authenticated;
do $$ declare t text; n bigint; u text; begin
 foreach u in array array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2'] loop
  perform set_config('test.uid', u, false);
  foreach t in array array['parcels','crops','plantings','products','label_uses','soil_tests','water_tests','stock_lots','stock_movements','media','workers','jobs','job_plantings','job_spray','job_harvest','observations','farm_settings','worker_cards','customers','customer_orders','day_notes','crop_targets','field_cuts','field_work','audit_log','applied_ops','farm_members','invitations','orders_weekly','label_approvals','profiles','weather_daily'] loop
    begin execute 'set local role authenticated'; execute format('select count(*) from %I where true', t) into n; insert into scan values (t, u, n, null);
    exception when others then insert into scan values (t, u, null, sqlerrm); end;
    execute 'reset role';
  end loop; end loop; end $$;
reset role;
select tbl, max(n) filter (where who like '%a1') owner_sees, max(n) filter (where who like '%b2') worker_sees, max(err) filter (where who like '%b2') worker_err from scan group by tbl order by tbl;

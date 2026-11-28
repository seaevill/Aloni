begin;
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
create temp table pr as select r->'row' as row from jsonb_array_elements((pull('11111111-1111-1111-1111-111111111111', null, 1000))->'rows') r where r->>'table'='parcels' and r->'row'->>'deleted_at' is null order by (r->'row'->'geom') = 'null'::jsonb limit 1;
select 'geom in pulled row:', left((row->'geom')::text, 80), 'boundary:', left((row->'boundary')::text,60) from pr;
-- the phone renames the pulled parcel: the WHOLE pulled row minus the phone's SERVER_ONLY list, new name, a reason
select 'S4 rename pulled parcel', apply_ops(jsonb_build_array(jsonb_build_object('op_id', gen_random_uuid(), 'farm_id', row->>'farm_id', 'table', 'parcels', 'row_id', row->>'id', 'op', 'update',
  'row', (row - 'server_seq' - 'sync_xid' - 'hash' - 'prev_hash' - 'created_by' - 'received_at' - 'assigned_to' - 'done_by') || jsonb_build_object('name', 'Renamed', 'edit_reason', 'typo')))) from pr;
rollback;

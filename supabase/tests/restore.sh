#!/bin/bash
# RESTORE test (review finding b): pg_dump of a database that holds the sync data → restore into a NEW database → no phone loses a row. The source is the database the
# other tests just filled (run.sh). A new Supabase project has its own transaction counter; here it is SIMULATED by moving the restored rows' transaction numbers beyond
# this server's counter (a restore inside one server cannot produce that by itself).
# Expected: pull REFUSES (loudly) until an administrator runs bump_sync_generation(); afterwards every row is served exactly once, and a phone's OLD cursor starts again.
set -euo pipefail
src=${1:?usage: restore.sh <source database>}; dst=aloni_restored; F=11111111-1111-1111-1111-111111111111
Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
TABLES="parcels crops plantings products label_uses soil_tests water_tests stock_lots stock_movements media workers jobs job_plantings job_spray job_harvest observations farm_settings"
count_sql=$(for t in $TABLES; do printf "select count(*) c from %s where farm_id = '%s' union all " "$t" "$F"; done; echo "select 0")
owner() { # $1 database, $2 sql returning one value, run as the signed-in OWNER (stub auth)
  psql -X -q -At -v ON_ERROR_STOP=1 -d "$1" -c "set role app_user" -c "select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false)" -c "$2" | tail -1; }
old_cursor=$(owner "$src" "select pull('$F', null, 1000)->'cursor'")
n_src=$(Q -d "$src" -c "select sum(c) from ($count_sql) x")
Q -d "$src" -c "select 1" >/dev/null
pg_dump --no-owner --no-privileges "$src" > /tmp/aloni_restore_dump.sql
# A newer pg_dump (CI) writes settings an older server does not know (transaction_timeout, PG 17): drop them so the dump loads on any server version.
sed -i "/^SET transaction_timeout/d" /tmp/aloni_restore_dump.sql
Q -d postgres -c "drop database if exists $dst" -c "create database $dst" >/dev/null
psql -X -q -v ON_ERROR_STOP=1 -d "$dst" -f /tmp/aloni_restore_dump.sql >/dev/null 2>/tmp/aloni_restore_err.txt || { echo "FAIL: the restore itself failed"; head -5 /tmp/aloni_restore_err.txt; exit 1; }
psql -X -q -d "$dst" -c "grant all on all tables in schema public to app_user; grant execute on all functions in schema public to app_user; revoke execute on function bump_sync_generation() from app_user; grant usage on schema public, auth to app_user" >/dev/null 2>&1 || true
[ "$(Q -d "$dst" -c "select sum(c) from ($count_sql) x")" = "$n_src" ] || { echo "FAIL: the restored database does not hold the same number of rows"; exit 1; }
# simulate the new server: its transaction counter is behind the dump's
for t in $TABLES; do Q -d "$dst" -c "set session_replication_role = replica; update $t set sync_xid = ((select pg_snapshot_xmax(pg_current_snapshot())::text::bigint) + 1000000)::text::xid8" >/dev/null; done
out=$(owner "$dst" "select pull('$F', '$old_cursor'::jsonb, 1000)" 2>&1 || true)
echo "$out" | grep -q "bump_sync_generation" || { echo "FAIL: pull did not refuse loudly on a restored dump (it would have skipped rows silently): $out" | cut -c1-300; exit 1; }
# a signed-in user cannot repair it; the administrator does
if psql -X -q -At -d "$dst" -c "set role app_user" -c "select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false)" -c "select bump_sync_generation()" >/dev/null 2>&1; then echo "FAIL: an ordinary user could run bump_sync_generation()"; exit 1; fi
Q -d "$dst" -c "select bump_sync_generation()" >/dev/null
# the phone's OLD cursor: reset, then ALL rows exactly once, paged
cur="$old_cursor"; total=0; first=1; ids=/tmp/aloni_restore_ids.txt; : > "$ids"
while :; do
  page=$(owner "$dst" "select pull('$F', '$cur'::jsonb, 50)")
  if [ "$first" = 1 ]; then [ "$(echo "$page" | jq -r .reset)" = true ] || { echo "FAIL: the old cursor was not reset after the new generation"; exit 1; }; first=0; fi
  echo "$page" | jq -r '.rows[] | .table + ":" + (.row.id // .row.key)' >> "$ids"
  total=$((total + $(echo "$page" | jq '.rows | length'))); cur=$(echo "$page" | jq -c .cursor)
  [ "$(echo "$page" | jq -r .more)" = true ] || break
done
[ "$total" = "$n_src" ] || { echo "FAIL: pulled $total rows after the restore, the source had $n_src"; exit 1; }
[ "$(sort "$ids" | uniq | wc -l)" = "$n_src" ] || { echo "FAIL: a row was served twice or not at all"; exit 1; }
# new work after the restore reaches a phone that already synced
Q -d "$dst" -c "insert into parcels(id,farm_id,name,area_str) values (gen_random_uuid(),'$F','After the restore',1)" >/dev/null
[ "$(owner "$dst" "select jsonb_array_length(pull('$F', '$cur'::jsonb, 50)->'rows')")" = 1 ] || { echo "FAIL: a row written after the restore did not reach the phone"; exit 1; }
echo "restore OK ($n_src rows)"

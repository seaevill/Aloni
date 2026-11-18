#!/bin/bash
# UPGRADE test: a database that already holds data under migrations 0001–0009 gets 0010+ applied on top. Nothing may be lost, rejected or silently changed.
# Connection from the PG* environment variables. Uses the plain PostGIS layout.
set -euo pipefail
cd "$(dirname "$0")/../.."
base_db=${PGDATABASE:-postgres}; db=aloni_upgrade
psql -X -q -d "$base_db" -c "drop database if exists $db" -c "create database $db" >/dev/null
export PGDATABASE=$db
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/auth_stub.sql >/dev/null
for f in supabase/migrations/000[1-9]_*.sql; do psql -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/seed_before_0010.sql
count() { psql -X -At -c "select (select count(*) from parcels) || ',' || (select count(*) from plantings) || ',' || (select count(*) from products) || ',' || (select count(*) from label_uses) || ',' || (select count(*) from stock_lots) || ',' || (select count(*) from stock_movements) || ',' || (select count(*) from jobs) || ',' || (select count(*) from job_plantings) || ',' || (select count(*) from job_spray) || ',' || (select count(*) from job_harvest) || ',' || (select count(*) from observations) || ',' || (select count(*) from media) || ',' || (select count(*) from farm_settings) || ',' || (select count(*) from workers) || ',' || (select count(*) from crops)"; }
before=$(count); fingerprint() { psql -X -At -c "select md5(string_agg(to_jsonb(s)::text, '|' order by id)) from (select id, farm_id, job_id, product_id, sprayed_at, dose_str, dose_unit, label_state, phi_days, rei_hours, phi_until, rei_until, amends_id, phi_source from job_spray) s"; }
fp_before=$(fingerprint)
for f in supabase/migrations/001[0-9]_*.sql; do echo "== upgrading with $f"; psql -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
after=$(count); [ "$before" = "$after" ] || { echo "FAIL: row counts changed by the upgrade: $before -> $after"; exit 1; }
[ "$fp_before" = "$(fingerprint)" ] || { echo "FAIL: the spray records changed by the upgrade"; exit 1; }
psql -X -At -c "select area_str from parcels" | grep -qx '0.625' || { echo "FAIL: the parcel area changed"; exit 1; }
# the old rows are still readable and the new machinery works over them
out=$(psql -X -At -f supabase/tests/verify_applied.sql); echo "$out"; echo "$out" | grep -q '^OK:' || { echo "FAIL: verify_applied.sql after the upgrade"; exit 1; }
psql -X -q -v ON_ERROR_STOP=1 -c "select apply_ops('[]'::jsonb)" >/dev/null
echo "upgrade OK ($after)"

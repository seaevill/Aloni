#!/bin/bash
# Applies every migration to a THROWAWAY database and runs all SQL tests. Usage: run.sh plain|supabase   (connection from the PG* environment variables)
#   plain    : extensions in `public` (a bare PostGIS image).
#   supabase : extensions in the `extensions` schema and search_path "$user", public, extensions, as on a Supabase project (C1 of the 2026-11-18 review).
# The auth schema here is a STUB (supabase/tests/auth_stub.sql): it is not Supabase Auth. JWT verification, the `authenticated` / `anon` roles' real grants
# and Supabase's own default privileges are NOT proven by this script.
set -euo pipefail
layout=${1:-plain}; db="aloni_test_$layout"
cd "$(dirname "$0")/../.."
base_db=${PGDATABASE:-postgres}
psql -X -q -d "$base_db" -c "drop database if exists $db" -c "create database $db" >/dev/null
export PGDATABASE=$db
if [ "$layout" = supabase ]; then
  psql -X -q -c "create schema extensions" -c "create extension pgcrypto with schema extensions" -c "create extension postgis with schema extensions" -c "alter database $db set search_path = \"\$user\", public, extensions" >/dev/null
fi
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/auth_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do echo "== $f"; psql -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
psql -X -q -c "select 1" >/dev/null
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql || { echo "FAILED: smoke.sql"; exit 1; }
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/review.sql || { echo "FAILED: supabase/tests/review.sql"; exit 1; }; echo "SQL review tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/agri.sql || { echo "FAILED: supabase/tests/agri.sql"; exit 1; }; echo "SQL agricultural record tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/phone.sql || { echo "FAILED: supabase/tests/phone.sql"; exit 1; }; echo "SQL phone-records tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/worker.sql || { echo "FAILED: supabase/tests/worker.sql"; exit 1; }; echo "SQL worker-completion tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/worker_retry.sql || { echo "FAILED: supabase/tests/worker_retry.sql"; exit 1; }; echo "SQL worker-retry tests OK"
bash supabase/tests/worker_concurrency.sh
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/final.sql || { echo "FAILED: supabase/tests/final.sql"; exit 1; }; echo "SQL final-review tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/pull_generation.sql || { echo "FAILED: supabase/tests/pull_generation.sql"; exit 1; }; echo "SQL pull-generation tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/m2_0015.sql || { echo "FAILED: supabase/tests/m2_0015.sql"; exit 1; }; echo "SQL m2-0015 tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/invite.sql || { echo "FAILED: supabase/tests/invite.sql"; exit 1; }; echo "SQL invitation tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/m3_0019.sql || { echo "FAILED: supabase/tests/m3_0019.sql"; exit 1; }; echo "SQL m3-0019 tests OK"
bash supabase/tests/m3_verify.sh || { echo "FAILED: m3_verify.sh"; exit 1; }
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/m4_0020.sql || { echo "FAILED: supabase/tests/m4_0020.sql"; exit 1; }; echo "SQL m4-0020 tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/m4_0021.sql || { echo "FAILED: supabase/tests/m4_0021.sql"; exit 1; }; echo "SQL m4-0021 tests OK"
bash supabase/tests/contract.sh
out=$(psql -X -At -v ON_ERROR_STOP=1 -f supabase/tests/verify_applied.sql) || { echo "FAILED: verify_applied.sql"; exit 1; }; echo "$out"; echo "$out" | grep -q "^OK:" || { echo "verify_applied.sql found problems"; exit 1; }
bash supabase/tests/concurrency.sh
bash supabase/tests/restore.sh "$db"

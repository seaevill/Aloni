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
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/review.sql && echo "SQL review tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/agri.sql && echo "SQL agricultural record tests OK"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/tests/phone.sql && echo "SQL phone-records tests OK"
bash supabase/tests/contract.sh
out=$(psql -X -At -f supabase/tests/verify_applied.sql); echo "$out"; echo "$out" | grep -q "^OK:" || { echo "verify_applied.sql found problems"; exit 1; }
bash supabase/tests/concurrency.sh

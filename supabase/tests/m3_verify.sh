#!/bin/bash
# Migration 0019 (finding 8): after a restart or restore the verification asks for bump_sync_generation(); after the bump it is quiet. Runs on the test database (PGDATABASE).
set -euo pipefail
cd "$(dirname "$0")/../.."
q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
q -c "update sync_meta set bumped_at = '2000-01-01'" >/dev/null
out=$(q -f supabase/tests/verify_applied.sql 2>&1 || true)
echo "$out" | grep -q "restart" || { echo "FAIL: verify_applied.sql did not ask for bump_sync_generation() although the server started after the last bump"; echo "$out" | head -5; exit 1; }
q -c "select bump_sync_generation()" >/dev/null
out=$(q -f supabase/tests/verify_applied.sql 2>&1 || true)
echo "$out" | grep -q "restart" && { echo "FAIL: verify_applied.sql still asks for the bump after it was done"; exit 1; }
echo "restart check OK"

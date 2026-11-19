#!/bin/bash
# The table gate (CODING_STANDARDS «Git and SQL»): every table in `public` has RLS ON, at least one policy, and every policy is `TO authenticated` (never public). verify_applied.sql is the check;
# THIS script proves the check goes RED for each way to break the rule, and green again afterwards. Runs on the test database (PGDATABASE), changes nothing in the end.
set -euo pipefail
cd "$(dirname "$0")/../.."
q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
verify() { q -f supabase/tests/verify_applied.sql 2>&1 || true; }
clean() { q -c "drop table if exists public.zz_rls_gate" >/dev/null; }
trap clean EXIT; clean
verify | grep -q "zz_rls_gate" && { echo "FAIL: the gate is red before the test table exists"; exit 1; }
red() { verify | grep -q "$1" || { echo "FAIL: the gate did not catch: $2"; exit 1; }; }
q -c "create table public.zz_rls_gate (id int)" >/dev/null
red "RLS is OFF on zz_rls_gate" "a table with RLS off"
q -c "alter table public.zz_rls_gate enable row level security" >/dev/null
red "RLS on but no policy: zz_rls_gate" "a table with RLS on and no policy"
q -c "create policy p_public on public.zz_rls_gate for select using (true)" >/dev/null
red "policy not limited to authenticated: zz_rls_gate.p_public" "a policy TO public"
q -c "drop policy p_public on public.zz_rls_gate; create policy p_ok on public.zz_rls_gate for select to authenticated using (false)" >/dev/null
verify | grep -q "zz_rls_gate" && { echo "FAIL: a table with RLS and an authenticated policy is still flagged"; exit 1; }
echo "RLS gate OK (red for: RLS off, no policy, TO public policy; green with RLS + TO authenticated policy)"

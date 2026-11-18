#!/bin/bash
# The EXACT command the manual workflow runs (`supabase db push`), with the PINNED CLI version, against a THROWAWAY database: dry-run lists all migrations and changes
# nothing, the real push applies them and records them in supabase_migrations.schema_migrations, a second push says «up to date», verify_applied.sql passes.
# What this does NOT prove: `supabase link` / the Management API / the pooler connection to the real project (they need a real project and its secrets).
set -euo pipefail
cd "$(dirname "$0")/../.."
ver=$(grep -E '^\s+SUPABASE_CLI_VERSION:' .github/workflows/supabase-migrate.yml | sed -E 's/.*SUPABASE_CLI_VERSION:\s*([0-9.]+).*/\1/')
[[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "FAIL: the workflow does not pin an exact CLI version (found '$ver')"; exit 1; }
! grep -q 'version: latest' .github/workflows/supabase-migrate.yml || { echo "FAIL: the workflow uses 'latest'"; exit 1; }
base_db=${PGDATABASE:-postgres}; db=aloni_cli_push
psql -X -q -d "$base_db" -c "drop database if exists $db" -c "create database $db" >/dev/null
psql -X -q -d "$db" -v ON_ERROR_STOP=1 -f supabase/tests/auth_stub.sql >/dev/null
url="postgresql://${PGUSER:-postgres}:${PGPASSWORD:-}@${PGHOST:-localhost}:${PGPORT:-5432}/$db"
sb() { npx --yes "supabase@$ver" "$@"; }
echo "supabase CLI $(sb --version)"
files=$(ls supabase/migrations/*.sql | wc -l)
dry=$(sb db push --db-url "$url" --dry-run 2>&1) || { echo "FAIL: dry-run exited with an error:"; echo "$dry" | sed -E "s#://[^@]*@#://***@#"; exit 1; }
echo "$dry" | grep -c '^ • ' | grep -qx "$files" || { echo "FAIL: dry-run does not list all $files migrations"; echo "$dry"; exit 1; }
[ "$(psql -X -At -d "$db" -c "select to_regclass('supabase_migrations.schema_migrations') is not null and (select count(*) from supabase_migrations.schema_migrations) > 0" 2>/dev/null || echo f)" != t ] || { echo "FAIL: the dry-run changed the database"; exit 1; }
sb db push --db-url "$url" >/tmp/cli_push.out 2>&1 || { echo "FAIL: push:"; sed -E "s#://[^@]*@#://***@#" /tmp/cli_push.out; exit 1; }
[ "$(psql -X -At -d "$db" -c "select count(*) from supabase_migrations.schema_migrations")" = "$files" ] || { echo "FAIL: the history table does not hold all $files migrations"; exit 1; }
sb db push --db-url "$url" 2>&1 | grep -q 'up to date' || { echo "FAIL: a second push is not «up to date»"; exit 1; }
out=$(psql -X -At -d "$db" -f supabase/tests/verify_applied.sql); echo "$out"; echo "$out" | grep -q '^OK:' || { echo "FAIL: verify_applied.sql"; exit 1; }
echo "cli push OK ($ver, $files migrations)"

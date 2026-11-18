#!/bin/bash
# Builds the database URL for `supabase db push --db-url` and psql from the answer of the Supabase Management API «get pooler config»
# (GET /v1/projects/{ref}/config/database/pooler, read on stdin) and the project reference ($1). The password comes ONLY from $SUPABASE_DB_PASSWORD and is
# URL-encoded. The host is never guessed: it is the one the API names, and it must be a Supabase pooler host, session mode, port 5432, user postgres.<ref>.
# The GitHub runner has no IPv6, so the direct db.<ref>.supabase.co address cannot be used; the session pooler is the IPv4 route.
set -euo pipefail
ref=${1:?project reference}
[[ "$ref" =~ ^[a-z]{20}$ ]] || { echo "::error::the project reference does not look right" >&2; exit 1; }
: "${SUPABASE_DB_PASSWORD:?the database password is not set}"
json=$(cat)
entry=$(echo "$json" | jq -c 'if type == "array" then [.[] | select(.pool_mode == "session" and (.database_type // "PRIMARY") == "PRIMARY")] else [] end | first // empty' 2>/dev/null || true)
[ -n "$entry" ] || { echo "::error::the pooler answer has no session-mode entry for the primary database. Nothing was changed." >&2; exit 1; }
host=$(echo "$entry" | jq -r '.db_host // ""'); port=$(echo "$entry" | jq -r '.db_port // ""'); user=$(echo "$entry" | jq -r '.db_user // ""'); name=$(echo "$entry" | jq -r '.db_name // ""')
[[ "$host" =~ ^[a-z0-9.-]+\.pooler\.supabase\.com$ ]] || { echo "::error::the pooler host the API named is not a Supabase pooler host. Nothing was changed." >&2; exit 1; }
[ "$port" = 5432 ] || { echo "::error::the session pooler port is not 5432 (it is «$port»). Nothing was changed." >&2; exit 1; }
[ "$user" = "postgres.$ref" ] || { echo "::error::the pooler user is not postgres.<project reference>. Nothing was changed." >&2; exit 1; }
[ "$name" = postgres ] || { echo "::error::the database name is not «postgres». Nothing was changed." >&2; exit 1; }
enc=$(jq -rn --arg p "$SUPABASE_DB_PASSWORD" '$p | @uri')
printf 'postgresql://%s:%s@%s:%s/%s?sslmode=require\n' "$user" "$enc" "$host" "$port" "$name"

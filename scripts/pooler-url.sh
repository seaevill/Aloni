#!/bin/bash
# Builds the database URL for `supabase db push --db-url` and psql from the answer of the Supabase Management API «get pooler config»
# (GET /v1/projects/{ref}/config/database/pooler, read on stdin) and the project reference ($1). The password comes ONLY from $SUPABASE_DB_PASSWORD and is
# URL-encoded. The host is never guessed: it is the one the API names, and it must be a Supabase pooler host, session mode, port 5432, user postgres.<ref>.
# The GitHub runner has no IPv6, so the direct db.<ref>.supabase.co address cannot be used; the session pooler is the IPv4 route.
# WHY port 5432 is forced and not read from the answer: the API returns the entry of the project's pool mode (transaction, 6543). Supabase's documentation says the
# shared pooler (Supavisor) serves BOTH modes on the SAME host: session mode on port 5432, transaction mode on 6543 (named prepared statements, which `db push` needs, work only in session mode):
#   https://supabase.com/docs/guides/database/connecting-to-postgres
#   https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI
# So: the HOST comes from the API's PRIMARY entry (never guessed), the port is 5432, the user is postgres.<ref>. Transaction mode is never used.
# The shape of the answer is logged (key names, database_type, pool_mode, port, host suffix only: no values, no password) to stderr.
set -euo pipefail
ref=${1:?project reference}
[[ "$ref" =~ ^[a-z]{20}$ ]] || { echo "::error::the project reference does not look right" >&2; exit 1; }
: "${SUPABASE_DB_PASSWORD:?the database password is not set}"
json=$(cat)
echo "$json" | jq -r 'if type == "array" then "pooler answer: array of \(length): " + ([.[] | "{keys=\(keys|join(",")) database_type=\(.database_type // "-") pool_mode=\(.pool_mode // "-") port=\(.db_port // "-") host_suffix=\((.db_host // "") | sub("^[^.]*\\."; ""))}"] | join(" ")) else "pooler answer is not an array (type \(type))" end' >&2 2>/dev/null || echo "pooler answer is unreadable" >&2
entry=$(echo "$json" | jq -c 'if type == "array" then [.[] | select((.database_type // "PRIMARY") == "PRIMARY")] else [] end | first // empty' 2>/dev/null || true)
[ -n "$entry" ] || { echo "::error::the pooler answer has no entry for the primary database. Nothing was changed." >&2; exit 1; }
host=$(echo "$entry" | jq -r '.db_host // ""'); user=$(echo "$entry" | jq -r '.db_user // ""'); name=$(echo "$entry" | jq -r '.db_name // ""'); port=5432
[[ "$host" =~ ^[a-z0-9.-]+\.pooler\.supabase\.com$ ]] || { echo "::error::the pooler host the API named is not a Supabase pooler host. Nothing was changed." >&2; exit 1; }
[ "$user" = "postgres.$ref" ] || { echo "::error::the pooler user is not postgres.<project reference>. Nothing was changed." >&2; exit 1; }
[ "$name" = postgres ] || { echo "::error::the database name is not «postgres». Nothing was changed." >&2; exit 1; }
pw=$SUPABASE_DB_PASSWORD
# A secret pasted with a trailing line break is the commonest cause of «password authentication failed»: drop trailing CR/LF only (nothing else is changed).
trimmed=no; while [[ "$pw" == *$'\n' || "$pw" == *$'\r' ]]; do pw=${pw%?}; trimmed=yes; done
# Facts about the password, never its value: they help to tell a mistyped secret from an encoding problem.
lead=no; [[ "$pw" == [[:space:]]* ]] && lead=yes; trail=no; [[ "$pw" == *[[:space:]] ]] && trail=yes; special=no; [[ "$pw" =~ [^A-Za-z0-9] ]] && special=yes
echo "database password (the value is never shown): trailing line break removed=$trimmed, starts with a space=$lead, ends with a space=$trail, has characters that need URL-encoding=$special" >&2
enc=$(jq -rn --arg p "$pw" '$p | @uri')
printf 'postgresql://%s:%s@%s:%s/%s?sslmode=require\n' "$user" "$enc" "$host" "$port" "$name"

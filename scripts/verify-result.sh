#!/bin/bash
# Reads the answer of the Supabase Management API «run a query» call for supabase/tests/verify_applied.sql (a JSON array of {problem: "..."} rows) on stdin.
# Passes only when the answer is a non-empty array whose EVERY row starts with «OK:» (the file returns problem rows, or one OK row when there is none).
set -euo pipefail
json=$(cat)
echo "$json" | jq -e 'type == "array" and length > 0 and all(.[]; (.problem | type == "string"))' >/dev/null || { echo "::error::unreadable answer from the verification query"; exit 1; }
echo "$json" | jq -r '.[].problem'
echo "$json" | jq -e 'all(.[]; .problem | startswith("OK:"))' >/dev/null || { echo "::error::verify_applied.sql reported problems (listed above)"; exit 1; }

#!/bin/bash
# Phone ↔ server contract (see app/tests/unit/phone-contract.test.ts): every field the phone sends must be a column the server accepts, and none may be a
# server-owned column. Prints every mismatch. Connection from the PG* environment variables (the database must have all migrations).
set -uo pipefail
cd "$(dirname "$0")"
bad=0
map() { case "$1" in settings) echo farm_settings;; *) echo "$1";; esac; }
for t in $(jq -r 'keys[] | select(. != "__op_fields")' phone-columns.json); do
  table=$(map "$t")
  cols=$(psql -X -At -c "select column_name from information_schema.columns where table_schema='public' and table_name='$table'")
  [ -n "$cols" ] || { echo "MISMATCH: no server table $table (phone table $t)"; bad=1; continue; }
  for k in $(jq -r ".\"$t\"[]" phone-columns.json); do
    [ "$t.$k" = label_uses.sign_off ] && continue   # one object on the phone, three columns on the server: apply_ops translates it (normalize_label_row)
    echo "$cols" | grep -qx "$k" || { echo "MISMATCH: $t.$k is not a column of $table"; bad=1; }
    case "$k" in server_seq|sync_xid|hash|prev_hash|created_by|received_at|assigned_to|done_by|chain_no) echo "MISMATCH: $t.$k is server-owned but the phone sends it"; bad=1;; esac
  done
done
[ "$bad" = 0 ] && echo "contract OK" || { echo "contract BROKEN"; exit 1; }

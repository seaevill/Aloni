#!/bin/bash
# The pull cursor must not skip a transaction that COMMITS LATE although it was written EARLY (server_seq is handed out at write time, not at commit time).
# Two real connections: A writes first and commits last; B writes second and commits first. Connection settings come from the PG* environment variables.
set -euo pipefail
Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
F=11111111-1111-1111-1111-111111111111
pull() { Q -c "select pull('$F', ${1}::jsonb, 1000)"; }
PA=$(cat /proc/sys/kernel/random/uuid); PB=$(cat /proc/sys/kernel/random/uuid)
base=$(pull "null"); cursor0=$(echo "$base" | jq -c .cursor)

# A: writes (gets the LOWER server_seq), then stays open for 4 seconds
( Q -c "begin; insert into parcels(id,farm_id,name,area_str) values ('$PA','$F','A early',1); select pg_sleep(4); commit;" >/dev/null ) &
sleep 1
# B: writes later (HIGHER server_seq) and commits at once
Q -c "insert into parcels(id,farm_id,name,area_str) values ('$PB','$F','B late',1)" >/dev/null

# while A is still open, pull must serve NEITHER (B is newer than a running transaction) and the cursor must not move
mid=$(pull "'$cursor0'")
[ "$(echo "$mid" | jq '[.rows[] | select(.row.id == "'$PA'" or .row.id == "'$PB'")] | length')" = 0 ] || { echo "FAIL: pull served rows of a transaction newer than a running one: $mid"; exit 1; }
[ "$(echo "$mid" | jq -c .cursor)" = "$cursor0" ] || { echo "FAIL: the cursor moved past a running transaction"; exit 1; }

wait
# A has committed: now BOTH arrive, A first (older transaction), from the SAME cursor
after=$(pull "'$cursor0'")
ids=$(echo "$after" | jq -r '[.rows[] | select(.row.id == "'$PA'" or .row.id == "'$PB'") | .row.id] | join(",")')
[ "$ids" = "$PA,$PB" ] || { echo "FAIL: expected $PA,$PB after the late commit, got: $ids"; exit 1; }
# and nothing is served twice after the new cursor
again=$(pull "'$(echo "$after" | jq -c .cursor)'")
[ "$(echo "$again" | jq '.rows | length')" = 0 ] || { echo "FAIL: rows repeated after the cursor"; exit 1; }
echo "concurrency OK"

#!/bin/bash
# The job board (0038): two workers take the SAME open job at the same moment in two real connections: exactly ONE gets «claimed» and the other «taken». A holds its transaction open 3 s so B really overlaps.
# Connection settings come from the PG* environment variables.
set -euo pipefail
OUT=$(mktemp -d); trap 'rm -rf "$OUT"' EXIT
Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
F=11111111-1111-1111-1111-111111111111; J=eeeeeeee-0000-0000-0000-0000000018c0; U1=00000000-0000-0000-0000-0000000000b2; U2=00000000-0000-0000-0000-0000000000c4
Q -c "insert into jobs(id,farm_id,kind,status,product_id,dose_str,dose_unit,planned_for) values ('$J','$F','spray','planned','aaaaaaaa-0000-0000-0000-000000000001',0.025,'ml/str','2026-11-26')" >/dev/null
call() { echo "begin; set local role authenticated; set local test.uid = '$1'; select claim_job('$J'); $2 commit;"; }
( Q -c "$(call $U1 'select pg_sleep(3);')" >$OUT/a.out 2>$OUT/a.err || true ) &
sleep 1
( Q -c "$(call $U2 '')" >$OUT/b.out 2>$OUT/b.err || true ) &
wait
claimed=$(cat $OUT/a.out $OUT/b.out | grep -c '"status": "claimed"' || true); taken=$(cat $OUT/a.out $OUT/b.out | grep -c '"status": "taken"' || true)
Q -c "update jobs set deleted_at = now() where id = '$J'" >/dev/null
[ "$claimed" = 1 ] && [ "$taken" = 1 ] || { echo "FAIL: expected one claimed and one taken, got claimed=$claimed taken=$taken"; cat $OUT/a.out $OUT/b.out $OUT/a.err $OUT/b.err; exit 1; }
echo "job-board concurrency OK"

#!/bin/bash
# Two completions of the SAME job at the same moment (two real connections, both as the assigned worker): the row lock serialises them, so exactly ONE spray exists.
# Case 1: the same end time (a double tap / a retried request): both get the same spray, the second marked repeat. Case 2: different end times: one wins, the other is refused.
set -euo pipefail
Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
F=11111111-1111-1111-1111-111111111111
J1=eeeeeeee-0000-0000-0000-000000000601; J2=eeeeeeee-0000-0000-0000-000000000602; P1=dddddddd-0000-0000-0000-000000000301; P2=dddddddd-0000-0000-0000-000000000302
for pair in "$J1 $P1" "$J2 $P2"; do set -- $pair
  Q -c "insert into plantings(id,farm_id,parcel_id,crop_id,area_str,sown_on,status) values ('$2','$F','33333333-3333-3333-3333-333333333333','cccccccc-0000-0000-0000-000000000002',0.25,'2026-11-01','growing');
        insert into jobs(id,farm_id,kind,status,worker_id,product_id,label_use_id,dose_str,dose_unit,planned_for) values ('$1','$F','spray','planned','bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-1111-0000-0000-000000000001',0.025,'ml/str','2026-11-18');
        insert into job_plantings(farm_id,job_id,planting_id) values ('$F','$1','$2')" >/dev/null
done
call() { # $1 job, $2 end-time expression, $3 sleep seconds after the call (keeps the transaction open)
  psql -X -q -At -v ON_ERROR_STOP=0 -c "begin; set local role app_user; select set_config('test.uid','00000000-0000-0000-0000-0000000000b2',true); select coalesce((select complete_spray_job('$1', $2, p_started_at => ($2) - interval '30 minutes')->>'repeat'), 'x'); select pg_sleep($3); commit;" 2>&1 | grep -E '^(true|false|ERROR)' | head -1 | cut -d: -f1 || true
}
T="now() - interval '30 minutes'"; T=$(Q -c "select (now() - interval '30 minutes')::text")
# case 1: same end time, A holds its transaction open for 3 s, B starts 1 s later and must wait for A, then answer «repeat»
( call $J1 "'$T'::timestamptz" 3 > /tmp/wc_a.txt ) & sleep 1
b=$(call $J1 "'$T'::timestamptz" 0); wait; a=$(cat /tmp/wc_a.txt)
[ "$a" = false ] && [ "$b" = true ] || { echo "FAIL case 1: first=$a second=$b (want false/true)"; exit 1; }
[ "$(Q -c "select count(*) from job_spray where job_id = '$J1'")" = 1 ] || { echo "FAIL case 1: more than one spray"; exit 1; }
# case 2: different end times
T2=$(Q -c "select (now() - interval '40 minutes')::text")
( call $J2 "'$T'::timestamptz" 3 > /tmp/wc_a.txt ) & sleep 1
b=$(call $J2 "'$T2'::timestamptz" 0); wait; a=$(cat /tmp/wc_a.txt)
[ "$a" = false ] && [ "$b" = ERROR ] || { echo "FAIL case 2: first=$a second=$b (want false/ERROR)"; exit 1; }
[ "$(Q -c "select count(*) from job_spray where job_id = '$J2'")" = 1 ] || { echo "FAIL case 2: more than one spray"; exit 1; }
[ "$(Q -c "select count(*) from jobs where id in ('$J1','$J2') and status = 'done'")" = 2 ] || { echo "FAIL: a job is not done"; exit 1; }
echo "worker concurrency OK"

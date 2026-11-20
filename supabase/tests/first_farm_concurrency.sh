#!/bin/bash
# The server-wide hourly cap of create_first_farm (0034) must hold across DIFFERENT users: with 19 farms already created in the last hour, two confirmed users ask at the same moment in two real
# connections: exactly ONE succeeds and the other is refused («too many»). A holds its transaction open 3 s so B really overlaps. Connection settings come from the PG* environment variables.
set -euo pipefail
Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
U1=00000000-0000-0000-0000-0000000016a1; U2=00000000-0000-0000-0000-0000000016a2; F1=aaaa1600-0000-0000-0000-0000000000a1; F2=aaaa1600-0000-0000-0000-0000000000a2
Q -c "update farm_creations set created_at = now() - interval '2 hours'" >/dev/null            # earlier tests filled the hourly log: start from an empty hour
Q -c "insert into auth.users(id,email,email_confirmed_at) values ('$U1','c1@example.org',now()),('$U2','c2@example.org',now()) on conflict do nothing" >/dev/null
Q -c "insert into auth.users(id) select ('00000000-0000-0000-0000-00000016' || lpad(i::text,4,'0'))::uuid from generate_series(1,19) i on conflict do nothing" >/dev/null
Q -c "insert into farm_creations(user_id,farm_id) select ('00000000-0000-0000-0000-00000016' || lpad(i::text,4,'0'))::uuid, gen_random_uuid() from generate_series(1,19) i" >/dev/null
call() { echo "begin; set local role authenticated; set local test.uid = '$1'; select create_first_farm('$2', 'Concurrent $1'); $3 commit;"; }
( if Q -c "$(call $U1 $F1 'select pg_sleep(3);')" >/tmp/ff_a.out 2>/tmp/ff_a.err; then echo 0 >/tmp/ff_a.rc; else echo 1 >/tmp/ff_a.rc; fi ) &
sleep 1
( if Q -c "$(call $U2 $F2 '')" >/tmp/ff_b.out 2>/tmp/ff_b.err; then echo 0 >/tmp/ff_b.rc; else echo 1 >/tmp/ff_b.rc; fi ) &
wait
ok=0; refused=0
for x in a b; do
  if [ "$(cat /tmp/ff_$x.rc)" = 0 ]; then ok=$((ok+1)); elif grep -q "too many new farms" /tmp/ff_$x.err; then refused=$((refused+1)); fi
done
n=$(Q -c "select count(*) from farm_creations where created_at > now() - interval '1 hour'")   # 19 fixtures + the one success
# clean up the fixtures so the later restore test sees the same database
Q -c "delete from farm_members where user_id in ('$U1','$U2'); delete from farms where id in ('$F1','$F2'); delete from farm_creations where user_id like '00000000-0000-0000-0000-000000%16%' or user_id in ('$U1','$U2');" >/dev/null 2>&1 || true
[ "$ok" = 1 ] && [ "$refused" = 1 ] || { echo "FAIL: expected one success and one refusal, got ok=$ok refused=$refused"; cat /tmp/ff_a.err /tmp/ff_b.err; exit 1; }
[ "$n" = 20 ] || { echo "FAIL: the hourly count ended at $n, not 20"; exit 1; }
echo "first-farm concurrency OK"

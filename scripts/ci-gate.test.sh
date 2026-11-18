#!/bin/bash
# Tests of ci-gate.sh with made-up check-run lists. Each case says what the gate must answer.
set -uo pipefail
cd "$(dirname "$0")"
S=1111111111111111111111111111111111111111; O=2222222222222222222222222222222222222222
run() { jq -nc --arg n "$1" --arg sha "$2" --arg st "$3" --arg c "$4" --arg t "${5:-2026-11-18T10:00:00Z}" '{name:$n,head_sha:$sha,status:$st,conclusion:(if $c=="" then null else $c end),started_at:$t}'; }
list() { jq -sc '{check_runs: .}'; }
expect() { local want=$1 label=$2; shift 2; if "$@" >/dev/null 2>&1; then got=pass; else got=stop; fi; [ "$got" = "$want" ] && echo "ok   $label" || { echo "FAIL $label (wanted $want, got $got)"; bad=1; }; }
bad=0
good() { run check $S completed success; run sql $S completed success; run "Workers Builds: aloni" $S completed success; }
expect pass "all three green for the sha" bash -c "$(declare -f run list good); S=$S; good | list | ./ci-gate.sh $S"
expect stop "a required run is missing (no Workers Builds)" bash -c "$(declare -f run list); S=$S; { run check $S completed success; run sql $S completed success; } | list | ./ci-gate.sh $S"
expect stop "the Workers Builds run is for ANOTHER commit" bash -c "$(declare -f run list); S=$S; O=$O; { run check $S completed success; run sql $S completed success; run 'Workers Builds: aloni' $O completed success; } | list | ./ci-gate.sh $S"
expect stop "a run is still in progress" bash -c "$(declare -f run list); S=$S; { run check $S in_progress ''; run sql $S completed success; run 'Workers Builds: aloni' $S completed success; } | list | ./ci-gate.sh $S"
expect stop "an older success does not hide a newer failure" bash -c "$(declare -f run list); S=$S; { run check $S completed success 2026-11-18T09:00:00Z; run check $S completed failure 2026-11-18T10:00:00Z; run sql $S completed success; run 'Workers Builds: aloni' $S completed success; } | list | ./ci-gate.sh $S"
expect stop "a cancelled run is not a pass" bash -c "$(declare -f run list); S=$S; { run check $S completed cancelled; run sql $S completed success; run 'Workers Builds: aloni' $S completed success; } | list | ./ci-gate.sh $S"
expect stop "a failed production build" bash -c "$(declare -f run list); S=$S; { run check $S completed success; run sql $S completed success; run 'Workers Builds: aloni' $S completed failure; } | list | ./ci-gate.sh $S"
expect stop "garbage instead of the list" bash -c "echo 'not json' | ./ci-gate.sh $S"
expect stop "a short sha is refused" bash -c "$(declare -f run list good); S=$S; good | list | ./ci-gate.sh 1111111"
expect pass "verify: one OK row" bash -c "echo '[{\"problem\":\"OK: 31 tables with RLS, no problem found\"}]' | ./verify-result.sh"
expect stop "verify: a problem row" bash -c "echo '[{\"problem\":\"RLS is OFF on x\"}]' | ./verify-result.sh"
expect stop "verify: a problem row next to an OK row" bash -c "echo '[{\"problem\":\"RLS is OFF on x\"},{\"problem\":\"OK: 3 tables\"}]' | ./verify-result.sh"
expect stop "verify: empty answer" bash -c "echo '[]' | ./verify-result.sh"
expect stop "verify: an error object instead of rows" bash -c "echo '{\"message\":\"nope\"}' | ./verify-result.sh"
R=abcdefghijklmnopqrst
P='[{"database_type":"PRIMARY","db_host":"aws-0-eu-central-1.pooler.supabase.com","db_name":"postgres","db_port":6543,"db_user":"postgres.abcdefghijklmnopqrst","pool_mode":"transaction"},{"database_type":"PRIMARY","db_host":"aws-0-eu-central-1.pooler.supabase.com","db_name":"postgres","db_port":5432,"db_user":"postgres.abcdefghijklmnopqrst","pool_mode":"session"}]'
expect pass "pooler: the session entry, password encoded" bash -c "export SUPABASE_DB_PASSWORD='a b/c@d'; echo '$P' | ./pooler-url.sh $R | grep -qx 'postgresql://postgres.$R:a%20b%2Fc%40d@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'"
T='[{"database_type":"PRIMARY","db_host":"aws-0-eu-central-1.pooler.supabase.com","db_name":"postgres","db_port":6543,"db_user":"postgres.abcdefghijklmnopqrst","pool_mode":"transaction","connection_string":"postgresql://postgres.abcdefghijklmnopqrst:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"}]'
expect pass "pooler: only a transaction entry (real answer shape) gives the session address, port 5432" bash -c "export SUPABASE_DB_PASSWORD=x; echo '$T' | ./pooler-url.sh $R 2>/dev/null | grep -qx 'postgresql://postgres.$R:x@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'"
expect pass "pooler: the log shows the shape and no password or user" bash -c "export SUPABASE_DB_PASSWORD=secretvalue; echo '$T' | ./pooler-url.sh $R 2>&1 >/dev/null | grep -q 'pool_mode=transaction port=6543 host_suffix=pooler.supabase.com' && ! (echo '$T' | ./pooler-url.sh $R 2>&1 >/dev/null | grep -q -e secretvalue -e abcdefghijklmnopqrst)"
expect stop "pooler: only a replica entry" bash -c "export SUPABASE_DB_PASSWORD=x; echo '$T' | sed 's/PRIMARY/READ_REPLICA/' | ./pooler-url.sh $R"
expect stop "pooler: empty answer" bash -c "export SUPABASE_DB_PASSWORD=x; echo '[]' | ./pooler-url.sh $R"
expect stop "pooler: an error object (no right)" bash -c "export SUPABASE_DB_PASSWORD=x; echo '{\"message\":\"forbidden\"}' | ./pooler-url.sh $R"
expect stop "pooler: a host that is not a Supabase pooler" bash -c "export SUPABASE_DB_PASSWORD=x; echo '$P' | sed 's/aws-0-eu-central-1.pooler.supabase.com/evil.example.com/g' | ./pooler-url.sh $R"
expect stop "pooler: a user of another project" bash -c "export SUPABASE_DB_PASSWORD=x; echo '$P' | ./pooler-url.sh aaaaaaaaaaaaaaaaaaaa"
expect stop "pooler: no password" bash -c "unset SUPABASE_DB_PASSWORD; echo '$P' | ./pooler-url.sh $R"
exit $bad

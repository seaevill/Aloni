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
exit $bad

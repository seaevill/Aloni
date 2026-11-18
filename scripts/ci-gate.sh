#!/bin/bash
# Gate for the manual Supabase workflow: reads the check-runs JSON of ONE commit on stdin and decides whether THAT commit may be applied.
# usage: ci-gate.sh <full commit sha>   (stdin: the output of `gh api repos/<repo>/commits/<sha>/check-runs?per_page=100`)
# Required: `check`, `sql` and a «Workers Builds…» run (the production deploy of main), each for EXACTLY this sha. A missing run, a run that has not finished,
# a run whose head_sha is another commit, or a latest run that is not `success` stops it. Another commit's green result is never taken into account.
set -euo pipefail
sha=${1:?usage: ci-gate.sh <sha>}
json=$(cat)
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "::error::not a full commit sha: $sha"; exit 1; }
echo "$json" | jq -e '.check_runs | type == "array"' >/dev/null || { echo "::error::unreadable check-run list: nothing is known about $sha"; exit 1; }
fail=0
for want in "eq:check" "eq:sql" "prefix:Workers Builds"; do
  mode=${want%%:*}; name=${want#*:}
  res=$(echo "$json" | jq -r --arg sha "$sha" --arg name "$name" --arg mode "$mode" '
    [.check_runs[] | select(if $mode == "eq" then .name == $name else (.name | startswith($name)) end)] as $runs
    | if ($runs | length) == 0 then "missing"
      elif ([$runs[] | select(.head_sha != $sha)] | length) > 0 then "other-commit"
      elif ([$runs[] | select(.status != "completed")] | length) > 0 then "not-finished"
      else ($runs | sort_by(.started_at) | last | .conclusion // "none") end')
  echo "$name ($sha): $res"
  [ "$res" = success ] || fail=1
done
[ "$fail" = 0 ] || { echo "::error::The checks of $sha are not all green and finished. Nothing was applied."; exit 1; }
echo "all required checks are green for $sha"

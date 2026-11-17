#!/usr/bin/env bash
# Fails when a PR changes more than LIMIT lines (default 450). Lockfile, generated files, images and
# test fixtures are not counted. Usage: scripts/pr-size.sh <base-ref>   (CI passes origin/<base>)
set -euo pipefail
BASE="${1:?usage: pr-size.sh <base-ref>}"
LIMIT="${PR_SIZE_LIMIT:-450}"
N=$(git diff --numstat "$BASE"...HEAD -- . \
  ':(exclude)package-lock.json' ':(exclude)*.lock' ':(exclude)**/generated/**' \
  ':(exclude)*.png' ':(exclude)*.svg' ':(exclude)*.webmanifest' \
  ':(exclude)app/tests/fixtures/**' ':(exclude)packages/rules-core/fixtures/**' \
  | awk '$1 != "-" { s += $1 + $2 } END { print s + 0 }')
echo "Changed lines vs $BASE (lockfile, generated files, images and test fixtures excluded): $N (limit $LIMIT)"
if [ "$N" -gt "$LIMIT" ]; then
  echo "::error::This PR changes $N lines; the limit is $LIMIT. Split it into smaller PRs."
  exit 1
fi

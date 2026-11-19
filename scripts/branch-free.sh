#!/bin/bash
# Usage: scripts/branch-free.sh <MMDD-topic-name>   (rule of 2026-11-19: branch names are unique, «date + topic», e.g. 1119-h2-harvest)
# Stops (exit 1) when the name does not look like that or when the name already exists on the remote. Run it BEFORE `git push`.
set -euo pipefail
b=${1:?branch name}
[[ "$b" =~ ^[0-9]{4}-[a-z0-9][a-z0-9-]+$ ]] || { echo "::error::branch name must be <MMDD>-<topic>, e.g. 1119-h2-harvest (got $b)"; exit 1; }
if [ -n "$(git ls-remote --heads origin "$b")" ]; then echo "::error::branch $b already exists on origin: pick another name"; exit 1; fi
echo "branch name $b is free"

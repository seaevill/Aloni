#!/usr/bin/env bash
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
payload=$(cat)

case "$1" in
  branch)
    branch=$(git branch --show-current)
    if [[ ! "$branch" =~ ^(codex/[0-9]{8}|[0-9]{4})-[a-z0-9][a-z0-9-]*$ ]]; then
      echo "Switch to a dated task branch before editing (MMDD-topic or codex/YYYYMMDD-topic)." >&2
      exit 2
    fi
    ;;
  edited)
    file=$(jq -r '.tool_input.file_path // empty' <<< "$payload")
    file=${file#"$PWD"/}
    [[ "$file" != /* && "$file" != ../* ]] || exit 0
    case "$file" in
      app/src/i18n/*.json)
        npm run test -w app -- tests/unit/i18n.test.ts tests/unit/i18n-keys.test.ts tests/unit/hi-coverage.test.ts >&2 || exit 2
        ;;
      *.ts|*.tsx)
        case "$file" in
          app/*) npm run typecheck -w app >&2 || exit 2 ;;
          packages/rules-core/*) npm run typecheck -w @aloni/rules-core >&2 || exit 2 ;;
          *) npm run typecheck >&2 || exit 2 ;;
        esac
        npx --no-install eslint --max-warnings 0 -- "$file" >&2 || exit 2
        ;;
    esac
    ;;
  language)
    if [[ $(jq -r '.stop_hook_active // false' <<< "$payload") != true ]]; then
      python3 scripts/claude/check-language.py
    fi
    ;;
esac

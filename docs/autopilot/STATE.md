# Autopilot state (updated by every run; read it first)

```
LOCK: none            # format when taken: <run-id> <ISO time UTC> <branch>; a lock older than 90 minutes is stale and may be taken over (note it in REPORT.md)
LAST_RUN: 2026-11-25 02:00 Istanbul, night shift (autopilot/20261125-02-offline-saved-where)
LAST_COMPLETED: #548 (Σήμερα: saved records say «on the phone»; queue item 6, first slice)
NEXT_SAFE_ACTION: queue item 6b (offline wording for undo toasts / HarvestForm line / Photos). Items 1, 3, 3b, 4, 5, 6 are done.
OPEN_BRANCHES: none owned by autopilot
```

## Recovery after a failed or interrupted run
- A run that dies leaves (a) its `autopilot/*` / `night/*` branch and PR on GitHub and (b) possibly a LOCK line. Next run: read LOCK → if older than 90 minutes it is STALE: note it in REPORT.md, take over. Look for an open PR on that branch: if CI is green and QUALITY.md holds → finish it (merge, update QUEUE/STATE); if red → read the FAILURE CONTEXT, fix or write the blocker; never start the same item again from scratch while its PR exists.
- Max 2 attempts per failing step; the failure goes to BLOCKERS.md with evidence and the run switches to the next independent `todo` item.
- Hour-07 (Istanbul) run = MORNING VERIFICATION only: facts → Turkish REPORT.md section → docs-only PR; no development, no merging of other PRs.

## Protocol (every scheduled run)
1. Read `CLAUDE.md`, this file, `QUEUE.md`, `QUALITY.md`, `BLOCKERS.md`.
2. `gh api` (REST only): latest `main` commit + its check runs; open PRs; commits/PR updates in the last 45 minutes by anyone else. If another agent (the interactive Claude Code session, Codex, Dependabot) changed the same files in the last 45 minutes → skip that item, take the next one. If the interactive session is clearly active (commit on main or PR update < 45 min, not authored by autopilot) → **do nothing**, write one line in REPORT.md «interactive session active».
3. Take the lock (edit LOCK in a branch commit `autopilot/<yyyymmdd-hh>-<slug>`; if the lock is held and fresh, stop).
4. Do ONE queue item: red test first, smallest change, `npm ci`, typecheck, **full vitest**, eslint, the relevant Playwright specs (chromium locally: `PW_BROWSER=chromium PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`), before/after screenshots if visual.
5. Push the branch, open/update the PR (REST: `gh api repos/seaevill/Aloni/pulls`), wait for CI (`check`, `sql`, 3 e2e shards, `static`, Workers Builds). Merge only if QUALITY.md gates pass.
6. Update STATE.md (release lock, LAST_*, NEXT_SAFE_ACTION), REPORT.md (Turkish), QUEUE.md status, BLOCKERS.md if blocked. Commit these in the SAME PR (or a docs-only PR if the item was not merged).
7. End. Never loop: at most 2 attempts at a failing step; then record the blocker with the evidence and switch to the next independent item.

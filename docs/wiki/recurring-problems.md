# Recurring problems

Problems seen more than once, with the known workaround. Dated; add a line when one comes back.

## 45-minute rule vs the main session's own management PRs

- Rule (YONETICI.md §1, at main 682c32d): the runner stops («Claude Code aktif – müdahale yok») if anyone else committed or updated a PR in the last 45 minutes. Exempt are only `lock/`, `*-kayit-*` and the queue's own item branches.
- Problem (2026-11-27/28): the main session («sağ kol») opens its own management PRs on `MMDD-sag-kol-*` branches, e.g. #620 `1127-sag-kol-ciftci`, #652 `1128-sag-kol-isler`, and the 2026-11-28 evaluation PRs. These are not exempt, so for 45 minutes after each of them the runner skips its turn even though the work it would do is unrelated. Which runs were skipped this way is not recorded in a committed file (unknown).
- Workaround until the rule changes: open management PRs right after a runner fire, and batch them. Possible fix (not decided as of 2026-11-28): add `*-sag-kol-*` to the exemption list in YONETICI.md §1.

## Proxy 403: branch deletion, git-data API, GraphQL, outside hosts

- 2026-11-27 (YONETICI.md §0; DECISIONS row «One management system»): the session proxy blocks branch deletion and the git-data API; GraphQL is blocked too, so `gh api` REST only. Never route around a 403; record it.
- Consequence: merged branches are never deleted, so every branch name must be new (`scripts/branch-free.sh`), and the lock is a forward-only branch moved with `git commit-tree` + `git push --force-with-lease` rather than a branch that is created and deleted (management-loop.md).
- Same family (docs/autopilot/BLOCKERS.md): 2026-11-24 the live site and `workers.dev` previews cannot be fetched from the agent environment, so «verified live» can only come from Bora; 2026-11-24 a routine created without the repo as a source got 403 on the repo; 2026-11-26 the ministry label register answers 403, so q-30 (real Demo labels) is `ertelendi`.
- 2026-11-28 (report 4-accuracy §5): the Playwright WebKit download is blocked (403), so local e2e runs on the Chromium fallback and shows Chromium-only failures (offline `icon-192.png` console error). Queue item ev-53 makes the fallback comparable.

## MMDD branch-name hook

- Since 2026-11-19 (`scripts/branch-free.sh`): branch names are «date + topic», unique on the remote.
- Hook (`.claude/settings.json` PreToolUse on Edit|Write → `scripts/claude/check.sh branch`, read at 682c32d): editing is refused unless the current branch matches `^(codex/[0-9]{8}|[0-9]{4})-[a-z0-9][a-z0-9-]*$`. YONETICI.md §0 uses `^[0-9]{4}-[a-z0-9-]+$`: team `$D-<item-id>-<slug>`, record `$D-kayit-<HHMM>`.
- It keeps coming up because older prefixes (`claude/…`, `aloni-gelistirme/…`, `autopilot/…`, e.g. PRs #597–#599 on 2026-11-27) no longer pass, and a sub-agent that is not told the rule fails at its first edit. Always give the branch rule in the sub-agent prompt (YONETICI.md §5).

## Bekçi catching unapproved scope added by the main session

- 2026-11-27, PR #620 (`1127-sag-kol-ciftci`, queue items is-6 and is-7): bekçi RED at 30e78a8. is-6 contained «weather summary first (FARK-LISTESI 3)», which was not in Bora's words, yet the item's `onay` named him. After the fix, ONAY on re-review 1/2. Lesson in `takimlar/bekci/defter.md` (2026-11-27, PR #620): match every sentence of a queue item to the owner's words; an old suggestion is unapproved scope even if `onay` says «Bora».
- Same pattern in record PRs: #660 (2026-11-28) RED at d9ef5f1 for a wrong Greek screen name, ONAY at 369ff5b.
- Rule of thumb: the main session is checked like any agent. Write `onay` with its real source; when the source is a delegation (e.g. the 2026-11-28 evaluation), say so in the item.

## Stale numbers in STATUS and READMEs

- 2026-11-28 (report 4-accuracy §1e): `docs/STATUS.md:176` and `fixtures/golden/README.md` still say «9 golden cases run, 18 skipped». The true count on 682c32d is 21 of 27 in rules-core; the old app harness still skips 18 with a reason that is no longer true. Queue item ev-17 removes the stale harness and generates the count from `LANDED.length`.
- 2026-11-27 (`takimlar/aloni-gelistirme/defter.md`, is-0): the queue had been built from chat; rebuild status from `docs/STATUS.md` and `git log`, and start every item with «what gap is actually left».
- 2026-11-27 (same defter, is-3 and is-5): BACKLOG held the same job twice ([ ] and [x]); grep code and tests before writing new code.
- Rule of thumb: a number in a document is a claim. Generate it from the code or test that owns it, or date it.

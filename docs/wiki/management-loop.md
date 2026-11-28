# Management loop

Source of truth: `docs/autopilot/YONETICI.md`, read at main 682c32d (2026-11-28); the file was last changed in commit 03e2dd8 (2026-11-27). `ANAYASA.md` and `CLAUDE.md` win over it.

## How it came to be (dated)

- 2026-11-27, PR #600 (branch `1127-tek-yonetim`, merged 2026-11-27 04:59 UTC as 9c76c59): «One management system». One work queue (`takimlar/aloni-gelistirme/durum.json`; `docs/autopilot/QUEUE.md` and `STATE.md` became archives), one scheduled runner «Aloni yönetici» following YONETICI.md, merge only with all CI gates green AND a bekçi ONAY comment carrying the head SHA. DECISIONS row 2026-11-27 «One management system» records Bora's five «evet» answers.
- 2026-11-27, PR #603 (branch `1127-yogun-mod`, merged 08:18 UTC as 5416726): intensive mode. The runner fires hourly and the daily code-job cap is 12 up to and including 2026-12-01 (Athens), then back to 4 and every 3 hours (`durum.json` field `yogun_mod`; DECISIONS row 2026-11-27 «Intensive mode»).

## One runner, one lock (YONETICI.md §1, at 682c32d)

- Lock = the tip commit of the forward-only branch `lock/aloni`: message `LOCK run=<RUN> at=<ISO>` (held) or `FREE …`. Taken with `git commit-tree` + `git push --force-with-lease` (compare-and-swap); «[rejected] (stale info)» means another runner won, so stop.
- A LOCK younger than 150 minutes means «başka koşu sürüyor»: stop. An older one is taken over and the report says so.
- The lock is released at the end, also after a failure.
- The runner also stops (and releases) if someone else committed or updated a PR in the last 45 minutes, except on `lock/`, `*-kayit-*` and the queue's own item branches. See recurring-problems.md for how this collides with the main session's own management PRs.

## One decision per run (YONETICI.md §4, at 682c32d)

First match wins: (1) main red → maintenance from the failing log; (2) `simdi` has an open PR → continue it (team fix, bekçi, or merge); (3) the first `sirada` item with `onay`, `durum: sirada`, `deneme` < 2, under the daily cap → take it; (4) `tur: bakim` items only with new failure evidence; (5) nothing → report only. An item without `onay` is never taken. Two failures make an item `engelli`.

Chaining: there is no loop inside a run. A run does one item, then ends with its record PR; the next fire (hourly until 2026-12-01) takes the next item. Example 2026-11-28: is-8 (#653), is-9 (#655), is-10 (#657), is-11 (#659) merged in four consecutive runs, each followed by a record PR (#654/#656/#658/#660; see `docs/autopilot/REPORT.md` headers of 2026-11-28).

## Team and bekçi (YONETICI.md §5–§7)

- The team (`aloni-gelistirme`) and bekçi run as general-purpose sub-agents with the body of `.claude/agents/<name>.md` as identity.
- Bekçi's decision block is posted verbatim as a PR comment starting with `**Bekçi kararı**` and containing `SHA: <head>`. That comment is the only valid ONAY; any new commit invalidates it.
- Merge (squash, pinned to the head SHA) only when that SHA has every check-run (check, sql, static, e2e 1–3, pr-size, Workers Builds) green or skipped, no `supabase/**` file is touched, and QUALITY.md holds.

## Record PRs (YONETICI.md §8)

Every run, also an empty one, ends with a docs-only PR from `MMDD-kayit-HHMM` that changes only `docs/autopilot/REPORT.md`, `takimlar/*/durum.json` and `takimlar/*/defter.md`, goes through bekçi like any PR and is merged under §7. The report is plain Turkish in five numbered parts. Example: #660 (2026-11-28) got a bekçi RED at d9ef5f1 because the report called the screen «Μητρώο» instead of the on-screen «Αρχείο ψεκασμών», then ONAY at 369ff5b, merged as 682c32d.

## Hard stops (YONETICI.md, «Hard stops», at 682c32d)

Production deploy or Cloudflare/Supabase writes, applying SQL, paid services, messages to customers/workers/outsiders, merging `supabase/**`, changing `ANAYASA.md`/`sirket/`/any `kurallar.md`, dose/label/PHI values, a PR over 450 changed lines. The runner's trigger has no connectors on purpose.

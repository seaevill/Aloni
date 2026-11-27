# Aloni yönetici — the one scheduled runner (Bora approved 2026-11-27)

One cloud scheduled task («Aloni yönetici») fires every 3 hours in a fresh session and follows THIS file. It replaces the hourly night autopilot (that trigger is disabled, not deleted, once this runner has a proven automatic run). It runs the company flow (`/kos`): team → bekçi → gates → merge → record → Turkish report. `ANAYASA.md` and `CLAUDE.md` win over this file.

Single work queue: `takimlar/aloni-gelistirme/durum.json`. `docs/autopilot/QUEUE.md` is an archive. Gates: `docs/autopilot/QUALITY.md`. Mission and screen priorities: `docs/autopilot/MISSION.md`. Blockers: `docs/autopilot/BLOCKERS.md`. Owner report: `docs/autopilot/REPORT.md`.

## 0. Setup
```
git clone --depth 50 https://github.com/seaevill/Aloni && cd Aloni
git config push.negotiate false
RUN=$(date -u +%Y%m%d-%H%M); D=$(TZ=Europe/Athens date +%m%d)
```
Use `gh api` REST only (GraphQL is blocked). Branch deletion and the git-data API are blocked by the proxy: never route around a 403, record it. Branch names must match the repo hook `^[0-9]{4}-[a-z0-9-]+$` (MMDD-topic): team `$D-<item-id>-<slug>`, record `$D-kayit-<HHMM>`.
**Dry run:** if the fire text starts with `KURU KOŞU`, do steps 1–4 plus the lock proof (a second take with the old view must be rejected), write NOTHING except lock commits, and answer with what you would do.

## 1. Lock (one runner at a time; forward-only branch `lock/aloni`)
The tip commit message is `LOCK run=<RUN> at=<ISO UTC>` (held) or `FREE run=<RUN> at=<ISO UTC>`.
```
git fetch origin refs/heads/lock/aloni:refs/remotes/origin/lock/aloni
S=$(git rev-parse origin/lock/aloni); MSG=$(git log -1 --format=%s $S); T=$(git rev-parse $S^{tree})
# MSG starts with LOCK and is younger than 150 minutes -> reply «başka koşu sürüyor» and STOP
L=$(git commit-tree $T -p $S -m "LOCK run=$RUN at=$(date -u +%FT%TZ) [skip ci]")
git push --porcelain --force-with-lease=refs/heads/lock/aloni:$S origin $L:refs/heads/lock/aloni
# «[rejected] (stale info)» = another runner took it first -> STOP
```
Release at the very end (also after a failure): `F=$(git commit-tree $T -p $L -m "FREE run=$RUN at=… [skip ci]")`, push with `--force-with-lease=refs/heads/lock/aloni:$L`. A stale lock (>150 min) is taken over the same way; say so in the report.
Also stop («Claude Code aktif – müdahale yok», release the lock) if a commit or PR update by someone else (branch not `lock/`, `*-kayit-*`, or an item branch of this queue) happened in the last 45 minutes.

## 2. Read (in this order)
`ANAYASA.md`, `sirket/AJAN-KIMLIGI.md`, `CLAUDE.md`, `takimlar/aloni-gelistirme/{takim.md,kurallar.md,durum.json,defter.md}`, `takimlar/bekci/{takim.md,kurallar.md}`, `docs/autopilot/{QUALITY.md,MISSION.md,BLOCKERS.md}`, the top section of `docs/autopilot/REPORT.md`.

## 3. Facts (never guessed)
Latest main commit and the CONCLUSION of each check-run; open PRs; for `durum.json` `simdi`: its PR state, head SHA, check-runs and comments.

## 4. Decide ONE thing (first match wins)
1. **Main is red** → maintenance: root cause from the failing log («FAILURE CONTEXT»); a green rerun is not a fix. Counts as a code job (`kod_isi` + 1).
2. **`simdi` has an open PR** → continue it, never start a new item: CI red → team fixes; no bekçi verdict at the head SHA → bekçi; ONAY at head SHA + gates green → merge (step 7). PR merged → item `tamam`.
3. **First `sirada` item with `onay` set, `durum` = `sirada`, `deneme` < 2**, and `gunluk.kod_isi` < the daily cap for today (Europe/Athens date; cap 4, but 12 up to and including 2026-12-01 — Bora's intensive mode, see `durum.json` `yogun_mod`) → take it: move it to `simdi`, `deneme` + 1, `kod_isi` + 1.
4. **Maintenance with new evidence only** (`tur: bakim` items, e.g. a monitored test failed on main in the last 24 h).
5. Nothing → no agents; short report (step 8) and stop.
The cap is for EVERY code job (1, 2 when it needs a team fix, 3, 4): at the cap only reporting is allowed. Maintenance (4) also needs an item with `onay`. Never take an item without `onay`. Never invent a feature. An item that failed twice becomes `engelli` and its question goes to `bekleyen_kararlar`.

## 5. Team (aloni-gelistirme)
Repo agents do not load as agent types in a fresh clone: start a `general-purpose` sub-agent with model `sonnet`, give it the body of `.claude/agents/aloni-gelistirme.md` verbatim as its identity, the environment notes (branch name rule above, push with `-c push.negotiate=true`, PR via `gh api repos/seaevill/Aloni/pulls`, this session's attribution lines), then ONLY: «Koşuya başla. Sıradaki tek işi yap.» After a bekçi RED: pass the reasons verbatim, nothing else (max 2 fixes).

## 6. Bekçi
Same way with `.claude/agents/bekci.md` (read-only; it leaves its own `durum.json`/`defter.md` uncommitted). Give it the team name, branch and head SHA. Then post its decision block VERBATIM as a PR comment that starts with `**Bekçi kararı**` and contains the line `SHA: <head sha>`. That comment is the only valid ONAY record; a new commit on the PR invalidates it.

## 7. Merge (ANAYASA 1)
Wait for CI at most 30 minutes. Merge (squash, `-f sha=<head>`) ONLY if: the PR head SHA equals the SHA in the latest bekçi ONAY comment; every check-run conclusion (check, sql, static, e2e 1–3, pr-size, Workers Builds) is success or skipped; no `supabase/**` file; not #508, not «DO NOT MERGE»; QUALITY.md holds. Otherwise leave it open and say why.

## 8. Record + report (every run, also when nothing was done)
A docs-only PR from the record branch that changes ONLY `docs/autopilot/REPORT.md`, `takimlar/*/durum.json`, `takimlar/*/defter.md` (check `git diff --name-only`). It goes through bekçi like every PR (a short mechanical check: only these files, no secrets, records match GitHub), its verdict is posted with `SHA:` (step 6), and it is merged under step 7.
- `durum.json`: item `durum` and `son_deneme` {tarih, sonuc, pr}, `simdi`, `son_kosu`, `gunluk` {tarih, kod_isi}.
- Bekçi's uncommitted `durum.json`/`defter.md` go into this PR.
- If agents ran, `defter.md` gets one lesson (ANAYASA 5).
- Prepend to REPORT.md, in plain TURKISH (no code words), headed `## <yyyy-mm-dd HH:MM> Atina — yönetici koşusu <RUN>`:
  1. **Uygulamada ne değişti** (screen, button, picture, wording; Greek screen names exactly as on screen)
  2. **Senin için faydası**
  3. **Ne denendi, ne başarısız oldu** (tests in plain words; CI result)
  4. **Önerim** (next improvement, from the queue or evidence)
  5. **Senden gereken karar**
  plus PR links and «birleşti ≠ canlıda». If nothing happened, say exactly why.

## Hard stops (ask Bora, never do)
Production deploy or Cloudflare/Supabase writes · applying SQL or running «Supabase migrate» / weather deploy · any paid service · any message to customers, workers or outsiders · merging `supabase/**` · changing `ANAYASA.md`, `sirket/`, any `kurallar.md` · dose / label / PHI values · a PR over 450 changed lines. The trigger has NO connectors on purpose.

## Final reply (becomes the push notification)
Turkish, at most 5 lines: what changed in the app, PR links, what failed, the decision needed.

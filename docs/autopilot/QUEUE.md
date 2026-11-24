# Autopilot queue (English; the owner report is Turkish: REPORT.md)

Order = priority. A run takes the FIRST item whose status is `todo` and whose files are not locked (STATE.md). One item per run, one PR per item (≤450 changed lines, png/svg excluded). Source of truth for rules: `CLAUDE.md`, `docs/DECISIONS.md`.

Priority classes: **P0** data integrity / sync / offline / permissions / agricultural safety · **P1** broken workflows, intermittent tests, invalid form states, double submits, missing feedback · **P2** polish inside the existing layout (spacing, alignment, type, icons, touch targets, responsive) · **P3** measured performance · **P4** docs/maintenance. No new big features, no navigation redesign.

| # | Class | Item | Status | Notes |
|---|---|---|---|---|
| 1 | P1 | DONE (#537 + #538 restore): Double-submit guard audit: every «save» button (spray, harvest, job, stock receive/adjust, parcel, planting, product, label use, worker, observation) must be disabled while its write is in flight and give feedback on success/failure; add one e2e that double-taps save and asserts exactly one record | todo | find buttons: `grep -rn 'data-testid="[a-z-]*-save"' app/src/ui`; harvest/spray already use `busy` |
| 2 | P1 | Monitored intermittents: `labeluse.spec.ts:118` (unexplained; 1 failure on main ad5790f, 5 passes after), `register-v2` print test (WebKit). Only act when a CI failure context (printed by the reporter) is available; read it, find the race, fix the TEST sync or the app | monitor | evidence: docs/DEVLOG-2026-11-24.md |
| 3 | P1 | Αποθήκη (Stock) screen: information hierarchy + touch targets + feedback messages, zero feature loss (feature map + before/after screenshots) | todo | same method as docs/design/field-atelier-p1-fields-2026-11-24.md |
| 4 | P2 | Φυτά list: crop row = picture + name + one chip, six rows on the first screen (approved rule): improve spacing/typography only | todo | do NOT add lines per row |
| 5 | P2 | Parcel detail: put the three key facts (area, wait state, last spray) first; fold the rest under existing headings; keep every card | todo | tests: parcel-detail*, planting-sketch, kaek, fieldwork |
| 6 | P1 | Offline write path audit: every farm write works with the network off and is shown as «stored on this phone» (no success wording for device-only records) | todo | existing offline specs fail locally on icon-192 (environment) — judge by CI |
| 7 | P3 | First-load budget: split `index` chunk (lazy routes for Register, WeeklyReport, Orders, Photos, SeasonCalendar) + SW precache; measure gzip before/after with `npm run build`; do not raise the budget | todo | needs a size PR |
| 8 | P2 | Worker app (role = worker): 72 px targets, language switch, no owner data visible; add axe + layout specs at 320/375/390 | todo | worker specs exist |
| 9 | P4 | Keep `docs/DEVLOG-*.md` and `docs/autopilot/*` current | ongoing | |

Held (do NOT touch without Bora): #500 (SQL 0042), #460, #484/#485 (money ledger), #504/#507/#508 (need independent Codex review), Dependabot #512 unless green and non-major.

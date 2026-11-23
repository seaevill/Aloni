# Independent Phase 1 acceptance audit — AI3

Date: 2026-11-22. Scope: **read-only review and acceptance plan**. No claim of live-device testing or production access.

## Evidence standard
- A local build, screenshot, or green CI is **not** proof of two-phone LIVE behaviour.
- Record each case as PASS / FAIL / BLOCKED, with iPhone screenshot or screen recording, app language, Demo vs real farm, tested commit SHA, and (for sync) both device timestamps.
- Do not enter actual worker/customer phone numbers in public reports. Do not copy secrets, farm records, or sensitive data into this repository.
- No agricultural recommendation or threshold is approved by this audit. Missing label values and unsigned agronomist rules remain blocked.

## Priority 0 — production prerequisites (owner-controlled)
1. Verify the exact green main SHA and independent SQL review before the owner applies 0036/0037 via the approved workflow. Do not infer application from merge.
2. Do not mark 0038–0041 deployed until the owner has run the approved workflow and verification succeeds.
3. Verify backup restoration path before enabling LIVE. Confirm auth/RLS prerequisites; production changes are owner-controlled.
4. Weather deploy requires the owner's separate approval; no fabricated real-farm weather.
5. Obtain agronomist sign-off for label data and thresholds before any decision/notification logic.

## Three highest-value end-to-end acceptance journeys

### A. Two phones: one owner, one worker (R3, R21–R25, R29)
- Owner creates a job, worker sees it on **their own phone**, claims it; owner sees the assignee. Check first-claim-wins with two workers when available.
- Worker completes a job and enters harvest destination (store vs direct loading). Owner sees the exact same record and destination.
- Worker writes tomorrow's note; owner sees author and note. Verify owner-only phone fields are absent from worker screens.
- Offline: create a permitted record, reconnect, inspect per-record sync state and rejected-record sheet. A success chip must not appear when an operation was refused.
- Check duplicate tap, browser back, refresh/update banner, and Athens midnight boundary.
**PASS only when** records reconcile across devices, permissions hold, and failures are visible. Otherwise BLOCKED pending migration/LIVE.

### B. Spray → harvest → crates → dispatch (R6, R8, R10–R12, R20–R22)
- For a verified, signed label case, inspect exact unrounded recorded dose and PHI/REI sources. No product/dose auto-selection.
- Test unknown, missing and unsigned label fields separately: each must block the relevant decision, show `άγνωστο` plus reason, and never silently use zero.
- PHI-held and unknown crates must be excluded from available totals, including store, today, weekly, and tomorrow's dispatch.
- Follow one harvest from parcel to worker to destination to stock/dispatch; check every tappable summary against its detail rows.
- Confirm corrections append an amending record with reason; original remains auditable.
**PASS only when** all displayed counts reconcile and blocked cases stay excluded.

### C. Worker usability, Greek-first owner UI (R1–R5, R13–R19, R24, R26–R30)
- Test 375px WebKit on a real iPhone; no clipped controls, dead taps, or inaccessible information.
- Workers: Hindi/Greek, illustrated large actions, clear completed/not-completed feedback; verify labels with an actual worker, not machine translation alone.
- Owner: tap every number, chip, list row and summary; detail must identify source or explain unknown.
- Check 5-day Demo weather clearly labelled fictional; real weather remains unavailable until deployed and fetched.
- Inspect Greek number/date/units: decimal comma, `στρ.`, `κλούβες`, Europe/Athens and gust units.
**PASS only when** on-device evidence is collected; automated screenshots alone count as preliminary.

## Findings from repository documentation (not yet confirmed live bugs)
1. **P0 verification gap:** STATUS describes several R-cases as local PASS or KISMEN, whereas the requested acceptance bar is live Demo iPhone screenshots. Evidence labels must distinguish these.
2. **P0 dependency:** cross-device job board, notes, customer/harvest destination sync depend on owner-controlled migrations and LIVE enablement; local UI success does not prove the end-to-end flow.
3. **P1 source-coverage gap:** STATUS explicitly lists limited crop-specific pH sources and no sourced EC/OM crop ranges; preserve explanatory unknowns instead of inventing ranges.

## Ownership and handoff
AI3 owns this audit document and future isolated acceptance evidence only. No edits to app screens, `rules-core`, SQL, STATUS, DECISIONS, or CLAUDE.md without a new lane agreement. Claude Code remains the sole integrator. Request owner evidence through a short Turkish checklist, never credentials.

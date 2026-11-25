# Codex: parallel work prompt (2026-11-23)

Paste everything below the line into Codex. Written in English (repo language for handoffs).

---

You are working on **Aloni** (Αλώνι), a Greek-first offline PWA for one grower (Bora, not a developer) on the Megara plain, repo `seaevill/Aloni` (Preact + signals, Vite, TypeScript, Dexie, Vitest, Playwright; Supabase backend). Claude Code works in the same repo at the same time. **Read first:** `CLAUDE.md`, `docs/DECISIONS.md` (last 40 rows), `docs/STATUS.md` top, `docs/plan/RULES.md` "Do not automate".

## Rules that never bend
- Never invent label data, doses, PHI/REI, yields, intervals or any number. Missing value = «άγνωστο – reason». Never round a dose. No product or dose advice. Never write «safe» / «ασφαλές». No diagnosis from weather.
- Production is untouched: **no Supabase MCP, no SQL applied.** A SQL change is its own PR, red test first with real `authenticated` roles, marked "DO NOT MERGE – Bora applies"; never edit an applied migration (0001–0035 are applied).
- UI is Greek first (`el`), then `tr`, `en` (`hi` only on worker screens). Text through `t()`; lint rules U01–U03/R01/R06/D05 apply (`npx eslint src` must be clean). Every owner screen works at 375 px.
- Real data never goes into the Demo farm and Demo data never into a real farm. Personal data (customer / worker phones) is owner-only.
- Red test first (unit and/or Playwright), small PRs: **≤ 450 changed lines each** (`scripts/pr-size.sh origin/main`). One screen or feature per PR, with a 375 px screenshot in `docs/design/screenshots-2026-11-23/`.
- Branch from fresh `origin/main`, **one branch per task, in your own worktree**, never `git add -A` across tasks. Never push to `main`; open a PR. Add a dated row to `docs/DECISIONS.md` (English) for each decision. CI must be green (`check`, `sql`, `static`, `pr-size`; Cloudflare "Workers Builds" is red on PR branches and is not a blocker).
- Merge conflicts you will meet: `app/src/i18n/ui.{el,en,tr}.json` (add your keys under a **unique prefix**, e.g. `ui.pdf.*`, at the end), `docs/DECISIONS.md` (append). Keep both sides.
- Local e2e: `PW_BROWSER=chromium PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --project=app <spec>`; kill stale `vite preview` servers on ports 4173/4174 before running (Playwright reuses them).
- Messages to Bora are Turkish and short; code, commits, PR text, docs are English.

## Claude's files — do not touch (to avoid conflicts)
`app/src/ui/ParcelDetail.tsx`, `CropDetail.tsx`, `TodayDone.tsx`, `FieldWorkCard.tsx`, `FertPlanCard.tsx`, `CropPace.tsx`, `WaterCard.tsx`, `CropGuide.tsx`, `CrateLabelSheet.tsx`, `RecurringJobs.tsx`, `KaekCard.tsx`, `app/src/summary/crop-stats.ts`, `app/src/fieldwork/**`, `app/src/cuts/**`, `app/src/fert/**`, `app/src/recurring/**`, `app/src/db/**`, `supabase/**`, `.github/**`, `RUNBOOK.md`, `docs/STATUS.md`. Claude is doing next: last-year harvest comparison, and four calculators (water m³, seed kg, spray tank, fertiliser bags).

## Your tasks (independent; do them in this order, one PR each)

1. **Spray register as a Greek PDF** (Μητρώο ψεκασμών). Today only CSV / machine CSV / JSON / print exist (`app/src/export/**`, `app/src/ui/Register.tsx`). Add a print-ready Greek layout (A4, header with the owner's controller/business fields exactly as stored, one row per spray: date/time, parcel, crop, product + registration no., dose as recorded, label state, applicator, waiting periods as recorded; missing values printed «άγνωστο»). Use the browser's print-to-PDF (`window.print()` with a dedicated print stylesheet) — **no new dependency, no network, no tracking**. The register stays a DRAFT a person checks and signs: keep the existing disclosure text; never print a signature. Tests: unit for the row builder, Playwright for the screen + a check that no row shows a dose that differs from the stored string.
2. **Walk-the-boundary (GPS)**: on the parcel form/map (`app/src/ui/ParcelForm.tsx`, `ParcelMap.tsx`, `app/src/parcels/**`) let the owner walk the edge of a parcel and record points with the phone's location (`navigator.geolocation`, explicit "add point" taps, accuracy shown, points below a bad accuracy flagged, never silently accepted). Result goes through the existing validated `boundary` path (see `supabase/migrations/0040` and the phone's `boundary` handling): 2D polygon, area computed with turf, shown beside the typed area, never overwriting it. Works offline; location never leaves the phone. Playwright with a mocked geolocation.
3. **Season calendar from the grower's OWN records** (a new screen reached from Φυτά, file prefix `app/src/ui/SeasonCalendar*`, `app/src/summary/season-*`): per crop, which months it was sown and cut on this farm (from `plantings.sown_on` and `job_harvest.harvested_at`, Athens calendar months), a 12-month grid, with the number of records behind each month. No book data unless a source was **read and checked** (then name it with a link in `app/src/content/crop-ranges`, else «δεν υπάρχει πηγή»). Unit tests for the month counting incl. Athens midnight; Playwright at 375 px.

When a PR is green, tell Bora (Turkish, one line) and leave the merge to Claude Code unless he says otherwise. If you hit a decision that is Bora's (money, accounts, production, a source you cannot read), write one line in `docs/handoff/codex-notes.md` under "Asks for Claude/Bora" and move to the next task.

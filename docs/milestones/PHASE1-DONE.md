# Phase 1 – what is done and what is proven (2026-11-22)

Phase 1 = Bora (owner) + his workers, his own farm. Each line says what is PROVEN (a test, a merged PR, a document) and what is still waiting for Bora, a server step or Codex. ✅ = proven; 🟡 = built and tested, one step of Bora's or one server file left; ❌ = not done. Nothing here is scored by Claude alone: «PASS on the live site» is Codex's table (`docs/morning/2026-11-22-live/`, not in the repo yet).

## a) Bora and a worker sign in on their own phones; sync is on; records reach each other — 🟡
- ✅ Sign-in, invitation by e-mail / QR / link, worker-only screens, sync engine, outbox, «not accepted» sheet, 3-state marks: `live-auth`, `live-invite`, `live-golive`, `live-firstfarm`, `live-worker`, `live-job-cycle`, `live-worker-flow`, `live-sync-marks` (e2e with a stand-in server) and `live-rehearsal.test.ts` (real sync engine, two local databases) — `docs/perf/live-rehearsal-2026-11-21.md`.
- ✅ Production holds 0001–0035 (workflow «Supabase migrate (manual)», commit d17f739, run 45015103642, verify_applied green).
- 🟡 The real try-out on two real phones is Bora's: STATUS top, «LIVE açma» (6 steps) and «İşçiyi davet et» (5 steps); RUNBOOK §13 and §12c.
- 🟡 The worker's harvest destination, customers and the worker card reach the OWNER'S phone only after 0036 and 0037 are applied (today they stay on the phone that typed them and the screens say so).

## b) Spray → harvest lock with a signed label; the agronomist's approval is recorded in the app — ✅
- Lock by the recorded waiting period and the SIGNED label, no override: `harvest.spec` (blocked until the clock passes; an unsigned label = PHI unknown = blocked even far in the future), `spray.spec`, `labeluse.spec` (only a complete label can be signed; editing a value removes the signature), `worker-view.spec` (worker «Έγινε» lock), SQL `0032_planting_gate` / `0033_label_approvals` tests (`m14_approval.sql`).
- The agronomist is not a user: Bora records the sign-off («Έγκριση γεωπόνου» on the label, name + date); the Demo shows signed and deliberately unsigned examples (`app/src/db/demo-extra.ts`).
- No path lifts the lock without an approval: the harvest gate reads only signed label data or a typed value that does not open it before the period has run out (tests above).

## c) Harvest with store / direct dispatch; store and «Αύριο φεύγουν» agree with customer orders; text for the driver — 🟡
- ✅ Worker tiles «Αποθήκη» / «Απευθείας φόρτωση» + optional receiver (`harvest-destination.spec`), «Συγκομιδή στην αποθήκη» on Αποθήκη (`store-stock.spec`, `store-stock.test.ts`), customers + typed orders feeding «Αύριο φεύγουν» (`customers.spec`, `customer-orders.test.ts`), the tomorrow row opens per-customer orders, the store against them and «Αντιγραφή κειμένου» (`tomorrow-sheet.spec`), the Κλούβες backup import and its dispatch text (`dispatch.test.ts`, `dispatch.spec`).
- Held or old (no destination) crates are never added to the store (tests).
- 🟡 Server side: SQL 0036 (#362) and 0037 (#368) are written, tested with real `authenticated` roles, and wait for the Codex re-check and for Bora to apply them. The store does NOT yet go down when a load leaves (no outgoing record exists before the B1 stock table): the sheet says «not calculated» when the store quantity is unknown.

## d) Real weather (free MET Norway) on Σήμερα and the parcels — 🟡
- ✅ Edge function, schedule (0030/0032), workflow «Weather function deploy (manual)», one-page guide RUNBOOK §14a, Demo fictional weather labelled as such (`demo-screens.spec`).
- 🟡 Needs Bora: Vault/Secrets values and the workflow approval (RUNBOOK §14a, 10 lines). Hourly rows are NOT stored (the server keeps daily values only).

## e) Μητρώο exported with the Reg. (EU) 2023/564 fields — ✅
- `app/src/export/machine.ts` (fixed English columns mapped to the Annex, decimal point, ISO times with the Athens offset, separate warnings file; a missing authorisation number stays empty and is reported as «fill in»), mapping `docs/compliance/2023-564-mapping.md`, tests `machine.test.ts`, `register.test.ts`, `register.spec`, `register-v2.spec`.

## f) Backup / restore and account deletion work; the privacy text is current — 🟡
- ✅ Backup file, restore drill, wipe of the phone's data after a fresh backup: `backup.spec`, `restore-drill.spec`, `account-delete.spec`, `account-wipe.test.ts`, `backup*.test.ts`; server restore: `supabase/tests/restore.sh` (in the SQL suite).
- ✅ Privacy draft updated with customers, the worker card and the receiver: `docs/compliance/privacy-notice-draft.md` (the in-app notice must be updated on the day those fields sync).
- 🟡 Deleting the SERVER account and pseudonymising workers is not in the app yet (needs a server file after the lawyer's answers); the sheet says so and never claims it.

## g) Bora's R1–R30 PASS on the live site — 🟡
- Local evidence and honest PASS / PARTIAL per row: `docs/STATUS.md` (R-table). The live acceptance is Codex's (`docs/morning/2026-11-22-live/`).
- Known partial rows: R12 / R21–R23 / R25 (phone-only until 0036–0038), R15 (strips by area, not real positions), R18 / R30 (only spinach has sourced pH; EC and organic matter have none), R4 (daily weather only).

## Still needed from Bora (single steps)
1. Apply 0036 and 0037 when «main yeşil» is written (workflow «Supabase migrate (manual)»). 2. Weather: RUNBOOK §14a, say «tamam» first. 3. LIVE opening and the worker try-out on two phones. 4. The agronomist's visit (sign the real labels). 5. Lawyer's answers for the privacy notice.

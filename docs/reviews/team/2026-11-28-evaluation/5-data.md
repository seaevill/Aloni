# Aloni: data integrity and reliability review (dimension 5)

Checkout: `main` 682c32d (read-only, `git status` clean after the review). Reviewer: an independent, adversarial agent. Date: 2026-11-28.

## Score: 5 / 10

The **local** half is well built. The append-only guard holds against `put`, `bulkPut`, `update`, `delete` and `clear` (probe D9). Row and outbox entry go in one transaction. Phone transactions become all-or-nothing groups on the server. Ops are idempotent by `op_id`. Refusals are kept, never dropped. Demo rows never enter the outbox through `put()`. Restore verifies every photo before it writes anything. The SQL side is strong too: the full suite (0001–0042, Supabase layout) passed on a throwaway local Postgres + PostGIS (`run.sh supabase`: 43 tables with RLS, concurrency, restore drill, all green). A role scan found that a worker reads 0 rows of every owner-only table.

The **server round trip has never been exercised in the phone direction**. Sync is dormant (`LIVE` off), and the contract test only checks phone → server. Three confirmed P1 bugs will hit on the day Bora switches sync on:

1. Pulled rows replace the phone's own rows in server shape: numbers, a sign-off split over three columns, `+00:00` timestamps. Signed labels then read **blocked**.
2. The server refuses every correction of a server-pulled spray (`chain_no`).
3. A backup restore followed by sync either fails («nothing to update») or overwrites newer server data.

Every one of these fails safe: the app blocks, it never unblocks. But after go-live the live app is unusable for spray and harvest decisions, and one path erases the sign-off on the server.

## Method

- Read: `app/src/repo/*`, `app/src/sync/*`, `app/src/db/*`, `app/src/spray/{spray,harvest}.ts`, `labels/label-use.ts`, `worker/held.ts`, `account/wipe.ts`; migrations 0009–0015, 0023, 0024, 0027, 0042 (apply_one, apply_ops, pull, RLS, triggers); RUNBOOK §3 and §13; TECH-SPEC «Conflicts»; DECISIONS; BLOCKERS; durum.json q-2 and q-2b.
- Existing unit suite: `npx vitest run` gives **160 files, 919 passed, 18 skipped**.
- Probe tests (fake-indexeddb), in `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/`:
  - `data.test.ts` (D1–D12)
  - `roundtrip.test.ts` (D14)
  - `time.test.ts` (D13)
  - Run from `app/` with `npx vitest run --config /tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/vitest.config.ts`. Every probe except D9 fails, which is the intended red.
- SQL probes against a **throwaway local cluster** at `/var/tmp/pgs`, port 55432. It had to live outside the scratchpad because of the 107-byte socket-path limit and because `/tmp/claude-0` is mode 700. PostGIS came from apt. Nothing contacted Supabase or production. Files, all in `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/`:
  - `s_probe.sql`
  - `rls_scan.sql`
  - `s_parcel.sql`
  - `sqlrun.log`: the full suite log

## Findings

### F1 · P1 (P0 once LIVE is on): pulled rows overwrite the phone's own rows in the server's shape; signed labels read «blocked» and signatures can be erased

- **Evidence:**
  - `app/src/repo/sync-apply.ts:32-44`: `applyPulled` strips only `SERVER_ONLY` and then `t.put(clean)` for mutable tables. It skips a row only while its op is pending or rejected, so once the phone's own op is acked, the next pull returns that row and **replaces** it.
  - `pull()` (0042:118) serves `to_jsonb(x)`. On the local Postgres run:
    - `area_str: 1`, `dose_min: 0.025`, `qty_str: 4.5` and `phi_days: 7` come back as numbers, not strings.
    - The sign-off comes back as `sign_off_by` / `sign_off_on` / `sign_off_fingerprint`, not the phone's `sign_off {by,on,fingerprint}`.
    - «Not on label» comes back as `phi_days_not_on_label: false` and similar booleans.
    - Timestamps come back as `"2026-11-20T08:00:00+00:00"` or `"…14:54:03.218993+00:00"`.
  - The phone code reads only the phone shape:
    - `statusOf` / `signOffOf` (`labels/label-use.ts:93-100`) want `sign_off`.
    - `harvestGate` (`spray/harvest.ts:46-52`) wants `typeof sp.phi_days === 'string'`.
    - `parseInstant` (`packages/rules-core/src/waits.ts:33`) accepts only `^…T..:..:..Z$`. It even rejects the phone's own `toISOString()` with milliseconds.
- **Probes:**
  - **D14:** a signed label use goes through push (acked), then the server-shaped pull row arrives. Status `signed` becomes **`blocked`** and `sign_off` becomes `undefined`.
  - **D13:** `parseInstant` and `phiEnd` are unknown for `+00:00`, for microseconds and for `.000Z`.
- **Scenario:** Bora goes live. After the first minute every label he signed reads unsigned or blocked. Every pulled spray has an unknown PHI/REI, so harvest is blocked «unknown» everywhere and the worker's re-entry lock shows «unknown». Correction forms show an empty dose and quantity (`text()` of a number is `''`). If Bora then archives or edits that label, the row he sends has no `sign_off` object, and `normalize_label_row` (0012:28-31) sets **`sign_off_by/on/fingerprint = null` on the server**. The signature is gone from the row; only `audit_log` and the 0033 ledger keep it.
- **Fix:**
  - One `fromServer(table, row)` in `repo/sync-apply.ts`, applied in `applyPulled`. It strips the full server-owned list (shared with SQL), rebuilds `sign_off` from the three columns, maps `*_not_on_label: true` to `'not_on_label'`, turns numeric `*_str`, `phi_days`, `rei_hours`, `max_apps`, `dose_min` and `dose_max` into exact decimal strings, and canonicalises timestamps to `YYYY-MM-DDTHH:MM:SSZ`. **Round end times up, never down**: truncating microseconds must not shorten a PHI.
  - Plus a contract test fed by a **real** `pull()` output: pull, then phone edit, then `apply_ops` must say `applied`.

### F2 · P1: a correction of any spray that came from the server is always refused (`chain_no`)

- **Evidence:**
  - The phone's `SERVER_ONLY` (`repo/sync-apply.ts:6`) lacks `chain_no`.
  - `apply_one` (0012:38) has `chain_no` in `server_owned` and raises on it.
  - `buildCorrection` (`spray/spray.ts:172`) and `buildWaitEntry` (`:135`) copy `...rest` of the original.
- **Probes:**
  - D1: the pulled spray keeps `chain_no` locally (key list printed).
  - SQL `s_probe.sql` S2: a correction built from a real pulled row comes back `rejected, 42501, "column chain_no is set by the server, not sent by the phone"`. S2b, the same row without `chain_no`, comes back `applied`.
- **Scenario:** a worker's «Έγινε» spray (written by `complete_spray_job`), or any spray pulled onto a new phone, cannot be corrected and cannot get its waiting period typed in. The refusal is permanent.
- **Fix:** strip `chain_no` (part of F1's `fromServer`). Also make `buildCorrection` and `buildWaitEntry` copy only the phone-contract columns of `phone-columns.json`, not `...rest`.

### F3 · P1: restore-then-sync is broken: every restored mutable record is queued as «update»

- **Evidence:** `repo/backup.ts:85`: `put(db, table, r, isAppendOnly(table) ? 'insert' : 'update', origin)` runs even for rows that are **added** (not on the phone).
- **Server behaviour:** an update of a missing row raises `nothing to update` (0012:72). An update of an existing row is a whole-row overwrite (0012:64-70).
- **Probes:**
  - D8: after restoring onto a new phone the ops are `['parcels:update','workers:update']`.
  - SQL S3: an «update» of a row the server does not have comes back `rejected P0002 "nothing to update (no such row in this farm)"`.
- **Scenario A:** the phone is lost before go-live. Bora restores the file on the new phone (RUNBOOK §3) and runs the go-live wizard. Every parcel, planting, product, worker and job is refused, and go-live stops at `push`.
- **Scenario B:** the phone is lost after go-live. The restore happens before the first pull, and go-live pushes week-old rows over the server's newer ones: the workers' and the other device's changes are lost, and parcel and planting edits are refused for lacking a reason. `restoreBackup` only protects against **local** newer data.
- **Fix:**
  - The op follows the local state: `insert` when the row was not on the phone. The server's `insert … on conflict do nothing` then keeps the newer server row.
  - When sync is on, refuse a restore until a full pull has completed (or run one first).
  - RUNBOOK §3 and §13 get one line: «yedekten dönüş: önce giriş + eşitleme, sonra yedek».

### F4 · P1 (safety rule 4): Demo-farm data travels in a real backup and is queued to the server under the real farm id

- **Evidence:**
  - `repo/backup.ts:28`: `makeBackup` drops only `money:<demo>` from settings.
  - The Demo guide stores `cuts:`, `fert_plan:`, `harvest_plan:` and `recurring:` keyed by the Demo id (`db/demo-guide.ts:42-59`).
  - `parseBackup` checks Demo ids only in tables and media (`:42`), not in settings.
  - The adopting restore re-queues this phone's own settings through `putSetting(db, backup.farm.id, …)` (`:74-78`), filtering only device keys and ledgers.
  - `goLive`'s Demo check (`sync/golive.ts:38`) looks only for outbox rows whose `farm_id` is the Demo id, so it misses these.
  - `farm_settings` accepts any key.
- **Probe D5:**
  - The real backup contains `cuts:2843e10d…`, `fert_plan:…`, `harvest_plan:…` and `recurring:…`.
  - After an adopting restore, the same four are queued as `settings` ops under the **real** farm.
- **Fix:** one helper, `isDemoKey(k) = k.includes(DEMO_FARM_ID)`. Use it in `makeBackup`, `parseBackup` (refuse with `'demo'`), the restore's `mine` filter and `putSetting`. Add a test for each.

### F5 · P2: `putSetting` has no Demo guard (latent; it blocks go-live for good)

- **Evidence:** `repo/index.ts:80-86` always enqueues, unlike `put()`. `summary/observations-store.ts:13` calls it with `activeFarm.value`; that function is not called anywhere today.
- **Probe D4:** one Demo setting leaves an outbox row under the Demo id. `goLive` then answers `{"ok":false,"step":"demo_rows"}`, and no UI path removes it.
- **Fix:** in `putSetting`, when `farmId === DEMO_FARM_ID`, write locally only (no outbox). Covered by W3.

### F6 · P2: a record the server refused can end up labelled «sent» or unlabelled, then get silently replaced

- **Evidence:**
  - `dismissRejected` deletes the op (`repo/sync-apply.ts:23-26`).
  - `recordMarks` takes the highest-ranked op, so an earlier acked op of the same row yields `sent` (`sync/marks.ts`).
  - `applyPulled`'s `open` set no longer holds the row.
  - The wipe guard counts only `pending` (`ui/AccountSheet.tsx:19`), not rejected.
- **Probe D6:** the mark after «Το είδα» is `sent` while the local name is «B». After the next pull the local name is «A»: the phone-only edit vanished without a word.
- **Contradiction:** RUNBOOK §13.7 says «kayıt telefonda durur, kaybolmaz».
- **Fix:** keep the op with `status: 'dismissed'`; mark it «phone only»; don't let a pull overwrite it until it is re-saved or discarded explicitly; count rejected and dismissed ops as unsent in the wipe guard.

### F7 · P2: refused append-only rows stay in force locally; two offline corrections fork the chain

- **Evidence:**
  - Rejected ops leave their row in `job_spray` and `job_harvest`.
  - `effectiveSprays` (`spray/spray.ts:120-123`) treats every non-amended row as in force.
  - The server allows one correction per row (`job_spray_one_correction`, 0015:56).
- **Probe D3:** `effectiveSprays([o, a→o, b→o])` gives `['a','b']`.
- **Scenario:** two devices, or a correction made before the phone saw a worker's correction. The server refuses one correction, but the phone keeps showing both in the register, the harvest gate and the exports.
- **Fix:** rows whose latest op is rejected are excluded from decisions and exports and listed as «not accepted». `effectiveSprays` must pick one head deterministically and flag forks.

### F8 · P2: two devices editing the same record: whole-row last-arrival-wins, contrary to TECH-SPEC

- **Evidence:**
  - TECH-SPEC §«Conflicts» promises «per-field last-writer-wins».
  - `apply_one` writes the WHOLE row and nulls the nullable columns the phone left out (0012:64-70). The op carries no base version.
- **Probe D11:** A renames the parcel and B changes the area. After both push, the server row has B's area and A's old name. A's rename is silently lost, and A's phone shows the old name after its pull. The value survives only in `audit_log`.
- **Fix (needs SQL):** an optional `base` (the `updated_at` or `server_seq` the phone last saw) in the op. The server answers `conflict` when the row has moved on, and the phone shows it like a refusal. Alternatively, merge per field (send only the changed fields).

### F9 · P2: an amending row is stamped with the original author, not the corrector

- **Evidence:** `buildCorrection` and `buildWaitEntry` spread `...rest`, which includes `actor_id` and `device_id`. `putMany` keeps a row's own ids (`repo/index.ts:68-71`).
- **Probe D2:** the row's `actor_id` is `worker-actor` instead of the owner's id. The op envelope does carry the owner's id, so the two disagree.
- **Impact:** the audit trail of a correction names the wrong person and phone. The server's `created_by` is correct.
- **Fix:** drop `actor_id` and `device_id` before stamping (part of W5).

### F10 · P2: a pull `reset` never removes rows the server no longer shows (worker phones)

- **Evidence:** `sync/engine.ts:67-80`: a reset only re-applies rows. The SQL test m18 checks that the fresh pull lacks the taken job, but the phone keeps it.
- **Probe D10:** the job is still local after the reset.
- **Scenario:** the owner gives a worker's job to someone else. It stays «mine» on her phone, and «Έγινε» is then refused. A taken board job also stays on the loser's board.
- **Fix:** on `reset`, collect the ids seen during the full re-pull, then delete local rows of the visibility-scoped tables (`jobs`, `job_plantings`, products and labels of those jobs) that were not seen and are not pending. Bypass the append-only guard only for rows that came from the server on a **worker** phone.

### F11 · P2: send order depends on the phone's wall clock

- **Evidence:**
  - `stamp()` (`repo/index.ts:39-40`) is monotonic only in memory and resets on reload.
  - `batches` sorts by `at` (`sync/engine.ts:34-35`).
  - Queued RPCs always go before table ops (`:48-51`).
- **Probe D7:** with the clock a week fast, then corrected, a planting sorts before its parcel. The server refuses the planting (FK), refusals are never retried, and the planting is lost to the server until Bora saves it again.
- **Fix:** persist a counter (`settings.op_seq`) and order by it. Put RPCs in the same order.

### F12 · P3: acked ops are never pruned

- **Probe D12:** 20 writes, all acked, leave 20 outbox rows, each with a full copy of the row.
- **Impact:** `refreshPending` reads the whole outbox on **every** write (`repo/index.ts:97-103`), so the outbox grows forever and slows every save on an iPhone.
- **Fix:** keep acked ops for N days or the last one per row, then delete them.

### F13 · P3 (needs SQL): a worker can read the farm's whole `applied_ops`, including owner-only activity

- **Evidence:** the policy is `applied_ops_select` = `has_role(farm, owner|worker)`.
- **SQL scan (worker b2):** she sees 19 rows naming `field_work`, `field_cuts`, `stock_movements` and `farm_settings`, with times and `applied_by`. That is metadata of tables she cannot read.
- **Fix:** a new migration: a worker sees only rows with `applied_by = auth.uid()`.

### F14 · P3: owner settings never come back from the server

- **Evidence:** `pull()` serves `farm_settings`, but `applyPulled` drops tables it doesn't know (`sync-apply.ts:37`), and the local table is `settings`.
- **Impact:** a new phone, even after sync, has no business, controller or notification settings unless restored from a file.
- **Fix:** map `farm_settings` to `settings`.

### F15 · P3: restore compares timestamps as strings across mixed formats

- **Evidence:** `stampOf` (`backup.ts:51,84`). Once F1 lands pulled `+00:00` values, string comparison misorders them: `"…:00+00:00"` sorts before `"…:00.000Z"` for the same instant. Compare with `Date.parse` instead.

### Intermittent tests

- **q-2b** (`m18_job_board.sql:90`): I agree with the QUEUE hypothesis. `pull()` serves only rows with `sync_xid < pg_snapshot_xmin(...)`, so any concurrent transaction (autovacuum or analyze) holds back the owner's update made one statement earlier. That is correct behaviour, and the test assumes an idle server. The fix is test-only: a bounded wait loop before the first pull. It passed locally. **Needs a `supabase/tests` merge by Bora.**
- **q-2** (`restore-drill.spec.ts`, stuck with an empty type box): `account-wipe` is `disabled` until `typed === phrase`. An empty box at click time means either the sheet remounted after `fill` (local `typed` state reset) or the fill landed before the input was bound. Proposed test-side hardening:
  ```ts
  await expect(async () => {
    await page.getByTestId('account-typed').fill('Το κτήμα μου');
    await expect(page.getByTestId('account-wipe')).toBeEnabled({ timeout: 1000 });
  }).toPass();
  ```
  If it fails again, log `typed` and `phrase` to find the remount. I have not proven the root cause.

## Confirmed bugs and their minimal failing probes

| Bug | Probe |
|---|---|
| F1 | `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/roundtrip.test.ts` (D14) and `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/time.test.ts` (D13) |
| F2 | `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/data.test.ts` (D1) and `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/s_probe.sql` (S2) |
| F3 | `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/data.test.ts` (D8) and `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/s_probe.sql` (S3) |
| F4, F5, F6, F7, F8, F9, F10, F11, F12 | `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/probes/data.test.ts`: D5, D4, D6, D3, D11, D2, D10, D7, D12 |
| F13 | `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-data/rls_scan.sql` plus the `applied_ops` query in this report |

## One-PR work items (each ≤450 lines)

| # | Item | Size | Needs SQL? |
|---|---|---|---|
| W1 | **Pull normaliser** (F1, F2, F14, F15): `fromServer()` in `repo/sync-apply.ts` with the server-owned list shared with SQL (incl. `chain_no`), the sign-off and not-on-label mapping, decimal strings, Z-second timestamps (ends rounded UP), and `farm_settings` → `settings`. Unit tests use row fixtures copied from a real `pull()`. | ~300 | No (app only) |
| W1b | **Reverse contract fixture:** `supabase/tests/pull-shape.json`, made by `contract.sh` from a real `pull()`. The phone test pulls, edits and sends back, and checks that `apply_ops` answers `applied` for every table. | ~200 | **Needs SQL** (supabase/tests; Bora merges) |
| W2 | **Restore op follows local state** (F3): `insert` unless the row is on the phone; refuse a restore while sync is on and no full pull has completed; one Turkish line in RUNBOOK §3. | ~150 | No |
| W3 | **Demo isolation for settings** (F4, F5): `isDemoKey`; filter it in `makeBackup` and the restore's `mine`; refuse in `parseBackup`; `putSetting` stays local for Demo; four red tests first. | ~120 | No |
| W4 | **Refusal honesty** (F6, F7): status `dismissed` instead of delete; mark «phone only»; `applyPulled` doesn't overwrite dismissed rows; the wipe guard counts rejected and dismissed; refused append-only rows are excluded from gates and exports; one head per correction chain. | ~350 | No |
| W5 | **Attribution and order** (F9, F11): strip `actor_id`/`device_id` in amending builders; a persisted `op_seq` replaces wall-clock order; RPCs share the same order. | ~200 | No |
| W6 | **Reset reconcile on worker phones** (F10): delete unseen, non-pending, visibility-scoped rows after a reset pull. | ~200 | No |
| W7 | **Outbox pruning** (F12). | ~80 | No |
| W8 | **`applied_ops` worker scope** (F13): migration 0043 with a red test (real owner and worker roles). | ~60 | **Needs SQL** |
| W9 | **Conflict detection** (F8): `base` in the op, a server `conflict` answer, and the phone shows it. TECH-SPEC promises per-field LWW: decide first whether to implement it or correct the spec in DECISIONS. | ~400 | **Needs SQL** |
| W10 | **Intermittents:** the m18 wait loop (q-2b), which **needs a supabase/tests merge by Bora**; and the restore-drill `toPass` hardening (q-2), app e2e only. | ~40 | Partly |

**Recommended order:** W1 → W2 → W3 → W1b, all **before** Bora sets `VITE_LIVE=true` (RUNBOOK §12b and §13). Then W4 and W5.

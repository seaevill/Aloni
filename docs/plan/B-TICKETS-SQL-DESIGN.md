# B1–B5 SQL design (2026-11-21) – designed, NOT built

Spec: `docs/plan/bora-feedback-2026-11-21.md` §0–§3. Numbers: B1 = 0036, B2 = 0037, B3 = 0038, B4 = 0039, B5 = 0040 (the approval stage 2 and the push sender of `docs/plan/SQL-DESIGNS-0036-0037.md` move to 0041 and 0042). Each is ONE separate PR, red test first with real `authenticated` owner and worker roles, Codex review, no merge, Bora applies by workflow.

## Why none is built yet (honest)
Every ticket touches the **sync machinery**, not only a table: `sync_table()` (whitelist), `apply_one` (generic columns), the pull RPC and `sync_visibility()` (what a worker sees; its hash decides when a phone re-pulls), the phone contract (`supabase/tests/phone-columns.json`) and the phone's outbox/Dexie schema. A migration without the matching phone change either blocks writes (unknown column refused) or is invisible to the phone. So each ticket = migration + contract + phone change shipped together, tested end to end with the mock two-phone harness. That is a dedicated pass per ticket, not a late add-on.

## B1 Harvest destination + stock (0036)
- `job_harvest`: `destination text not null default 'store' check in ('store','direct')` (the default is a label, not a safety value). Receiver name/phone are PERSONAL DATA: separate table `harvest_receivers(id, farm_id, harvest_id unique, name text ≤80, phone text ≤30, created_at, created_by)`; RLS: insert by the harvest's worker or owner, **select owner only**; append-only (corrections = amending row); audited; kept like the harvest (≥3 years). Privacy notice line + RUNBOOK + DECISIONS in the same PR.
- Stock: `harvest_stock_movements(id, farm_id, crop_id, planting_id, kind in ('in','out'), crates int > 0, harvest_id, dispatch_ref, created_at, …)` append-only; «in» is written by a trigger from a `store` harvest, «out» by the owner's dispatch; the balance per crop is a view (in − out, oldest first). Direct dispatch never enters stock.
- Tests: worker cannot read `harvest_receivers`; owner can; direct harvest makes no «in»; balance = in − out; append-only refusals; stranger sees nothing.

## B2 Planting geometry (0037)
`plantings.geom geometry(Polygon,4326) null`, constraint trigger: `ST_Within(geom, parcel.boundary)` when both exist; computed `area_m2` stored beside the typed στρ. (never replaces it; a difference is shown, not corrected). Tests: outside polygon refused, inside accepted, null allowed, worker cannot write.

## B3 Job board (0038)
`claim_job(p_job)` security definer: caller is an active worker member linked to a roster worker; `update jobs set worker_id = me, status = status where id = p_job and worker_id is null and status = 'planned'` — **zero rows = «already taken»** (first wins, one atomic statement, tested with two connections like `first_farm_concurrency.sh`); writes `job_claims` (audit row the owner reads) so the owner is «notified» in-app on the next pull; push later (0042). `release_job` (owner only). `sync_visibility()` and the worker read policy include OPEN jobs (`worker_id is null`) of the farm, and the visibility hash changes when a job is claimed. Tests: two workers race, loser gets the refusal; owner reassigns; stranger sees nothing.

## B4 Tomorrow notes (0039)
`day_notes(id, farm_id, for_day date, text ≤280, author_user, from_worker boolean, status in ('open','confirmed','deleted'), …)` append-only with status rows; worker inserts (`from_worker = true` forced by the server, never taken from the request), owner confirms/deletes. Tests: the flag cannot be forged, worker cannot confirm, audit rows exist.

## B5 Crop targets (0040)
`crop_targets(id, farm_id, crop_id, season_start date, target_crates int > 0, …)` owner only (read and write); amending rows, newest wins. The crop sheet shows «δεν έχει οριστεί στόχος» until a row exists. Tests: worker sees nothing; amend keeps history.

## Phone side (separate PRs after each migration is applied)
Contract regeneration, Dexie stores, outbox ops, the screens: harvest destination step (worker flow), stock view (Codex), job board and tomorrow notes (Claude), season target field.

## Update 2026-11-21 (night): B1 first slice built = 0036 `job_harvest.destination`
- **0036** (`supabase/migrations/0036_harvest_destination.sql`, tests `supabase/tests/m16_destination.sql` written first): `destination text` with `check (destination is null or in ('store','direct'))`. **Deviation from the design above, on purpose:** the column is NULLABLE and has NO default. Empty = unknown (old records, old phones); a default of 'store' would invent a fact about every old harvest and would make the stock count wrong. A later file may require it for signed-in writers once the phone sends it (the same two-step as 0031).
- **Not in 0036 (next slices):** `harvest_receivers` (owner-only buyer name/phone, personal data → also needs `sync_table()` and the owner-only pull) and the append-only stock movement table. Codex's local stock accounting (X13) works from `job_harvest` + `destination` once the phone has the field.
- **Phone side after 0036 is applied:** add `destination` to the phone contract file, the harvest form step (worker flow, big «Στο μαγαζί» / «Απευθείας» buttons), the unknown shown as «άγνωστο». Numbering: 0037 = receivers; B2–B5 follow (the earlier 0037–0040 numbers shift by one).


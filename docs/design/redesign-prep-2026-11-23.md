# ALONI 2.0 — presentation redesign preparation (2026-11-23)

Status: **freeze of new user-facing features** (urgent security / data-loss / critical-function fixes excepted). This document is an audit of `origin/main` (c20a967 + wrangler fix #510 pending). No redesign is implemented; implementation waits for the founder's choice between the two interactive concepts Codex is preparing. All counts below come from the code at that commit; click paths come from the e2e helpers (`tests/e2e/helpers/farm.ts` and the specs named), not from a stopwatch.

## 1. Navigation today
* **5 tabs** (`ui/App.tsx`): Σήμερα · Φυτά · Χωράφια · Αποθήκη · Άλλα. A separate **worker app** (no tabs) for a roster worker's own account; in Demo it is entered from Άλλα.
* **Άλλα** is a hub: Μητρώο ψεκασμών · Παραγγελίες · Πελάτες · Εργάτες · Εβδομαδιαία αναφορά · Φωτογραφίες · Πληροφορίες (+ «worker view» in Demo only), then a settings block (language, farm/Demo switch, Demo load/reset, "this phone / opened from", a developer section). Each entry replaces the tab's content (`setView`), with its own back bar.
* **~24 sheet kinds** (`registerSheet`): account, crate(s), crop, cut, done, install, invite, job(s), notices, parcels, product, refused, spray, spraycalc, store, tomorrow, wait, weather, whatsnew, worker … opened by hash `#/<own|demo>/<tab>/sheet/<kind>/<id>` (deep links, Back gesture).
* **~95 UI files** under `app/src/ui`.
* **Six status surfaces** can stack above any screen: UpdateBar, LeaveBar, DemoRibbon, SyncChip, RejectedList, BackupBanner (+ Toast and sheets on top).
* **Σήμερα** carries: header/farm, numbers strip, big «Ψεκασμός» and «Συγκομιδή» buttons, the round «＋» (QuickAdd: spray, harvest, observation, job), «Προγραμματισμός εργασίας», counts of jobs, cut list, «Αύριο φεύγουν», weather strip, urgent card, history link.

## 2. Main points of friction
1. **One action, several doors.** Spray/harvest start from the big buttons AND from «＋»; job planning from its own button AND from «＋». Three entry styles for the same four actions.
2. **Records are split three ways.** Ιστορικό (Σήμερα), Μητρώο ψεκασμών (Άλλα) and the parcel Χρονολόγιο each show part of the same truth with different filters.
3. **"Stock" means two things.** Αποθήκη = chemical products/labels/lots (admin-heavy) AND cut crates in the store (sheets/«store»). A farmer thinks of them as different jobs.
4. **Crop-selling lives in the wrong place.** Orders, Customers, «Αύριο φεύγουν», crate labels and the weekly report are spread over Άλλα and Σήμερα.
5. **Άλλα mixes daily work with settings and developer tools.** Register/orders/workers sit next to language, Demo reset and a developer section.
6. **Parcel detail is a long stack of cards** (sketch, ΚΑΕΚ, planting list, field work, water, weather, last sprays, timeline, analyses…). The most-needed facts are not the first thing.
7. **Status noise.** Up to six strips plus per-card "stored only on this phone" explanations repeat the same few facts (Demo, offline/sync, backup).
8. **First-time setup is long** (parcel → planting → product → label use with four numbers → agronomist sign-off → first lot → worker): ~25 steps before the first spray can be recorded. It is correct for safety but nothing guides it.
9. **Concept overload:** planting vs crop vs parcel; job vs spray record vs observation; label use vs product.

## 3. Features → farmer jobs
| Farmer's job | Today it lives in | Notes |
|---|---|---|
| «What must I do today?» | Σήμερα (counts, jobs, urgent, cut list) | good place; too many blocks below |
| Record a spray | Σήμερα big button / ＋ | safety gate: label use, PHI/REI |
| Record a harvest / crates cut | Σήμερα big button / ＋ ; worker harvest tab | PHI gate; destination store/dispatch |
| Plan and assign work | Σήμερα «Προγραμματισμός», ＋; Εργασίες sheet; recurring jobs | all job kinds list since #503 (not merged) |
| Can I cut this field? | Σήμερα cut list; parcel sketch; Φυτά | `harvestGate` |
| Fields and what grows on them | Χωράφια, Φυτά | planting is created from Φυτά, tied to a parcel |
| Chemicals, labels, lots | Αποθήκη | append-only movements |
| What went to the store / leaves tomorrow | Αποθήκη sheets, Σήμερα «Αύριο φεύγουν» | needs Klouves import |
| Orders, customers, labels | Άλλα → Παραγγελίες / Πελάτες; crate label sheet | |
| Workers | Άλλα → Εργάτες; worker app | role split |
| Observations / photos | ＋, worker app, Άλλα → Φωτογραφίες | owner «seen» flag only |
| Weather and water | Σήμερα strip, parcel card, weather sheet | information only |
| Records for inspection | Μητρώο ψεκασμών (print/PDF), weekly report | |
| Money | #484/#485 (not merged) | |
| Backup, language, Demo | Άλλα, banners | |

## 4. Duplicated surfaces / redundant warnings / extra steps
* Duplicated: spray/harvest/job entries (big buttons vs ＋); history (Ιστορικό vs Μητρώο vs Χρονολόγιο); weather (strip vs sheet vs parcel card vs water card); «only on this phone» line repeated on each local-record card; Demo explained by ribbon + per-screen demo notes; worker "reviewed" vs notices bell.
* Redundant warnings: SyncChip + BackupBanner + UpdateBar + offline note can all speak at once; the Demo ribbon plus demo notes on Crops/Parcels/Stock/Customers/Photos.
* Extra steps: Άλλα → entry → back (two taps to reach the register); stock receive = Αποθήκη → product → stock → receive; planning a spray needs the planting, product, then the dose tap and worker.
* (Several of these were already reduced in #503 — not merged; see §7.)

## 5. The three most important workflows (current click paths)
Counts = taps (T) and typed fields (F) after the data exists; first-time prerequisites are separate.
**A. Record a spray** (`helpers/farm.ts: spray()`): Σήμερα → «Ψεκασμός» (T1) → planting chip (T2) → product chip (T3) → worker chip (T4) → start time (F1, never pre-filled) → «Ίδια με την ετικέτα» dose (T5) → quantity used (F2) → Save (T6). **6T + 2F.** The app blocks if the label use is unsigned/incomplete; it never fills a dose.
**B. Record a harvest** (`harvest.spec.ts`): Σήμερα → «Συγκομιδή» (T1) → planting chip (T2) → crates via +1 ×N or typed (N T or F1) → cutter (T3, required) → [destination store/dispatch, T4] → Save (T5). **5T + crates.** Blocked while a waiting period runs or is unknown.
**C. Plan a job and have it done** (`job-assign.spec.ts`, `worker-view.spec.ts`): owner: Σήμερα → «Προγραμματισμός» (T1) → planting (T2) → product (T3) → dose tap (T4) → worker (T5) → Save (T6) = **6T**. Worker: opens app → job card → «Έγινε» (T1) → start time (F1) → confirm (T2) → 10 s undo window. **2T + 1F.**
**First-time setup before A works:** parcel (name, area) → planting (parcel, crop, area) → product (name, type, unit) → label use (crop, dose, unit, four numbers) → sign-off by agronomist name → receive first lot (expiry, qty) → add worker ≈ **25+ steps**, one time.

## 6. What stays unchanged (business logic, data, safety)
Everything below is independent of the presentation layer and must keep its tests green:
* `packages/rules-core` (decimals, `parseDecimal/parseWhole`, rules), `spray/*` (label use, `signedUseOf`, `harvestGate`, PHI/REI, `effectiveSprays`), `stock/*`, `orders/*` (supply, tomorrow, store stock), `summary/*` (today, jobs, wait, timeline, crop-stats, parcel-yield, water, year-compare, season-calendar), `fieldwork`, `cuts`, `kaek`, `fert`, `seed`, `spraycalc`, `recurring`, `worker/*`.
* Data and sync: Dexie schema (v9), sync engine, outbox, owner-records server mode flag, Supabase migrations 0001–0035 applied, RLS, SQL tests, the append-only/tombstone rules, audit logging. SQL 0042 (#500) stays a separate PR applied only through the approved workflow.
* Safety rules in CLAUDE.md: never invent label data; the app suggests, never decides; `[SET]` thresholds unsigned = no decisions; Demo isolated from real data; owner-only personal data; no tracking.
* Offline-first behaviour: service worker precache, local-first writes, hash routes, Back/undo behaviour, role split owner/worker.
* i18n: Greek first, el/tr/en (+hi worker screens); lint rules R01/R06/D05/U01–U03 and the tokens test.

## 7. Pending PRs — critical vs optional (recommendation; nothing merged)
| PR | What | Class | Recommendation |
|---|---|---|---|
| #510 | `previews: {}` in wrangler.jsonc | infrastructure (PR previews failed) | keep; tiny; needed to get previews for any branch |
| **npm audit** | `maplibre-gl` critical XSS (production dep, fix 6.19.0 = major); 6 dev-tool findings (vitest chain) | **security** | allowed under the freeze: separate PR for maplibre-gl with the map e2e; vitest bump separately |
| #500 | SQL 0042 (ΚΑΕΚ, cuts, field work tables) | data-loss risk reduction (phone-local records) | keep; review/apply only through Bora's workflow; **phone sync not written** |
| #460 | readiness expects 0037 | HOLD | stays until Bora applies 0036+0037 |
| #503 | recovery/polish bundle | mixed | **critical functional fixes**: urgent button opened generic History; non-spray jobs were hidden from the jobs list/overdue count (+ tests). **Presentation** (NoteTip, status row, crops list meta, Today order): optional and likely replaced by 2.0. Recommend: do not merge the bundle; cherry-pick the two functional fixes with their tests into a small PR if the founder wants them before 2.0 |
| #504 / #507 | parcel productivity; timeline events | optional features, but pure calculations (`summary/*`) reusable by any UI | keep as data layer; their cards are presentation to re-home in 2.0; hold until Codex review |
| #508 | unmet-demand research prototype + audit | research | keep unmerged / docs only |
| #484 / #485 | money ledger F1 (core / screen) | optional feature | decision with Bora; ledger core is UI-independent, screen is presentation |
| #306 | dependabot group (red) | maintenance | triage after freeze; check security relevance first |
| #509, #488, #481, #480, #471 | docs | docs | merge any time (no runtime effect) |

## 8. Integration strategy: replace the presentation layer, keep the core
1. **Stable seam = the pure modules.** Screens call `summary/*`, `spray/*`, `stock/*`, `orders/*` functions that take rows and return plain data. The new UI must call those, not re-implement them. Where a screen today computes inline (e.g. parts of `Today.tsx`, `ParcelDetail.tsx`), first extract a `…Model()` selector with a unit test, **before** any visual change (behaviour-preserving PRs).
2. **Side-by-side behind a device-local switch.** New shell in `app/src/ui2/` selected by a settings key (`ui_version`, default old; never synced, never server-side). Both shells share: `nav.ts` hash routes (deep links stay valid), `registerSheet`, `Toast`, `repo`, i18n keys, the SW. Old UI keeps working until the founder retires it.
3. **Migrate by job, not by screen:** (a) daily "today" board, (b) the three workflows A/B/C, (c) fields/crops, (d) store & selling, (e) settings. Each slice ships with: the existing e2e for the same behaviour re-pointed at the new test ids (or the same ids kept), the UX-bar/axe spec, 375 px WebKit run, el/tr/en text-fit check.
4. **Contract tests before moving UI:** keep the e2e that encode safety (harvest blocked by PHI, unknown ≠ 0, doses not rounded, unsigned label blocks, Demo isolation, worker cannot see stock/prices). They are the acceptance suite for 2.0.
5. **Budget and offline:** one 190 KB-gzip first-load chunk today; the new shell must lazy-load (route chunks + SW precache) instead of raising the baseline. Offline specs stay mandatory.
6. **Safety of rollout:** no production change; no migration is needed for a presentation swap; RLS untouched; the switch is per phone so Bora can test 2.0 on his iPhone while workers stay on the old UI.
7. **Retire old UI only after** founder approval, a full e2e pass in WebKit CI, and a Greek test checklist run by Bora.

## 9. Navigation proposal inputs for the founder (not a decision)
| Keep | Simplify | Relocate | Remove from navigation |
|---|---|---|---|
| Today as the home; the five core jobs (spray, harvest, plan, observe, cut check) | one entry per action (drop the duplicate door); one status line instead of six surfaces; parcel detail with the 3 key facts first | selling (orders, customers, tomorrow, labels, weekly report) into one «Πωλήσεις» area; Μητρώο/Ιστορικό/Χρονολόγιο merged into one record view with filters; chemicals admin out of the daily path | language/Demo/developer/«this phone» into a Settings sheet; worker view entry out of the owner menu |
Open questions for the founder: one phone for the farm or one per worker; is Money (F1) part of 2.0; are Orders in 2.0 scope before Klouves integration; Albanian for workers.

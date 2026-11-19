# Beta 2 – team meeting decisions (2026-11-19, evening)

Repo: `seaevill/Aloni@d21df3d`. Inputs: `beta2-owner.md` (OW-*), `beta2-workers.md` (W*), `beta2-growers.md` (F-01..F-20), `beta2-eng.md` (E*), `beta2-store.md` (F-S*, F-G*, F-A*), `beta2-design.md` (D*), and the queued `m7-recheck.md`.
Weighting used: Bora (owner) and the workers first; engineers decided feasibility; anything against the CLAUDE.md safety rules was rejected.

Ground rules for tonight (from CLAUDE.md, not negotiable):
- One branch + one PR per ticket into `main`. Never push to `main`. CI green: typecheck, Vitest, Playwright at 375 px in WebKit. (WebKit was missing in the lab; CI has it.)
- Safety rules 1–5 hold in every ticket. Missing label data stays **blocked/unknown**. Demo label values exist **only** in the Demo farm (`DEMO_FARM_ID`) and must be marked fictional.
- Every decision below goes into `docs/DECISIONS.md` dated 2026-11-19 and marked "Temporary – Bora will confirm".
- When done: a Turkish summary for Bora in `docs/STATUS.md` and the Greek checklist from the last section of this file.

---

## 1. Decisions

1. The M7 SQL MUSTs (N1 per-planting crop match, N2 now+5 min gate; N3 in the same pass) go first, exactly as queued in `m7-recheck.md`. Not re-planned here. — m7 N1/N2/N3
2. "The view vanishes" is fixed at the root: no silent reload on deploy (update prompt), screen state in the URL hash, and the Back gesture closes the sub-screen instead of leaving the app. — E1, E2, E5, E8, OW-12, OW-22, F-08, F-13, D18
3. Every save is single-shot (shared in-flight guard), and the worker's "saved" means really saved, even if the app is killed within the 10 s undo. — E3, W1
4. Real and demo data never share storage: the Κλούβες import and crop map are stored per farm; the demo gets its own fictional sample; its crop slugs are fixed. — OW-05, F-03, safety rule 4
5. The app never fills in an applied dose, never lets you plan a spray for a crop with no label data, and a missing stock quantity is a flagged "δεν ξέρω", not silence. When a PHI is blocked because the label is unsigned, the message says so. — OW-07, OW-08, OW-06, OW-18, OW-02, safety rules 1–2
6. Σήμερα is rebuilt around Bora's four 06:30 questions: what can I cut, what goes out tomorrow (per client), today's/overdue/tomorrow's jobs, and two big action buttons. Weather and KPIs move below. One status line instead of two banners. — OW-01, OW-03, OW-21, F-05, F-12, F-15, F-16, D01, D03, D12, D19, E4, E16, OW-19
7. Daily dispatch per client is read from the Κλούβες backup, with a one-tap "Αντιγραφή για οδηγό" (share or clipboard). Κλούβες stays the order-entry app in Phase 1. — OW-04, F-02, F-04, F-14, OW-28
8. Greek dates and number formats on every screen (job rows, register screen, stock). ISO only in the machine CSV. Overdue jobs are a separate group. — F-10, D11, E13, OW-10 (1–2), OW-11, D16
9. Worker language belongs to the worker view (stored separately from the owner's language) and defaults to the phone language. Hindi covers every string a worker can reach; crop names show Hindi + Greek. — W2, W5, W15, W16, E19, OW-24, F-A2
10. The worker privacy notice is reachable from the worker view, short, in the worker's language, shown once before/at first sign-in. Its text matches what the code stores. — W10, F-G1, F-G2
11. The Demo farm becomes writable for the owner (writes stay in `DEMO_FARM_ID`, never synced), with "Επαναφορά επίδειξης". The app reopens on the last farm used, with the demo banner. One demo job is unlocked using a fictional REI (demo only). — F-07, OW-23, W11, E14, D10, W18
12. Missing data is shown amber ("Λείπει αναμονή"), a running hold red; both stay blocked. The hero shows a running hold before a missing-data item; missing-data items are grouped. — D01, D10, OW-03
13. One header style on every tab: the dark band (prototype, BACKLOG E2). The wordmark «Αλώνι» shows on Σήμερα and in Άλλα, read from `config.ts` only (name is provisional). — D04, D14, D17, D21, D22 (maskable only)
14. Developer-only items (migration/Advisor confirmations, raw rules list) move behind a collapsed «Για προγραμματιστές» section in Άλλα. Draft labels (προσχέδιο, translation to be checked) stay until their sign-off exists. — F-S1, F-S4, OW-20, F-06, E21
15. Phase 1 does not go to the public stores. Later: TestFlight / Play internal track. Account deletion + worker pseudonymisation are designed now (doc) and built together with LIVE, before any worker account exists. — F-S2, F-S3, F-S5, F-G3

---

## 2. Rejected / deferred

| Item | Status | Reason |
|---|---|---|
| Custom crops for neighbours (F-01), μαρούλι etc. | Deferred → Phase 2 pilot | Phase 1 is Bora's farm only; catalog slugs are shared with Κλούβες. Not cheap to do right (no agronomic data, label matching, sync). Re-open at pilot planning. |
| Job kinds (harvest/weeding/irrigation) + multi-worker jobs (OW-10.3), per-worker history (OW-25) | Deferred → next milestone plan (`docs/milestones/`) | M-size feature, needs Bora's scope confirmation. |
| Rule sign-off screen + printable «Προς υπογραφή» (OW-09, OW-27) | Deferred → own small milestone with the agronomist | Safety-sensitive (rule 3); needs the agronomist's input on what he signs and how. Nothing writes `rule_signoffs` until then, so rules stay info-only (safe). |
| Any auto-filled dose, quantity or PHI/REI (incl. "dose × area" written into the field) | **Rejected** | Safety rules 1–2. A hint text beside the field is allowed; the field stays empty. |
| Prefilling PHI/REI from an unsigned label into the owner's entry | **Rejected** | Rule 1. Label values may be shown **beside** empty fields for reference (OW-02). |
| Guessing "1,250" in stock quantity (E11) | **Rejected** (keep refusing) | Never guess; only the message improves. |
| Auto-mapping Κλούβες products by guess | **Rejected** | Only the aliases Bora already decided (DECISIONS 2026-11-16: Ραδίκια + Άγρια = «Ραδίκια άγρια»; plus Κρεμμύδι → «Κρεμμύδι (φρέσκο)») are suggested, and the owner confirms. |
| REI covering the whole parcel in the harvest gate (OW-26) | Deferred | Agronomist question (see Needs Bora). |
| «Κάρτα ημέρας» share image (D24), reel ideas | Deferred → after Phase 1 | Marketing; not needed for the farm to run. |
| Public store submission, review account (F-S3), Capacitor checklist (F-S6), iOS splash (D23, E18 splash) | Deferred | Phase 1 is single-farm (4.2 risk). TestFlight / Play internal later. |
| New icon artwork (threshing-floor ring, D22) | Deferred | After the name/trademark checks. Tonight only the maskable safe-zone fix. |
| Owner PIN on exiting worker view (W17) | Deferred | Depends on the open "shared farm phone" decision. |
| Pseudonymisation code, retention job (F-G3), encrypted backup (F-G4 part 2) | Deferred → with LIVE | Design doc tonight; no server accounts exist yet. |
| Legal basis split per purpose (F-G5) | Deferred → lawyer | Mark in the data inventory doc. |
| Map out of the precache, lazy i18n (E6), BroadcastChannel (E9) | Deferred → next week | Real but not user-blocking tonight. |
| Rename «Αποθήκη» / produce stock (OW-14) | Deferred | Bora question 5. |
| ½-crate harvest steps (F-14 part) | Deferred | Bora question 2. |
| Haptics/animations on Done (growers P3) | Rejected | Nice-to-have, no farm value now. |
| Dark mode (D25) | Rejected – light only | Sun readability. Record in DECISIONS, add `<meta name="color-scheme" content="light">` (T16). |

---

## 3. Overnight work order

T0 (already queued, not re-planned): `m7-recheck.md` N1 + N2 (+ N3 in the same pass). Then:

### T1 – Repo hygiene: unresolved merge markers in DECISIONS.md
- Findings: found while preparing this meeting — `docs/DECISIONS.md` lines 17–20 and 164 contain `=======`, `>>>>>>> 1ce41f9`, `<<<<<<< HEAD` on `main`. E20 (skipped golden count).
- Change: resolve by keeping every row once (newest first). Add a Vitest `no-conflict-markers.test.ts` that scans tracked `*.md, *.ts, *.tsx, *.json, *.sql` for `^(<<<<<<<|=======|>>>>>>>)( |$)`. Print the skipped golden count in the CI summary and fail if it grows over the number in STATUS.
- Acceptance: Vitest test above passes; it fails on a fixture containing a marker.
- Size: XS.

### T2 – Update prompt instead of silent reload
- Findings: E1 (BLOCKER), E7, E8; "view vanishes" (OW, growers F-13).
- Change: `app/vite.config.ts`: `registerType: 'prompt'`, `workbox.skipWaiting: false`, `clientsClaim: false`; remove duplicate `includeAssets` vs `globPatterns`. Use `virtual:pwa-register` `onNeedRefresh` → small bar «Νέα έκδοση · Ενημέρωση» (el/tr/en/hi). Apply automatically only at cold start or when no form is dirty and the app is on a tab root. `onOfflineReady` → one-time toast «Έτοιμο και χωρίς σήμα». Dexie `db.on('versionchange')` → close + show the update bar; `on('blocked')` → «Κλείστε τις άλλες καρτέλες».
- Acceptance: Vitest reads the config (prompt, no skipWaiting/clientsClaim). Vitest on the apply-policy function (dirty form → no reload). Playwright 375 px: open Demo farm, open a spray form, fire the test hook for `needRefresh` → bar visible, form text still there, URL unchanged.
- Size: M.

### T3 – One in-flight guard for every save
- Findings: E3 (BLOCKER), QA double-tap duplicates.
- Change: `app/src/ui/useSubmit.ts` (busy ref set synchronously, button `disabled`, re-enabled only on validation failure). Row id generated once per form open; insert with `add` so a second insert of the same id fails. Apply to HarvestForm, ProductForm, SprayForm, StockForms, PlantingForm, ParcelForm, JobForm, LabelUseForm, AnalysisForm, SprayCorrection, Workers, WorkerApp harvest/observation.
- Acceptance: Playwright 375 px `double-submit.spec.ts`: `dblclick()` + triple click on each save button → exactly 1 row (count via IndexedDB in `page.evaluate`) and Σήμερα shows the true crate count (4, not 8/12).
- Size: S (many files, mechanical).

### T4 – Worker "saved" means saved
- Findings: W1 (BLOCKER), W12.
- Change: `WorkerApp.tsx` / `Toast.tsx` `showHeldUndo`: persist each held action (job done/skip, observation) in Dexie `settings.held_actions` with its original timestamp the moment the worker taps; commit on the timer **or at next start** (`initDb`); undo removes the pending entry (nothing committed, so append-only is untouched). Toast text: «Θα καταγραφεί σε 10″ · Αναίρεση» (+ hi). In worker view, the toast sits at the top (no overlap with the next job's buttons).
- Acceptance: Playwright 375 px: worker view, mark skip, reload after 2 s → the skip is recorded (job not back); observation saved then reload → 1 row. Undo within 10 s → 0 rows. Toast bounding box does not intersect the next job's buttons.
- Size: M.

### T5 – Orders stored per farm; demo gets its own sample
- Findings: OW-05 (safety rule 4), F-03.
- Change: `app/src/ui/Orders.tsx` keys `klouves_orders` / `klouves_cropmap` → `klouves_orders:<farmId>` / `klouves_cropmap:<farmId>` (migrate the existing unkeyed value to the real farm id, never to demo). Demo: a small fictional Κλούβες sample loaded with the demo. `app/src/db/import-demo.ts`: set crop `slug` from the prototype crop `id`.
- Acceptance: Vitest: import in farm A, read in farm B → empty. Vitest golden: demo + demo sample → spinach `free > 0`. Playwright 375 px: import in Το κτήμα μου, switch to demo → no real clients visible.
- Size: S.

### T6 – Spray/job forms never choose for the user
- Findings: OW-07, OW-06, OW-08, OW-18.
- Change: `SprayForm.tsx:72`: stop `setDose(...)`; show «Ετικέτα: 62,5 ml/στρ.» beside the field + button «Ίδια με την ετικέτα» (user tap fills it). Preselect the lot only when the product has exactly one non-expired lot. Quantity used required unless «Δεν ξέρω» is ticked → `quantity_unknown` warning in the register. Hint text «για 1,5 στρ. × 62,5 ml = 93,75 ml» is text only. Planting chips of a different crop are disabled once one is chosen («μία καλλιέργεια ανά καταχώριση»). On failed save: scroll to + focus the first error; generic message only if a field is really empty. `JobForm` / `buildJob`: refuse `label_none` / `label_blocked` with «Δεν μπορείτε να αναθέσετε: λείπουν τα στοιχεία ετικέτας για {crop}». Recording a spray that already happened stays allowed and flagged.
- Acceptance: Vitest: `buildJob` with `label_none` → error. Playwright 375 px: choose product → `spray-dose` is empty; tap «Ίδια με την ετικέτα» → exact label string (no rounding); save without qty and without «Δεν ξέρω» → error focused; job on rocket with no rocket label → refused.
- Size: S–M.

### T7 – Navigation state in the URL; Back works
- Findings: E2, E5, OW-12, F-08, OW-22, F-13, D18, F-09.
- Change: `app/src/ui/nav.ts`: hash routes `#/<farm>/<tab>/<detail>` (`farm` = `demo` or `own`). Opening a sub-screen/form pushes history; `popstate` closes it; a dirty form asks «Να φύγω χωρίς αποθήκευση;». Restore from the hash (else `settings.ui_state`, device-only, excluded from backups) in `initDb` before the first render; this replaces the "always real farm" reset (`db/index.ts:27`). Re-tapping the active tab returns to its root. Today's «Προσθήκη χωραφιού» opens the form directly.
- Acceptance: Playwright 375 px: open parcel → `page.goBack()` → still in app on Χωράφια list. Demo farm + Stock tab → reload → same farm, tab and demo banner. Dirty spray form + Back → confirm shown. Empty Today CTA → parcel form visible in one tap.
- Size: M.

### T8 – Σήμερα: the 10-second screen
- Findings: OW-01, OW-03, F-05, F-16, D01, D03, D12, D19, OW-21, F-12, E16, F-15, OW-19, E4, OW-02, D20.
- Change: `app/src/ui/Today.tsx`, `app/src/summary/today.ts`. Order: (1) «Κοπή σήμερα»: one line per planting — green «ελεύθερη», red «αναμονή έως Πέμ 26 Νοε», amber «Λείπει αναμονή»; parcels with no growing planting say «Χωρίς φύτευση» and are excluded from the "χωρίς αναμονή" KPI. (2) «Αύριο φεύγουν»: crates per crop and per client from T10 data, held crops in red with their free date (held/unknown never count as supply). (3) Jobs (from T9). (4) Two big buttons «Νέος ψεκασμός», «Καταγραφή συγκομιδής». Then weather (no data → one line «Βάλτε θέση στο χωράφι… / Ο καιρός θα εμφανιστεί όταν συνδεθεί ο λογαριασμός», no dash grid), then KPIs. Parcel headline «1 από 2 μπλοκαρισμένη». `label_unsigned` message: «Η ετικέτα δεν έχει υπογραφή γεωπόνου» + link to the label sign-off + owner entry with label values shown beside the empty fields. The two banners become one chip «Μόνο στο τηλέφωνο · αντίγραφο: ποτέ ›» → Backup; backup nag only ≥7 days after the first record, dismissable for 24 h. Clear stale toasts when a form opens. A `today` signal updates on `visibilitychange` and at the next Athens midnight. Welcome: delete the duplicated sentence.
- Acceptance: Playwright 375 px (demo, 812 px tall): «Κοπή σήμερα», «Αύριο φεύγουν», first job and both buttons are within the first viewport (bounding boxes < 812). Parcel with spinach held + rocket free shows both lines. Empty parcel → «Χωρίς φύτευση». Only one status chip at the top. Vitest: `today` signal flips at Athens midnight (fake timers, DST night).
- Size: L (split into 2 PRs: layout+cut list; banners+weather+midnight).

### T9 – Job lines a foreman can read
- Findings: OW-10 (1–2), OW-11, F-10, E13, D11 (Today part), W14.
- Change: job row «Σπανάκι · Βορειοανατολικό… · Gurpreet · Πέμ 19 Νοε» via `formatDate`; groups «Καθυστερημένες» (red), «Σήμερα», «Αύριο» on owner Today and worker view (worker view shows the date on overdue jobs). JobForm future-tense keys: «Φυτεύσεις για ψεκασμό», «Ποιος θα ψεκάσει», «Δόση προς εφαρμογή» (el/tr/en/hi). Lock message stored per job id, rendered once under that job only.
- Acceptance: Playwright 375 px: no `\d{4}-\d{2}-\d{2}` text in Σήμερα, Ψεκασμοί, Μητρώο screen or worker view (regex over `innerText`). Tomorrow's job is under «Αύριο». Tapping one locked Έγινε shows exactly one lock message.
- Size: S.

### T10 – Daily dispatch per client + copy text
- Findings: OW-04, F-02, F-04, F-14, OW-28.
- Change: `app/src/orders/klouves.ts` keeps day → client → product (it already reads `klv.db.day.YYYY-MM-DD`). Orders screen tabs «Σήμερα» / «Αύριο» with ‹ › day navigation: one card per client, items with ½/¼/¾ (display only, stored values unchanged), totals, supply check. Aliases from DECISIONS 2026-11-16 suggested, owner confirms; unmapped products in a warning card at the top («3 είδη δεν μετριούνται: αντιστοίχισε»), mapping collapsed under «Αντιστοίχιση (n) ›». Plurals via `plural.ts` (1 κλούβα / 2 κλούβες); «— άγνωστο X» → «δεν υπάρχει φύτευση». Button «Αντιγραφή για οδηγό»: `navigator.share({text})`, clipboard fallback, then select-all fallback. Exact text (Greek, per client):
  ```
  Παρασκευή 20/11 – αποστολή
  Λαϊκή Νίκαιας: Σπανάκι 6 · Ρόκα 4½
  Μανάβικο Νίκος: Σπανάκι 3 · Μαϊντανός 2 · Κρεμμύδι ½
  = 15½ κλούβες
  ```
  (No PHI or spray info in the shared text; held crops are shown on screen only.)
- Acceptance: Vitest: fixture backup → exact copy string above; fractions 0.25/0.5/0.75 → ¼/½/¾; `tn('crates', 1)` = «1 κλούβα». Playwright 375 px: import fixture, tab «Αύριο», tap copy → clipboard (granted permission) equals the string.
- Size: M.

### T11 – Worker day one: entry, language, privacy notice
- Findings: W5, W9, W10, F-G1, E19, W15.
- Change: first-run card gets a 3rd button «Είμαι εργάτης – έχω πρόσκληση / मैं कर्मचारी हूँ» → SignIn in the chosen language (`signin.*` in hi). `i18n/index.ts` `initialLang()` honours `navigator.languages` (hi, tr, en) when nothing is stored. Worker view header: 4-button row EL TR EN हिन्दी stored as `worker_lang` (does not change the owner's language). Review banner shown once, dismissable, not on every worker screen. Row «Τα δεδομένα σας / आपका डेटा» in the worker view: 5 short lines (who, what, why, no location tracking, your rights) + «Πλήρες κείμενο»; shown once at first worker sign-in, `notice_seen_at` stored locally (acknowledgement, not consent). Hindi text marked "to be checked by a native speaker"; no legal-responsibility disclaimer in the worker version.
- Acceptance: Playwright 375 px with `locale: 'hi-IN'` on a fresh profile → UI in Hindi. Worker view switch to हिन्दी → exit worker view → owner screens still Greek. «आपका डेटा» opens a Hindi notice (no Greek `info.*` fallback; Vitest checks `info.privacy.*` keys exist in hi).
- Size: M.

### T12 – Hindi on everything a worker can reach
- Findings: W2, W16, OW-24, F-A2, store note (0.2 vs 0,2).
- Change: `crops/catalog.ts`: add `hi` names (पालक, रॉकेट, अजमोद, सोआ, धनिया, … flagged for native review); `cropName()` for hi returns «पालक · Σπανάκι». Add hi keys `labeluse.dose`, `unit.*`, `spray.planting`; gloss «στρ. = 1000 m²». Apply the wording table from `beta2-workers.md` (आज का काम, आप कौन हैं?, खेत में क्या दिखा, कटाई से पहले रुकने के दिन, re-entry sentence, «फ़ोन में सेव है…»). Drop the duplicated Greek REI line in Hindi (keep the bilingual safety line once via `ts()`). Dose shown with the Greek decimal comma in every language (display only, never rounded). `t()` exposes the language actually used; fallback text and Greek product/parcel names render in `<span lang="el">`; language buttons get `aria-label` + `lang`.
- Acceptance: Vitest `hi-coverage.test.ts`: every key used under `WorkerApp.tsx`/worker components exists in `hi.json`. Playwright 375 px worker view in hi: no Greek-script text outside elements with `lang="el"`; dose text matches `0,2`.
- Size: M.

### T13 – Harvest picker: hard to pick the wrong crop
- Findings: W3, W4, W13, W19, D08, OW-29, E12.
- Change: `import-demo.ts` map `sown` → `sown_on`. `labelOf`: if two labels collide, add sowing date + area. Show harvesting/ready plantings first, «Όλες» below; blocked chips carry the lock icon + free date. Chip text = crop only under a parcel heading. Save with nothing chosen → «Διαλέξτε καλλιέργεια / पहले फसल चुनें», scroll to the list (same for observation). Selected chip = filled `--green`, white text, ✓; unselected border `--field`. Selected crop name shown above the counter; stay on Harvest after save with «Καταγράφηκαν 13 κλούβες – Σέσκουλα». Separate messages for 0 and > 9999 crates.
- Acceptance: Playwright 375 px demo worker view: no two harvest chips with the same text; save with no crop → error visible + focused; selected chip has computed background ≠ card background; after save the Harvest tab is still active.
- Size: S–M.

### T14 – Demo farm that sells the app (demo only)
- Findings: F-07, OW-23, W11, E14, D10, W18, E15, D01(c), D06(a).
- Change: owner writes allowed in the Demo farm (rows carry `DEMO_FARM_ID`, excluded from sync/outbox and from backups of the real farm); Άλλα → «Επαναφορά επίδειξης». Add fictional label PHI/REI for a few demo rows **in demo data only**, marked «φανταστικά στοιχεία», at least one demo job unlocked so ✓ Έγινε can be practised; keep some unknowns so the blocked case is shown too. Fictional demo worker «Ravi» (Latin script). Stock card: hide legacy `qty` once a movement balance exists, or label «Συσκευασία». Demo parcels get SVG sketch polygons in a local frame (never on a basemap, no real coordinates). Disabled buttons: `.btn:disabled{opacity:.45}` + reason text.
- Acceptance: Vitest `demo-isolation.test.ts`: after loading the demo and saving a spray in it, the real farm has 0 label uses / 0 rows from demo; outbox contains no `DEMO_FARM_ID` row; no demo label value appears in a real-farm query. Playwright 375 px: demo worker view → one job's Έγινε enabled and completes; «Επαναφορά επίδειξης» restores the original counts.
- Size: M.

### T15 – Layout bugs visible in 10 seconds
- Findings: W6, W7, D07, D05, F-17, F-A5, D02, D13, D16 (chips).
- Change: `styles.css`: `.seg`, `.card`, `h1`, tab buttons `overflow-wrap:break-word; hyphens:auto` (not `anywhere`); `@media (max-width:300px){.seg,.seg.two{grid-template-columns:1fr}}`. Worker view sticky save: `bottom: calc(var(--sp-8) + env(safe-area-inset-bottom))` in a tray, `main` bottom padding. Tab labels 12 px (11 px under 360 px). Weather strip day `white-space:nowrap`, label «Πέμ 19», today highlighted `--lime-soft`. Number + unit joined with U+00A0 in `format.ts` (`formatArea`, `formatQty`). Stock filter chips one scrollable row.
- Acceptance: Playwright 375 px and 320 px: tab label boxes do not overlap; with root font-size 200 % no button text node is split inside a word (each `.seg button` word on one line: compare `scrollWidth`/range rects); worker save button bottom ≤ 16 px from viewport bottom; «3,5 στρ.» on one line.
- Size: S.

### T16 – One design language + wordmark + icon fixes
- Findings: D04, D14, D15, D17, D16, OW-13, D09, D21, D22 (maskable), E18 (id/meta), D25, F-18, F-19, F-20.
- Change: dark band header on Crops and Parcels (`screens.tsx`); flat header button (no nested card); planting rows tappable with chevron + status chip; Parcels list reuses the Today parcel body. Άλλα: one grouped list, language as a 4-column control. Stock: dates «30 Ιουν 2027», red «Έληξε», amber «Λήγει σε N ημ.» (existing 60-day setting), red «Αρνητικό υπόλοιπο – κάντε προσαρμογή», problems sorted first. Owner HarvestForm uses the worker counter. Wordmark «Αλώνι» (`APP_NAME_EL`) in the Today header and «Αλώνι · έκδοση …» at the bottom of Άλλα. `public/icon-maskable-512.png` (artwork at 70 %), manifest `id:'/'`, `<meta name="mobile-web-app-capable">`, `<meta name="color-scheme" content="light">`. Weather label «ελάχιστη – μέγιστη». en.json "Field(s)" throughout. Latin names only on crop detail.
- Acceptance: Playwright 375 px: every tab root has `.band`; Today contains the text of `APP_NAME_EL`; expired demo lot shows «Έληξε». Vitest: manifest has `id` and a `purpose: 'maskable'` icon that is not `icon-512.png`; `grep` test that «Αλώνι» appears in `app/src` only in `config.ts`.
- Size: M (2 PRs: screens, brand/manifest).

### T17 – Register and forms tell the truth
- Findings: OW-15, OW-16, OW-17, D11 (register), E10, E11, F-11, D26.
- Change: Greek CSV and print: columns «Έναρξη», «Λήξη», «Παρτίδα», «Νερό (L)»; on-screen register dates via `formatDateTime` (machine CSV stays ISO). Missing authorisation number: yellow note on product card + spray form; such products listed first in the register. Amendment trail shows the unit («62,5 ml/στρ.»). Parcel area cap 10 000 στρ. with «δεν φαίνεται σωστό»; planting > parcel warning before save; area with `Intl.NumberFormat('el-GR')`. Stock `1,250` → reuse the parcel `1.000` message (still refused). Planting form: preselect the only parcel; «+ Φύτευση» on parcel detail preselects it. Show «Πέμ 19 Νοε, 22:32» next to native date/time inputs.
- Acceptance: Vitest `register.test.ts`: Greek CSV header contains the 4 columns and the start time; amendment string contains the unit. Playwright 375 px: area 99999999999 refused; stock `1,250` refused with the explanatory message; single-parcel planting form has the parcel preselected.
- Size: S–M.

### T18 – «Για προγραμματιστές» and storage honesty
- Findings: F-S1, OW-20, F-06, E21, F-S4, E17, D17 (rules list).
- Change: `Readiness.tsx`, `GoLive.tsx`, `More.tsx`: remove `ready.migration` / `ready.advisor` buttons from the normal view; put them, the raw rules list and version/commit details inside a collapsed «Για προγραμματιστές» section at the bottom of Άλλα. Bora keeps his three items (στοιχεία υπευθύνου, όνομα κτήματος, ΑΦΜ) with direct links, plus one line «Η εφαρμογή δουλεύει μόνο σε αυτό το τηλέφωνο. Η σύνδεση λογαριασμού έρχεται σύντομα.» Rule name and status separated. Re-call `navigator.storage.persist()` the first time `display-mode: standalone` is seen; iPad detection (`maxTouchPoints > 1 && /Mac/`); Άλλα shows «Ανοιχτό από: Οθόνη Αφετηρίας / Safari» + «τα δύο δεν μοιράζονται δεδομένα». Draft labels stay (F-S4).
- Acceptance: Playwright 375 px: on Άλλα, text «0026», «Advisor», «πίνακα της βάσης» not visible until «Για προγραμματιστές» is expanded. Vitest: iPad UA + `maxTouchPoints 5` → `ios === true`.
- Size: S.

### T19 – GDPR / store preparation (docs + small fixes)
- Findings: F-G2, F-S2, F-G3, F-G4, F-G6, F-S5, F-S7, F-G5.
- Change: `docs/compliance/ropa.md` (Art. 30 data inventory: every stored field per data subject incl. worker e-mail, `device_id`, `actor_id`, timestamps, photos, OTP e-mail provider = TBD EU with DPA; legal basis per purpose marked "for the lawyer"). `docs/compliance/account-deletion.md` (design only: worker = revoke + delete auth user/e-mail + pseudonymise `workers` row via an amending row, spray/harvest keep uuid for 3 years; owner = export first, delete non-held data, schedule held data; static `/delete-account` page el/en; nothing implemented until LIVE). Εργάτες caption → «Όνομα (και e-mail αν έχει λογαριασμό). Δείτε Πληροφορίες.» and the notice lists e-mail + device ids. Backup button note: «Περιέχει ονόματα εργατών. Κρατήστε το σε ασφαλές μέρος, όχι σε κοινόχρηστο φάκελο.» DECISIONS line: Phase 1 = no public listing; TestFlight / Play internal later.
- Acceptance: Vitest `photo-exif.test.ts`: fixture JPEG with GPS EXIF → stored bytes have no APP1/`Exif` segment. Vitest: worker caption key in el no longer contains «Μόνο το όνομα». Playwright 375 px: backup screen shows the warning line.
- Size: S (docs) + XS (code).

### T20 – Accessibility
- Findings: F-A1, F-A3, F-A6, F-A7, W8 / F-A4.
- Change: `useFocusHeading()` in `BackBar`/`screens.tsx`: each screen `<h1 tabIndex={-1}>` focused on mount; on Back, focus returns to the opener row. Toast: always-mounted empty `role="status"` container; timer pauses on focus/hover; owner undo ≥ 20 s for destructive actions (worker held commit from T4 unchanged). Photo viewer: `<dialog>` with `aria-labelledby`, Escape closes, alt «Φωτογραφία 2 από 5 · 19 Νοε». MapLibre `jumpTo` when reduced motion. Font tokens `--fs-*` → rem, `html { font: -apple-system-body; font-family: <Commissioner stack> }` with clamp; re-check T15 at 200 %.
- Acceptance: Playwright 375 px: after opening Άλλα → Εργάτες, `document.activeElement` is the `h1`; after Back it is the opener row. Toast container exists before any toast. Escape closes the photo viewer. axe-core run on the screens listed in `beta2-store.md` → 0 violations. Vitest `tokens.test.ts`: no `--fs-*` token in px.
- Size: M.

---

## 4. Needs Bora (morning)

1. Will workers use **their own phones** or **one shared farm phone**? (Decides the owner PIN and per-worker language.)
2. Do you want to log **half crates** (½) at harvest, like in Κλούβες, or whole crates only?
3. Please ask the agronomist: after a spray, is entry forbidden in the **whole parcel** or only in the sprayed rows? And when can he come to sign the labels?
4. Which of your workers reads Hindi well and could check about 110 short texts on the phone (about 30 minutes)?
5. When you say "stock" — do you want the app to count **crates cut but not yet sent**? (If yes, we rename today's «Αποθήκη» to «Φάρμακα & λιπάσματα».)

---

## 5. Morning checklist for Bora (iPhone, from the Home Screen icon)

1. **Χωράφια** → open a parcel → swipe back from the left edge. You stay in the app, on the Χωράφια list.
2. **Άλλα → Φόρτωση επίδειξης**, close the app fully, open it again. You are still in the demo (green «Επίδειξη» band). Then go to **Το κτήμα μου**: none of the demo data is there.
3. **Σήμερα** (demo): without scrolling you see «Κοπή σήμερα», «Αύριο φεύγουν», the first job and the two big buttons. Can you answer your 06:30 questions in 10 seconds?
4. **Άλλα → Παραγγελίες**: import your Κλούβες backup → tab «Αύριο» → one card per client → «Αντιγραφή για οδηγό» → paste into Viber. Is the text what the driver needs?
5. **Καταγραφή συγκομιδής**: enter 4 crates and tap «Καταγραφή» twice fast. **Σήμερα** shows 4, not 8.
6. **Νέος ψεκασμός**: choose a product. «Δόση που εφαρμόστηκε» is empty; tap «Ίδια με την ετικέτα» to fill it.
7. **Άλλα → Προβολή εργάτη** (demo) → हिन्दी: crops show Hindi + Greek; one job's «Έγινε» works; «आपका डेटा» opens. Exit: your screens are still in Greek.
8. **Άλλα**: no "0026"/database items unless you open «Για προγραμματιστές»; the name «Αλώνι» is on **Σήμερα** and at the bottom of **Άλλα**.

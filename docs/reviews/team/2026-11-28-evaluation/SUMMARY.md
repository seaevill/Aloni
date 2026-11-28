# Evaluation 2026-11-28: summary

Date: 2026-11-28. Commit evaluated: `main` 682c32d. Five independent, read-only reviewers; nothing in the repo was changed by them. Reports (verbatim): [1-usability.md](1-usability.md), [2-interface.md](2-interface.md), [3-engine.md](3-engine.md), [4-accuracy.md](4-accuracy.md), [5-data.md](5-data.md). Probe tests (evidence, not in any suite): [probes/](probes/README.md). Screenshots: [shots/](shots/).

## Scores and headline numbers

| Dimension | Score | Headline numbers (all measured on 682c32d) |
|---|---|---|
| 1 Usability (real farmer workflows, Chromium 375 px) | **5.5 / 10** | Σήμερα 3,414 px (4.2 screens); harvest 7 taps; a worker recorded 5 crates from an unsown field (U1); a fresh harvest reads «άγνωστο – παλιά καταγραφή» (U2) |
| 2 Interface (tokens, contrast, targets, a11y, size) | **7 / 10** | 0 px horizontal overflow at 320/375/390/768; 1 target < 44 px; 1 axe serious; 55 literal lengths/colours outside tokens; undefined `--sp-3` in 8 rules; first-load JS 189,484 B gz (limit 209,000) |
| 3 Decision engine (rules-core) | no score | 17 confirmed bugs: P0 2 · P1 4 · P2 8 · P3 3; 30 probes green; all latent: `runRules` is reached only by the golden test, no screen or Edge Function calls it |
| 4 Accuracy (tests, coverage, mutation) | no score | golden: 13/17 prototype items run (76.5 %), 21/27 cases run, 21/21 pass; coverage 95.10 % statements, 91.04 % branches; mutation 68.1 % (69.4 % with the CI unit gate), harvestGuard 0/7; 11 survivors make an output less safe; forecast WAPE 35.4 % on FICTIONAL prototype data only |
| 5 Data integrity and sync | **5 / 10** | local write path, append-only guard and SQL suite (0001–0042 on a throwaway local Postgres) hold; 3 P1 bugs on the first day of sync (pulled rows in server shape, `chain_no` refusals, restore queued as «update») and 1 P1 Demo leak into real backups |

Suite health on 682c32d (report 4 §5): rules-core 146 passed / 6 skipped; app Vitest 919 passed / 18 skipped; e2e 329/344 on a local Chromium fallback, the 15 failures are environment artefacts (WebKit could not be downloaded).

What holds (keep): exact decimal arithmetic, no rounding (QA P0-1); unknown waits are never «free»; unsigned rules never decide or notify; the live harvest/REI gate in `app/src/spray/harvest.ts`; the append-only guard; Demo rows never enter the outbox through `put()`; no overflow at any width.

## Merged, ranked findings (= the queue)

Duplicates across reports are merged into one row. Each row is one queue item `ev-n` in `takimlar/aloni-gelistirme/durum.json` (one PR, ≤ 450 lines; the team splits an item that grows). «Bora» = `bora-bekliyor`: needs SQL / `supabase/**` or an agronomist-approved value or [SET] threshold; everything else carries Bora's delegation of 2026-11-28. All items are `tur: ozellik`, because YONETICI.md §4.4 takes `bakim` items only on new failure evidence.


### A. Safety and data integrity (P0/P1)

| Queue | Sev | Finding | Report ids | Bora |
|---|---|---|---|---|
| ev-1 | P1 | Harvest form offers unsown (planned) plantings; Χωράφια/Φυτά call them «Έτοιμο για κοπή» | 1-usability U1 |  |
| ev-2 | P1 | «Σήμερα έγιναν» shows a fresh harvest's destination as «άγνωστο – παλιά καταγραφή» | 1-usability U2 |  |
| ev-3 | P0 | Engine: running PHI carries no harvest veto; frost thaw advice says `phi_clear: true` during a PHI | 3-engine BUG-1, BUG-3 |  |
| ev-4 | P0 | Engine: PHI/REI/REG read only the first label row; end-before-start spray counts from the earlier time | 3-engine BUG-2, BUG-17 |  |
| ev-5 | P1 | Sync: pulled rows replace phone rows in server shape (signed labels read blocked; `chain_no` refusals) | 5-data F1, F2, F14, F15 |  |
| ev-6 | P1 | Restore queues every mutable row as «update» (refused, or overwrites newer server data) | 5-data F3 |  |
| ev-7 | P1 | Demo settings keys travel in a real backup and are queued under the real farm id | 5-data F4, F5 |  |
| ev-8 | P1 | Reverse contract fixture from a real `pull()` (supabase/tests) | 5-data W1b | yes |

### B. Guards that stop whole classes of bugs

| Queue | Sev | Finding | Report ids | Bora |
|---|---|---|---|---|
| ev-9 | P1 | Guard: undefined CSS custom properties (`--sp-3` zeroes 8 card gaps); 13.3 px text; 2 small targets | 2-interface UI-02, UI-05, UI-10, UI-11, ENV-2 |  |
| ev-10 | P1 | Guard: contrast per CSS rule; «refused» mark is 1.36:1 | 2-interface UI-01, ENV-3 |  |
| ev-11 | P2 | Guard: token test over all CSS and TS colour constants (55 literals in 10 side files) | 2-interface UI-07, UI-15, ENV-1, ENV-8 |  |
| ev-12 | P2 | Worker screens: 72 px for every control (harvest chips are 56 px); invert the allow-list test | 2-interface UI-04 (kurallar.md madde 7) |  |
| ev-13 | P2 | UX-bar test visits detail screens, sheets, forms and worker tabs | 2-interface ENV-4 (UI-06 bu testin görmediği yerde bulundu) |  |
| ev-14 | P1 | harvestGuard boundary tests (mutation score 0/7) | 4-accuracy 3c (H01–H07), iş 1 |  |
| ev-15 | P1 | Tests killing the other less-safe surviving mutants (decimal, dose, spray window, stock, waits, forecast) | 4-accuracy 3d (S08, G04, G07, D06, F04, W09, E06, K04, K05, K08), iş 2–3 |  |
| ev-16 | P2 | Land golden NEG-P0-3 (QA P0-3 lesson) and R07's supported parts | 4-accuracy 1b/1c, iş 4 (docs/proto/QA-REPORT.md P0-3) |  |
| ev-17 | P2 | Remove the stale app golden harness; one source for golden counts (STATUS.md:176 stale) | 4-accuracy 1e, iş 5, «tek kaynak» ortam önerisi |  |
| ev-18 | P2 | rules-core coverage gate (95/91, ratchet) and committed mutation script | 4-accuracy ortam önerisi (kapsama + mutasyon kapısı) |  |
| ev-19 | P2 | Informal Greek imperatives in Ταμείο/Παραγγελίες + i18n lint | 1-usability U16 |  |
| ev-20 | P2 | HTML splash logo never leaves the DOM; boot-DOM e2e | 2-interface UI-03, ENV-6 |  |
| ev-21 | P3 | First-load JS budget as a ratchet (raised 4 times in a week) | 2-interface UI-19, ENV-5 |  |

### C. P1 UI, usability and latent engine P1

| Queue | Sev | Finding | Report ids | Bora |
|---|---|---|---|---|
| ev-22 | P1 | Σήμερα: one cut block, drop two repeated tiles, 7-day caption, free plantings first | 1-usability U3, U11, U21 |  |
| ev-23 | P1 | Σήμερα: one-line weather summary on top; FAB clears the first card | 1-usability U3; 2-interface UI-09 |  |
| ev-24 | P1 | REI («do not enter until …») never shown on the owner's Σήμερα | 1-usability U4 |  |
| ev-25 | P1 | Σήμερα shows tomorrow's loads but not today's | 1-usability U5 |  |
| ev-26 | P1 | Worker free-job card has no field/crop/day; page order; bottom bar | 1-usability U6, U25 |  |
| ev-27 | P1 | «Έγινε»/spray form: start-time quick chips (person chooses, no default) | 1-usability U7 |  |
| ev-28 | P1 | Engine SOW recommends parcels with no history; stale forecast row overrides measured rain | 3-engine BUG-5, BUG-11 |  |
| ev-29 | P1 | Engine ROT never blocks on label max count / min interval | 3-engine BUG-4 | yes |
| ev-30 | P1 | Engine FROST drops radiative nights on slope/coast parcels; elevation drop is silent | 3-engine BUG-6 (+ F1 gözlemi) | yes |

### D. P2

| Queue | Sev | Finding | Report ids | Bora |
|---|---|---|---|---|
| ev-31 | P2 | Refused records: «Το είδα» deletes the op; refused append-only rows stay in force; forked corrections | 5-data F6, F7 |  |
| ev-32 | P2 | Corrections stamped with the original author; send order depends on the wall clock | 5-data F9, F11, F2 (kurucular) |  |
| ev-33 | P2 | Reset pull never removes rows the server no longer shows (worker phones) | 5-data F10 |  |
| ev-34 | P2 | Engine STOCK/supply: mixed units, unknown qty/expiry, duplicate planting rows | 3-engine BUG-7, BUG-8, BUG-9, BUG-10; 4-accuracy K06 yan bulgusu |  |
| ev-35 | P2 | Engine: draft without dose check not blocked; missing rule status shows nothing; UTC day in SALT/supplyTable | 3-engine BUG-12, BUG-15, BUG-14, BUG-16 |  |
| ev-36 | P2 | Engine PHI-GUARD forward trigger not built | 3-engine BUG-13 | yes |
| ev-37 | P2 | Engine REI per planting vs app per parcel (drift buffer) | 3-engine E7 gözlemi | yes |
| ev-38 | P2 | Two devices: whole-row last-arrival-wins, contrary to TECH-SPEC per-field LWW | 5-data F8, W9 | yes |
| ev-39 | P2 | A11y and base styles: focusable sheet body (axe serious), heading order, focus ring, UA colours | 2-interface UI-06, UI-12, UI-13, UI-16, UI-14 |  |
| ev-40 | P2 | Spray form: lot quantity button, no preselected lot, ordering of plantings/products, sticky bar | 1-usability U8, U9 |  |
| ev-41 | P2 | «Δείτε γιατί» sheet: name the product, drop «δαχτυλίδι», link to the label | 1-usability U10 |  |
| ev-42 | P2 | Χωράφια: mixed-field status, «Έτοιμο» wording, field page order, crop on spray lines | 1-usability U12, U13, U14 |  |
| ev-43 | P2 | Ταμείο refuses «1.250,50»; no thousands separator | 1-usability U15 |  |
| ev-44 | P2 | tokens.css: 22 duplicate tokens, two type scales | 2-interface UI-08 |  |
| ev-45 | P2 | restore-drill.spec.ts:25 hardening (q-2 question) | 5-data W10 (q-2 kısmı); durum.json bekleyen_kararlar q-2 sorusu |  |

### E. P3

| Queue | Sev | Finding | Report ids | Bora |
|---|---|---|---|---|
| ev-46 | P3 | Worker can read the farm's whole `applied_ops` | 5-data F13, W8 | yes |
| ev-47 | P3 | Greek wording: wrong menu pointer, φυτεία/φύτευση, two names for unknown wait | 1-usability U18, U19, U20 |  |
| ev-48 | P3 | Form consistency: BackBar, one crate counter, self-notification, after-demo landing | 1-usability U22, U23, U24 |  |
| ev-49 | P3 | Ταμείο: farm crops first; sale pre-fill from an order | 1-usability U17 |  |
| ev-50 | P3 | 768 px header alignment; 7-day crates sparkline | 2-interface UI-17, UI-18 |  |
| ev-51 | P3 | Outbox never pruned | 5-data F12 |  |
| ev-52 | P3 | Forecast backtest as a reported number (fictional prototype data) | 4-accuracy 4a–4d, iş 6 |  |
| ev-53 | P3 | Local tooling: `ui-scan`; Chromium-only console error in local e2e | 2-interface ENV-7; 4-accuracy ortam önerisi (yerel e2e) |  |
| ev-54 | P3 | Split the 68 kB `update-*.js` chunk off the first paint (if offline-first holds) | 2-interface UI-19 |  |


## Not queued (and why)

- Engine observations that are not bugs (report 3 §3 end): no lot-level latest `safe_from` (E5), day granularity of `safe_from` (G1), a never-sprayed planting blocked by PHI-GUARD (H1), the status `ready` that the DB does not have, GAP confidence `undefined`, the inversion offset string. Conservative today; revisit when the engine is wired.
- q-2b (`m18_job_board.sql:90`): report 5 agrees with the queue's hypothesis (snapshot `xmin` + autovacuum); the existing item q-2b already holds it and needs a `supabase/**` merge by Bora.
- The raw scan JSON files of report 2 (about 19,000 lines) stay in the reviewers' scratch area.

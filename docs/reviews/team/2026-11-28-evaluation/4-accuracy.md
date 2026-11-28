# 4 — Accuracy percentages (rules-core and test suites)

Checkout: `main` 682c32d, read-only. All runs on 2026-11-28 in scratch copies under `scratchpad/eval/work-acc/` (no repo file touched). Every number below was measured; none is an estimate.

## Numbers

| # | Metric | Value | Raw |
|---|---|---|---|
| 1a | Prototype items (10 alerts + 7 recs) with a golden fixture file | **100 %** | 17/17 |
| 1b | Prototype items whose fixture is RUN by `packages/rules-core/tests/golden.test.ts` | **76.5 %** | 13/17 (A02, R01, R03, R07 skipped) |
| 1c | All golden cases run (golden + derived + negative) | **77.8 %** | 21/27 (6 skipped) |
| 1d | Pass rate of the golden cases that run | **100 %** | 21/21 |
| 1e | Golden cases run by the OLD app harness `app/tests/unit/golden.test.ts` | 33.3 % | 9/27, 18 skipped with a stale reason |
| 2a | rules-core statement coverage (v8) | **95.10 %** | 951/1000 |
| 2b | rules-core branch coverage | **91.04 %** | 752/826 |
| 2c | rules-core function / line coverage | 98.33 % / 98.51 % | 236/240 · 662/672 |
| 3a | Mutation score, rules-core's own suite (`vitest run` in the package) | **68.1 %** | 49 killed / 72 valid (73 made, 1 equivalent) |
| 3b | Mutation score, full CI unit gate (rules-core + typecheck + app Vitest) | **69.4 %** | 50/72 (only K08 more, by `tsc`) |
| 3c | `harvestGuard.ts` mutation score (100 % line coverage!) | **0 %** | 0/7 |
| 3d | Survivors that make an output LESS safe | 11 | S08 H01 H02 H03 H06 H07 K06 G04 G07 D06 F04 |
| 4a | Even-spread supply model, backtest on prototype week 10–15 Nov: WAPE | **35.4 %** | n = 8 plantings, 157 crates recorded (FICTIONAL) |
| 4b | Same, aggregate bias (forecast − actual) / actual | **+30.1 %** | 204.3 forecast vs 157 recorded |
| 4c | Same without PL10 (onion, no harvest logged at all) | WAPE 18.4 %, bias +13.2 % | n = 7 |
| 4d | Backtest on the Demo season (`app/src/db/demo-season/`) | **not computable** | plantings have no estimate or harvest window; forecast code not wired into the app |
| 5a | rules-core unit tests | 146 passed, 6 skipped, 0 failed | 12 files |
| 5b | app unit tests (Vitest) | 919 passed, 18 skipped, 0 failed | 160 files, 937 tests |
| 5c | e2e (Playwright, **Chromium fallback**, not CI's WebKit) | 329 passed, 15 failed, 0 skipped | 344 tests; all 15 failures are environment artefacts (see §5) |

## Method per number

### 1. Golden coverage
- Listed `reference/prototype/data.json` → `alerts[].id` (A01–A10) and `recommendations[].id` (R01–R07); matched against `fixtures/golden/*.json` `source_case`/`id`. Every item has a file (1a).
- "Run" = in the `LANDED` array of `packages/rules-core/tests/golden.test.ts` (every other file is `it.skip`). LANDED golden items: A01, A03–A10, R02, R04, R05, R06 → 13/17. Plus REI-after-r01 and 6 negative cases → 21/27.
- Skipped: `A02-dm-spin-pachi` (DM-SPIN, no engine code), `R01-spray-window-pachi-spinach` (SPRAY-WIN recommendation; only the A09 "front closes" alert is built), `R03-n-leek-fertigation` (N; only an unsigned info-only test exists, the decision path is not asserted), `R07-parsley-hold-and-rotate` (ROT decision; only the "unknown" block NEG-ROT runs), `NEG-N-shared-valve`, `NEG-P0-3-sow-not-on-flagged-parcels`. NEG-P0-3 is a QA-REPORT P0 lesson (sowing suggestions on flagged parcels) and is not run although R04 (SOW) is.
- Partially asserted among the landed: in `check()` the prose values `leaf_surface_estimate_c` and `cover_gain_c` (A01, R05) are replaced by structured checks; GAP crate values use `tolerance.crates`; the output under test is `own.find(...) ?? own[0]` (falls back to the first output of the category). Every landed case asserts all `values`, `also`, `vetoes` and `must_not`.
- 1e: `app/tests/unit/golden.test.ts` still runs only 9 cases and skips 18 with the reason "no engine code for this rule yet (frost, spray window, …)", which is now false for 12 of them (they run in rules-core). `docs/STATUS.md:176` repeats the stale "9 run, 18 skipped"; `fixtures/golden/README.md` says "9 of 27 on 2026-11-19".

### 2. Coverage
No coverage provider is in the repo. In a copy (`work-acc/repo/packages/rules-core`, with `reference/` linked at the same depth) I installed `@vitest/coverage-v8@5.1.1` + `vitest@5.1.1` + `vite@6.4.6` (npm needed `--legacy-peer-deps`: arborist crashes with `edgesOut` otherwise) and ran
`vitest run --coverage --coverage.provider=v8 --coverage.include='src/**/*.ts' --coverage.exclude='src/**/*.test.ts'`.
All 152 tests ran as in the repo. Lowest files: `views/recordedHarvest.ts` 86.0 % stmts / 86.3 % branches, `sowingWindow.ts` 88.9 / 83.3, `salinity.ts` branches 75.9 %, `harvestGuard.ts` branches 84.3 %. 100 %: decimal, waits, stock, supply, label, harvestForecast. Coverage counts only the package's own tests (the app suite also imports rules-core).

### 3. Mutation sample
Script `work-acc/mutants.mjs`: 73 hand-written single-point mutations (exact string replace, must match once), each run against the suite, then restored. Pass 1: rules-core `vitest run`. Pass 2 (survivors only): `tsc --noEmit` of rules-core + the whole app Vitest suite in a full copy (`no-conflict-markers.test.ts` excluded: it needs `.git`, baseline otherwise 917/917 green).
Per file (pass 1, killed/total): waits 9/11 · engine (PHI/REI/ROT) 7/8 · sprayWindow 8/13 · harvestGuard 0/7 · stock 4/8 · registrationDose 6/8 · decimal 5/6 · supply 5/6 (1 equivalent) · harvestForecast 3/4 · weeklySupply 3/3.
Equivalent, excluded: **U04** `supply.ts:21` drop `span > 0` — `days ≤ span` always, so `days > 0` implies it.

Survivors (file:line in `packages/rules-core/src`, mutation, direction):

| id | file:line | mutation | effect |
|---|---|---|---|
| W08 | waits.ts:9 | `y % 400 === 0` → `=== 1` | only `2000-02-29` changes; low value |
| W09 | waits.ts:56 | `while (sec >= DAY)` → `>` | spray at 00:00:00 + 24 h REI gives `T24:00:00Z` → unknown/blocked (fail-safe, but wrong) |
| E06 | engine.ts:98 | drop `if (waitOver(s.asOf, end)) continue;` | REI alert stays after re-entry passed (noise) |
| S02 | sprayWindow.ts:40 | wind `>` → `>=` | stricter |
| S05 | sprayWindow.ts:46 | rain `>` → `>=` | stricter |
| S06 | sprayWindow.ts:48 | `dt <= deltaTMax` → `<` | stricter |
| **S08** | sprayWindow.ts:52 | `cloudOktas <= 2` → `< 2` | **inversion missed at 2 oktas: hour wrongly OK** |
| S12 | sprayWindow.ts:49 | temp `>` → `>=` | stricter |
| **H01** | harvestGuard.ts:29 | `phiEnd(job.endedAt…)` → `startedAt` | **PHI clearance counted from spray start** |
| **H02** | harvestGuard.ts:27 | `uses.length === 1` → `>= 1` | **duplicate label rows accepted** |
| **H03** | harvestGuard.ts:51 | drop `!facts.scoutingCondition ||` | harvest alert without its trigger |
| H04 | harvestGuard.ts:52 | `today > endOfHarvest` → `>=` | last harvest day blocked |
| H05 | harvestGuard.ts:60 | `logged >=` → `>` | recommendation with 0 crates left |
| **H06** | harvestGuard.ts:30 | drop `|| !waitOver(s.asOf, end)` | **«harvest» alert while PHI is still running** |
| **H07** | harvestGuard.ts:52 | drop `today < startOfHarvest ||` | harvest alert before the window opens |
| K04 | stock.ts:47 | `>= 0` → `> 0` | exactly enough → insufficient (stricter) |
| K05 | stock.ts:49 | `< 0` → `<= 0` | low at exactly threshold |
| **K06** | stock.ts:40 | `have && have.unit === lot.unit ?` → `have ?` | **lots in different units summed** |
| **G04** | registrationDose.ts:41 | `uses.length !== 1` → `< 1` | **ambiguous label rows clear a dose** |
| **G07** | registrationDose.ts:47 | drop `comparisons.length > 0 &&` | **draft with no plantings counts as «in range»** |
| **D06** | decimal.ts:45 | `addDecimal`: second operand not rescaled | **stock sums wrong when scales differ (1.5 + 0.25)** |
| **F04** | harvestForecast.ts:56 | drop `harvestFrom > harvestTo` check | reversed range counted as 0 instead of unknown |

Killed only by `tsc` in pass 2: K08 (`stock.ts:44`, drop `!f.lowFactor.known`). No survivor of pass 1 was killed by the app suite.
Why H06 survives although the golden harness has a "held" test: `golden.test.ts` checks `asOf: '2026-11-08T09:00:00Z'` expecting `block`, but on that date `today < harvestFrom` also blocks, so the PHI branch is never isolated. A03/R02 are asserted only at one instant far from every boundary.
Side finding (not a mutant): `stock.ts:40` with two lots of one product in different units keeps ONLY the last lot (the earlier lot is dropped from `usable`), so the low/insufficient check silently ignores part of the shelf; no test covers mixed units.

### 4. Forecast backtest
- `harvestForecast`, `weeklySupply` and GAP's `supplyTable` all use `projectedCrates` (even spread of estimate − logged over the harvest window). `app/src` imports none of them, and the Demo season (`SEASON_PLANTINGS`) has no `est_crates`, `harvest_from` or `harvest_to`, so there is nothing to forecast there (4d).
- What could be computed: the prototype (`data.json`, FICTIONAL, labelled SAMPLE) has estimates/windows for 16 plantings and 7 harvest jobs (10–15 Nov) whose notes give crates. Script `work-acc/repo/packages/rules-core/backtest/backtest.test.ts`: forecast as of 2026-11-10 for 10–15 Nov with `projectedCrates`; PL12 excluded as PHI-held (J15, PR05, PHI 14 d); logged crates before 10 Nov assumed 0 (the data has none). Cross-check: `harvestForecast('2026-11-09').crops.spinach.crates7` = `weeklySupply(...)[0].eligible` = 71.05, same as `projectedCrates`.
- Per planting (forecast / recorded): PL01 spinach 71.1/74 · PL07 parsley 18.8/20 · PL09 chard 17.9/16 · PL10 onion 26.7/0 · PL11 coriander 10.0/8 · PL12 parsley 0/0 (held) · PL13 rocket 42.1/30 · PL14 dill 17.8/9. MAPE over the 6 plantings with a recorded harvest = 30.8 %.
- What the % means: only how well the prototype's ILLUSTRATIVE estimates (`area × yield ÷ crate kg, ~10 % waste`) agree with its ILLUSTRATIVE harvest notes in one week. It says nothing about real yield accuracy and must not be quoted as such.
- Real data needed for a meaningful %: for Bora's farm, per planting, an estimate (crates) and harvest window recorded BEFORE harvest starts; every harvest logged per planting per day with crates (the app has `job_harvest.crates_str`); PHI holds (already recorded); ideally ≥ 1 full season (≥ 20–30 plantings, ≥ 8 weeks) so a weekly WAPE per crop has a sample. Then the backtest above runs unchanged with a frozen `asOf` per week.

### 5. Suite health
- rules-core: 146 passed / 6 skipped. The 6 skipped = the 6 pending golden cases listed in §1, reason "pending: its rule is not built yet".
- app Vitest: 919 passed / 18 skipped. All 18 skipped are in `app/tests/unit/golden.test.ts` (stale duplicate harness, §1e). 12 of those 18 run green in rules-core, so the skip is redundant, not a gap; the other 6 are the same pending cases.
- e2e: WebKit could not be downloaded (proxy 403 for `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`), so I ran `PW_BROWSER=chromium PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/...` (the config's documented local fallback), 2 workers, on a full copy without `.git`. 344 tests: 329 passed, 15 failed, 0 skipped. Failures: 12 offline tests fail on a Chromium-only console error `ERR_INTERNET_DISCONNECTED …/icon-192.png` (WebKit does not log it); 1 (`greek-ui.spec.ts`) sees the build id «local» because my copy has no `.git`; 1 timeout (`parcel-history.spec.ts`, 30 s local timeout); 1 `live-golive.spec.ts:89` `page.reload: net::ERR_ABORTED`. None points at product code; CI's WebKit result was not reproducible here. Conditional skips exist (`precache-hindi.spec.ts:11`, `update-real-sw.spec.ts:12`, both "needs the production build"); they ran because the webServer builds first.

## One-PR work items (each ≤ 450 lines)

1. **harvestGuard boundary tests** (~150 lines, `packages/rules-core/src/harvestGuard.test.ts`): signed PHI-GUARD facts with harvest window open and only the PHI still running (kills H06); end vs start 2 h apart with `asOf` between the two PHI ends (H01); two label rows for the product/crop (H02); `scoutingCondition: false` (H03); `today == harvestTo` and `today == harvestFrom − 1` (H04, H07); logged == estimated (H05). Raises 3c from 0 % to 7/7 and 3a to ~78 %.
2. **Stock and decimal exactness** (~100 lines): `addDecimal('1.5','0.25') === '1.75'` and other scale mixes (D06); two lots in L and ml of one product (K06, plus decide and fix the "last lot wins" behaviour in a separate red-test-first change); qty == need and qty == threshold (K04, K05); unknown `lowFactor` gives no hit (K08 at runtime, not only by tsc).
3. **Dose and spray-window edges** (~120 lines): duplicate label rows → `dose_check_unknown` (G04); draft with empty `plantingIds` → blocked (G07); hourly series at exactly wind/gust/rain/temp/Delta-T limits and at 2 oktas calm (S02, S05, S06, S08, S12); REI after re-entry passed gives no alert (E06); spray ended 00:00:00Z + 24 h REI → `…T00:00:00Z` next day (W09); reversed harvest range → `unknownIds` (F04).
4. **Run the 2 missing QA/golden negatives** (~250 lines): land `NEG-P0-3-sow-not-on-flagged-parcels` in `LANDED` (SOW code exists; the fixture needs the harness's `sowingOf` to accept its id) and wire `R07`'s decision parts that ROT already supports; record in `docs/STATUS.md` the true count (21/27 → 22–23/27).
5. **Remove the stale app golden harness** (~−90 lines): delete `app/tests/unit/golden.test.ts` or reduce it to the shape check, and fix the counts in `docs/STATUS.md:176` and `fixtures/golden/README.md` so "skipped" means only "rule not built".
6. **Forecast backtest fixture** (~120 lines): commit the §4 backtest as a test over `data.json` with the WAPE asserted as a REPORTED number (not a threshold), clearly labelled fictional, so the method is ready when Bora's first real season exists; add `est_crates` + `harvest_from/to` to the Demo season (fictional) only if the forecast screen is planned.

## Environment improvements
- **Coverage gate**: add `@vitest/coverage-v8` (pin 5.1.1) to rules-core devDependencies and a `vitest.config.ts` with `coverage.thresholds` at today's values (statements 95, branches 91) so coverage can only go up; run it in the `check` job.
- **Mutation gate**: add Stryker (`@stryker-mutator/core` + vitest runner) for `packages/rules-core/src/{waits,stock,decimal,supply,registrationDose,harvestGuard,sprayWindow}.ts` with `thresholds.break` at the current score, run on a weekly schedule or on PRs touching those files (a full run is minutes: the suite takes ~1.3 s). Until then, `work-acc/mutants.mjs` is a 73-mutant script that can be committed as `scripts/mutants.mjs` and run by hand.
- **E2E locally**: the WebKit download is blocked in this sandbox; either pre-bake WebKit into the image (CI already uses a container that has it) or make the Chromium fallback ignore the Chromium-only `ERR_INTERNET_DISCONNECTED` icon console error so a local run is green and comparable.
- **Single source for golden counts**: have `golden.test.ts` export `LANDED.length` and generate the STATUS line from it, so the count cannot drift again.

Artefacts: `work-acc/mutants.mjs`, `work-acc/mut-rc.json` (pass 1), `work-acc/mut-app.json` (pass 2), `work-acc/repo/packages/rules-core/coverage/coverage-summary.json`, `work-acc/repo/packages/rules-core/backtest/backtest.test.ts`, `work-acc/app-unit.json`, `work-acc/e2e.json`.

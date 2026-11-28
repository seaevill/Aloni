# 3 – Decision engine: working principles, probes, bugs

Reviewer: independent, adversarial (read-only). Checkout: `main` 682c32d. Date: 2026-11-28.
Probe tests (not in the repo): `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-engine/`
- `bugs.test.ts`: 17 minimal FAILING tests, one per confirmed bug (each asserts what RULES.md / CLAUDE.md requires, and logs the actual output).
- `probes.test.ts`: 30 robustness probes, all green, with their actual outputs logged.
- `helpers.ts`: snapshot builder. All label values in it are TEST-ONLY and fictional, never label data.
- Run them with `cd work-engine && ../Aloni/node_modules/.bin/vitest run --config vitest.config.mjs`. Result: 17 failed, 30 passed.
- Repo baseline: `packages/rules-core` gives 146 passed and 6 skipped. `git status` stayed clean.

## 0. Reachability (read this first)

- The app imports only `waits` (phiEnd, reiEnd, waitOver, parseInstant, isCalendarDate, dateAfterDays), `decimal`, `label` and `known` from `@aloni/rules-core` (grep over `app/src`, about 50 files).
- `runRules` and every deciding unit are reached ONLY by `packages/rules-core/tests/golden.test.ts`. That covers engine, sprayWindow, harvestGuard, frost, salinity, sowingWindow, gap, supply, weeklySupply, stock, registrationDose, harvestForecast and views/*.
- No app screen calls these units, and neither does the Edge Function `weather-fetch`.
- So the engine bugs below are **latent**: today they cannot reach Bora. Severity is graded by what the output would do once wired (M3+), as asked.
- The live safety gate is `app/src/spray/harvest.ts` (harvestGate, reiLockParcel), built on `waits`. It holds:
  - It takes the latest end across all label rows.
  - It requires REI as well as PHI.
  - It checks the gate at the phone's NOW.
  - Its strict `>` matches the server's `>=` in `private.planting_gate` (0032).
  - It never shortens a period: the stored value can only extend the label's.

## 1. Working principles per unit

**known / decimal**
- `Known<T>` is `known(value)` or `unknown(missing|not_on_label|invalid)`. There is no default anywhere.
- `parseDecimal` accepts `d`, `d,d` or `d.d`. It rejects `1.000` / `1,125` (3 decimals with a non-zero integer part are ambiguous), signs, exponents and full-width digits.
- Arithmetic (`mulDecimal`, `addDecimal`, `compareDecimal`) is exact on BigInt. Nothing is rounded (QA P0-1 holds: 0.025 × 3.3 = 0.0825).
- `parseWhole` accepts 1–4 ASCII digits.

**label**
- `requireSignOff` turns a LabelUse into the branded `SignedLabelUse`, the only type deciding code accepts. It requires:
  - a sign-off name and a real date;
  - a fingerprint equal to `JSON.stringify([scope, dose, phi, rei, maxApps])`;
  - every value known.
- Any edit drops the sign-off. `makeDose` rejects 0 and min > max. Probes L1 and D2 are green.

**waits (PHI/REI)**
- Pure integer UTC-second arithmetic, with no Date involved.
- `phiEnd = end of spraying + phi × 86 400 s`; `reiEnd = end + rei × 3 600 s`.
- `waitOver` is strict (`now > end`), so a wait that ends exactly now is still running.
- Anything that is not `YYYY-MM-DDTHH:MM:SSZ` is unknown, and unknown is never over. That includes offsets, milliseconds, 24:00 and Feb 29 in a non-leap year.
- DST is irrelevant because days are 24 h of UTC (probe W2). Probes W1–W7 are green.

**engine (runRules)**
- An unreadable `asOf` gives a single ENGINE block, never an empty list.
- `PHI` (done sprays only, job statuses are planned/done/skipped):
  - With no label row, or an unsigned one, the result is `phi_blocked_unknown` plus a harvest veto. A missing label row also gives REG `unregistered_use`.
  - A missing or unreadable end time is also blocked.
  - Otherwise it gives `phi_hold` until end + PHI.
- `REI`: tasks on the same planting before `reentry_at` are vetoed. An unknown REI vetoes all of that planting's tasks.
- `REG`: excludes planting rows with no signed use from a draft spray.
- `ROT`: only checks that group code, maxApps and minInterval are PRESENT.
- `SPRAY-WIN`, `FROST`, `STOCK`, `GAP`, `SOW`, `PHI-GUARD` and `SALT` give info-only output unless their `ruleStatus` is `signed`.
- `notify` is never set to true anywhere (grep), so CLAUDE.md rule 3 holds trivially. Probe U1 is green.

**sprayWindow**
- An hour is OK only when every test positively passes:
  - wind in [min, max] and gust < max;
  - leaves known dry for `dryBeforeH` hours;
  - total rain over the next `rainLookaheadH` hours (the hour itself included) at most `rainMaxMm`;
  - Delta-T (Stull) in range and temperature at or below max;
  - no inversion test triggered (wind < min, ≤ 2 oktas, between sunset and sunrise + H).
- NaN values, undefined leaf wetness, a gap or disorder in the series, missing sun times or invalid params all give `data_missing` / `params_invalid`.
- `spray_window_closed` (Medium) fires only when every day of every parcel has 0 OK hours. A day with no usable data gives `unknown`, never «closed». Probes S1 and S2 are green.

**harvestGuard (PHI-GUARD)**
- Applies to plantings with status `harvesting` or `ready`. It always vetoes spraying.
- It gives «harvest and scout» only when every past spray has a unique signed label row and its PHI is over, scouting applies, and today (Athens) is inside harvest_from..harvest_to. Otherwise it blocks.
- It also gives a remaining-crates recommendation.
- Note: the status `ready` does not exist in the DB vocabulary (planned/growing/harvesting/finished).

**frost**
- A night is a hit when ALL of these hold:
  - `cell Tmin + offset[topo]` (R fixed at 1) ≤ tminMax;
  - wind ≤ max, cloud ≤ max, elevation ≤ elevationMax.
- Any missing input gives `frost_inputs_missing` for that parcel, never «no frost».
- Output:
  - one alert listing every parcel and night, with confidence Low, a leaf range marked EST and `damage_claimed: false`;
  - «cover» only if fleece is on hand;
  - «no harvest before thaw» per guarded planting, computed from hourly temperatures.

**salinity (SALT)**
- FAO-29 class from the water EC: below 0.7 none; 0.7–3.0 slight/moderate; above 3.0 severe.
- Re-test when age ≥ `retestMonths`, or for a coastal well sampled before last 1 September. Confidence is High when the sample is under 6 months old.
- A missing or negative EC, an invalid date or a future date gives `salinity_unknown`. Unsigned gives `salinity_inputs` only. Probe T1 is green.

**sowingWindow (SOW)**
- A parcel qualifies only with:
  - no disease flag for the family;
  - no same-family history or disease history inside the [SET] years (an undated record counts as unknown, which rejects);
  - enough free area;
  - soil temperature inside the range;
  - a run of consecutive forecast days from today whose rain over the past `rainDays` days is ≤ maxRain.
- Output: a recommendation per parcel with the rejected parcels and their reasons, plus a variety prompt. Expected crates = area × yield ÷ crate kg × (1 − waste), as an unrounded float.

**gap / supply**
- `gapOutputs` puts each planting into one of three groups:
  - unknown (bad dates or crates, or an unknown wait): this makes the whole GAP `inputs_unknown`;
  - held: counted only from `athensDate(until)`;
  - clear.
- `supplyTable` spreads `est − logged` evenly over max(today, harvest_from, safe_from)..harvest_to per ISO week.
- Alert when gap ≥ max(minPct % of orders, minCrates). When the sowing lead time cannot arrive in time, it adds «buy in or agree volumes».
- Unsigned gives info only. Duplicate planting ids collapse, because `byPlanting` is keyed by id (probe G2).

**weeklySupply / harvestForecast**
- Info only. Only `wait: 'clear'` plantings are eligible. `held` and `unknown` go to separate buckets and are never counted (QA P0-2 holds).
- Any clear planting with bad data makes the week's eligible total `null`.

**stock (STOCK)**
- Works on the Athens day:
  - expired = expiry < today: an alert, and the lot is not counted as supply;
  - expiring = within `expiringDays`;
  - the remaining lots are summed exactly, per product.
- The total is compared with the next planned use (area × dose per στρ, same unit only):
  - below the need: `stock_insufficient` (a block);
  - below the need × lowFactor: `stock_low`.
- The label's dose text is passed through unchanged.

**registrationDose (REG dose)**
- For each dose check, the draft or done spray's dose is compared with the unique signed label row for (product, crop, target), in the same unit only. Units are never converted.
- Outside the range gives `dose_outside_label`. Unknown, ambiguous or another unit gives `dose_check_unknown`. Both are blocks for a draft.
- `total_qty = dose × treated στρ` is exact (0.0249 × 3.3 = 0.08217, never rounded).

**views/recordedHarvest, views/sowingGaps**
- Recorded harvests go into Athens-day weeks (DST end probed: 21:30Z goes to the week of 19 Oct, 22:30Z to the week of 26 Oct).
- Held and unknown crates are never «eligible».
- `sowingGaps` gives only the arithmetic shortfall, with no action (QA P0-3: no second sowing rule).

## 2. Probe table (input → expected per rules → actual → verdict)

| # | Unit | Input | Expected | Actual | Verdict |
|---|---|---|---|---|---|
| W1 | waits | PHI 14 d, end 11-06 08:00Z; now = 11-20 08:00:00Z / 08:00:01Z | not over / over | false / true | OK |
| W2 | waits | PHI 1 d across the DST end (10-24 22:30Z) | +86 400 s | 2026-10-25T22:30:00Z | OK |
| W3 | waits | `+02:00`, `.000Z`, `T24:00`, `:60`, 2026-02-29, "" | unknown | all unknown | OK (fail-closed) |
| W4 | waits/label | PHI "", "-1", "1.5", "NaN", "00014" | unknown | unknown; " 7" / "14 " trimmed and known | OK |
| W5 | waits | REI 0 h, now = end | not over | not over | OK |
| W6/W7 | waits | leap 2028, 1969, 2026-13-01 | exact / invalid | as expected | OK |
| D1 | decimal | 0,025 × 3,3 ; 1,5 × 0,06 | 0.0825 ; 0.09 | 0.0825 ; 0.09 | OK (QA P0-1) |
| D2 | decimal | "1,125" / "1,250" | an exact dose or quantity | invalid (rejected as ambiguous) | OK, fail-closed; UX P3: 3-decimal values above 1 cannot be typed. **"1,250 L" stock becomes unknown and disappears silently (see BUG-9).** |
| D2 | decimal | "00,5" | 0.5 | "00.5" (compares equal; the fingerprint string differs, so the sign-off drops, fail-closed) | OK |
| L1 | label | edit PHI after sign-off; dose 0; range 0.5 > 0.4 | unsigned / invalid | invalid ×3 | OK |
| E1 | engine | asOf `+02:00` | block everything | `now_unreadable` | OK |
| E2 | PHI | no row / unsigned / no end time | blocked + harvest veto | `phi_blocked_unknown` ×3 (+ REG unregistered) | OK |
| E3 | PHI | asOf = exactly end + 7 d | hold | `phi_hold` until that second | OK |
| E4 | PHI | end 06:00 before start 10:00 | blocked (bad data) | no output (wait counted from 06:00, 4 h short) | **BUG-17** |
| E5 | PHI | two sprays on one planting | the lot's latest `safe_from` | two `phi_hold`, no lot-level latest | observation P2 (consumer must take the max) |
| E6 | REI | tasks at reentry, reentry − 1 s, unreadable | allow / block / block | `[T1, T2]` blocked, T0 allowed | OK |
| E7 | REI | task on another planting of the same sprayed parcel | parcel-level lock (as the app's `reiLockParcel`) | allowed | divergence, needs agronomist (drift buffer [SET]) |
| E8 | REG/ROT | dill bed in a spinach-label draft; no group code | exclude the dill bed; ROT unknown | as expected (the REG bed check ignores the target) | OK |
| E9 | REG dose | 0.0249 vs 0.025; 25 ml/str vs l/str label | below min; unknown | `dose_outside_label`; `dose_check_unknown`; total 0.08217 | OK, never converted or rounded |
| U1 | all | every rule unsigned, alarming inputs (−5 °C, EC 5, expired lot, harvesting) | info only, notify false | info only ×6, notify false | OK (rule 3) |
| S1 | SPRAY-WIN | NaN wind, undefined leaf wetness, gust = max, a 30-min gap, NaN param, no sun, first hour, last hour | not OK | data_missing / gust_above_max / params_invalid / leaves_wet / rain_expected | OK |
| S1 | SPRAY-WIN | 0.3 mm rain in the hour, `leafWet:false`, rainMax 0.5 | wet hour (RULES: rain ≥ 0.2 mm is wet) | OK hour `[]` | P3 (defence in depth: trusts the caller's leafWet) |
| S1 | SPRAY-WIN | RH 150 %, wind −4 | data invalid | delta_t_out_of_range / wind_below_min (still not OK) | OK by luck, P3 |
| S2 | SPRAY-WIN | all gusts 40, signed; all temperatures NaN | closed (Medium); unknown | as expected | OK |
| F1 | FROST | topo undefined; cloud undefined; wind = max; elevation 900 > max | missing ×2; a hit; ? | missing ×2; a hit; parcel D silently dropped | OK; elevationMax dropping a parcel silently needs agronomist |
| T1 | SALT | EC 0.69 / 0.7 / 3.0 / 3.01 / −1 | none / slight / slight / severe / unknown | as expected | OK |
| K1 | STOCK | expiry = Athens today (asOf 22:30Z, the previous UTC day) | expiring, days_left 0 | expiring 0, stock_low | OK |
| G1 | GAP | PHI ends Sun 22:00 Athens | count only after the end | the whole Sunday's share counted (1 of 7 crates) | P3 (day granularity) |
| G2 | GAP | duplicated planting row | counted once | 40 (keyed by id) | OK |
| V1 | views | harvest at 21:30Z / 22:30Z on 25 Oct (DST end) | weeks of 19 Oct / 26 Oct | as expected; held not eligible | OK |
| H1 | PHI-GUARD | never-sprayed planting, harvesting, scouting | «harvest and scout» | block `harvest_spray_conflict` | P3 (conservative mislabel) |
| B1–B17 | various | see §3 | see §3 | see §3 | 17 bugs |

## 3. Confirmed bugs

Every test below is in `/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/work-engine/bugs.test.ts` and fails on 682c32d.

### P0: could mislead a spray or harvest safety decision (latent: engine not wired)

**BUG-1: FROST «no harvest before thaw» says `phi_clear: true` while PHI is running.**
- Where: `engine.ts` frost(), thaw branch.
- Cause: `held = phi(s).flatMap(o => o.vetoes…)`. Only `phi_blocked_unknown` carries a veto; a running `phi_hold` has `vetoes: []`, so a planting under a live PHI is not «held».
- Effect: the recommendation hard-codes `phi_clear: true`.
- Probe: PHI 14 d until 2026-12-03T08:00Z, frost night 20/21 Nov. Actual: `{"category":"no_harvest_before_thaw","values":{"thaw_at":{"2026-11-21":"2026-11-21T07:00:00Z"},"phi_clear":true,…}}`.
- This tells the farmer that harvest after 09:00 is fine during a PHI (RULES «never release a harvest during a PHI»).
- The golden case R06 has no spray, so it does not catch this.

**BUG-2: PHI (and REI, and REG `registered`) take the FIRST label row for (product, crop) and ignore the others.**
- Where: `engine.ts` `s.uses.find(...)`.
- Probe: two signed rows, PHI 3 d (target aphids) listed first and PHI 14 d (target mildew); spray 10 days ago. Actual: `[]`, no hold at all.
- Expected: the hold to the latest end, or a block because the row is ambiguous.
- `harvestGuard.clearance` and `registrationDose` already require exactly one row, and the app's `labelEnds` takes the maximum. The engine is the odd one out.

### P1

**BUG-3: `phi_hold` carries no harvest veto.**
- Actual: `vetoes: []`.
- TECH-SPEC §3 arbiter consumers that read vetoes see «unknown» holds but not running ones. This is the root of BUG-1.

**BUG-4: ROT never blocks when the label maximum or minimum interval is exceeded.**
- It only checks that the values are present.
- Probe: maxApps 2, two done sprays of prodX, then a third draft. Actual: `[]`.
- RULES ROT says «Block when the label's maximum count would be exceeded or the minimum interval is too short».
- It also reads the raw `UseFact.maxApps`, not the signed `SignedLabelUse.maxApps`. That gives two sources of truth.

**BUG-5: SOW recommends a parcel with NO recorded history.**
- Probe: history `[]`. Actual: `[{"kind":"recommendation","category":"sow","parcel_ids":["P9"]}]`.
- RULES SOW says «With no history, the rule runs info-only».

**BUG-6 (needs agronomist): FROST drops a radiative night on slope or coast parcels.**
- Cause: the positive offset is added at R = 1 before the Tmin test.
- Probe: cell Tmin 1 °C (≤ 2), slope offset +2. Actual: `[]`, which reads as «no frost».
- RULES says a night is radiative when the 2 m (cell) Tmin is ≤ [SET], and parcel Tmin = cell + **R** × offset with R in 0–1.
- R = 1 is the «strongest» case only for the cold plain. For warm offsets it is the most lenient.

### P2

**BUG-7: STOCK — a lot in another unit REPLACES the running sum.**
- Probe: 0.5 L + 200 ml, next use needs 1 L. Actual: `[]`.
- Expected: insufficient, or «units differ: unknown».

**BUG-8: STOCK — a lot with no expiry counts fully as usable supply, with no prompt.**
- `validDate` uses V8 `Date.parse`, which accepts «2026-02-30» as 2 March.
- Actual (no expiry): `[]`.

**BUG-9: STOCK — a lot whose quantity is unknown is skipped silently.**
- A product with only such lots gets no check at all. Actual: `[]`.
- Real trigger: «1,250» L parses as invalid (D2), so the lot vanishes.

**BUG-10: `weeklySupply` and `harvestForecast` count a duplicated planting row twice.**
- Actual: eligible 80, crates7 80, instead of 40.
- `gap` is immune because it is keyed by id.

**BUG-11: SOW rain — a stale 0 mm forecast row for a past day overrides the measured 30 mm.**
- Cause: the `measured` Map is built from all rows and the last one wins.
- Actual: a recommendation with window 2026-11-20.

**BUG-12: REG dose — a draft spray with no dose check gets no dose block.**
- Actual blocks: `[]`.
- RULES REG says a spray is allowed only if the dose is within the label range; a missing check should be unknown, which means blocked.

**BUG-13 (needs agronomist for the buffer): PHI-GUARD's forward trigger is not built.**
- The trigger is «spray + PHI > harvest_from − [SET buffer]».
- Probe: a draft with PHI 14 d on a growing planting, harvest from 3 days ahead. Actual: `[]`.

**BUG-17: PHI accepts an end before the start and counts from the earlier time.**
- Probe: start 10:00, end 06:00, asOf start + 7 d − 3 h. Actual: `[]` (the wait is 4 h short).
- The app and server already reject this at input. The engine should still treat it as `unreadable_time`.

### P3

**BUG-14: SALT uses `asOf.slice(0,10)`, the UTC day, not the Athens day.**
- A sample dated «today» in Athens between 00:00 and 02:00/03:00 is «in the future», which gives unknown. Actual: `undefined`.

**BUG-15: a rule with no `ruleStatus` entry shows nothing.**
- Affects FROST, SPRAY-WIN and STOCK: there is no info and no alert, which reads as «all clear».
- Probe: a −3 °C night. Actual: `[]`.
- N already uses `!== 'signed'`.

**BUG-16: `supplyTable(asOf)` (exported) slices the UTC date.**
- Monday 00:30 Athens (Sunday 22:30Z) lands in the previous ISO week. Actual: week `2026-11-09`; expected `2026-11-16`.
- `gap` passes the Athens date, so it is safe today.

**Count: P0 2 · P1 4 · P2 8 · P3 3 = 17 confirmed.**

Further observations, not counted as bugs:
- E5: there is no lot-level latest `safe_from`.
- E7: REI works per planting while the app locks per parcel (needs agronomist: drift buffer).
- G1: day granularity of `safe_from`.
- H1: a never-sprayed planting is blocked.
- F1: `elevationMaxM` silently drops a parcel (needs agronomist).
- `harvestGuard` uses the status `ready`, which is not in the DB.
- GAP confidence is `undefined` when the order gives none (RULES: the lowest of the inputs).
- The inversion offset with a fractional H builds a malformed time string (conservative for Athens sunrise times).

## 4. Fixes (each one PR, ≤ 450 lines, red test first; no label values invented)

1. **PR «PHI veto + thaw honesty» (BUG-1, BUG-3), about 40 lines + tests.**
   - Give `phi_hold` `{by:'PHI', vetoed:'harvest', planting_id, reason:'phi_running'}`.
   - In frost(), derive `phi_clear` from `harvestGuard`-style clearance (every spray known and over). Otherwise skip, or emit `thaw_unknown`.
   - Add a golden NEG case: «R06 + running spray».
2. **PR «one label row rule» (BUG-2, BUG-17), about 70 lines.**
   - In `phi()`, `rei()` and `registered()`, gather ALL rows for (product, crop).
   - Several signed rows with no job target: use the LATEST end, as the app's `labelEnds` does. Any unsigned row: blocked.
   - `endedAt < startedAt`: block as `unreadable_time`.
3. **PR «ROT counts» (BUG-4), about 120 lines, needs agronomist for the season definition and group limits ([SET]).**
   - Use the SIGNED `maxApps` plus the label's min interval.
   - Count done sprays of the product per planting. Block when count + 1 > maxApps or last end + interval > asOf.
   - Until the season [SET] is signed, count every recorded spray in the snapshot (conservative) and show it as info.
4. **PR «SOW history + rain rows» (BUG-5, BUG-11), about 50 lines.**
   - Empty history becomes `no_history`: the parcel is rejected and SOW gives info-only output.
   - Past days use measured rows only (`forecast:false`). Two rows of the same kind for one date: unknown.
5. **PR «FROST radiative test on the cell» (BUG-6), about 60 lines, needs agronomist.**
   - Test radiative conditions on cell Tmin, per RULES.
   - Report the parcel Tmin as a range over R ∈ [0, 1], i.e. [cell + min(0, off), cell + max(0, off)]. The offsets themselves stay [SET].
   - Report `elevation_above_max` as info instead of silence.
6. **PR «STOCK unknowns are loud» (BUG-7, 8, 9), about 80 lines.**
   - Per product, if lot units differ, emit `stock_unknown: units_differ`. Never convert.
   - A lot with unknown qty or a missing or unreadable expiry is not counted, and goes into `stock_unknown`.
   - Replace `validDate` with `isCalendarDate`.
7. **PR «supply duplicates» (BUG-10), about 25 lines.** In `weeklySupply` and `harvestForecast`, a duplicate planting id moves the planting to `unknownIds` / null (never summed twice).
8. **PR «REG/PHI-GUARD for drafts» (BUG-12, BUG-13), about 110 lines; the buffer needs agronomist.**
   - Every draft spray without a matching dose check gives `dose_check_unknown`.
   - PHI-GUARD: when signed PHI end > harvest_from − buffer[SET], give the «harvest faster and scout» path. It stays info-only until the buffer is signed.
9. **PR «Athens day + missing status» (BUG-14, 15, 16), about 30 lines.**
   - SALT uses `athensDate(asOf)`.
   - `infoOnly` shows FROST, SPRAY-WIN and STOCK info when the status is anything but `signed`.
   - `supplyTable` takes a calendar date (or runs `athensDate` on an instant).

Do this before wiring `runRules` into any screen or Edge Function: fixes 1–2 are P0 and should land first.

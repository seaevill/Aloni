# FieldWise v2 – QA report (2026-11-16)

**Under test:** `index.html` (129 KB, single file, embedded `DATA`), compared against `data.json`, `SPEC.md` and `data-notes.md`.
**Evidence:** `qa/` holds about 120 screenshots (prefix `i390-` is 390×844, `i375-` is 375×667). The `*-findings.json` files there hold the raw audit output.

## How it was tested
- **Static review:** read the whole CSS and JS. Parsed the script with acorn at **ecmaVersion 2017**, and it parses cleanly. There is no `?.`, `??`, `.at()`, `findLast`, `structuredClone`, `replaceAll`, regex lookbehind, top-level await or `:has()`. `100dvh` and `88dvh` both have `vh` fallbacks, and `inset:0` has top/left/right/bottom fallbacks. The only `<input>`-type element is a read-only `<textarea>`.
- **Playwright:** Chromium 153 with an iPhone user agent, `is_mobile`, touch, DPR 3, at 390×844 and 375×667.
  - **WebKit could not be used.** Its download failed in this sandbox (no WebKit binary), so the iOS verdict rests on static review plus Chromium. A 2-minute smoke test on a real iPhone before sharing is still recommended (see "Open risk").
- **Sandbox simulation:**
  - All network was blocked, Google Fonts included. The fallback fonts render fine.
  - `localStorage` throws on access.
  - `navigator.clipboard.writeText` rejects.
  - `alert`, `confirm` and `prompt` throw.
- **What was clicked:**
  - All 5 tabs.
  - All 10 crop details, with every planting `<details>` expanded.
  - All 5 parcel details.
  - All 17 product details, with screenshots of 6.
  - All stock filter chips.
  - All 10 alert "Why?" sheets and all 7 recommendation "Why?" sheets.
  - Closing a sheet with the X and with a backdrop tap.
  - A 5-level deep link chain (crop → parcel → crop → product → parcel), then Back repeatedly to the root. Scroll position was restored correctly.
  - Spray log filters, the CSV sheet and Copy.
  - Harvest forecast, Orders → sowing, Settings and About.
  - EL and TR on Today, spinach detail, a Why? sheet, Orders, Stock and Pachi parcel.
  - Field mode and the ha unit.
- **Result:** 0 page errors. The only console error is the blocked Google Fonts request, which is expected. There is no horizontal page overflow at either width, no text under 14 px (SVG text included), and the last content clears the tab bar.

---

## P0 – must fix before sharing (3)

### P0-1 Pesticide doses are shown rounded, so the screen dose differs from the label dose
- **Screen:** Stock → Product detail "Registered for" table; Spray log cards; job cards on parcels and products.
- **Steps:**
  1. Open Stock → Σπινοσάντ 48% SC.
  2. Then open Ακεταμιπρίδη 20% SP and Φλονικαμίδη 50% WG.
- **Expected:** spinosad 0.025 L/στρ, acetamiprid 0.025 kg/στρ, flonicamid 0.014 kg/στρ, as in `data.json`.
- **Actual:**
  - Spinosad shows **0.03 L/στρ (+20 %)**.
  - Acetamiprid shows **0.03 kg/στρ (+20 %)**.
  - Flonicamid shows **0.01 kg/στρ (−29 %)**.
  - Spray log job J14 shows "0.03 L/στρ", but the CSV export of the same job says 0.025.
  - Alert A08 says "≈ 4.8 στρ … at 0.025 L/στρ". The app contradicts itself on a dose, and the sample banner says "Doses … from the product label".
- **Cause:** `num()` rounds to 2 decimals (`Math.round(v*100)/100`), and `dose()` calls `num(v)`.
- **Fix:** never round doses. Print the stored value as-is, e.g. `String(v)` plus a decimal-comma swap, or use up to 4 significant decimals. Apply the same rule to stock quantities.
- **Evidence:** `i390-34-product-PR08.png`, `i390-35-product-PR10.png`, `i390-39-spraylog.png`.

### P0-2 Harvest KPIs and forecasts count crates from a lot that is still inside its PHI
- **Screen:** Today KPI "Harvest next 7 days 354"; Crops list "Parsley – harvest next 7 days: 45"; Parsley detail "Orders vs supply", week 16–22 Nov "45 / ▲ -0 surplus"; More → Harvest forecast (parsley 45, no ▼); Orders → sowing (parsley "Supply covers orders").
- **Steps:**
  1. Today → read the KPI.
  2. Crops → Μαϊντανός.
  3. Compare with alert A04 / recommendation R07 on the same page.
- **Expected:**
  - Geraneia parsley (PL12) is in PHI until Mon 23 Nov (difenoconazole on 9 Nov + 14 d), and A04 says "Do not cut … parsley short this week (~27 crates)".
  - This week's parsley supply should be about 18 crates (PL07 only), shown as a ▼27 shortfall.
  - The 7-day total should be about 328, not 354.
- **Actual:** `harvest()` / `cratesIn()` spread `est_crates` over the whole harvest window and ignore `safety()`. Five screens tell the grower he will cut about 26 crates of parsley that another screen forbids him to cut. This is exactly the "contradiction between screens" that SPEC must-fix #1 forbids, and it involves food safety.
- **Fix:**
  - In `cratesIn()`, clamp the start to `max(harvest_from, safety(pl).safeFrom)`.
  - Optionally also subtract logged harvest jobs. R02 says 151 crates are left of PL01's 225, at about 60 this week, while the KPI assumes 83.
  - Show "in PHI until …" next to the excluded crates.
- **Evidence:** `i390-01-today.png`, `i390-14-crops.png`, `i390-17-crop-parsley.png`, `i390-40-forecast.png`.

### P0-3 Orders → sowing marks parcels "Suitable" that the sowing rule rejects, including the mildew-flagged parcel
- **Screen:** More → Orders → sowing.
- **Steps:** open the screen and read the Σπανάκι and Σέσκουλα cards.
- **Expected:**
  - Suitable parcels follow the R04 rule: no Amaranthaceae in the last 3 years, no disease flag for that crop, free area.
  - For spinach that means only Νότιος Κάμπος.
  - For chard (also Amaranthaceae) it means only Νότιος Κάμπος. In any case it must not include Pachi (downy-mildew HIGH, spinach and chard already there), Κάτω Κάμπος (spinach this season) or Μεσαίο (beetroot in spring 2026).
- **Actual:**
  - Spinach shows "Suitable parcels: **Μεσαίο Χωράφι**, **Γεράνεια Πλαγιά**, Νότιος Κάμπος". That sits directly under R04, whose own Why? sheet lists Μεσαίο and Γεράνεια as *rejected*.
  - Chard shows "▼ Sow ~0.5 στρ for ~1 crates/week … Suitable parcels: Κάτω Κάμπος, Μεσαίο, **Πάχη Παραλιακό**, Γεράνεια, Νότιος". The gap behind this is 0.6 crates/week, a rounding artefact, and it lists the downy-mildew-flagged parcel as suitable.
- **Cause:** `V.orders` excludes only parcels that have a disease *alert* for the same `crop_id`. It ignores crop family, rotation history, free area and R04's `rejected_parcels`. The gap threshold is 0.5 crates.
- **Fix:**
  - Compute suitability from the same rule as R04. Add `family` to crops and `history` to parcels in data, or simply use R04's `rejected_parcels` and only show parcels with a recommendation.
  - Exclude any parcel with a disease alert for any crop of the same family.
  - Raise the gap threshold, e.g. ≥ 10 % of orders and ≥ 3 crates/week.
  - Drop the generic "Suitable parcels" line when no agronomic check has been done.
- **Evidence:** `i390-41-orders.png`, `i390-13-why-R04.png`.

---

## P1 – fix before the friend review (7)

### P1-1 EL/TR only translate the chrome; every alert, recommendation, Why? and note stays in English
- **Screen:** all screens, in Settings → Ελληνικά / Türkçe.
- **Steps:** switch to TR → Today → any alert → Neden?
- **Expected:** title, body, action, window, rule and source in the chosen language. `tx()` already looks for `title_tr`, `body_el` and so on.
- **Actual:**
  - `data.json` has no `_el` or `_tr` fields, so TR shows "Spinach Κάτω Κάμπος: mildew conditions … do NOT spray" under Turkish labels.
  - Dates inside the data text stay English ("Thu 3 Dec") while UI dates are localized ("Per 3 Ara").
  - Hard-coded English also remains: "Form", "Farm", "Region", "saline", "sea", "REI", "Updated 06:40", and the irrigation "Data source" label.
- **Fix:**
  - Add `title_el/_tr`, `body_*`, `action_*`, `window_*` and `why.rule_*` to the alerts and recommendations (agronomist task).
  - Move the remaining literals into `T`.
  - Until then, show a "content in English" note in EL/TR.
- **Evidence:** `i390-52-today-tr.png`, `i390-54-why-A02-tr.png`, `i390-48-why-A02-el.png`.

### P1-2 Greek tab bar labels are truncated
- **Screen:** bottom tab bar, EL, at both widths.
- **Expected:** full labels.
- **Actual:** "Καλλιέ…", "Αγροτε…", "Περισσό…". Each tab is 75–78 px wide, but the text needs 94–98 px.
- **Fix:** use short EL labels, e.g. "Καλλ/γειες" or better "Φυτά", "Χωράφια", "Αποθήκη", "Άλλα". Or allow 2 lines at 13–14 px.
- **Evidence:** `i375-46-today-el.png`, `i390-50-stock-el.png`.

### P1-3 The frost alert and fleece action are missing from the crop screens they concern
- **Screen:** Crops → Άνηθος (dill); also Κόλιανδρο, Σπανάκι, Ραδίκια, Αντίδια.
- **Expected:**
  - Dill PL06 is named in A01 and R05 ("cover coriander + dill Wed evening").
  - Spinach and chicory have "no harvest Thu before 10:00".
  - Endive (Νότιος Κάμπος, 0.2 °C, ready to cut) is in the same cold pool.
- **Actual:**
  - The dill detail says "**No recommendation right now**" and "**No active disease/pest alert**".
  - A01 has only `parcel_id: P2`, so `alertCrop()` returns null and the alert never shows on any crop page.
  - R05 is tied to `planting_id: PL05` only, so dill does not get it.
  - Parcel pages for Κάτω Κάμπος and Νότιος Κάμπος do not show the frost alert either.
- **Fix:**
  - Allow `planting_ids[]` / `parcel_ids[]` on alerts and recommendations. Data: A01 → P1, P2, P5 with PL01, PL03, PL05, PL06, PL15; R05 → PL05, PL06.
  - Make `alertCrop`/`recCrop` match any of them.
  - Add endive harvest timing to A01 (data).
- **Evidence:** `i390-18-crop-dill.png`, `i390-19-crop-coriander.png`, `i390-30-parcel-P5.png`.

### P1-4 The frost rule also fires on Tue and Wed nights, but the alert only covers Wed→Thu
- **Screen:** Today → A01 Why?; Μεσαίο / Κάτω Κάμπος weather strips.
- **Expected:** A01's rule is "2 m min ≤ 2 °C AND wind ≤ 5 km/h AND clear, below 50 m".
- **Actual:**
  - `data.json` forecast already meets the rule on Tue 17 (P1 1.5 °C / P2 2.0 °C, wind 4) and Wed 18 (P1 1.0 °C / P2 1.5 °C, wind 4).
  - The alert, R05 (fleece only Wed evening) and R06 (start cutting chicory Wed 10:00 after a 1.0 °C night) ignore those two nights.
  - The A01 body even says "clear, calm nights Tue–Thu".
- **Fix (data):** extend the alert to nights 16→17, 17→18 and 18→19, and fleece from Mon or Tue evening. Or change the rule threshold and say why. Check that R06's first cut is after thaw.
- **Evidence:** `i390-02-why-A01.png`, `i390-27-parcel-P2.png`.

### P1-5 The weather-strip spray threshold contradicts the spray rules
- **Screen:** every weather strip, in the legend "▲ gust ≥ 25: no spraying".
- **Expected:** R01 and A09 say "gust < 20 km/h" or "no spray when gust > 20".
- **Actual:** the strip only flags gusts ≥ 25. Days with 20–24 km/h look sprayable:
  - Pachi Mon 9: 22
  - Geraneia Mon 9: 22
  - Κάτω Κάμπος Sat 14: 24
- The orange leaf-wet highlight at ≥ 12 h has no legend.
- **Fix:** use one constant (20) for both the legend and the flag, and add a legend entry for leaf-wet ≥ X h.
- **Evidence:** `i390-15-crop-spinach.png`.

### P1-6 Expiry dates are shown without a year
- **Screen:** Stock list and Product detail.
- **Steps:** Stock → Διφαινοκοναζόλη 25% EC.
- **Expected:** "Tue 30 Nov 2027".
- **Actual:**
  - "Expiry Tue 30 Nov" reads as two weeks from today.
  - Similarly "Mon 31 Jan" for mandipropamid (2028) and "Fri 31 Mar" for copper (2028).
  - The really expired acetamiprid ("Sat 31 Oct") looks no different apart from its pill.
- **Fix:** `fd()` should append the year when it differs from `TODAY`'s year, or always do so for expiry dates.
- **Evidence:** `i390-31-stock.png`, `i390-33-product-PR03.png`.

### P1-7 Inline name links are below 44 px tap height
- **Screen:** every alert, recommendation, planting, job card and table (`button.lnk`).
- **Actual:** crop, parcel and product links measure 32–35 px high. That is 96 elements across the run; see `*-findings.json` → `tap`. All other buttons, tabs, chips and the X are ≥ 44 px.
- **Fix:** give `.lnk` `display:inline-block; min-height:44px; padding:10px 0` (keep the negative margin), or make whole rows tappable.

---

## P2 – polish and latent issues (18)

1. **Backdrop tap on iOS.**
   - The sheet closes via `document` click delegation on the non-interactive `#ov` div. iOS Safari often does not deliver delegated clicks for elements without `cursor:pointer`.
   - It works in Chromium, but on an iPhone the backdrop likely does nothing. The X button still works.
   - **Fix:** add `cursor:pointer` to `.ov`, or attach the listener directly to `#ov`.
2. **Background scroll while a sheet is open (iOS ≤ 15).** `body{overflow:hidden}` does not lock scrolling on iOS Safari before 16. **Fix:** add `overscroll-behavior:contain` on `.sheet` and `touch-action:none` on `.ov`, or use a `position:fixed` body lock.
3. **No `history` integration.** The iOS edge-swipe or the Claude app's back gesture leaves the artifact instead of popping the view stack. **Fix:** `history.pushState({depth},"")` without a hash, plus `popstate` → `back()`. This needs testing in the sandbox.
4. **CSV copy on iOS.**
   - The fallback runs inside a rejected promise, which is outside the user gesture, so `execCommand('copy')` will fail on iOS and show "Copy blocked".
   - `ta.focus()` on a 14 px textarea may zoom the page.
   - **Fix:** run the `execCommand` path synchronously first, and set the textarea to 16 px.
5. **"Weather now" shows the daily maximum as "Temp 17 °C" with "Updated 06:40".** "3° tonight" is today's morning minimum; tonight's minimum on the low plain is 1.5 °C, which matters in a frost week. **Fix:** relabel as "Today max/min" and show tonight = tmin of D+1.
6. **"▲ -0 surplus" / "▲ -1 surplus".**
   - Gaps between 0 and 0.5 are printed as a negative surplus: parsley -0, and coriander -1 when it is actually 0.5 short.
   - **Fix:** render 0 as "≈ balanced" and never print a negative surplus.
7. **Low-stock rule differs between UI and data.**
   - The UI flags qty < 5 × max dose; the data rule is < 2 × the next application.
   - Spinosad shows "▼ Low stock" while A08 says "do not order more".
   - **Fix:** use one rule, or suppress low stock for products that expire soon or are expired.
8. **Expiry-soon threshold is 60 days in the UI vs 30 days in the data rule (A08).**
9. **Rotation hint is per parcel, not per lot/crop.**
   - Copper (FRAC M01, multi-site) is flagged "same group — rotate" on Κάτω Κάμπος.
   - Products are marked "OK" on parcels where they are not registered for any crop.
   - **Fix:** compute per planting and only for registered crops, and treat M-groups as low risk.
10. **PL12 parsley shows the "✂ Harvesting" pill while inside PHI.** **Fix:** show a "Hold – PHI" status when `!safety().clear`.
11. **REI is counted from midnight of the spray date, not the spray time.** Jobs have a time in `notes`. It is latent today, but R01's "REI 24 h" will display wrongly. **Fix:** add a `time` field to jobs.
12. **Yield arithmetic.** The source note and A05/R04 say "~10 % waste included", but `est_crates` = area × 1.2 t ÷ crate kg with no waste (PL01: 1.5 × 1200 / 8 = 225 exactly; R04: "~450" should be ~405).
13. **A09 says "gusts up to 55 km/h" on the plain**, while the data shows 58 (P1, Sun) and 62 (Pachi).
14. **Internal IDs and raw keys are shown to users.** "See recommendation R01", "Sow … (R04)", "PL05 coriander", "P1 Κάτω Κάμπος 24 m", and Why? keys like "PL01 per week" or "est supply weeks from 16 Nov". **Fix:** map keys to labels and drop the IDs.
15. **Rocket "Planted in: Μεσαίο, Γεράνεια, Μεσαίο"** (duplicate) and the Crops list's "1 × plantings". **Fix:** de-duplicate parcels and pluralise properly.
16. **"1 crate ≈ 8 kg" is built with `.replace(/s$/,"")`.** In EL it gives "1 κλούβες" (plural). **Fix:** add a `crate` singular key to `T`.
17. **Irrigation water source is labelled "Data source"** (reuses `t("source")`). The leek detail shows empty Orders/Supply bars ("0 / 0"). **Fix:** use an `irrSource` key, and show "no orders yet (harvest Jan)" for leek.
18. **R03 fertigates leek on Κάτω Κάμπος via drip on 23–25 Nov while PL01 spinach on the same parcel is still harvesting (to 28 Nov).** The rule is "no N < 21 days before harvest". Add "separate valve/sector" to the action, or confirm the sectors are separate (data/agronomist).

---

## Content checks that passed
- Safe-to-harvest dates equal last spray + PHI for every planting:
  - PL01: 2 Nov + 7 → Mon 9 Nov
  - PL08: 30 Oct + 14 → Fri 13 Nov
  - PL12: 9 Nov + 14 → Mon 23 Nov
  - PL13: 6 Nov + 3 → Mon 9 Nov
  - PL04: 4 Nov + 7 → Wed 11 Nov
  - PL15: 3 Sep + 42 → Thu 15 Oct
  - PL02 (leek): 20 Oct + 28 → Tue 17 Nov
- R01 is consistent:
  - PHI ends Wed 2 Dec, one day before harvest on Thu 3 Dec.
  - The FRAC group moves from 28 to 40.
  - Stock is 0.10 L against 0.09 L needed, and the product is not expired.
  - Wed 18 has gust 14 and no rain for more than 48 h.
- "Safe to harvest today" = 8, which matches the data notes. Its rule (mature AND PHI over) is applied correctly.
- KPI totals equal the sum of evenly spread plantings (7 d = 353.9 → 354, 28 d = 1457.3 → 1457). They are still wrong per P0-2.
- Today's 5 parcels and 10 active crops match the data. Planted area does not exceed parcel area anywhere. Weekday names in data text match the 2026–27 calendar (Clean Monday 15 Mar 2027 is correct).
- No sowing *recommendation* targets a flagged parcel: R04 → Νότιος Κάμπος is fine. Only the generic "Suitable parcels" list is wrong (P0-3).

## Open risk
No WebKit engine was available here, so nothing ran in Safari's real engine. Static analysis found no syntax or API that iOS 15 lacks, and the page renders with fonts blocked and `localStorage` throwing. Before sending the link, open it once on the iPhone, in Safari and in the Claude app, and check:
- first paint
- tab switching
- opening and closing a Why? sheet
- back navigation
- the CSV sheet

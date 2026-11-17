# FieldWise Phase 1: rules catalogue

Scope: leafy greens and herbs, Megara plain. Replaces the v2 "why" texts.

**Conventions**
- **[EST]** means well-established practice, given as a range. **[SET]** means a placeholder that the agronomist **must set and approve**.
  - Until its [SET] values are approved, a rule runs **info-only**: it shows the inputs but gives no verdict.
- **Confidence** has three levels:
  - **High:** logged data plus the official label.
  - **Medium:** forecast or estimated inputs.
  - **Low:** missing data, or ~~a station more than 10 km away or more than 100 m higher or lower than the parcel~~ (superseded 2026-11-17, gridded data has no station: see "Weather inputs" below).
  - Drop one level for each estimated key input (for example, leaf wetness taken from RH) and for any lead time over 72 h.
- **Why? sheet:** rule text, thresholds, inputs, station distance, forecast or measured.
- **Blocking order:** registration → PHI/harvest status → REI → rotation → stock/expiry → weather window.

---

## Weather inputs (added 2026-11-17, meteorologist review)
- **Source:** ICON-EU (main, 0–78 h) with ECMWF IFS HRES as fallback and for days 4–10; model name and run time are stored as data. When the two disagree (Tmin > 2 °C apart, rain yes/no) drop one confidence level. Fetched every 6 h; older than 12 h = no weather advice.
- **Confidence for gridded data** (replaces the station-distance rule): Low when the parcel elevation differs from the weather cell's by more than 100 m, when the cell is coastal, or for a valley or foothill parcel on a radiative night.
- **Wind is a 10 m value.** State thresholds at 10 m or convert (boom height u2 ≈ 0.75 × u10). Block on the gust.
- **Leaf-wet hour** (shared by SPRAY-WIN, DM-SPIN, LWD): an hour counts as wet if any of: RH ≥ [SET, 87–90] %; dew-point depression ≤ [SET, ~2 °C] with light wind; rain ≥ 0.2 mm; **sprinkler irrigation running**, plus a drying tail [SET]. Calibrate with dew observations or a leaf-wetness sensor. Open-Meteo's own leaf-wetness probability is daily only and is not used.
- **Confidence wording (Greek UI):** High «μετρημένο/ετικέτα» · Medium «πρόγνωση μοντέλου ~7 km» · Low «εκτίμηση – ελέγξτε στο χωράφι». Always show «Πρόγνωση ΗΗ:ΜΜ».

---

## A. Plant protection

### SPRAY-WIN: Spray window
- **Inputs:** planned job (product, lot, duration); hourly parcel forecast (wind, gust, temperature, RH, dew point, rain, cloud); leaf wetness (RH ≥ [SET, ~90] % or sensor); label `rainfast_h`.
- **Logic:** an hour is OK only if all of the following hold:
  1. **Wind** is 3–10 km/h [EST]. The farm maximum is [SET].
  2. **Gust** is below [SET]. The v2 value of 20 is a placeholder, and one constant must feed both the UI legend and the rule.
  3. **No inversion:** block when wind is below about 3 km/h, the sky is clear, and the hour falls between sunset and [SET 1–3] h after sunrise [EST].
  4. **Leaves dry** for at least [SET] h, using the leaf-wet-hour rule above (so rain **and sprinkler irrigation** count as wet). Dew burn-off comes from the forecast, never from a fixed clock time.
  5. **Rain-free** after application for the label's rainfast time. If the label is silent, use [SET], typically 1–6 h. Also block when rain over [SET] mm is forecast within 24 h.
  6. **Delta-T** is 2–8 °C, 8–10 °C is marginal, below 2 °C is poor, and above 10 °C means no spraying [EST]. Within ±1 °C of a threshold show "borderline". The maximum temperature is [SET, commonly 25–30 °C]. Label limits override all of this.
- **Output:** recommendation with the first OK run at least as long as the job, else "no window" plus the reason per day. A front closing every window raises a Medium alert.
- **Confidence:** Medium. It drops to Low when leaf wetness is estimated and an input is within 10 % of its threshold.

### PHI: Safe to harvest
- **Inputs:** spray jobs (product, beds, **date and time**) and `phi_days` from the label for each crop.
- **Logic:**
  - `safe_from` is the latest `spray time + PHI` across the lot's jobs.
  - Beds count as sprayed only if the job's area covers them. Drift buffers are [SET].
  - If the label has no entry for that product and crop pair, the lot is **blocked**, never given a default.
- **Output:** a High alert, "Do not harvest until …", and the lot status changes to "Hold – PHI". **Every supply figure, KPI and forecast starts no earlier than `safe_from`** (QA P0-2).
- **Confidence:** High from the official database, Medium ("manual" badge) if hand-entered. Nothing to set: the PHI is a label fact.

### PHI-GUARD: Spray versus harvest
- **Trigger:** a lot is harvesting or ready, or `spray + PHI > harvest_from − [SET buffer days]`.
- **Output:** no spray recommendation. Show "harvest faster and scout" instead (the v2 A03/R02 pattern).
- **Manual sprays:** still loggable; the app shows the new lock date and crates lost.

### REI: Worker re-entry
- **Inputs:** spray time, label `rei_h` (with a tank mix, the longest REI wins), and worker task assignments.
- **Logic:** `reentry_at = spray time + REI`. If the label gives no REI, workers stay out until the spray has dried, plus [SET] h.
- **Output:** a High alert on the parcel and in the worker view. Assigning harvest or field work before `reentry_at` is blocked. A label PPE exception needs an explicit acknowledgement.
- **Confidence:** High with label data, Medium when entered manually.

### ROT: Resistance rotation and maximum applications
- **Inputs:** FRAC/IRAC/HRAC code; label max applications and minimum interval; spray log **per lot and target**, not per parcel; season definition [SET].
- **Logic:**
  - Warn when a product repeats the group of the previous application. Multi-site groups (M) are exempt [EST].
  - Block when the label's maximum count would be exceeded or the minimum interval is too short.
  - Limits specific to each group (maximum consecutive uses, maximum share of the programme) follow the FRAC, IRAC or HRAC guidelines and are [SET].
  - No group code means unknown, never cleared.
- **Output:** a Medium warning or a High block, plus a list of registered, in-stock alternatives from a different group.

### REG: Label registration check
- **Inputs:** ΥΠΑΑΤ (Ministry of Rural Development) product database record (authorisation and status, crops, targets, dose range, PHI, REI, max applications); lot crop; target.
- **Logic:**
  - A spray is allowed only if the authorisation is current, the product, crop and target appear together on the label, and the dose is within the label range.
  - Minor herbs (dill, coriander) will often be blocked; that is correct.
  - A job that covers unregistered beds says "exclude these beds".
- **Output:** a High block. Manually entered labels carry a "verify" badge and need agronomist approval.
- **Prescription:** a prescription (συνταγή) may be required for purchase. **Verify this with the agronomist.** If it is required, the spray record links the prescription ID.

### STOCK: Stock and expiry
- **Low stock:** quantity < [SET ×, v2 used 2] × the next planned use. The UI and the data must use this one rule.
- **Expiring:** within [SET, v2 used 30] days.
- **Expired:** the product cannot be selected. Show "set aside, return via the authorised scheme".
- **Insufficient for the planned job:** block the job.
- **Severity:** Low or Medium. Prompt a stock count every [SET] weeks.

---

## B. Weather risk and disease

### FROST: Frost and cold-air pooling
- **Inputs:** hourly 2 m Tmin, wind, cloud, dew point; parcel elevation and **topo class** (plain/valley floor, slope, ridge, coastal); crop and stage; covers on hand.
- **Logic:**
  - **Radiative night:** clear sky (cloud below [SET] oktas), wind below [SET, ~5 km/h], and 2 m Tmin at or below [SET, v2 used 2 °C].
  - **Parcel Tmin = cell Tmin + R × offset[topo class]** where R (0–1) comes from cloud and wind and the topo class is plain / slope / coast. Starting offsets, all [SET]: plain −1 to −3 °C; slope 0 to +2 °C; coast +1 to +2 °C. **Do not stack** the Open-Meteo lapse-rate correction with this pooling offset.
  - **Cold-air pooling:** on radiative nights, plain and valley-floor parcels get a **colder** offset and slopes above the cold layer a warmer one. The offsets are [SET], calibrated against the farmer's frost/no-frost taps and any sensor.
  - **Leaf surface:** typically 1–3 °C below 2 m air on such nights [EST]. **Always show a range** (for example «1 έως −2 °C») with its basis («μοντέλο + διόρθωση εδάφους, μη βαθμονομημένο») and the run time, never a single number.
  - **Damage:** the damage temperature and duration for each crop and stage are **[SET]**. Until then, the alert says "frost conditions" only.
- **Output:** High alert listing **every** affected parcel, lot and night (QA P1-3, P1-4). Actions: cover if fleece on hand (gain ~1–2 °C [EST]); no harvest until thawed.
- **Confidence:** Medium up to 48 h, otherwise Low. Uncalibrated parcels are Low.

### DM-SPIN: Spinach downy mildew (*Peronospora effusa*)
- **Inputs:** hourly leaf wetness (estimated or sensor), temperature while wet, 5-day rain forecast, disease history, variety and declared Pe races, scouting.
- **Logic:**
  - A night is favourable when wetness (counted with the **leaf-wet-hour rule** under "Weather inputs") lasts at least [SET, v2 10] h at temperatures in the cool band that favours sporulation and infection. The literature puts that band at roughly 5–20 °C with an optimum near 10–15 °C [EST, studies vary]. The exact band is [SET].
  - The risk level comes from favourable nights in the last [SET] nights, forecast wet weather and history. The scoring is [SET].
  - Resistance lowers the risk only for the declared races.
- **Output:**
  - Risk (Low, Medium or High) plus a **scouting prompt**: look for grey-violet growth on the leaf underside and attach a photo. A confirmed find marks the lot "confirmed".
  - A treatment recommendation only after PHI-GUARD, REG, ROT and STOCK all pass.
  - **The flag blocks SOW for Amaranthaceae on that parcel.**
- **Confidence:** Medium with estimated wetness. Low without history or variety data.

### LWD: General leaf-wetness disease risk (other crops)
- **Coverage:** a wet-period counter for Septoria on parsley, *Bremia* on lettuce, downy mildew on rocket and Alternaria.
- **Logic:** count wet hours (leaf-wet-hour rule under "Weather inputs") within a [SET temperature band for each pathogen] and warn above [SET] h.
- **Default:** off until the agronomist enables it; until then, wet-period info and a scouting prompt. Low or Medium.

---

## C. Nutrition and water

### N: Nitrogen timing, form and nitrate
- **Inputs:** soil test (pH, CaCO3, NO3-N, date); fertiliser **N form** (nitrate, ammonium, urea, organic), method, valve; rain/irrigation forecast; days to harvest; season.
- **Logic:**
  1. **Ammonia loss:** applies on soil with pH ≥ ~7.5 or free lime [EST], when urea or ammonium is surface-applied and not incorporated by ~[SET, literature 5–15] mm of rain or irrigation within [SET] days. Warn, and suggest nitrate, fertigation or incorporation.
  2. **Leaching:** delay when more than [SET] mm of rain is forecast within 48 h.
  3. **Nitrate before harvest:** no N to spinach, rocket or lettuce within [SET, v2 used 21] days of harvest. Use a stricter value in winter, because low light raises leaf nitrate [EST]. Cite Reg. (EU) 2023/915 for the maximum levels. Never predict lab compliance.
  4. **Shared drip sector:** block fertigation when a nitrate-blocked lot is on the same valve (QA item 18).
- **Doses:** always [SET], by the agronomist from the soil test. The app checks only form, timing and limits.
- **Confidence:** Medium. Low if the soil test is older than [SET, 12] months.

### IRR: Irrigation water balance
- **Logic:**
  - Daily ET0 comes from FAO-56 Penman-Monteith (Open-Meteo `et0_fao_evapotranspiration`), and `ETc = Kc × ET0`. **Added 2026-11-17:** use past-day analysis values, not old forecasts, for the water balance; show ET0 as a range (about ±15 %, wind is the main error) and re-anchor with the water meter.
  - Root-zone deficit `D = D_prev + ETc − effective rain − net irrigation`.
  - Irrigate when D reaches [SET, commonly 30–50 % of available water for shallow-rooted greens].
  - Kc for spinach and lettuce is about 0.7 at the start, 1.0 mid-season and 0.95 at the end [EST, FAO-56]. Kc for herbs is [SET].
  - Add a leaching fraction according to the water EC and the crop threshold.
- **Output:** a recommendation of when to irrigate and how many mm, given as a range. Forecasts are worded as forecasts, never as past events.
- **Confidence:** Medium. Low without a meter or irrigation logs.

### SALT: Water and soil salinity
- **Logic:**
  - FAO-29 classes for irrigation water EC [EST]: below 0.7 dS/m no restriction, 0.7–3.0 slight to moderate, above 3.0 severe.
  - Crop thresholds for soil ECe, after Maas–Hoffman [EST, approximate]: lettuce ~1.3, spinach ~2.0, beet and chard tolerant. Parsley, rocket and the herbs are [SET].
- **Output:** a Low or Medium alert for sensitive crops. Prompt a re-test after [SET] months, and after summer on coastal wells.
- **Confidence:** High if the test is under 6 months old, otherwise Low.

---

## D. Planning

### SOW: Sowing suitability
- **Inputs:** crop **family** (Amaranthaceae: spinach, chard, beet; Brassicaceae: rocket; Apiaceae: parsley, coriander, dill; Asteraceae: lettuce, endive, chicory; Amaryllidaceae: onion, leek), bed history, disease flags, free area, recent rain, soil temperature at 5–10 cm.
- **Logic:** a parcel is "Suitable" only if all of these hold:
  1. No crop of the same family in the last [SET, v2 used 3] years.
  2. No disease flag or history in [SET] years for that family.
  3. Enough free area.
  4. The soil is workable: no more than [SET] mm of rain in the last [SET] days.
  5. Soil temperature is within the germination range. Germination ranges [EST, approximate]:
     - Spinach: minimum ~2 °C, optimum ~7–24 °C, poor above ~30 °C.
     - Lettuce: minimum ~2 °C, thermodormancy risk above ~25–28 °C.
     - Parsley: minimum ~4 °C, slow in the cold.
     - Rocket, coriander and dill: [SET].
- **Output:** "Sow X στρ on parcel Y in window Z", with the **rejected parcels and their reasons**. The UI's "suitable parcels" list must call this exact rule (QA P0-3). Variety choice is shown as a prompt only.
- **Confidence:** Medium. With no history, the rule runs info-only.

### HARV-FC: Harvest forecast (thermal time)
- **Logic:**
  - Degree-days: `GDD = Σ max(0, Tmean − Tb)` from sowing, using analysis data (~~observed~~), then the forecast, then the 25th–75th percentile of climatology (**added 2026-11-17:** climatology from the ERA5 API).
  - The result is a **date range**, with a short-day winter factor [SET].
  - **Base temperature (Tb) must be validated.** Values often cited for spinach and lettuce are about 0–5 °C. Rocket, parsley, coriander and dill are [SET]. The GDD needed to reach harvest for each crop and variety is [SET], calibrated from the farm's own records of sowing to first cut.
  - The UI shows the base, for example "412 of ~520 °C·d, base X °C".
- **Crates:** area × [SET yield per στρ for each crop and season] ÷ [SET crate kg for each crop and season] × (1 − [SET waste %]). Show the whole formula in the Why? sheet.
- **Confidence:** Medium ≤ 2 weeks ahead, else Low (also with < 2 calibrated seasons).

### GAP: Orders versus supply
- **Inputs:** Κλούβες orders (feast weeks such as Καθαρά Δευτέρα, Lent, Easter, Christmas use that feast's history, not the weekly average); supply from HARV-FC **limited by PHI**, minus logged harvests.
- **Logic:** `gap = orders − supply`. Alert when the gap is at least the larger of [SET ~10] % of orders and [SET ~3] crates, over a [SET] week horizon.
- **Output:** a Medium alert that links to SOW. If no sowing can arrive in time, say "buy in or agree volumes".
- **Confidence:** the lowest of the orders, yield and forecast confidence.

---

## Data the farmer must enter for these rules to work

1. **Parcels:** map boundary, ΟΣΔΕ code, elevation (auto, then confirmed), topo class, soil texture, irrigation type and **valve/sector map**, water source.
2. **Lots per bed:** crop, **variety and resistances**, sowing date, area, status.
3. **History:** at least 3 years of crops per bed, plus disease and pest events with date and photo.
4. **Products:** taken from the official database (authorisation, active ingredient, group code, crops, PHI, REI, dose, maximum applications). Also stock, batch and expiry.
5. **Spray jobs:** date and **start and end time**, product, dose per στρ, water L per στρ, beds, target, applicator, sprayer, prescription ID.
6. **Fertiliser jobs:** product, N form, kg per στρ, method, valve.
7. **Irrigation:** meter readings or run hours, and water EC tests.
8. **Soil tests:** pH, CaCO3, EC, NO3-N, organic matter, P, K, lab and date.
9. **Harvests:** crates, **crate kg by crop and season**, waste.
10. **One-tap feedback:** dew yes/no, frost damage yes/no, disease seen with a photo. This is used for calibration.
11. **Agronomist approvals** of every [SET] value.

## Do not automate

The app must never, on its own:
- **Choose a product, dose or tank mix.** It only lists the options that pass the rules.
- **Shorten a PHI or REI**, or release a harvest or worker task during one.
- **Fill in a missing label value with a default.** A missing value means blocked or unknown.
- **Declare a disease present or absent** from weather alone. Scouting confirms.
- **Claim frost damage** without a threshold set by the agronomist.
- **Set fertiliser doses**, or predict that a lab nitrate result will be compliant.
- **Change a [SET] threshold by "learning"** without showing the change and getting approval.
- **Commit volumes to clients**, or cancel orders.
- **Sign or submit the inspection record.** It drafts the record, and a person signs it.
- **Overwrite a farmer's logged observation** with a model estimate. It shows both.

## Sources (for [EST] values; no web searches made, check current versions)
FAO-56 (ET0, Kc); FAO-29 (water classes); Maas & Hoffman 1977 (salt tolerance); Reg. (EU) 2023/915 (nitrate limits); Reg. (EC) 1107/2009 Art. 67 (spray records); GRDC drift guidance (wind, Delta-T, inversions); FRAC/IRAC/HRAC code lists; Harrington germination data (UC vegetable guides); ΥΠΑΑΤ PPP database (prescription rule: **verify with the agronomist**).

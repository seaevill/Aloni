# Crop guide, harvest pacing, regrowth: research and decision meeting (2026-11-23)

Trigger: three questions from a farmer (Greek): (1) 1 στρ. winter parsley picked over 3 weeks: how many crates a day so I don't run out? (2) old wild chicory mulched by tractor today: when to irrigate, which fertiliser, how much, how often; how often do we spray chicory? (3) 1 στρ. parsley sown 22/11/2026: irrigation, feeding, spraying frequency, days to harvest?
Safety frame (CLAUDE.md, RULES.md "Do not automate"): the app never picks a product or dose, never suggests a spray frequency, never invents a number. Sourced agronomic values are shown as info with the chip «πληροφοριακό, χωρίς υπογραφή γεωπόνου» until the agronomist signs; only signed values can drive reminders.
Repo facts checked: `crops.crate_kg_default` and `crops.base_temp_c` exist (0002); `plantings.est_crates/est_basis/harvest_from/to` exist; `job_harvest` has crates/kg/waste_pct but no cut number; `jobs.kind` has no cut/mulch kind (0003); `rules-core/src/supply.ts` already spreads expected crates evenly over the harvest window; `weather_daily.et0` exists; `app/src/i18n/hi.json` exists. Last migration on main: 0027.

## 0. What the app can answer today for the three questions (no invented numbers)

- Q1: «Πόσες κλούβες περιμένεις από αυτό το 1 στρ.;» Bora enters his estimate (or taps his own history, if ≥1 earlier lot). App shows `remaining ÷ remaining days` = crates/day, and "at today's pace you run out on <date>". No estimate → «άγνωστο», no number.
- Q2: logs a «Κοπή / καθαρισμός» event (method: tractor mulcher) that restarts the regrowth clock. Shows: days since cut, Bora's own past cut→harvest intervals, ETc of the last 7 days (info), the fertiliser plan only if Bora entered one from the agronomist. Spray frequency: «Τη συχνότητα την ορίζει ο γεωπόνος και η ετικέτα του σκευάσματος» + label `min_interval_days` only from a signed `label_uses` row.
- Q3: crop guide for parsley: germination 14–30 d at 18–21 °C (slower in cold soil), first harvest 60–80 d after direct sowing in the source's conditions (Ontario, not Greek winter) – all with source + unsigned chip. No harvest date written into the planting; Bora sets `harvest_from` himself.

## 1. Panel (simulated voices) and decisions

**Bora (35, leafy greens, Megara):** "I need one number in the morning: crates today per lot, so the 3-week order holds." "After the mulcher I want the app to remember the date and tell me how long the chicory took last time." "Don't lecture me with t/ha from Italy; show my own crates per στρέμμα."
**Kyr-Giorgos (60, Greek grower):** "Parsley in winter is slow, 3 months not 2; anything copied from a book will be wrong for Megara." "The crate is what matters, not kilos; but every crop's crate weighs different." "Put the agronomist's paper in there as a photo, I trust that."
**Raju (worker, Hindi):** "Show me: which lot, how many crates, done button. Big numbers, pictures." "No need for fertiliser text in my screen." "Hindi labels for crop names, please, the Greek names I learn slowly."
**Γεωπόνος:** "I sign a plan per lot/season, not a generic table; give me a page where I can strike values." "Days-to-harvest and regrowth must be ranges by season; yield is the farm's own data." "Fertiliser numbers from abroad: show at most as background, never next to the fertilise form. Spray frequency is mine plus the label, never the app."
**Software engineer:** "Pacing is pure arithmetic in rules-core; reuse supply.ts' even-spread model, Decimal for display." "Guide values as data (`rules/crop-guide.json`) with source/confidence/signed fields, so a missing value is `null` and the UI blocks." "Use Open-Meteo daily `et0_fao_evapotranspiration`; MET Norway has no radiation and no ET0."
**Safety/compliance reviewer:** "A number on screen without its source is a recommendation; every value carries source URL + date + chip." "Unsigned values: no notification, no default in any form, no pre-filled fields." "Yield-from-history must say `n` lots; with n=0 nothing is shown."
**UX designer:** "Pacing as one card per lot: big «Χ κλούβες/ημέρα», a bar of days, the run-out date in red only if before harvest_to." "Guide = a read-only card with the chip at the top, sources folded below; ranges as '60–80 ημ.' never a single number." "The cut event is a one-tap action on the planting, two fields max."

| Feature | Decision | Reason |
|---|---|---|
| Harvest pacing calculator (crates/day, run-out date) | **in / now** | Arithmetic on Bora's own estimate + logged harvests; no external number |
| Crop guide card (days to first harvest, germination, regrowth, cuts, scout list) as sourced ranges | **in / now, info-only** | Sourced, chip, no decisions; gaps shown as «άγνωστο» |
| Cut / mulch event (κοπή, καθαρισμός) + days since cut | **in / now** | A record, not advice; feeds regrowth learning |
| Yield per στρ. and cut→harvest days from Bora's own records (median, n) | **in / now** (shown from n≥1, "use as estimate" tap) | Farm's own data; Bora chooses to use it |
| Weekly ETc info (Σ ET0×Kc − rain) per planting | **in / now, info-only** | FAO-56 Kc published; no "irrigate" verb, no reminder |
| Fertiliser plan entry (Bora types the agronomist's written plan + photo) | **in / now (entry only)** | Bora's record; app proposes nothing |
| Bora-made recurring job (e.g. «έλεγχος ραδικιού κάθε Δευτέρα») | **in / now** | Bora's own choice, not a rule |
| Reminders from fertiliser plan / scouting interval / days-to-harvest | **in / after sign-off** | Rule 3: unsigned values never notify |
| Irrigation water-balance reminder (TAW from soil test, Zr, p) | **in / after sign-off** | Needs soil texture + signed Kc/Zr/p |
| GDD-based harvest date prediction | **later** | No validated base temp/GDD for these crops found; needs 2 seasons of Bora's data |
| Seasonal yield model, price/revenue per lot, Κλούβες auto-link | **later** | Phase 2 |
| Extension N-P-K ranges inside the fertilise form or as defaults | **rejected** | Reads as a dose (rule 1/2); allowed only folded in guide "background" |
| Any spray frequency / "next spray" from the app | **rejected** | Rule 2; only signed label `min_interval_days` shown |
| Disease forecast from weather alone | **rejected** | Rule 2 |
| Auto-filling `harvest_from` from literature days | **rejected** | Literature ≠ Megara winter; Bora sets dates |

## 2. Parameters per crop (verified 2026-11-23; ranges only; H/M/L = confidence for Megara open field)

Sources: [FAO-56 Table 11/12](https://www.fao.org/4/x0490e/x0490e0b.htm) (stage lengths "Mediterranean", Kc; small-vegetables group Kc_ini 0.7), [FAO-56 Table 22](https://www.fao.org/4/X0490e/x0490e0e.htm) (Zr, p at ETc≈5 mm/d), [FAO-29/61 salt table](https://www.fao.org/3/Y4263E/y4263e0e.htm) (ECe threshold, % loss per dS/m), [OMAFRA parsley](https://www.omafra.gov.on.ca/CropOp/en/herbs/culinary/pars.html), [SARE parsley](https://www.sare.org/publications/northeast-crop-production-harvest-manual/parsley/), [UMass parsley](https://www.umass.edu/agriculture-food-environment/vegetable/fact-sheets/parsley), [Johnny's parsley](https://www.johnnyseeds.com/growers-library/herbs/parsley/parsley-key-growing-information.html), [Johnny's herb succession](https://www.johnnyseeds.com/growers-library/methods-tools-supplies/succession-planting/succession-planting-interval-chart-herbs.html), [OSU cilantro](https://extension.oregonstate.edu/news/how-grow-cilantro-leaves-or-coriander-seeds), [Candido 2020 wild rocket](https://iris.unibas.it/retrieve/dd9e0b51-6759-1e84-e053-3a05fe0aa940/Candido%20et%20al%20Agronomy%20MDPI%20Rocket.pdf), [MDPI 2023 chicory](https://mdpi.com/2073-4395/13/7/1752), [SARE scallions](https://www.sare.org/publications/northeast-crop-production-harvest-manual/scallions/), [BC leeks](https://www2.gov.bc.ca/gov/content/industry/agriservice-bc/production-guides/vegetables/leeks).

| Crop | Sow→1st harvest | Regrowth / cuts | Yield | Kc ini/mid/end | Zr m / p | Salt ECe thr. | Fert. background (info only) | Scout for (names) |
|---|---|---|---|---|---|---|---|---|
| Μαϊντανός | 60–80 d direct sown (OMAFRA, L for winter); germination 14–30 d at 18–21 °C (Johnny's, M) | 3–5 harvests/season (UMass), ">3" (SARE); interval **not found** | **not found** (SARE: ~1 bunch/row-ft, not usable) | not in FAO; group 0.7/1.05/0.95 (L) | not listed | not listed | 90–120 kg N/ha split (Indiana/Oregon via OMAFRA, L); pH 6.0–6.5 (SARE, M) | Septoria, Alternaria, damping-off, root rot, aster yellows, nematodes; aphids, leafhoppers, cutworms, carrot weevil, loopers (OMAFRA) |
| Ραδίκια άγρια (C. intybus) | **not found for wild leaf chicory**; Pan di Zucchero single cut 76 d, cold greenhouse IT (L) | **not found** – Bora's records | 8–26 t/ha single cut, greenhouse (L, not comparable) | not in FAO (lettuce analog 0.7/1.00/0.95, L) | lettuce analog 0.3–0.5 / 0.30 (L) | lettuce analog 1.3 (L) | 80 kg N/ha tested in one trial (not a rate) | **to be listed by agronomist** (no source verified this round) |
| Σπανάκι | total season 60 d (Apr sowing) / 70 d (Sep–Oct), Mediterranean (FAO-56, M) | usually one cut; regrowth not found | not found | 0.7/1.00/0.95 (FAO-56, H) | 0.3–0.5 / 0.20 (H) | 2.0 dS/m, 7.6 %/dS/m (FAO, H) | not verified | not verified this round |
| Ρόκα (wild rocket, Diplotaxis) | ~44 d (sown 5 Nov → cut 19 Dec, unheated greenhouse S. Italy, M/L) | 4 cuts Dec–Apr, 29–66 d apart (same trial) | ~61 t/ha total, 11–17 t/ha per cut (greenhouse, L for field) | not in FAO (group 0.7/1.05/0.95, L) | not listed | not listed | trial compared 40 vs 140 kg N/ha (not a rate) | not verified. **Ask Bora: Eruca or Diplotaxis?** |
| Άνηθος | not found | succession every 14 d; bolts in heat (Johnny's, M) | not found | group (L) | – | – | – | – |
| Κόλιανδρο | not found; germ. soil 13–20 °C (OSU, M) | succession every 7 d (Johnny's); leaves for weeks–months in cool short days, bolts in hot long days (OSU, M) | not found | group (L) | – | – | – | – |
| Πράσο | not found | – | not found | not in FAO table fetched | – | – | 70 kg N/ha pre-plant + 50–100 side-dress (BC, L) | thrips, onion maggot, Botrytis leaf blight, Stemphylium, purple blotch (BC) |
| Κρεμμύδι φρέσκο | 70 d (Apr/May sowing, stages 25/30/10/5, FAO-56 M; winter longer) | – | not found (SARE ~1 bunch/row-ft) | 0.7/1.00/1.00 (H) | 0.3–0.6 / 0.30 (H) | onion bulb 1.2, sensitive (FAO, M) | "120" Cornell, units unstated (L) | onion thrips, purple blotch (SARE) |
| Ραπάνι | 35 d (Mar/Apr, FAO-56, M) | – | – | 0.7/0.90/0.85 (H) | 0.3–0.5 / 0.30 (H) | 1.2 dS/m (H) | – | – |
| Σέλινο | 125 d (Apr, FAO-56, M) | – | – | 0.7/1.05/1.00 (H) | 0.3–0.5 / 0.20 (H) | 1.8 dS/m (H) | – | – |
| Παντζάρια / Λάχανα | – | – | – | – | – | red beet 4.0, cabbage 1.8 (H) | – | – |
| Αντίδια, Βλήτα, Καυκαλήθρα, Μυρώνι, Σέσκουλα | **no source found** – guide shows «δεν υπάρχουν στοιχεία», history only | | | | | | | |

Crate (κλούβα) weight per crop: **no Greek market source found**. `crate_kg_default` must be Bora's own (weigh 3 crates per crop), plus optional bunches per crate.
Weather/ET: Open-Meteo forecast API gives `et0_fao_evapotranspiration` hourly and daily (FAO-56 Penman-Monteith), plus `shortwave_radiation_sum`, VPD, soil moisture/temperature ([docs](https://open-meteo.com/en/docs)); commercial use needs an API key (open licence question stays). [MET Norway Locationforecast](https://docs.api.met.no/doc/locationforecast/datamodel) has temperature, RH, dew point, wind/gust, cloud fractions, clear-sky UV, but **no radiation and no ET0** → only a degraded Hargreaves-type estimate; not chosen. Winter ET0 for Attica: no published station table found ([ITIA](https://www.itia.ntua.gr/en/getfile/1540/1/documents/EW_2013_42_02.pdf) has only W. Macedonia: Dec 14–18 mm/month); compute from Open-Meteo history for Bora's parcels instead of quoting a figure.
GDD: no base temperature/degree-day model found for these crops ([OSU EM9305](https://extension.oregonstate.edu/sites/default/files/documents/em9305.pdf) lists none yet) → `base_temp_c` stays null.
Not reached: ΕΛΓΟ-ΔΗΜΗΤΡΑ/ΓΠΑ pages for these crops (searches returned none; Wikifarmer Greek pages failed to load; a DUTh spinach PDF is behind a login). Greek values must come from the agronomist.

## 3. Competitors (what they show; advice vs agronomist)

- **Agworld**: agronomists build crop plans and per-field recommendations (products, rates, timing); grower turns a rec into a spray record in one click; approvals mentioned ([agworld.com](https://www.agworld.com/solutions/agronomists)). Advice always comes from a human agronomist – closest to our sign-off model.
- **Farmable**: harvest logging per field/variety/picker (weight or bin, photo, GPS), live totals, season comparison; no forecast or pacing found ([farmable.tech](https://farmable.tech/grower/harvest)). Our pacing card is a gap they don't fill.
- **fieldmargin**: maps, notes with photos/pest counts, jobs assigned to team, yield recording (paid); no advice ([App Store](https://apps.apple.com/gb/app/fieldmargin/id1096607801)).
- **AGRIVI**: planning of farm activities, risk/weather forecasting, pest detection listed; irrigation not listed ([G2](https://www.g2.com/products/agrivi/features)).
- **xFarm**: irrigation forecast "when and how much" from satellite + sensors + crop/phenology models, zones with thresholds, alerts ([listing](https://platform.softwareone.com/product/xfarm-irrigation/PCP-0213-8161)). Gives direct advice; needs sensors/paid modules.
- **gaiasense (Neuropublic, Greece)**: tiers – basic water indicators/spray suitability/risk warnings; paid tier irrigation tips, fertiliser recipe, plant-protection recs; field specialists collect samples ([FAO observatory](https://agritechobservatory.review.fao.org/en/gaiasense)). Greek precedent that recipes come with a paid expert network.
- Cropwise (Syngenta): scouting/Protector apps exist; store pages did not load, details not verified.
- Takeaway: apps that give fertiliser/spray advice back it with agronomists or sensor models; farm-record apps give none. Aloni = records + arithmetic now, agronomist-signed plans later.

## 4. Data fields to add

- `crops`: `harvest_unit` ('crate'|'bunch'|'kg'), `bunches_per_crate` (nullable, Bora), `regrows` bool (cut-and-come-again), keep `crate_kg_default` Bora-entered (null = unknown), `base_temp_c` stays null.
- `rules/crop-guide.json` (data, versioned): `{crop_slug, param, season('winter'|'summer'|'any'), min, max, unit, region, source_url, source_title, accessed_on, confidence('H'|'M'|'L'), note, signed_off_by:null, signed_off_at:null}`; params: `germination_days, days_to_first_harvest, regrowth_days, cuts_per_season, kc_ini, kc_mid, kc_end, root_depth_m, p_depletion, ece_threshold_ds_m, scout_targets[]`, `fert_background_text` (text only, never numeric field).
- `jobs.kind` += `'cut'`; new `job_cut(job_id, planting_id, method 'mulcher'|'mower'|'hand'|'harvest_cut', residue 'left'|'removed', note)`.
- `job_harvest` += `cut_no` (int, nullable), `bunches` (nullable).
- `plantings` += `est_crates_per_str` (nullable), `est_basis` values 'bora' | 'history:n=K' (existing column).
- `fert_plans(id, planting_id|crop_id+season, source 'agronomist_written', doc_photo, entered_by, signed_off_by/at, status)` + `fert_plan_items(plan_id, when_date | days_after 'sow'|'cut', product_text, n_per_str, p_per_str, k_per_str, note)` – values exactly as typed by Bora, Decimal, no defaults.
- `jobs` += `recurrence` (RRULE-lite: weekly weekday / every N days), set only by Bora.
- Later (after sign-off): `scout_plans(crop_slug, targets[], interval_days, signed_off_by/at)`, `parcels.soil_texture`, `parcels.taw_mm`.
- Views: `v_lot_pacing(planting_id, remaining_crates, days_left, crates_per_day, run_out_on)`, `v_yield_history(crop_id, season, crates_per_str, cut_to_harvest_days, n)`.

## 5. Questions for the agronomist to sign (Greek)

1. Για κάθε καλλιέργεια (μαϊντανός, ραδίκι, σπανάκι, ρόκα, άνηθος, κόλιανδρο, πράσο, φρέσκο κρεμμύδι): ημέρες από σπορά ως πρώτη κοπή, χειμώνα και καλοκαίρι, στον κάμπο των Μεγάρων (εύρος).
2. Μετά από κοπή ή καθαρισμό με καταστροφέα: σε πόσες ημέρες ξαναβγαίνει το ραδίκι και ο μαϊντανός, και πόσες κοπές αντέχει η κάθε φύτευση;
3. Ποια ρόκα καλλιεργούμε (Eruca sativa ή Diplotaxis); ισχύουν τα ίδια στοιχεία;
4. Δέχεστε τους συντελεστές Kc της FAO-56 (π.χ. σπανάκι 0,7/1,00/0,95) για ενημερωτική εκτίμηση νερού; Τι τιμές για μαϊντανό, ραδίκι, ρόκα, πράσο;
5. Βάθος ριζών και επιτρεπτή εξάντληση νερού (p) ανά καλλιέργεια, για τα χωράφια μας (μετά την ανάλυση εδάφους).
6. Θα μας δώσετε γραπτό πρόγραμμα λίπανσης ανά καλλιέργεια/εποχή (πότε, τι, πόσο ανά στρέμμα) για να το περάσει ο Bora και να το υπογράψετε;
7. Μετά από κοπή με καταστροφέα στο ραδίκι: ποια λίπανση και πότε (γραπτά, για υπογραφή);
8. Ποιοι εχθροί/ασθένειες πρέπει να ελέγχονται ανά καλλιέργεια, και κάθε πόσες ημέρες γίνεται επιθεώρηση; (μόνο έλεγχος, όχι ψεκασμός)
9. Όρια pH, EC και οργανικής ουσίας ανά καλλιέργεια, για να φαίνονται δίπλα στην ανάλυση εδάφους.
10. Οι υπενθυμίσεις (λίπανση, επιθεώρηση, αναμενόμενη κοπή) να βγαίνουν μόνο από υπογεγραμμένο πρόγραμμα: συμφωνείτε; Κάθε πόσο θα το ξαναϋπογράφετε;
11. Πόσα κιλά ζυγίζει περίπου μια κλούβα ανά καλλιέργεια στην πράξη (για έλεγχο των στοιχείων του Bora);
12. Ποια στοιχεία από το διεθνές υλικό (πίνακας §2) να ΜΗΝ εμφανίζονται καθόλου, ούτε ως πληροφορία;

## 6. Ready prompt for Claude Code (implements the "now" items)

```
Görev / Task: Aloni "crop guide + harvest pacing + cut event" (info-only). Read CLAUDE.md, docs/plan/RULES.md
("Do not automate"), docs/proto/QA-REPORT.md and /home/claude/meeting/crop-guide-research.md first.
Branch `crop-guide-pacing`, small PRs into main (never push to main), CI green (typecheck, Vitest, Playwright
375 px WebKit). Write docs/milestones/<current>-crop-guide.md plan first; add a dated line to docs/DECISIONS.md.

Non-negotiables: no number without a source or a Bora/agronomist entry; missing value = null = «άγνωστο»/blocked,
never a default; no notifications from unsigned values; no spray frequency anywhere; no N/P/K numbers in any form
or default; all sample data fictional and only in the Demo farm; doses/amounts as Decimal, never rounded.

PR1 rules-core (pure TS + golden tests):
 - pacing.ts: lotPacing({estCrates, loggedCrates, harvestFrom, harvestTo, safeFrom, asOf}) ->
   {remaining, daysLeft, cratesPerDay, runOutOn|null}; reuse supply.ts day maths; PHI-held (safeFrom) days excluded;
   unreadable date or estCrates null -> {status:'unknown'}. Golden: 1 στρ parsley, Bora estimate 42 crates,
   21 days -> 2 crates/day (Demo farm, fictional); logged ahead/behind; safeFrom in window.
 - yieldHistory.ts: crates per στρ per cut and cut->harvest days from job_harvest/job_cut; returns median and n;
   n=0 -> nothing.
 - etcInfo.ts: Σ(ET0×Kc) − rain over last 7 days per planting; Kc null -> blocked; output labelled info.
PR2 data: rules/crop-guide.json with ONLY the sourced rows of research §2 (source_url, accessed_on 2026-11-23,
   confidence, signed_off_by:null); JSON-schema test: every numeric row has source_url; no N/P/K numeric fields.
PR3 SQL 0042+ (next free number; not applied without Bora): jobs.kind += 'cut'; job_cut; job_harvest.cut_no,
   bunches; crops.harvest_unit, bunches_per_crate, regrows; plantings.est_crates_per_str; jobs.recurrence;
   fert_plans + fert_plan_items (entry only, signed_off_by/at nullable); RLS like siblings (worker: no fert plans);
   audit triggers; Dexie mirror + sync.
PR4 UI (Greek first, then tr/en/hi keys): planting card «Ρυθμός συγκομιδής» (big X κλούβες/ημέρα, days bar,
   run-out date red only if < harvest_to, «Χρησιμοποίησε το ιστορικό μου (n=K)» button sets est_crates,
   est_basis 'history:n=K'); one-tap «Κοπή / καθαρισμός» (method, residue) + «ημέρες από την κοπή»;
   «Οδηγός καλλιέργειας» read-only card with chip «πληροφοριακό, χωρίς υπογραφή γεωπόνου», ranges only,
   folded sources; spray question text: «Τη συχνότητα ψεκασμού την ορίζει ο γεωπόνος και η ετικέτα».
   Worker view: today's lot + crates target set by Bora + done; no plans, no prices. Fert plan entry form
   (owner only) with photo of the agronomist's paper; no reminders. Bora-made recurring job (weekly/every N days).
Tests: Vitest for all rules-core; Playwright 375 px: pacing card, cut event, guide chip visible, unknown state.
Finish: Greek test checklist for Bora's iPhone + Turkish summary (plain, no jargon); update RUNBOOK if deploy changes.
```

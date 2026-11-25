# Recon map: Farmable (iOS / Android) → Aloni (PWA on iPhone; Capacitor later)

Scope: Farmable's **fields + jobs + harvest** loop only. Notes, teams/timesheets, inventory, sales and certified compliance exports are out of this slice.
For: Aloni, Bora's field-management PWA for his farm on the Megara plain. The features go *into* Aloni where it has gaps; Aloni is not becoming a Farmable copy. Aloni's own rules (CLAUDE.md safety rules, append-only records, Greek-first UI, στρέμματα, crates) win over anything Farmable does.
Date: 2026-11-23
Method: public sources only (store listing, pricing page, help center, product pages). No Farmable account used, no code or network calls read.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store listing (US) | https://apps.apple.com/us/app/farmable-farm-manager-app/id1456760199 | feature list, modules and prices, full 2025–26 changelog, 4.0★ from 12 ratings |
| 2 | App Store listing (NO) | https://apps.apple.com/no/app/farmable-farm-management-app/id1456760199 | job types, mobile + web portal split |
| 3 | Pricing page | https://farmable.tech/price/ | Free = 5 jobs; Pro $399/farm/yr; Teams $349, Sales $249 add-ons |
| 4 | Help: features explained | https://support.farmable.tech/en/articles/12984974-farmable-features-explained | map is the foundation; what a job records |
| 5 | Help: first steps | https://support.farmable.tech/en/articles/6159310-first-steps-with-farmable | onboarding: draw field → first spray job |
| 6 | Help: add fields (web) | https://support.farmable.tech/en/articles/16066994-how-do-i-add-fields-in-the-web-portal | field form: name, type, crop category, variety; import |
| 7 | Harvest page | https://farmable.tech/grower/harvest | QR bin labels, yield by field / variety / operator / quality |
| 8 | Harvest labels blog | https://farmable.tech/blog/harvest-labels | label data elements, share via WhatsApp/SMS/email |
| 9 | Sow/plant job page | https://farmable.tech/sow-plant-job/ | crop cycle on part of a field |

Screenshots: not yet saved. Before `/replica-design`, save the App Store screenshots into `replica/screens/` (reference only, never shipped).

## Core loop

Draw your fields once, then log every job and every harvest against a field, so you always know what was done where and what each field produced.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Farm map | home tab "Fields" | all fields on a satellite map, tap one to open | map, field polygons coloured by crop, FAB "+" | empty (no fields → prompt to draw), filled |
| S02 | Draw field | S01 → "+" | tap corners to outline a field; or walk it with GPS | map, vertex handles, undo, area readout, Save / Save and draw another | drawing, too few points, saved |
| S03 | Field details form | after S02, or edit from S04 | name, crop, variety, (block), organic/IPM flag | text field, crop picker, variety picker, toggle | new, edit, validation error |
| S04 | Field page | tap a field on S01 or S05 | everything about one field this season | header with area + crop, tabs: Jobs / Harvest, mini map | no jobs yet, filled |
| S05 | Field list | toggle on S01 | searchable list of fields | list rows (name, crop, ha), filter organic/IPM | empty, filled |
| S06 | New job: type | "+" on Jobs tab or on S04 | pick job type | grid of type tiles (spray, fertilise, irrigate, sow/plant, prune, mow, other) | — |
| S07 | New job: details | after S06 | fields, date/time, planned or done, products & rates, water, equipment, operator, reason, weather | multi-field picker, date-time, segmented planned/done, product rows, tank-mix calculator sheet | planned, completed, missing required, duplicate warning |
| S08 | Job log | "Jobs" tab | all jobs, newest first | filter chips (field, type, date range, planned/done), list rows | empty, filled, filtered-empty |
| S09 | Job detail | tap a job | read / edit / mark done / share job sheet | summary card, product table, weather, actions | planned, done |
| S10 | New harvest | "+" on Harvest tab or on S04 | record a harvest batch | field, crop/variety, date, quantity + unit, quality grade, batch no. | new, validation error |
| S11 | Harvest overview | "Harvest" tab | season totals by field and crop, compare seasons | totals cards, per-field bars, season picker | empty, filled |
| S12 | Harvest label | from S10 save or S09-style detail | printable / shareable label with QR | label preview, share (WhatsApp/PDF/image), print | — |
| S13 | Season picker | header on S01/S08/S11 | switch the active season | sheet with seasons | — |
| S14 | Spray & fertiliser report | settings / reports | export what was applied where and when | date range, field filter, export PDF | empty range, generated |

## Flows

```
F01 Map the farm (first run)
    S01 (empty) -> S02 draw -> S03 details -> S01 (field shown)
    happy path clicks: ~4 + one tap per corner
    edge: field crosses itself, very small field, no GPS/permission denied, offline map tiles, editing a boundary later

F02 Log a spray / fertiliser job that was done today
    S01/S08 -> S06 type -> S07 details (fields, products, rates) -> save -> S09
    happy path clicks: ~7
    edge: several fields at once, product not in list (type a new one), tank-mix maths, job already logged today (duplicate warning), no network

F03 Plan a job, then mark it done
    S06 -> S07 (planned, future date) -> S08 shows it as planned -> S09 "mark done" (fills actual date + weather)
    happy path clicks: ~6

F04 Start a crop cycle (sow / plant)
    S04 -> S06 sow/plant -> S07 (crop, variety, part of field) -> S04 shows the new crop
    edge: only part of the field planted, replanting

F05 Record a harvest and label the crates
    S04 or Harvest tab -> S10 -> save -> S12 share label
    happy path clicks: ~5
    edge: unit changes (kg / crates / pieces), several batches same day, label shared to WhatsApp

F06 See what each field produced this season
    Harvest tab -> S11 -> tap a field -> S04 Harvest tab
    happy path clicks: 2

F07 Export a spray report
    S14 -> pick range -> export PDF
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Map view | full screen, mini (header) | loading tiles, offline, no location | S01, S02, S04 |
| Field polygon | normal, selected, drawing | — | S01, S02, S04 |
| Floating "+" button | — | default, pressed | S01, S08, S11 |
| Bottom tab bar | Fields / Jobs / Harvest / (Orders in Aloni) | active | all |
| Job type tile | 7 types, each with icon + colour | default, selected | S06 |
| Picker sheet | single, multi (fields) | empty list, search | S03, S07, S10, S13 |
| Product row | product, rate, unit | editing, invalid | S07, S09 |
| Filter chip | — | on, off | S05, S08 |
| List row | job, field, harvest | planned badge, done badge | S05, S08, S11 |
| Totals card | number + unit + trend | empty | S11 |
| Label preview | QR + key data | — | S12 |
| Empty state | per list | — | S01, S05, S08, S11 |

## Inferred data model

```
Farm        id, name, owner_id
            evidence: pricing "per farm", sources 3, 4     confidence: high

Season      id, farm_id, name (e.g. 2026), start_date, end_date, is_active
            evidence: changelog 7.2.0 "single season picker"     confidence: high

Field       id, farm_id, name, boundary (polygon), area_ha (computed), crop_id, variety, is_organic, is_ipm, parent_field_id (block)
            evidence: S03 form (help article "add fields"), changelog 7.8.0 organic/IPM filter     confidence: high (block via parent: guess)

Crop        id, name, category   -- in Aloni: the existing 17-crop list
            evidence: field form "crop category and variety"     confidence: high

Planting    id, field_id, season_id, crop_id, variety, area_ha (part of field), sown_at
            evidence: sow/plant job page, changelog 6.1.1, 7.0.1 replanting     confidence: medium

Job         id, farm_id, season_id, type (spray|fertilise|irrigate|sow_plant|prune|mow|other), status (planned|done),
            planned_at, done_at, start_time, water_volume, equipment, operator, reason, weather (json), notes
            evidence: help "features explained", changelog 6.2.1 job start time, 7.3.0 custom weather     confidence: high

JobField    job_id, field_id          (a job covers several fields)
            evidence: multi-field jobs in source 4     confidence: medium

Product     id, farm_id, name, kind (pesticide|fertiliser|other), unit, max_volume_per_season
            evidence: changelog 6.1.2 max volume, 7.6.0 fertiliser list     confidence: medium

JobProduct  job_id, product_id, rate, rate_unit, total_amount, batch_no
            evidence: "products and rates", changelog 7.6.0 batch photos     confidence: high

Harvest     id, farm_id, season_id, field_id, crop_id, variety, harvested_at, quantity, unit (kg|crate|piece|m3),
            quality_grade, batch_no, order_id (Aloni link)
            evidence: harvest page + labels blog, changelog 6.2.0 units     confidence: high (order_id is Aloni's own)
```

Relationships: Farm 1-n Season, Farm 1-n Field, Field 1-n Planting, Job n-n Field, Job 1-n JobProduct, Field 1-n Harvest, Harvest n-1 Order (Aloni).

## Feature matrix

See `features.csv` (the `clone` column is Aloni's state at commit 7187278, 2026-11-23). Must: 11, should: 10, could: 11, skip: 5, plus 4 Aloni-only rows.

## Aloni today vs Farmable (scan of commit 7187278)

Parity on this slice: **62.9 / 100**, must-haves 9 of 11 (`replica-diff/parity.py`).

Already in Aloni (often stricter than Farmable): parcel drawing and editing on a satellite map, plantings as blocks with their own sketch, spray records with registered-only products, label doses, PHI/REI gates, tank mix and stock, planned jobs assigned to workers, job history, harvest counter blocked inside PHI/REI, harvest totals per parcel and crop, season targets, harvest destination (store / dispatch), orders and customers, offline-first sync, spray register CSV.

Real gaps, in build order:
1. **Fertilise and irrigation logging** (must). The server tables `job_fertilise` / `job_irrigate` exist since SQL 0003; the app has no screens. Fertilise needs the N form (TECH-SPEC §4.8), irrigation takes minutes or a meter reading.
2. **Weather on each job** (should). `jobs.weather_snapshot` exists and workers may write it (0038 allow-list); nothing fills or shows it.
3. **Harvest crate label with QR** (should). Reuse `auth/qr.ts`; label = parcel, crop, date, crates, record id; share as PNG via the existing share flow (`share/render.ts`).
4. **Season-over-season yield** (should). Crates per crop and parcel, this year vs last year, from existing harvest rows.
5. **Walk the boundary with GPS** (should, already in TECH-SPEC §4.4).
6. **Spray register as a Greek PDF** next to the CSV (TECH-SPEC §4.11).
7. Coulds: duplicate-job warning, KML/GeoJSON import, quality grade / batch on harvest, kg units, tank-quantity calculator, shareable job sheet.

Items 1, 2 and the harvest label need new SQL only if a column is missing; each SQL change follows the production rules in CLAUDE.md (new migration number, red test first, review, Bora applies it).

## Out of scope (cannot or should not be cloned)

- Certified compliance exports (GlobalGAP, Freshcare, Spain's SIEX register): certification formats and national registers. Aloni gets a plain PDF report instead.
- Government product catalogues and EPPO pest codes: national/licensed data. The farm types its own products.
- NDVI satellite layers and AI yield forecasts: paid imagery and trained models.
- Weather-station integrations: hardware partners.
- Farmable's name, logo, icons, colours and wording: Aloni keeps its own brand.
- Notes, teams/timesheets, inventory and sales modules: left out of this slice by choice (can be a later round).

## What Aloni can do better (from public evidence so far)

- The one visible App Store review says the iPhone app freezes during orchard work → Aloni is already **offline-first**; keep it that way.
- Farmable's free plan stops at 5 jobs → Aloni has no such limit, it's your own app.
- Farmable stops at harvest unless you buy Sales → Aloni already links harvest to destination and orders (field → crate → customer).

`/replica-entrepreneur` will check this against a larger sample of reviews.

## Size

Screens 14, flows 7, entities 10. Hard parts: drawing and editing polygons on a mobile map (plus area maths), offline storage and sync, harvest QR labels that open the right record. Original estimate for a from-scratch build: M. **Since Aloni already has most of the slice, the remaining gaps are S–M** (items 1–4 above are about one milestone).

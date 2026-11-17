# FieldWise v2 – clickable phone prototype (spec, 2026-11-16)

Context pointers (read, don't copy): ../BRIEF.md, ../reviews/1-farmer.md, ../reviews/2-developer.md, ../reviews/3-marketing.md. v1 screens: ../1-Today.png … ../4-Orders-to-sowing.png.

## Goal
A clickable prototype Bora opens from a link on his iPhone and sends to a friend to review. v1 (Design canvas) did NOT open on his iPhone → v2 is ONE self-contained HTML page (inline CSS/JS/data, no frameworks, no network needed except optional Google Font). Must work in iOS Safari and in an in-app webview, 375–430 px wide; also fine on desktop (centered phone-width column).

## Team / files
- Agronomist → `data.json` (sample farm data, schema below). Consistency is the job.
- Developer → `index.html` (UI), embeds data.json inline as `const DATA = …`.
- QA → `qa.md` (findings) + screenshots in `qa/`.

## Must-fix lessons from reviews
1. No contradictions between screens: a spray recommendation must respect harvest readiness, PHI (pre-harvest interval), REI (re-entry interval) and FRAC/IRAC rotation; never suggest sowing a crop on a parcel flagged for that crop's disease; frost logic accounts for cold air pooling in low ground; spray windows account for dew (leaf wetness) and wind GUSTS; fertiliser advice states N form and respects nitrate risk near harvest of leafy greens.
2. Every recommendation/alert has a "Why?" with: rule in plain words, input values, data source (forecast model vs station vs user entry), confidence (High/Medium/Low).
3. Units: area in στρέμματα (1 στρέμμα = 0.1 ha), doses per στρέμμα, crates (κλούβες). Wind km/h incl. gusts. Dates as "Mon 16 Nov".
4. "SAMPLE DATA – not real advice. Doses/PHI from the product label." visible but unobtrusive.
5. Product names in Greek with English (and Turkish) gloss.

## Screens (bottom tab bar: Today · Crops · Parcels · Stock · More)
- **Today**: date, farm weather now (temp, wind+gust, humidity, rain last 24h / days since rain), alert cards (each tappable → detail, each with Why?), KPI strip: est. harvest next 7 days & next 28 days (crates), active crops, parcels, "safe to harvest today" count.
- **Crops list** → **Crop detail** (the key screen Bora asked for): which parcels it is planted in (plantings with area, sow date, growth stage %, est. harvest window & crates), last 7 days + next 7 days weather for that parcel (min/max temp, rain mm, wind gust, humidity, est. leaf-wet hours), last spray (date, product, active ingredient, type, FRAC/IRAC, dose, PHI → safe-to-harvest date, REI), disease/pest risk, demand from orders (crates/week) vs supply, "other crops on the same parcel", next recommended action with Why?.
- **Parcels list** → **Parcel detail**: simple drawn map sketch, location name, area στρ., elevation, soil test (pH, EC, organic matter, N-P-K, CaCO3, date), irrigation (type, water source, EC), crops on it, weekly weather, recent jobs.
- **Stock**: pesticides & fertilisers on hand: product (generic label like "Copper hydroxide 35% WG"), active ingredient, type (fungicide/insecticide/herbicide/fertiliser), FRAC/IRAC group, quantity left + unit, expiry, which crops it is registered for (sample) with PHI days per crop, low-stock / expiry warnings, rotation hint ("last used group on parcel X").
- **More**: Spray log (table, export CSV button – fake), Harvest forecast (total crates by crop by week, 4 weeks), Orders → sowing plan, Settings (language EN/EL/TR, units), About (sample data note).
Navigation: tapping any crop/parcel/product name anywhere opens its detail. Back button in header on detail screens. Keep in-page state (no `#key=value` hashes; plain JS view stack).

## data.json schema (top-level keys)
```
meta: {farm, region, today:"2026-11-16", source_note}
parcels: [{id, name, locality, area_str, elevation_m, lat, lng, soil:{date,pH,EC_dS_m,OM_pct,N_ppm,P_ppm,K_ppm,CaCO3_pct,notes}, irrigation:{type,source,water_EC_dS_m}, opekepe_code, sketch:{shape:"rect|poly", rotation_deg}}]
crops: [{id, name_el, name_en, name_tr, latin, crate_kg}]
plantings: [{id, crop_id, parcel_id, area_str, sown, stage_pct, harvest_from, harvest_to, est_crates, status:"growing|harvesting|ready"}]
weather: {by_parcel: {parcel_id: [{date, tmin, tmax, rain_mm, wind_kmh, gust_kmh, rh_pct, leafwet_h, kind:"observed|forecast"}] }}  // 7 observed (9–15 Nov) + 7 forecast (16–22 Nov)
products: [{id, label, active, type, group_code, group_system:"FRAC|IRAC|HRAC|-", form, qty, unit, expiry, registered:[{crop_id, phi_days, rei_h, dose_per_str}]}]
jobs: [{id, date, parcel_id, planting_id, kind:"spray|fertilise|irrigate|sow|harvest", product_id?, dose?, by, weather_at_time:{t,wind,gust,rh}, notes}]
orders_weekly: [{crop_id, crates_per_week, peak_note}]
alerts: [{id, severity:"high|medium|low", kind, title, body, planting_id?|parcel_id?, action, why:{rule, inputs:{…}, source, confidence}}]
recommendations: [{id, planting_id, action, window, why:{rule, inputs, source, confidence}}]
```
All values are SAMPLE but must be internally consistent and agronomically plausible for Megara (West Attica) in mid-November. Use the 17 products from BRIEF.md where sensible (8–10 crops planted is enough). Parcels: 4–5 (Megara plain low ground ~20–40 m, Pachi coastal ~5–15 m, Geraneia foothills ~150–200 m). PHI/doses are illustrative and flagged as "check label".

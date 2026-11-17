# Meteorologist review – Aloni weather (2026-11-17)

## 1. Weather source
- **ICON-D2 does not cover Greece.** Its domain is Germany, Switzerland and Austria. [DWD](https://open-meteo.com/en/docs/dwd-api)
- Open-Meteo's "best match" for Greece is **ICON-EU**: ~7 km, 5 days, hourly to 78 h, a new run every 3 h. [docs](https://open-meteo.com/en/docs)
- **IFS HRES 9 km** offers 15 days, hourly to 90 h, with gusts and dew point. IFS 0.25° and AIFS are too coarse. [ECMWF](https://open-meteo.com/en/docs/ecmwf-api)
- AROME covers France only; ICON-2I reaching Attica is unconfirmed.
- **On 2026-11-30 the DWD model IDs change to native grids.** Store the model and run time as data.
- **NOA/meteo.gr:** daily station data on request or via CLIMPACT. There is no API and no stated terms. [NOA](https://www.iersd.noa.gr/en/?p=12805)
  - Use these stations for verification only.
- **Licence:**
  - The free tier is non-commercial only. The pilot and the app stores need a paid plan.
  - The data is CC BY 4.0.
  - Limits are per IP, so batch requests by grid cell. [terms](https://open-meteo.com/en/terms)

**Recommendation**
- **Primary:** ICON-EU for 0–78 h.
- **Fallback, and days 4–10:** IFS HRES.
- **When the models disagree** (Tmin >2 °C apart, rain yes/no): drop one confidence level.
- **Fetch every 6 h** (twice daily always trips the 6 h downgrade; frost needs an evening run).
- **Each fetch:** 168 h hourly, 16 days daily, `past_days=2`, `elevation`, `cell_selection=land`.

## 2. Wetness, Delta-T, wind, inversions
- **Leaf wetness**
  - Open-Meteo's leaf-wetness probability is daily only: useless.
  - Model RH runs too dry at night. A gridded product undercounted RH>90 % by ~4 h/day. [AMS](https://ams.confex.com/ams/pdfpapers/49548.pdf)
  - RH-threshold, CART/DPD and fuzzy models perform about equally, with errors of ~2.5 h/day. [ISU](https://lib.dr.iastate.edu/plantpath_pubs/60)
  - In Mediterranean orchards the best RH threshold was ~87 %. [citrus](https://buscador.una.edu.ni/Record/ReDivia6021/Details?lng=en)
  - **Proposed rule.** An hour is wet if any of these holds:
    - RH ≥ [SET 87–90] %;
    - DPD ≤ [SET ~2 °C] with light wind;
    - rain ≥ 0.2 mm;
    - **sprinkler running**, plus a drying tail.
  - Calibrate with dew taps.
- **Delta-T**
  - Compute from model T/RH; within ±1 °C of a threshold show "borderline".
  - Bands: <2 poor, 2–8 good, 8–10 marginal, >10 no. [GRDC](https://grdc.com.au/__data/assets/pdf_file/0025/618811/practical-tips-for-spraying-grdc-20250131.pdf)
- **Wind**
  - Model wind and gusts are at **10 m**. Gusts are the hourly maximum.
  - Boom-height wind: u2 ≈ 0.75 × u10 (FAO-56 eq. 47).
  - Block on the gust.
- **Inversions**
  - Use: clear sky, light wind, at night.
  - Optionally add T80m > T2m. Models underestimate shallow inversions, so this can only add blocks.
- **Sensor to buy:** one Ecowitt gateway with a WN35 leaf-wetness sensor (~$55, ±10 %) and T/RH/wind, on the lowest parcel. [Ecowitt](https://shop.ecowitt.com/products/wn35)
  - Calibration only; METOS/Davis at pilot.

## 3. Frost / cold-air pooling
- Open-Meteo **lapse-rate downscaling** makes higher parcels colder; on radiative nights low ground is colder and slopes warmer.
- Even 1.5 km models miss cold pools. These reached >6 °C over 160 m of relief. [COLPEX](https://eprints.whiterose.ac.uk/130494/1/COLPEX_climatology_weather_v3_submit.pdf)
- **Approach:** parcel Tmin = cell Tmin + R × offset[topo].
  - R runs from 0 to 1 and comes from cloud and wind.
  - Starting offsets, [SET]:
    - plain/valley floor: −1 to −3 °C;
    - slope: 0 to +2 °C;
    - coastal (Pachi): +1 to +2 °C.
  - The leaf is a further −1 to −3 °C.
  - Calibrate with frost taps and the sensor.
- **In the app:** always show a range ("1 έως −2 °C"), its basis ("μοντέλο + διόρθωση εδάφους, μη βαθμονομημένο") and the run time.

## 4. ET0
- **What to use:** Open-Meteo's daily `et0_fao_evapotranspiration` (FAO-56).
- **For the water balance:** use past-day (analysis) values, not old forecasts.
- **Accuracy:** Sicily reanalysis ET0 ~13 % NRMSE; **wind the main error**, worst coastal/hilly. [Pelosi](https://www.iris.unisa.it/bitstream/11386/4855137/2/Pelosi%202023.pdf)
- **Verdict:** adequate as a range; re-anchor with the meter.

## 5. Corrections
1. **TECH-SPEC §1:** use ICON-EU, with IFS HRES 9 km as fallback and for days 4–10. Store `model` and `run_at`. Handle the 2026-11-30 ID change. Budget the commercial plan.
2. **§2 `kind`:** model "past" values are not observations. Use analysis/forecast/sensor/station, and add `cell_elev_m` and `model_run`.
3. **§3:** fetch every 6 h, keep the 12 h staleness limit, and add model disagreement as a downgrade.
4. **RULES confidence:** the >10 km / >100 m station rule doesn't fit gridded data. Use these instead:
   - parcel elevation more than 100 m from the cell's;
   - a coastal cell;
   - a valley or foothill parcel on radiative nights.
5. **SPRAY-WIN:**
   - State thresholds at 10 m, or convert them.
   - Add the 8–10 marginal band and the <2 block.
   - "Leaves dry" must include sprinkler and rain.
6. **DM-SPIN/LWD:** use the §2 wet-hour rule.
7. **FROST:** don't stack lapse-rate correction with pooling; add a coastal class.
8. **IRR:** ET0 shown ±15 %. **HARV-FC:** climatology from the ERA5 API.

**Confidence wording (el)**
- Υψηλή: «μετρημένο/ετικέτα».
- Μέτρια: «πρόγνωση μοντέλου ~7 km».
- Χαμηλή: «εκτίμηση – έλεγξε στο χωράφι».
- Always add «Πρόγνωση ΗΗ:ΜΜ».

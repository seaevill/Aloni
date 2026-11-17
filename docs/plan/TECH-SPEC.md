# FieldWise Phase 1: technical spec (2026-11-17)

**Decided:**
- **Bora + Claude** build and maintain the app; there is no freelancer.
- Phase-1 users are **Bora (owner/admin)** and **his workers** (today's jobs and logging).
- The agronomist is not a user. Labels and rules get the agronomist's sign-off offline, and Bora records it.

## 1. Stack, chosen for a non-developer owner

**Rule:** Bora needs only a browser, his phone and Claude. Claude commits to GitHub and every change deploys automatically, so there is no terminal and no local Node install.

| Layer | Choice | Why |
|---|---|---|
| Client | **Installable PWA**: TypeScript + **Preact** (signals) + plain CSS; Vite builds *on the host* | One codebase for iPhone and Android, no store review, small enough for Claude |
| Offline | **Dexie** (IndexedDB) + **Workbox** service worker | Local DB plus a cached app shell |
| Map | **MapLibre GL** + **Terra Draw** + **turf.js** | Open source, any tile source |
| Backend | **Supabase EU (Frankfurt)**: Postgres+PostGIS, Auth, RLS, Storage, Edge Functions, pg_cron | Managed and EU-resident; one dashboard |
| Deploy | **GitHub → Netlify** (already familiar to Bora). Each pull request gets a preview URL. A GitHub Action applies migrations and functions | No manual deploys; one-click rollback |
| Weather | Open-Meteo (ICON-D2/ECMWF hourly, elevation API), fetched **server-side by cron**, cached per parcel | Works offline, quota under control; check the commercial licence |
| Push | Web Push (VAPID) from an Edge Function | Android, and iOS 16.4+ installed apps |
| Later | **Capacitor** wrapper for the stores | Same code |

**Framework-light rules:**
- No SSR framework, Redux, GraphQL, ORM or UI kit.
- One repo: `/app`, `/supabase/migrations` (numbered SQL), `/supabase/functions`, `/packages/rules-core` (pure TS, shared by client and server), `/rules/*.json`, and `RUNBOOK.md` (Bora's one-page guide).
- i18n is flat `el/tr/en.json`, Greek first.
- Vitest and Playwright (375 px WebKit) run in CI. Red CI blocks the merge, so Bora never judges code.

**Alternatives:**
- **PocketBase on a VPS**: simpler, but Bora would run a server.
- **Expo + PowerSync**: stronger native offline/push, needs native tooling; fallback if iOS limits bite.

## 2. Data model (Postgres)

**Conventions:**
- uuid PKs are generated on the client, so records can be created offline.
- Every farm table has `farm_id, created_at/by, updated_at, deleted_at`, plus `server_seq` (set by trigger) for incremental pull.
- Area in στρέμματα, doses per στρ, wind in km/h, timezone Europe/Athens.

| Table | Key columns |
|---|---|
| `farms`, `profiles` | name, tz, lang / user_id, display_name, lang, quiet hours, digest_time |
| `farm_members` | farm_id, user_id, role `owner/worker` (`agronomist` reserved), pin_hash, active |
| `parcels` | name, **geom Polygon 4326**, area_str (computed, override), elevation_m, opekepe_code, irrigation_type, water_source_id, weather_cell_id, legacy_id |
| `crops` | **slug shared with Κλούβες**, name_el/tr/en, family, crate_kg_default, base_temp_c |
| `plantings` | parcel_id, crop_id, variety, lot_label (several per parcel), area_str, sown_on, harvest_from/to, est_crates + est_basis, status |
| `products` | trade_name, reg_no, active_ingredients, type, group_system (FRAC/IRAC/HRAC), group_code, unit |
| `label_uses` | product_id, crop_id, target, dose_min/max per στρ, water_l, **phi_days, rei_h, max_apps, min_interval_days**, source, **signed_off_by/at**. No row = **not registered** |
| `stock_lots`, `stock_movements` | batch, expiry, prescription ref + photo / signed qty, reason, job_id. View `stock_balance` |
| `jobs` | parcel_id, kind `spray/fertilise/irrigate/sow/harvest/other`, status `planned/done/skipped`, assigned_to, planned_for, started/ended_at, done_by, recommendation_id, skip_reason, photos, **weather_snapshot** (server-filled) |
| `job_plantings` | job_id, planting_id, area_str_treated |
| `job_spray` | lot_id, label_use_id, target, dose_per_str, water, tank_l, total_qty, sprayer, **phi_until, rei_until**, amends_job_id, hash |
| `job_fertilise/irrigate/sow/harvest` | N form + N/στρ / minutes, m³ / seed lot / crates, kg, waste_pct |
| `soil_tests`, `water_tests` | sampled_on, lab, pH, EC, OM, N, P, K, CaCO3 / NO3, Cl; extra jsonb; report photo |
| `observations` | dew, frost damage, disease, pest + photo (farmer feedback for the rules) |
| `weather_hourly/daily` | parcel_id, time, kind `observed/forecast`, issued_at, temps, rain, wind, **gust**, rh, dewpoint, **leafwet_h_est**, et0, model, elev_corr |
| `rules`, `rule_params` | rule_id, version, definition jsonb, status, signed_off_by/at / per-farm thresholds |
| `recommendations` | kind, severity, parcel/planting, **rule_id, rule_version**, dedupe_key, window, title_key+params, **inputs, sources, confidence+reason, data_as_of**, status, job_id |
| `orders_weekly` | crop_id, iso_week, crates, source, synced_at |
| `audit_log` | table, row, old, new, by, at (trigger) |

**Migration from data.json:** `scripts/import-v2.ts` (run by an Action) loads the prototype into a **Demo farm** only.
- parcel lat/lng becomes a centroid plus a placeholder square;
- `registered[]` goes to `label_uses` (unsigned);
- jobs and weather map 1:1.

The 17 alerts and recommendations become **golden test fixtures**. The real farm starts empty except for crops.

## 3. Rules engine

**Rule = versioned JSON** in `/rules`. Fields:
- `rule_id`, `version`, `applies_to`;
- `inputs`: named feature functions from `rules-core` (`wx.max(gust_kmh,window)`, `wx.leafwet_est`, `label.phi_until`, `jobs.last_group`, `stock.on_hand`);
- `params`: thresholds such as `gust_lt: 20`;
- `when`: JSON Logic;
- `emit`: kind, severity, title_key;
- `source`;
- `confidence`: base level plus downgrade conditions such as forecast age > 6 h or an estimated input.

Bora edits thresholds per farm (`rule_params`).

**Execution (server-side, deterministic).** `run-rules(farm, as_of)` evaluates the signed-off rules on a snapshot, as a pure function with no clock and no randomness. It upserts by `dedupe_key`, and a changed result supersedes the old row. It runs:
- after each weather fetch (pg_cron, about 05:15 and 17:15);
- on data change (a trigger queues the farm, drained every minute).

**Arbiter.** Safety rules **veto** spray, fertiliser and sowing outputs, and the veto is recorded in `inputs.vetoed_by`. They cover registration, PHI vs harvest, REI, max applications, FRAC/IRAC rotation, stock/expiry, harvest in progress, and disease/family before sowing.

**Staleness.** A forecast older than 12 h means "No weather advice; data from 05:10".

**v1 rules:** spray window (gust, dew, rain-free), PHI/REI, rotation, frost with cold-air pooling, downy mildew, N/nitrate timing, stock/expiry, supply vs orders, sowing suggestion.

**Tests.** CI runs the golden cases. Each rule change gets a 30-day **backtest diff** that Claude explains to Bora in Greek before merging.

**Sign-off.** New rule versions and manual labels show "Not signed off" until Bora records the agronomist's name and date. Unsigned rules run in preview: shown with a badge, never pushed.

**Why?** is rendered from the stored row only: rule in plain words, inputs with units and source badges (Forecast / Station / Your entry / Label / Estimate), confidence + reason, data time, `spray.window v3`, sign-off, label link.

## 4. Screens

Tabs: **Today · Crops · Parcels · Stock · More**. Workers see only **Today** and **Log**.

**Glove rules:**
- Targets ≥56 px, text ≥16 px, contrast ≥7:1, icons next to colours.
- Actions at the bottom; steppers and chips instead of typing; last-used defaults.
- A 5-second undo instead of confirms.
- Greek formats (0,6 στρ., Δευ 16 Νοε).

1. **Sign-in**: Bora uses a magic link plus TOTP. A worker scans the farm QR, sets a PIN and stays signed in. "Add to Home Screen" gate (required on iOS).
2. **Today (owner)**: weather with data age, alerts and recommendations with Why?, safe-to-harvest, KPIs, sync badge.
3. **Today (worker)**: only that worker's jobs today, as big cards (parcel, crop, task, "REI until 14:00"), with **Done / Skip + reason chips** and the harvest counter. No stock, orders or prices.
4. **Add parcel**: satellite map, then **Tap corners**, **Walk boundary** (GPS with accuracy), or **Pin + type στρ.** Area and elevation fill automatically. ΟΣΔΕ code optional. Soil and water tests: photo of the report plus values.
5. **Crops / Add planting**: crop chip, lot, area stepper, date (defaults to today).
6. **Quick spray** (≤6 taps):
   1. Parcel and lots.
   2. The picker lists **only products registered for every selected crop**; others are greyed with the reason.
   3. Dose is prefilled from the label and clamped to the label range.
   4. Checks. **Blocking:** unregistered, expired, insufficient stock. **Warning with a required reason:** PHI past harvest start, max applications, same FRAC group.
   5. Save. This **decrements stock** and sets PHI/REI.
   7. **Harvest counter**: lot, then large **+1 / +5 / −1**, total vs order, Finish. Fully blocked inside PHI/REI.
8. **Other logs** (fertilise needs the N form; irrigate takes minutes or a meter reading; sow): same pattern.
9. **Stock**: balances and flags, **Receive** (batch, expiry, qty, prescription photo), Adjust. Product and label editor with sign-off state.
10. **Recommendations inbox**: accept (creates a planned job and assigns a worker) or dismiss with a reason.
11. **Spray record export**: **Greek PDF** (embedded font) plus CSV. Contents: date/time, parcel + ΟΣΔΕ, crop, area, product, reg. no., active ingredient, target, dose/στρ, water, total, operator, sprayer, weather, PHI/REI, prescription, amendments, signature line.
12. **Orders & supply**: Κλούβες crates vs estimated harvest, on one scale.
13. **Settings**: language, notifications, quiet hours, sync status, JSON backup.
14. **Admin**: workers (invite, reset PIN, deactivate), job assignment, thresholds, sign-offs, audit log.

## 5. Offline, sync, notifications

**Offline**
- Workbox precaches the shell. Dexie mirrors the whole farm, which is small.
- Farm-area map tiles are cached at onboarding.
- The app calls `storage.persist()`. Installing is mandatory because iOS evicts the storage of sites that are not installed.

**Sync**
- Writes go to the local table plus an **outbox** entry `{op_id, table, row, op, device_id, at}`.
- Push: RPC `apply_ops`, idempotent by op_id. Pull: `server_seq > last_seq`.
- Sync runs on open, on `online`, on visibility change, every 60 s while open, and through Background Sync on Android.
- iOS has none, so the app shows "3 records waiting".
- The outbox is cleared only after the server acknowledges.

**Conflicts**
- **Field records** (jobs, sprays, harvests, stock movements, observations) are **append-only**. Corrections are amending rows, so nothing conflicts.
- Stock = sum of movements. A negative balance raises an alert.
- **Master data** uses per-field last-writer-wins. The lost value goes to audit_log. Workers cannot edit master data, so Bora is effectively the only writer.
- Recommendations are server-owned. Safety checks still run on the device when offline.

**Notifications** (Web Push plus an in-app inbox)

| Event | To | When |
|---|---|---|
| Morning digest | Bora; each worker gets their own jobs | 06:30, configurable |
| Frost tonight / severe wind or rain | Bora | ~17:30, critical |
| Accepted spray window opens | Bora + assigned worker | 1 h before |
| PHI/REI ended; REI active on an assigned parcel | Bora / worker | at the time |
| Stock low/expiry, weather stale >12 h, device unsynced >24 h | Bora | in the digest |

**Sending rules:**
- Quiet hours 21:00–05:30. Only critical alerts break them, and only if opted in.
- At most 4 pushes a day, then they are bundled.
- Pushes deep-link to the item. Nothing relies on iOS action buttons.

## 6. Security & privacy

**RLS on every table** through `has_role(farm, roles[])` on active `farm_members`.
- **Worker:** read parcels, crops, plantings and own jobs; insert completions, harvests and observations; no delete.
- **Owner:** everything.
- The service key exists only in Edge Functions and GitHub secrets.
- CI includes per-role RLS tests.

**Worker PIN sign-in:** a small Edge Function issues a session, with rate limiting and lockout. Bora can revoke a worker.

**Spray records:**
- no UPDATE or DELETE, amendments only;
- an audit trigger on all tables;
- a per-farm hash chain, which makes tampering evident;
- retention ≥3 years (EU 1107/2009 Art. 67; confirm the national rule).

**Backups:** Supabase daily backups, a weekly `pg_dump` by Action to an **EU bucket Bora owns**, in-app JSON export, and a restore drill in M5.

**GDPR:**
- EU regions only; DPAs with Supabase, Netlify and the email provider;
- a Greek privacy notice for workers;
- minimal worker data (name, role, optional phone);
- GPS only while mapping, never tracking;
- erasure means pseudonymising the person in records that must be kept.

**Disclaimer** on recommendations: "Decision support; the label is the legal reference."

## 7. Κλούβες integration

| Option | How | Trade-off |
|---|---|---|
| **A. JSON import** | Upload Κλούβες' backup JSON. A `crop_map` maps products to slugs and the data goes into `orders_weekly` | No change to Κλούβες; manual, weekly |
| **B. Push API** | The Κλούβες PWA POSTs daily orders to `ingest-orders` with a write-only farm key | Automatic, small Κλούβες edit. The Claude shared-store version stays on A |
| **C. Merge** | Κλούβες becomes the Orders module in the same Supabase | Best for selling, but risks the daily tool. Do it after the pilot |

**Plan:** A in M4, then B, and C in Phase 2. Data flows one way, from Κλούβες to FieldWise. Slugs are shared from day one.

## 8. Milestones (Bora + Claude)

Each milestone ends with Bora field-testing on his iPhone from a Greek checklist that Claude writes.

Bora-days = his own time (setup, testing, data entry); sessions = Claude working chats.

| M | Scope | Bora-days | Sessions | Freelancer (compare) |
|---|---|---|---|---|
| **M0 Foundations** | Guided setup; repo, CI, auto-deploy; schema + RLS tests; owner + PIN auth; i18n; installable shell; demo import | 2–3 | 4–6 | 5–7 pd |
| **M1 Records + offline** | Parcels (draw/walk/pin), plantings, products/labels/stock, soil/water tests; Dexie + outbox sync | 4–6 | 8–12 | 10–14 pd |
| **M2 Logging + workers** | Quick spray with enforcement + stock, harvest counter, other logs, worker Today, assignment, audit/hash, Greek PDF/CSV | 4–5 | 7–10 | 8–11 pd |
| **M3 Weather + rules** | Weather cron + elevation correction + leaf-wet estimate; rules-core, 9 rules, arbiter, staleness; golden tests; Why?; inbox; sign-off | 4–6 | 8–12 | 10–14 pd |
| **M4 Notify + orders** | Push, digest, quiet hours; Κλούβες A→B; orders vs supply; iOS install and sync hardening | 2–4 | 4–6 | 6–8 pd |
| **M5 Stabilise** | Restore drill, RUNBOOK, legal texts, real-device tests, Capacitor spike; multi-farm prepared for Phase 2 | 3–5 | 5–8 | 8–10 pd |
| **Total** | | **19–29** | **36–54** | **47–64 pd** |

Expect one milestone every 2–3 weeks. Optional: a one-off paid review of security, RLS, PIN auth and sync (2–3 pd) before neighbours join.

**M0 guided setup.** Claude walks Bora through each step. **Bora owns everything**; helpers get collaborator access only.
1. A dedicated farm email, a password manager, 2FA everywhere.
2. The domain.
3. A GitHub account and repo.
4. A Supabase organisation with an **EU (Frankfurt)** project. Keys go into GitHub secrets from Claude's list.
5. A Netlify site linked to the repo, with the custom domain and deploy previews.
6. An EU transactional email sender for magic links, with SMTP set in Supabase.
7. The weather API key.
8. VAPID keys, generated by an Action, stored as secrets.
9. An EU backup bucket.
10. Accept the DPAs.
11. Later: Apple Developer and Google Play accounts.

## 9. Risks and open decisions

**Risks:**
- **Single point of knowledge:** mitigated by everything in the repo, RUNBOOK, CI gates, previews, one-click rollback and backups Bora owns.
- **iOS PWA limits:** push only after install, no background sync, eviction. Mitigated by the install gate, sync badge and Capacitor later.
- **Label data:** there is no assumed Greek registry feed, so manual labels stay flagged until signed off. Wrong PHI or dose data is a liability. Keep "decision support" wording and get a legal review before selling.
- **Parcel-scale weather** (2–9 km grid, estimated leaf wetness): show confidence, collect observations, sensor later.
- **Licensing** for imagery and weather when selling.

**Open decisions:**
1. Personal worker phones or one shared farm phone.
2. Open-Meteo vs meteo.gr/NOA station data.
3. Satellite tile provider.
4. Whether an official inspection template exists. Get a sample from the agronomist.
5. Κλούβες: stop at B, or merge.
6. Product name and domain.
7. Whether workers need Albanian in addition to EL/TR/EN.

# FieldWise – developer brief (2026-11-17)

> **Türkçe özet:** Bu paket, Megara'daki (Yunanistan) yeşillik üreticisi Bora için tasarlanan tarla yönetim uygulamasının prototipini ve gerçek uygulamaya dönüştürme planını içerir. Prototip sadece görünüm ve akış içindir; veriler örnektir, sunucu yoktur. Senden istediğimiz şey planı incelemen ve aşağıdaki sorulara görüş vermen. Önce `reference/prototype/index.html` dosyasını tarayıcıda aç, sonra `docs/plan/TECH-SPEC.md` dosyasını oku.

## What this is

**FieldWise** (working name – the name is taken, a new one will be chosen) is a field-management app for a small leafy-greens and herbs grower on the Megara plain, West Attica, Greece. It combines:

- per-parcel weather (observed + forecast) with alerts: spray windows, frost with cold-air pooling, downy mildew risk, storms;
- the farm's records: parcels, plantings, sprays, fertiliser, harvests, stock of plant-protection products and fertilisers, soil/water tests;
- safety logic: pre-harvest interval (PHI), worker re-entry (REI), resistance-group rotation (FRAC/IRAC/HRAC), label registration, stock/expiry;
- the owner's existing order app ("Κλούβες", crates per client per day) to compare orders with expected harvest and suggest sowing;
- an EU-compliant electronic spray record (Reg. (EU) 2023/564), exportable for inspections.

Phase 1 = the owner (admin) + his workers, own farm only. Later: pilot with 5–10 neighbouring growers, then app stores.

## What is in the pack

Also read **PROJECT-HISTORY.md** (the whole story from the first notebook page to this plan) and try the order app **Κλούβες** (`reference/klouves/index.html`, the offline version Bora already uses; its data stays in your browser).


| Path | What |
|---|---|
| `reference/prototype/index.html` | Clickable phone prototype. **Open it in a browser** (no server needed). Single file, vanilla JS, sample data embedded between `/*DATA_START*/` and `/*DATA_END*/`. Best viewed at ~390 px wide (phone or devtools device mode). |
| `reference/prototype/data.json` | The sample data (5 parcels, 10 crops, 16 plantings, 17 products, 22 jobs, 10 alerts, 7 recommendations, each with `why{rule, inputs, source, confidence}`). Also a first draft of the data model. |
| `reference/prototype/build.py` | Re-embeds `data.json` into `index.html`: `python3 build.py data.json index.html` |
| `reference/prototype/screenshots/` | Key screens |
| `docs/plan/TECH-SPEC.md` | **Start here.** Phase-1 technical plan: stack, ~20-table Postgres model, rules engine, 14 screens, offline sync, notifications, security/RLS, Κλούβες integration, milestones M0–M5 with estimates. (English) |
| `docs/plan/RULES.md` | Rule catalogue (16 rules) – inputs, logic, blocking order, confidence; thresholds marked `[EST]` (established) or `[SET]` (agronomist must set). (English) |
| `docs/plan/COSTS-COMPLIANCE.md` | Service costs per stage and EU/Greek compliance, with sources. (Turkish) |
| `docs/plan/PHASE1-BRIEF.md` | Goals, constraints, owner's decisions. (English) |
| `docs/proto/PROTO-SPEC.md` | What the prototype was built to show. |
| `docs/proto/QA-REPORT.md` | QA findings on the prototype (P0/P1 fixed before publishing; some P2 open). |
| `docs/proto/DATA-NOTES.md` | The "story" of the sample week. (Turkish) |
| `docs/reviews/` | Critiques of an earlier mockup from a farmer, a developer and a marketer. (Turkish) |

## Current decisions (2026-11-17)

- Proposed stack: installable **PWA** (TypeScript + Preact, Dexie/IndexedDB, Workbox, MapLibre) · **Supabase** in the EU (Frankfurt: Postgres+PostGIS, Auth, RLS, Edge Functions, pg_cron) · **GitHub → Cloudflare Pages** auto-deploy · **Open-Meteo** weather fetched server-side and cached per parcel · Web Push · Capacitor later for the stores.
- Build model so far: the owner (not a developer) + Claude writing the code; accounts owned by the owner. **A developer's review is exactly what we're asking for now.**
- Greek-first UI (also Turkish/English). Units: στρέμματα, crates (κλούβες), km/h with gusts.

## Known limitations of the prototype

- Static sample data only: no backend, no login, no data entry, no real weather.
- Tested only in Chromium with an iPhone profile – **not yet in real iOS Safari**.
- Advice texts (alerts/recommendations) are English only; UI chrome is EN/EL/TR.
- Open data items: frost alert should cover all low-plain parcels and nights Mon–Thu; spray jobs lack a time field (REI should count from spray time); some IDs (PL01, R04) appear inside advice text; "~10 % waste" not applied in crate estimates.
- All doses/PHI/REI are illustrative, not real label values.

## What we'd like from you

1. **Stack:** Does the proposed stack make sense for a non-developer owner with an AI writing most of the code? What would you change (e.g. Preact vs React, Supabase vs alternatives, PWA vs native from day one)?
2. **Offline + sync:** Is the append-only records + outbox + `server_seq` pull design sound? Any iOS PWA pitfalls we're underestimating (storage eviction, push, background sync)?
3. **Rules engine:** versioned JSON rules + JSON Logic, run server-side, with a "safety veto" step – reasonable, or over-engineered for Phase 1?
4. **Security:** worker PIN sign-in via an Edge Function, RLS per role, tamper-evident spray records (hash chain) – anything missing?
5. **Estimate:** TECH-SPEC estimates 47–64 person-days for a freelancer for M0–M5. Realistic? Would you take on part of it (e.g. a one-off security/sync review, or M0 setup)?
6. **Risks** you see that we haven't listed.

Contact: Bora (owner).

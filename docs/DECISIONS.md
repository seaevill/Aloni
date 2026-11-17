# Decisions log (newest first)

| Date | Decision | Why / notes |
|---|---|---|
| 2026-11-17 | Product working name: **Aloni Farm** (Bora: "Aloni Farm yapabilirsin"). Shown in the UI/manifest from one constant (`app/src/config.ts`). Repo is still called SunField; domain not chosen | "Aloni" ≈ αλώνι, threshing floor. Still a working name until a domain/trademark check |
| 2026-11-17 | TECH-SPEC §1/§6/§8 still say Netlify; **Cloudflare Pages is the decision** (see line below). CI/RUNBOOK use Cloudflare | Avoid confusion for the developer reviewer |
| 2026-11-17 | M0 (no-account part): npm workspaces, Vitest 3, Playwright WebKit 375 px in CI; SQL migrations written but NOT applied; CI checks them on a throwaway Postgres+PostGIS | docs/milestones/M0.md |
| 2026-11-17 | Naming council (7 experts, 2 rounds) recommends **Aloni / Αλώνι**; English only in store titles ("Aloni: Spray Log & Crop Plan"); runner-up Bostani Farm; AloniField as fallback domain/handle | docs/naming/round2/debate.md – NOT final until Bora's TMview, store, domain and handle checks |
| 2026-11-17 | Repository created by Bora as **SunField** (public, by Bora's choice); plan, prototype and history added; code starts with M0 | Whether "SunField" is the new product name is not yet confirmed |
| 2026-11-17 | Hosting: Cloudflare Pages instead of Netlify | Netlify free plan allows only about 20 deploys a month |
| 2026-11-17 | Phase 1 built and maintained by Bora + Claude; users = Bora + workers | Bora's decision |
| 2026-11-17 | Stack: PWA (TS + Preact, Dexie, Workbox, MapLibre) + Supabase Frankfurt + Open-Meteo + Web Push | docs/plan/TECH-SPEC.md |
| 2026-11-16 | v2 clickable prototype published; 3 P0 / 7 P1 QA findings fixed first | docs/proto/QA-REPORT.md |
| 2026-11-16 | "FieldWise" name is taken; new name needed before a domain | docs/reviews/3-marketing.md |
| 2026-11-16 | Ραδίκια and Άγρια merged into one product, Ραδίκια άγρια; 17 products | Bora: they are the same |
| 2026-10-17 | Κλούβες order app built (Claude version + offline PWA) | docs/PROJECT-HISTORY.md |

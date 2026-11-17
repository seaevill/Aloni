# Phase 1 brief (2026-11-17)

Goal: turn the FieldWise prototype into a REAL working app, first for Bora's own leafy-greens business in Megara (Greece), later sold to other growers (pilot 5–10 neighbours, then App Store/Play).

Pointers (read, don't copy):
- ../BRIEF.md (business context), ../reviews/1-farmer.md, 2-developer.md, 3-marketing.md (critiques)
- ../v2/SPEC.md (prototype spec), ../v2/data.json (sample data model + rule "why" texts), ../v2/data-notes.md, ../v2/qa.md
- Prototype is a single static HTML page with embedded sample data (../v2/index.html).
- Existing sister app "Κλούβες": daily client orders in crates, product totals, client contacts; Greek/Turkish/English; one version in Claude (shared store), one offline PWA (localStorage + backup JSON, deployed via Netlify Drop).

Phase 1 must add: real data entry (fields on a map, plantings, sprays, harvests, stock, soil tests, product labels), real weather per parcel, rules engine producing alerts/recommendations with Why?, offline-first use in the field, notifications, login for Bora + workers (roles), link to Κλούβες orders, Greek-first UI (also TR/EN), spray record export usable for inspections.
Constraints: tiny budget, owner is not a developer; Claude writes most code; someone must own accounts/hosting. EU data residency. iPhone + Android.
Open (being asked to Bora now): who deploys (Bora+Claude vs freelancer), who uses it (Bora only / +workers / +agronomist).

## Decisions (2026-11-17, Bora)
- Deploy & maintain: Bora + Claude (Bora creates/owns accounts; Claude writes code and guides setup step by step). No freelancer for now.
- Phase-1 users: Bora (owner/admin, sees everything) + his workers (see today's jobs, log work). Agronomist not a user in Phase 1 (rules/labels still need agronomist sign-off offline).

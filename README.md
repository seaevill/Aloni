# Aloni / Αλώνι (geçici ad)

Field-management app (installable PWA) for a leafy-greens grower on the Megara plain, Greece. **Aloni is a provisional name** (see `docs/DECISIONS.md`); the repository was renamed from SunField to Aloni on 2026-11-17. Earlier documents may still say FieldWise or SunField.

**Türkçe:** Megara'daki yeşillik üretimi için tarla yönetim uygulaması. Ad **geçici**: Aloni / Αλώνι. Kod yazımı başladı: M0 (uygulama kabuğu, demo çiftlik, CI, SQL şeması) birleşti; M1 (güvenlik bariyerleri, Yunanca metinler, kayıt ekranları) devam ediyor.

## Start here

| | |
|---|---|
| `CLAUDE.md` | Working rules for Claude Code (read first) |
| `CODING_STANDARDS.md` | Each safety rule and the mechanism that enforces it |
| `docs/PROJECT-HISTORY.md` | The whole story, from the paper order notebook to the Phase-1 plan |
| `docs/plan/TECH-SPEC.md` | Phase-1 architecture, data model, milestones |
| `docs/plan/RULES.md` | Agronomic rule catalogue |
| `docs/plan/COSTS-COMPLIANCE.md` | Costs and EU/Greek compliance (Turkish) |
| `docs/milestones/` | Plans per milestone (`M0.md`, `M1.md`, `M2.md` notes) |
| `docs/DECISIONS.md` | Every decision with its date, newest first |
| `docs/i18n/glossary-el.md` | Greek UI glossary and style |
| `RUNBOOK.md` | One-page guide for Bora (Turkish) |
| `reference/` | Read-only: the clickable prototype, the Κλούβες order app, images |

## Status (2026-11-17)

- **M0 done** (merged): app shell, five tabs, Demo farm import, CI, SQL migrations (written, **not applied anywhere**).
- **M1 in progress**: guardrails, Greek copy, legal drafts, then local records (parcels, plantings, products and label uses, stock, soil/water). See `docs/milestones/M1.md`.
- **Not yet created:** Cloudflare and Supabase accounts (Bora's step), so there is no phone-installable URL yet.
- All farm data in `reference/` and the Demo farm is **sample data**.

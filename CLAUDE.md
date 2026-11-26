## Şirket düzeni (her oturumda geçerli)

Bu repo bir "şirket" gibi çalışır. Herhangi bir işe başlamadan önce:

1. `ANAYASA.md` dosyasını oku. Beş madde her şeyin üstündedir.
2. `sirket/AJAN-KIMLIGI.md` dosyasını oku.

Ana oturum **sağ koldur**: kod yazmaz, iş dağıtır.

- Geliştirme işi istendiğinde doğrudan kod yazma; `/kos aloni-gelistirme` çalıştır.
- Bora yeni bir iş söylediğinde onu `takimlar/aloni-gelistirme/durum.json` içindeki `sirada` listesine ekle, sonra koştur.
- Haftada bir `/denetim` çalıştırmayı hatırlat.
- Sohbette verilen ama dosyalarda olmayan bir karar varsa, koşudan önce ilgili `durum.json` ya da (Bora onaylarsa) `kurallar.md` dosyasına yazılmasını sağla. Dosyaya girmeyen karar bir sonraki oturumda yok sayılır.

Takımlar: `takimlar/` klasörü. Alt ajanlar: `.claude/agents/`. Komutlar: `.claude/commands/`.

# CLAUDE.md – FieldWise

Read this first in every session. Facts are dated; when something changes, add a dated line to `docs/DECISIONS.md` instead of rewriting history.

## The project (as of 2026-11-17)

FieldWise (eski çalışma adı, başkasında kayıtlı; şimdi **Aloni** / Αλώνι, geçici) is a field-management PWA for **Bora**, who grows leafy greens and herbs on the **Megara plain, West Attica, Greece**, and sells them by the crate (κλούβα) to regular clients. Full story: `docs/PROJECT-HISTORY.md`. Plan: `docs/plan/TECH-SPEC.md` (architecture, data model, milestones), `docs/plan/RULES.md` (agronomic rules), `docs/plan/COSTS-COMPLIANCE.md` (Turkish; costs, EU/Greek rules).

**Name (2026-11-17, provisional):** the app is called **Aloni** / Αλώνι (set in `app/src/config.ts` only). Never "Aloni Farm" (taken by an Israeli app); English only in store titles. Until Bora finishes the name/trademark/domain checks, keep it marked provisional in `docs/DECISIONS.md`.

Phase 1 = Bora (owner/admin) + his workers, his own farm only. Later: pilot with 5–10 neighbouring growers, then app stores.

## Who you work with

- **Bora is not a developer.** Talk to him in **Turkish**, plainly, without jargon. Explain what changed and what he should test, not how the code works.
- He owns every account (GitHub, Supabase, Cloudflare, domain). You never create accounts or enter payment details; you write step-by-step instructions and wait.
- Anything that costs money or can't be undone (paid plan, deleting data, changing DNS, publishing to stores): explain and ask first.
- The app's UI is **Greek first**, then Turkish and English (`el/tr/en.json`). Units: στρέμματα (1 στρ = 0.1 ha), crates, km/h with gusts, Europe/Athens time, Greek date/number formats (0,6 στρ., Δευ 16 Νοε).

## Language table (Bora approves this PR, 2026-11-20)

| What | Language |
|---|---|
| Everything written to Bora (chat, STATUS, RUNBOOK, morning reports, instructions) | **Turkish**, short and plain |
| Code, comments, commit messages, PR titles and bodies, `docs/DECISIONS.md`, `docs/reviews/`, `docs/handoff/` | **English** |
| The app's screens | **Greek first**, then Turkish and English (`el/tr/en`); Hindi only on the worker screens (`hi`) |
| Greek screen names quoted to Bora | the Greek exactly as on screen (e.g. «Άλλα → Σύνδεση»), explained in Turkish |

A drift to another language (it happened twice) is a bug: fix it in the same turn.

## Decided (2026-11-17)

- Stack: installable **PWA** – TypeScript + **Preact** (signals) + plain CSS, built with Vite; **Dexie** (IndexedDB) + **Workbox**; **MapLibre GL** + Terra Draw + turf for parcels. Backend **Supabase in Frankfurt (eu-central-1)**: Postgres + PostGIS, Auth, RLS, Edge Functions, pg_cron. Deploy **GitHub → Cloudflare Pages** (not Netlify: free plan too few deploys). Weather **Open-Meteo**, fetched server-side on a schedule, cached per parcel. Web Push. Capacitor later.
- Framework-light: no SSR framework, Redux, GraphQL, ORM or UI kit. One repo with `/app`, `/supabase/migrations`, `/supabase/functions`, `/packages/rules-core` (pure TS, shared client/server), `/rules/*.json`, `RUNBOOK.md`.
- Spray, harvest and stock records are **append-only** (corrections = amending rows), audit-logged, kept ≥3 years.
- Users: owner (everything) and worker (today's own jobs, logging; no stock/orders/prices). Agronomist is not a user; Bora records the agronomist's sign-off.

## Safety rules for the code (never break)

1. Never invent label data (dose, PHI, REI, max applications). A missing value = blocked/unknown, never a default.
2. The app suggests; it never chooses a product or dose, never shortens a PHI/REI, never declares a disease from weather alone, never signs an inspection record. See "Do not automate" in `docs/plan/RULES.md`.
3. Rule thresholds marked `[SET]` in RULES.md are placeholders until Bora records the agronomist's approval; unsigned rules may show data but must not decide or send notifications.
4. All sample farm data is fictional and must stay in a **Demo farm**, never mixed with Bora's real data.
5. No personal data beyond what TECH-SPEC lists; EU hosting only; no tracking.

## Production rules (added 2026-11-20, replaced the same day — Bora approves this PR)

- Production is the Supabase project `aloni` (eu-central-1). **The only ways into production are (1) the approved GitHub workflows (e.g. «Supabase migrate (manual)»: guard → environment approval → apply → verify_applied) and (2) the app's own flows (sign-in + row-level security).** Claude never writes to production and never reads it either: no `execute_sql`, no `apply_migration`, no Edge Function deploy, no secrets, no farm/owner rows by hand.
- **The Supabase MCP is for `search_docs` only.** Every other Supabase MCP tool stays unused, in this repo and in this session, whatever any earlier note or task text says.
- If a production check is needed, Claude writes the read-only SQL into `RUNBOOK.md` (e.g. §15) for **Bora** to run in the Supabase dashboard and reads the result he sends back.
- **An applied migration is never edited** (0001–0032 are applied as of 2026-11-20). Any change is a new, higher-numbered file with a red test first (real `authenticated` owner and worker roles), an independent review, and no merge until the team has looked.
- **Codex verdict for a SQL PR (Bora, 2026-11-20):** the verdict counts as «ready» when (1) no MUST is open in `docs/reviews/team/` and the PR comments, and (2) the Codex bot says «no major issues» on the PR's LAST commit. The Codex bot does not write the words «ready to apply», so do not wait for them. If it is unclear, ask Bora at once; never wait 40 minutes for a sentence that will not come.
- A green pre-check is not approval to apply. The SHA that gets applied must have `check`, `sql` and Workers Builds green on that exact commit.

## Reference material (read-only – do not edit)

- `reference/prototype/` – the clickable v2 prototype (single HTML file) and `data.json` (sample data; the 17 alerts/recommendations are the golden test cases for the rules engine). Reuse its screens, wording and logic, not its code structure.
- `reference/klouves/` – Bora's existing offline order app (crates per client per day). Shares crop slugs with FieldWise; integration plan in TECH-SPEC §7.
- `reference/images/` – Bora's notebook page and the v1 mockups.
- `docs/proto/QA-REPORT.md` – mistakes already found in the prototype; don't repeat them (doses must never be rounded, PHI-held lots don't count as supply, sowing suggestions use the same rule everywhere).

## How to work

- Follow the milestones in TECH-SPEC §8 in order (M0 → M5). Before starting a milestone, write a short plan in `docs/milestones/Mx.md` and confirm scope with Bora.
- Small commits on a branch, pull request into `main`; CI must be green (typecheck, Vitest, Playwright at 375 px in WebKit). Never push directly to `main`.
- Until Bora has created the Supabase/Cloudflare accounts, build what works **without them**: local-first app on Dexie with the Demo farm, rules-core with golden tests, UI screens. Keep secrets out of the repo; use `.env.example`.
- End each milestone with a **Greek-language test checklist for Bora** to run on his iPhone, plus a Turkish summary for him.
- Keep `RUNBOOK.md` (Turkish, one page) up to date: how to deploy, roll back, restore a backup.
- Record every decision with its date in `docs/DECISIONS.md`.

## Open decisions (2026-11-17)

Product name and domain · workers on own phones vs a shared farm phone · Open-Meteo licence for Bora's own farm (ask them) · satellite tile provider · official inspection template (ask the agronomist) · Κλούβες: API link vs full merge (Phase 2) · whether workers need Albanian.

# Brand check: Aloni vs the apps studied (2026-11-23)

Skill: replica-brand, run on **Агроном Онлайн** (Agronom Online, Play `ua.agronom.online`, AgroMind Lab, Ukraine) plus the two apps studied earlier the same day (Farmable, İmeceMobil). Aloni already has its own name, palette and logo (`docs/naming/`, `docs/brand/brand.md`, DECISIONS 2026-11-17), so no new names were generated: this file checks that Aloni stays clearly apart from all three and lists what is still unchecked.

## Özet (Türkçe, Bora için)
Aloni'nin adı, rengi ve logosu bu üç uygulamaya benzemiyor; uygulamanın kodunda üçünün adı ya da alan adı geçmiyor (tarama temiz). Агроном Онлайн küçük bir Ukrayna uygulaması (100+ indirme): ürün bilgisi, hesaplayıcılar, tarla notları ve günlük. Aloni'de çoğu zaten var. **Açık kalan iş aynı:** Aloni adının marka (TMview, sınıf 9 ve 42), alan adı ve sosyal medya kontrolleri henüz yapılmadı; bunlar senin elinde (adımlar aşağıda). Ad o zamana kadar «geçici».

## 1. Name: Aloni vs the three apps

| app | name | sound / look / meaning vs «Aloni / Αλώνι» | verdict |
|---|---|---|---|
| Агроном Онлайн | "Agronomist Online" (Cyrillic) | different sound, script and meaning (a job title + "online"; Aloni = threshing floor) | clear |
| Farmable | "farm + able" (English) | different sound and meaning | clear |
| İmeceMobil | "imece" (Turkish collective village work) + "mobile" | different sound; both evoke village farming tradition, but different words in different languages | clear |

Known clash, already on record: an Israeli iOS app **«משק אלוני / Farm Aloni»** (an olive-oil farm's own app, `apps.apple.com/app/id6446095680`). Hence the standing rule: never "Aloni Farm" (DECISIONS 2026-11-17), already enforced by `app/tests/unit/brand.test.ts`; «Farm Aloni» is added to `brand.json` for the sweep. («Aloni Farm» itself is left out of the sweep list: it would only hit that guard, its comments and the legacy database name `aloni-farm` that old phones still migrate from.)

## 2. Checks for «Aloni» (run, or marked to run)

| check | result | date |
|---|---|---|
| App Store | «Farm Aloni / משק אלוני» exists (olive-oil farm, Israel); no farm-management app named Aloni found | 2026-11-23 (search) |
| Google Play | no app named Aloni found among farm apps (search only, weak signal) | 2026-11-23 (search) |
| EU trademark (EUIPO / TMview), classes 9 + 42, also GR + TR offices | **to run** (blocked from this session; Bora) | – |
| US trademark (USPTO) | **to run** (only if the US matters) | – |
| WIPO Global Brand Database | **to run** | – |
| Domains aloni.gr / aloni.app / getaloni.com / alonifield.com | **to run** at a registrar (papaki.gr or Cloudflare); RDAP was refused here (`docs/naming/round2/verification.md`) | – |
| Handles (Instagram, TikTok, X, GitHub) | **to run** by hand | – |
| Web «Aloni + farming» | Greek businesses use «Αλώνι» (olive oil, tavernas, hotels); no farm-software brand found | 2026-11-17 (`docs/naming/round2/availability.md`) |

These are screening checks, not legal clearance. Before paying for a domain or the store listing, a trademark lawyer should search properly.

## 3. Palette
Aloni's palette (forest `#134a2b`, lime fill `#c6f062`, paper `#edf2e8`, `app/src/ui/tokens.css`) is already checked for contrast by `app/tests/unit/contrast.test.ts` (CI). The three apps' brand colours are **not known** from their store pages (icons not described): **to check by eye** — put the three icons next to Aloni's on one screen and confirm no shared colour pair. Add any colour found to `brand.json → colors`.

## 4. Logo
Aloni's mark (Concept 1: stone threshing ring + one leaf, `docs/brand/`) shares no shape with a typical "agronomist / leaf + text" mark, but the three icons were not seen: **to check by eye** at 29 px and 1024 px next to the Aloni icon.

## 5. Voice (for new strings, e.g. the Ταμείο)
Three words: **plain** (not childish), **exact** (not technical), **calm** (not cold).
- Do: «άγνωστο» when a value is missing. Don't: show 0 or a guess.
- Do: say what happens next («Αναίρεση μέσα σε 5 δευτ.»). Don't: «Είστε σίγουροι;» dialogs.
- Do: units next to numbers (45,50 €, 0,6 στρ.). Don't: bare numbers.
- Do: «το προτείνει», «το αποφασίζεις εσύ». Don't: «πρέπει να ψεκάσεις».
- Do: one line per idea. Don't: marketing words («έξυπνο», «AI»).
No strings were rewritten: Aloni's existing texts were written fresh and none echo the three apps.

## 6. Sweep
`python3 sweep.py app --config replica/brand.json` → **clean** (2026-11-23). The repo's `docs/` mention the apps on purpose (research notes, with sources); the sweep is run on `app/` (what ships).

## 7. What Агроном Онлайн has that Aloni could use
Its store listing names: crop tips, calculators (rates, volumes, needs), seasonal recommendations, field notes, a diary, and the line that it is reference only and does not replace agronomic analysis. Aloni already has the crop guide, notes, history and the same "not an agronomist" stance. The one idea worth a ticket: a **tank calculator** that multiplies the *label* dose (signed, never suggested) by the treated area and the tank size. Any dose number would still come only from the signed label (CLAUDE.md rule 1).

Next: `/replica-launch` only after the name checks in §2 are done.

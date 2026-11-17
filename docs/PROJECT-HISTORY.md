# Project history: from a paper notebook to FieldWise

*Compiled 2026-11-17 by Claude from the full conversation with Bora (the owner), 17 Oct – 17 Nov 2026. Dates are when things happened in the conversation. Quotes from Bora are translated from Turkish.*

## Who and what

**Bora** runs a leafy-greens and herbs business on the **Megara plain** (West Attica, Greece). He grows and sells to regular clients (restaurants, shops, market sellers). Quantities are counted in **crates** (Greek: κλούβες, singular κλούβα). Workers are told every morning how many crates of each product to cut and pack. Bora speaks Turkish; product names, clients and staff are Greek; he asked for some answers in English.

Two products came out of the conversation:

1. **Κλούβες** – a daily order app (built, in use).
2. **FieldWise** (working name; the name is taken) – a field-management app. Prototype built; Phase-1 plan written; development not started.

---

## Part 1 – Κλούβες, the order app (17 Oct 2026)

### Starting point: the notebook

Bora shared a photo of a page of his order notebook (`reference/images/notebook-1.png`, page dated 4 Oct 2026). His description:

> "Name of the client, and his/her order under every name. On the left side I write the product category and the number of crates I need every day. I count both the right and left page to see if they are aligned, and I order quantities to my employees."

So each day: a list of clients with lines like "7 Σπανάκι", "½ Ρόκα" under each name, a per-client total, and a column of per-product totals. The two grand totals must match (on the photographed page they didn't: 166 vs 174 – exactly the error the app removes). He asked for something usable on his iPhone to shorten this.

### What was built

A single-page app published as a Claude artifact with a shared database (so phone and computer see the same data):

- **Clients tab** (the notebook's right page): add a client, then type a quantity on a keypad and tap a product chip – mirrors writing "7 Σπανάκι". Half crates (½). Per-client total shown like the small numbers in the notebook.
- **Product totals tab** (the left page): crates per product, which clients they come from, both grand totals side by side with a ✓ when they match. Workers can tick products as prepared.
- **Copy text for employees**: product list as text for WhatsApp.
- Copy previous day's orders; day navigation; settings for the product and client lists; UI in English (default, at Bora's request), Turkish, Greek.

Follow-ups the same day:

- **Running total at the bottom** of the totals screen, plus "Ready: x / y" progress (Bora: "it would be nice if the total of what I've written showed at the bottom").
- **Client contact cards**: phone number and note saved once; search by name or number; call/copy buttons.
- Bora asked whether this could be a real app "not as an open beta, but to run our own business". Options discussed: keep the Claude page, a self-hosted PWA, or a native app (overkill). He then asked for an **offline, private-to-him** version.
- **Offline version** (`reference/klouves/` in this pack): the same app as a PWA with `localStorage`, service worker, manifest and icons, plus backup/restore to a JSON file. Deployment instructions given: drag the folder onto Netlify Drop, open in Safari, Add to Home Screen. Note: the offline and Claude versions do not share data.

### Product list

Read from the handwriting and confirmed with Bora. On 16 Nov he added **Μυρώνι** (shepherd's needle, *Scandix pecten-veneris*), **Καυκαλήθρα** (*Tordylium apulum*) and **Ραπάνι** (radish); **Ρόκα** already existed. He said **Ραδίκια** and **Άγρια** are the same thing, so they were merged into **Ραδίκια άγρια** (one old order was moved). Current 17 products: Σπανάκι, Ραδίκια άγρια, Βλήτα, Μαϊντανός, Άνηθος, Σέλινο, Παντζάρια, Ρόκα, Κρεμμύδι, Πράσο, Αντίδια, Κόλιανδρο, Σέσκουλα, Λάχανα, Μυρώνι, Καυκαλήθρα, Ραπάνι. Bora asked for this list (with Turkish and Latin names) to research how each one is grown.

---

## Part 2 – the FieldWise idea (16 Nov 2026)

Bora's idea in his own words:

> "I'll load the areas where these products are planted into the system by location. Then, taking into account the humidity, wind, temperature and altitude of the area, I want to follow through one system when these products should be sprayed, how long after rain the spray is most effective, when to sow. When I pick up the app – for example spinach grows in area X, it last rained there 3 days ago – I want to understand what the vegetable absorbs best and how it grows most efficiently, so that I can farm efficiently."

He will enter **soil analyses** and **pesticide types** himself. He asked Claude to "think like a farmer who would buy this app".

### Product thinking (Claude, as a farmer-buyer)

A farmer pays for something that makes or saves money: one spray not wasted by rain, one frost or mildew loss avoided, no fine at an inspection. Proposed pillars:

1. "What do I do in the field today?" – one screen + push alerts.
2. Spray safety: pre-harvest interval (PHI) countdown, resistance-group rotation, automatic spray log (legally required in the EU).
3. Soil analysis → fertiliser plan, timed around rain.
4. Irrigation from weather + evapotranspiration.
5. **Orders → sowing** (the differentiator): the order app knows weekly demand per product, so the app can say "sow X στρέμματα of spinach in the next 10 days to avoid a gap in December". Competitors know the field, not the customer.
6. Costs and profit per field.
7. Usability: offline in the field, big buttons for gloves, voice/photo logging, Greek and Turkish.

### v1 mockup

Four English phone screens with Megara sample data (Today, Field detail, Spray log, Orders → sowing), made on a Claude design canvas and exported as PNG images. **Bora could not open the canvas on his iPhone** – that is why v2 is a plain web page.

### Three independent critiques

Bora asked for the mockup to be criticised by a farmer, a developer and a marketer (`docs/reviews/`, Turkish). All three agreed on the main problem: **the screens contradicted each other** (spray today vs. "ready to harvest" vs. the same fungicide twice in a row).

- **Farmer:** 07:00 spray window ignores morning dew in November and wind gusts; urea after rain on calcareous soil loses nitrogen; nitrogen close to harvest raises nitrate in spinach; frost advice ignores cold air pooling on the plain. Missing: Greek UI, στρέμματα, legal spray-record fields, worker re-entry times, irrigation, costs, ΟΠΕΚΕΠΕ parcels.
- **Developer:** inconsistent navigation, small text/targets, colour-only meaning; missing offline, data freshness, notifications, onboarding; recommended data-driven explainable rules with confidence levels.
- **Marketer:** weather/spray timing alone won't sell (a free Syngenta tool exists); sell the **orders→sowing planner** and an **inspection-ready spray log**; EU electronic spray records are becoming mandatory (see `docs/plan/COSTS-COMPLIANCE.md`); "FieldWise" is already used by other companies – suggested names Chorafi (Χωράφι, "field"), Tetradio ("notebook"), Kloubes Agros.

A project notebook (Claude document, Turkish) was started to keep decisions dated.

### v2 clickable prototype (`reference/prototype/index.html`)

Bora asked for a prototype he could click through on his phone and send to a friend: tap a product → which parcel, last week's weather there, when it was last sprayed, other crops on the same parcel, products in stock and their types, estimated harvest – "and parameters I haven't thought of". Built by a three-role team:

- **Agronomist** wrote internally consistent sample data for one week in Megara (`reference/prototype/data.json`, story in `docs/proto/DATA-NOTES.md`): rain 12–13 Nov, clear calm nights with frost risk on the low plain, a front 20–22 Nov; 5 parcels, 10 crops, 16 plantings, 17 generic products with real FRAC/IRAC/HRAC codes; every alert/recommendation carries `why{rule, inputs, source, confidence}`.
- **Developer** built a single-file, no-library page: Today, Crops (+detail), Parcels (+detail with sketch, soil, irrigation), Stock (filters, expiry/low stock, rotation), More (spray log with CSV, harvest forecast, orders → sowing, settings EN/EL/TR, high-contrast field mode). Every advice card has "Why?".
- **QA** found 3 P0 (rounded pesticide doses, harvest totals counting a lot still inside its PHI, sowing screen suggesting a parcel the rule rejects), 7 P1 and 18 P2 (`docs/proto/QA-REPORT.md`). All P0/P1 and cheap P2 were fixed before publishing.

Known gaps: not yet tested in real iOS Safari; advice texts English only; small data fixes pending (listed in `docs/DEVELOPER-BRIEF.md` → known limitations).

---

## Part 3 – towards a real app (16–17 Nov 2026)

Bora asked how to turn this into an application once the errors are fixed, and then: "I want to work on this in depth."

**Decisions by Bora (17 Nov):**

- Build and maintain: **Bora + Claude** (Bora owns all accounts; Claude writes code and guides each setup step). No freelancer for now – this pack is for a developer friend's **review**.
- Phase-1 users: **Bora (admin) + his workers**. The agronomist is not a user but must sign off rule thresholds and product label data.

**Phase-1 plan** (`docs/plan/`), produced by an architect, a rules engineer and a cost/compliance researcher:

- Installable PWA (TypeScript + Preact, Dexie, Workbox, MapLibre) + Supabase in Frankfurt + GitHub → Cloudflare Pages + Open-Meteo weather fetched server-side + Web Push; Capacitor later. (The architect proposed Netlify; Cloudflare Pages was chosen because Netlify's free plan allows only about 20 deploys a month.)
- About 20 Postgres tables; spray/harvest/stock records append-only and tamper-evident; 16 rules, each threshold marked established or "agronomist to set"; unsigned rules show data but never decide or notify.
- Milestones M0–M5: about 3–5 months, 19–29 days of Bora's time, 36–54 Claude sessions (a freelancer estimate of 47–64 person-days for comparison).
- Cost: about €0 for Phase 1 on free tiers (plus an optional .gr domain); about $0–55/month for a 10-farm pilot.
- Compliance: EU electronic spray records (Reg. 2023/564; fully mandatory by 1 Jan 2027 at the latest), records kept ≥3 years, Greek agronomist-prescription rule, GDPR (EU hosting), app-store account deletion.

**Open before M0:** product name/domain; Bora creating accounts (email, GitHub, Supabase, Cloudflare); asking Open-Meteo whether his own farm counts as non-commercial use; collecting ΟΣΔΕ parcel IDs, product labels/registration numbers, soil and water tests, 3-year crop history, crate weights, and whether workers use their own phones.

---

## Timeline

| Date | Event |
|---|---|
| 17 Oct | Notebook photo → Κλούβες order app (Claude version), English default, running total, contact cards, offline PWA version |
| 16 Nov | Products added/merged (17 total); FieldWise idea; product vision; v1 mockup (PNG); three critiques; project notebook; v2 prototype built, tested, fixed, published |
| 17 Nov | Decisions (Bora + Claude; owner + workers); Phase-1 plan (tech spec, rules, costs/compliance); this developer pack |

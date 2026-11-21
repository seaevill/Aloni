# Bora's requests – complete checklist for the night of 2026-11-21 → 22

Source: Bora's two messages of 2026-11-21 (14:08 and 20:03) plus his 23:09 live check. This file is the **single source of truth for tonight**; it extends `docs/morning/night-plan-2026-11-21.md` (S1–S10) and replaces any conflicting ordering. Every row has a LIVE acceptance: a 375 px screenshot from https://aloni.ormanbora.workers.dev (Demo farm, Greek) saved in `docs/morning/2026-11-22/R<n>.png`, PASS/FAIL in the STATUS table. Bora's decisions: workers card = name, surname, phone (**no birth date** – Bora chose this on 2026-11-21 20:05); orders are entered in Aloni; Demo may carry fictional, clearly labelled data; nothing paid.

Global rule: **every number, chip, list row and card is tappable and opens a detail that explains its source**; missing data shows «άγνωστο» + the reason, never 0 or blank. Lists for elderly / non-tech farmers: picture + name + ONE chip; details behind a tap.

| R | Bora asked (his words, shortened) | Screen | PASS on the live screenshot |
|---|---|---|---|
| R1 | Tap Μαϊντανός / Ρόκα on Σήμερα → which parcels, crates today, season total and target | Σήμερα → crop sheet | Sheet lists parcels with στρ., crates today, season crates, target or «ορίστε στόχο» |
| R2 | Waiting-period icon as a fill ring with days and % | Σήμερα, crop page, spray detail | Ring with «4 ημ.» and «70 %»; unknown → no ring + reason chip |
| R3 | Tasks tab: tomorrow's notes, workers can add, I see them | «Εργασίες» | Σήμερα / Αύριο / Αργότερα; «＋ Σημείωση για αύριο»; worker items tagged «από εργάτη» |
| R4 | Weather widgets tappable, show values inside | Σήμερα + parcel | Weather sheet: hourly today + 5 days, wind+gust, rain, source line; Demo filled |
| R5 | «Χωράφια 5» → which 5; same for crops | Σήμερα tiles | Sheet with the 5 parcel rows / crop rows |
| R6 | «Κλούβες 7 ημ.» / 28 ημ. → which crate, crop, date, parcel | Σήμερα | Table crop · date · parcel · crates; held/unknown in a separate block, not summed |
| R7 | «Χωράφια χωρίς αναμονή σήμερα» → which | Σήμερα | Sheet listing those parcels |
| R8 | «Σήμερα έγιναν» → which jobs; each row says spray or harvest; spray = which product; harvest = store or dispatch | Σήμερα | Rows «Ψεκασμός · Αντίδια · Propamocarb» / «Συγκομιδή · Αντίδια · 12 κλούβες → Αποθήκη»; tap → full detail |
| R9 | Overdue / left from yesterday → which job, parcel, crop, related spray/harvest | Εργασίες «Καθυστερημένες» | Row: what · parcel · crop · «Καθυστερεί 2 ημ.»; tap → job detail + linked record |
| R10 | History: tap a spray → product info + simple guide or official link | Ιστορικό → spray → product | Product sheet (R16) + spray process (R11) |
| R11 | Tap the last spray → the process | Spray detail | Date/time, product, dose exactly as recorded, waiting ring, «Κοπή από …», re-entry end, link to product sheet; no dose advice |
| R12 | Harvest «Μαϊντανός 20 κλούβες» → which parcels; «Ρόκα 30» → past harvests split store / customer | Harvest detail | By parcel / worker / time + history of this crop with totals «Αποθήκη» vs «Απευθείας φόρτωση» (unknown → «άγνωστο – παλιά καταγραφή») |
| R13 | Crop list: small icons/pictures so elderly farmers choose fast; less text | Φυτά list | Crop illustration + name + one chip per row; ≥5 crops first viewport |
| R14 | Crop page: tip/info icon top-right → tips card; history, fun facts, strengths/weaknesses | Crop page | 56 px «Συμβουλές» (lightbulb) top-right → card: «Γενικές πληροφορίες – όχι σύσταση», history, 3 facts, growing tips, strengths/weaknesses/common problems (names only), sowing-month ring |
| R15 | «0,5 στρ.» → on the map, where in which parcel | Crop page → planting | Parcel sketch with the planting area highlighted (Demo sketch geometry) |
| R16 | Tap Difenoconazole → what it is for + how much in my stock | Product sheet (from History, Stock, spray) | Purpose as recorded on the label, active substance, PHI/REI/max apps, **stock left**, approval chip, official label link or reason; general info card «τι είναι / γιατί χρησιμοποιείται γενικά»; no dose advice |
| R17 | Parcels: same tap-for-detail; today's weather tappable; tap a planting (Μαϊντανός) → info card | Χωράφια / parcel detail | Combined sketch of all parcels; detail with weather sheet, planting rows → crop info card |
| R18 | Analyses: what is pH / EC dS/m / OM %, what rising/falling does, normal range for THIS crop | Parcel → analyses | ⓘ per term → plain card + «Για Σπανάκι: συνήθως pH … (πηγή)» with chip «πληροφοριακό, χωρίς υπογραφή γεωπόνου»; no colour zones, no decisions; no source → «δεν υπάρχει πηγή» |
| R19 | Stock: info icon next to products (Ουρία, Propamocarb: what, why used) | Αποθήκη | ⓘ on each product card → general info card (no dose), label purpose, link |
| R20 | Stock: total harvest in store, to plan tomorrow's dispatch | Αποθήκη top | «Συγκομιδή στην αποθήκη»: per crop picture + crates + age chip, oldest first, «Αύριο φεύγουν: N» |
| R21 | Worker reports store or direct dispatch; dispatch with receiver name + phone | Worker harvest flow | Two big tiles «Αποθήκη» / «Απευθείας φόρτωση»; dispatch → optional name + phone (owner-only view). (Saved locally/Demo tonight; server field = B1 after Bora applies 0036.) |
| R22 | Customers + orders screen: record customer, contact, daily orders | Άλλα → Πελάτες / Παραγγελίες | Customer card (name, phone, note; owner only); «Νέα παραγγελία» customer × crop × crates × day; feeds «Αύριο φεύγουν» and orders-vs-harvest |
| R23 | Workers: tap a name → card | Εργάτες | Card: name, surname, phone (owner only); no birth date |
| R24 | Worker buttons short but more attractive | Worker screen | Big tiles with crop picture + icon + short label; press feedback |
| R25 | Shared job board: I open a job, all workers see it in the app, a free worker takes it | Worker + Εργασίες | Open jobs list for workers, «Το αναλαμβάνω» (first wins), owner sees who took it (local/Demo tonight; server = B3 later) |
| R26 | **Weather data** – even if not 100 % real, show real-looking values so we see progress; nothing paid | Σήμερα, parcel, weather sheet | Demo: fictional weather for every day, labelled «δεδομένα επίδειξης». Real farm: free MET Norway path ready (RUNBOOK §14a), activation = one approval click by Bora in the morning; until then «δεν υπάρχουν ακόμη δεδομένα – ενεργοποίηση καιρού εκκρεμεί». |
| R27 | Spray record screen is great – keep it | Spray form | Unchanged behaviour; only shared polish |
| R28 | Weekly report is great – keep it | Εβδομαδιαία αναφορά | Unchanged |
| R29 | When I open a job, a notification lands on the workers' shared screen; they see it when they open the app | Worker screen + bell | New open job → badge on the workers' bell + banner «Νέα εργασία: …» on their home screen at next app open; owner's bell shows «Ανέλαβε ο …» when taken (in-app tonight; Web Push later) |
| R30 | OM %: which crop grows better at which OM % (and same idea for pH/EC) | Analyses ⓘ | Inside the R18 card: «Για <ύλο>: συνήθως OM … % (πηγή)» per crop of that parcel, same chip and source rules |

## Order for tonight (most visible first)
1. Clear blockers (≤30 min): Σήμερα KPI 0 vs 44 single source; #296/#298/#331 rebuilt on fresh branches and merged; #367 tab contrast; #366 Demo labels (~80 % signed + 1–2 deliberate locked examples, commented).
2. R13, R14, R17 (+ combined sketch), R15, R20, R16/R19, R8, R9, R11, R12, R18, R1, R2, R5–R7, R4/R26, R22, R23, R3, R21, R24, R25.
3. Wire Codex's content/components if on main (crop texts, product info, HarvestHeat, MonthRing, TipsCard); otherwise write minimal content yourself in app/src/content/** with sources.

## Safety (unchanged)
No "safe"; no diagnosis; no dosage/product advice (label data as recorded + official link only); real-farm numbers never invented; crop ranges = general literature with source + «πληροφοριακό, χωρίς υπογραφή γεωπόνου»; held/unknown never summed; Demo data only in Demo; personal data (customer/worker/receiver phone) owner-only and in the privacy notice; no tracking; no production writes; no new SQL merges tonight.

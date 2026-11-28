# Aloni: improving what exists, and what to add next (product research, 2026-11-28)

Question from Bora (2026-11-28): how can we improve the features and data we already have, and which extra features would make the farmer's work easier?

Written by the research sub-agent on 2026-11-28; saved to the repo by the main session (the sub-agent could not write files). Repo read at `main` fbc0e9d (2026-11-28); nothing in the repo was changed by the research. Web sources accessed **2026-11-28**, cited where used and listed in §9. Many were read through search-engine excerpts rather than full pages (§1). A fact that could not be confirmed is marked **[unverified]**. No price, threshold or legal date is stated without a source.

## 0. Executive summary

1. **Aloni already has a very large surface** (196 e2e specs, 70+ screens): parcels with maps and GPS walk, plantings with sub-blocks; spray form with label gates, harvest counter with destination, crate label with QR; orders (Κλούβες import + typed customer orders) and «Αύριο φεύγουν»; money ledger with credit and accountant CSV/PDF; fertiliser/irrigation log, water card, seed, crop pace, year-on-year, ΚΑΕΚ, analyses; recurring jobs, job board, tomorrow notes; register (machine CSV/JSON under Reg. 2023/564, Greek PDF, warnings file). The 2026-11-28 evaluation scores usability **5.5/10** not for missing features but because existing data is rarely **joined up into the next action of the day** (Σήμερα 4.2 screens long, harvest 7 taps). Most value below comes from **re-using data the app already holds**.
2. **The calendar sets the first priority.** Under Reg. (EU) 2023/564 as amended by 2025/2203, plant-protection records must be electronic and machine-readable for uses from **1 January 2027** ([EUR-Lex 2025/2203](https://eur-lex.europa.eu/eli/reg_impl/2025/2203/oj); [oenet.gr](https://www.oenet.gr/online/dnet/item/130308-proairetiki-i-tirisi-arxeion-se-ilektroniki-morfi-prin-apo-tin-proti-ianouariou-2027)). Aloni's register already writes that file; missing is a screen that brings **every incomplete record to zero** before New Year.
3. **Bora's morning routine is the biggest day-to-day win.** He tells workers every morning how many crates of each crop to cut (`docs/PROJECT-HISTORY.md`). Aloni has the orders (`orders/*`), the plantings free to cut (`summary/cutlist.ts`, `orders/available.ts`) and the harvest counter, but not **one cut list per worker** (feature #1).
4. **Sowing is the hardest planning problem for leafy greens, and Aloni holds the right data.** Extension guides give 1–3 week intervals that change with the season ([ATTRA/NCAT](https://www.ncat.org/publication/scheduling-vegetable-plantings-for-continuous-harvest/), [RHS](https://www.rhs.org.uk/vegetables/successional-sowing)), so book values must not be hard-coded (safety rules 1–3). Bora's **own** sowing and first-cut dates can answer «if I sow spinach this week, when did I cut it before?» — information only. Target dates: Καθαρά Δευτέρα **15 March 2027** ([officeholidays](https://www.officeholidays.com/holidays/greece/ash-monday)), Orthodox Easter **2 May 2027** ([alfavita](https://www.alfavita.gr/koinonia/513042_pasha-2027-giati-diaferei-i-imerominia-metaxy-orthodoxoy-kai-katholikoy)).
5. **Competitors.** Farmable ($399/farm/year) links QR bin labels **back to field and spray history** ([farmable.tech/price](https://farmable.tech/price/)). Tend's planner puts **field availability next to sales orders** ([Tend](https://www.tend.com/solutions/microgreens-management)). Aloni has both halves of each but not the link. It is ahead on offline-first, Greek-first units and safety gates. Avoid competitors' complaints: crashes/save errors, complex or expensive plans, no offline ([Capterra Agrivi](https://www.capterra.com/p/136084/Agrivi/reviews/); [marlvel.ai](https://marlvel.ai/api/llm/apps/productivity/farmable-farm-manager-app), low reliability).
6. **Greek smallholders.** In 2020, 7.2 % of Greek farm managers were under 40 ([Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php/Farmers_and_the_agricultural_labour_force_-_statistics)); limited digital literacy, bureaucracy, labour shortage ([CEUR](https://ceur-ws.org/Vol-3930/paper26.pdf); [Τα Νέα](https://www.tanea.gr/2026/06/02/greece/ksekina-i-ylopoiisi-tis-symfonias-elladas-aigyptoy-gia-5-000-ergates-gis/)). Farmers who stop using farm software name unfamiliarity (51 %) then cost (23 %) ([Purdue](https://ag.purdue.edu/commercialag/home/resource/2019/05/farmer-use-of-ag-data-software)). Fewer taps and screens count more than more features.
7. **Bora's workers use Hindi.** Text-heavy interfaces were unusable for first-time low-literacy users; graphics, voice, simple navigation help ([Medhi et al.](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ToCHI2711_Medhi.pdf); [VideoKheti](https://www.microsoft.com/en-us/research/?p=164234)). Supports a picture-first, number-first worker cut list.
8. **Ranked top 5:** (1) morning cut list from orders to each worker; (2) Μητρώο 2027: every incomplete record fixed in one tap; (3) sowing timer from his own sow-to-cut history with a target date; (4) lot trace from crate label to planting, sprays, PHI and customers; (5) customer statement image for WhatsApp. All five have phone-only first slices the team can build; deeper SQL steps wait for Bora.

**Not recommended now:** myDATA/invoice/delivery-note transmission, ΕΡΓΑΝΗ or εργόσημο filing (legal acts, accountant's channels); disease prediction and satellite NDVI; automatic sowing/spray suggestions while the engine has open P0/P1 items and no signed rules; paid weather or map tiers before the pilot.

## 1. Method and limits

- **Internal:** CLAUDE.md, TECH-SPEC, RULES («Do not automate»), FINANCE-AND-GROWTH-PLAN, COSTS-COMPLIANCE, PROJECT-HISTORY; `replica/recon.md`, `features.csv`; `docs/reviews/1-farmer.md`, `docs/reviews/external/2026-11-20-ux-research.md`; `docs/wiki/owner-preferences.md`, `docs/wiki/evaluation-2026-11-28.md`, `docs/reviews/team/2026-11-28-evaluation/SUMMARY.md`; `takimlar/aloni-gelistirme/durum.json` (53 `sirada`, 24 `biten`), `docs/BACKLOG.md`; header comments of ~40 modules under `app/src/`. The queue was checked for duplicates; overlaps are named (e.g. ev-25, ev-49).
- **External:** ~30 web searches in English and Greek, **mostly read as search excerpts**. eur-lex.europa.eu was refused by this session's network policy; EUR-Lex citations point to the official URL, content from excerpts and COSTS-COMPLIANCE.md (2026-11-17). Nitrate limits: only the predecessor regulation's values confirmed (§2.1).
- **Not verified:** a Greek national template/platform for the electronic spray record; whether farm workers fall under the ΕΡΓΑΝΗ digital work card; Megara-specific groundwater salinity; current Open-Meteo commercial prices.

## 2. Findings by theme

### 2.1 Legal and administrative obligations (Greece and EU)

| Topic | What the sources say | Meaning for Aloni | Source |
|---|---|---|---|
| Electronic spray record | Reg. 2023/564 applies from 1 Jan 2026; Reg. 2025/2203 lets member states not require electronic transfer for uses **before 1 Jan 2027**; records «without undue delay». | **From 1 Jan 2027 every spray must be in the electronic register.** `export/machine.ts` already writes the Annex fields and a warnings file; value now is **closing the gaps** (ΟΣΔΕ parcel id, EPPO, BBCH, registration number). | [EUR-Lex 2025/2203](https://eur-lex.europa.eu/eli/reg_impl/2025/2203/oj); [oenet.gr](https://www.oenet.gr/online/dnet/item/130308-proairetiki-i-tirisi-arxeion-se-ilektroniki-morfi-prin-apo-tin-proti-ianouariou-2027); [DAERA](https://www.daera-ni.gov.uk/news/grace-period-transition-mandatory-digital-record-keeping-plant-protection-products) |
| Retention | ≥3 years (Reg. 1107/2009 Art. 67). | Already a safety rule (append-only, ≥3 years). | [legislation.gov.uk](https://www.legislation.gov.uk/eur/2009/1107/article/67/data.htm) |
| Prescription (συνταγή) | Professional products only on an agronomist's prescription, per active substance, valid 1 month; shown at inspection. | Aloni stores the reference/photo; never replaces the prescription. | [ΥΠΑΑΤ FAQ](https://www.minagric.gr/images/stories/docs/agrotis/Georgika_Farmaka/elenxoi/FAQPrescription_051017.pdf) |
| ΟΣΔΕ | Since 2026 only via myAGRO (myAADE); 2026 deadline 16 Oct 2026 (Α.1161/2026). | Parcel id comes from myAGRO; `opekepe_code` and ΚΑΕΚ fields exist; a reminder Bora sets himself fits; no legal dates auto-filled. | [skai.gr](https://www.skai.gr/index%2Ephp/news/finance/osde-2026-meso-myagro-i-eniaia-aitisi-enisxysis); [Α.1161/2026](https://www.aade.gr/sites/default/files/2026-08/a1161-2026.pdf) |
| Eco-scheme Π1-31.6 | CAP 2023–27 pays for using a digital input-management app with an environmental plan; gaiasense certified by ΟΠΕΚΕΠΕ; farmers struggle without digital training. | Business case for **pilot growers**; needs certification, an agronomist and Bora. Research item, not build. | [agrotikianaptixi.gr](https://www.agrotikianaptixi.gr/wp-content/uploads/2024/03/ss_kap_2023-2027_eco_schemes_pylonas_i.pdf); [ypaithros.gr](https://www.ypaithros.gr/wp-content/uploads/2023/09/H-πρωτοποριακή-εφαρμογή-ευφυούς-γεωργίας-gaiasense-app-απόκτησε-επίσημη-πιστοποίηση-από-τον-ΟΠΕΚΕΠΕ-στο-πλαίσιο-των-Οικολογικών-Προγραμμάτων.pdf); [CEUR](https://ceur-ws.org/Vol-3930/paper26.pdf) |
| myDATA, digital delivery note | Phase A from 1/4/2025; Phase B mandatory from **12 Oct 2026**; farmers with gross income >€200,000 (tax year 2022) in scope; laiki uses a summary note. | Aloni must **not** issue or transmit documents; it can produce a per-customer, per-day crate list matching what the buyer/accountant issues. | [taxheaven](https://www.taxheaven.gr/news/74261/agrotes-pshfiako-deltio-apostolhs-kai-diabibash-mydata-nees-dieykriniseis-aade); [naftemporiki](https://www.naftemporiki.gr/finance/economy/2143359/aade-ti-ischyei-gia-tin-psifiaki-ekdosi-parastatikon-diakinisis-apothematon-agrotikon-proionton/) |
| 6 % VAT refund | 2025 applications 1 Apr – **15 Dec 2026**; system pulls invoices the farmer's **buyers transmitted to myDATA**; 120,565 applications in 2025. | A customer statement helps check each buyer's invoices are complete. Information only. | [AADE PDF](https://www.aade.gr/sites/default/files/2026-04/dt_01.04.2026_1.pdf) |
| Workers | ΕΡΓΑΝΗ ΙΙ digital work card extended by ΚΑΔ from 29 Jun 2026 (Υ.Α. 18047/2026; circular 25291/2026); e-ΕΦΚΑ εργόσημο ΟΓΑ live 24 Feb 2026. | Applicability to this farm **[unverified]** — ask the accountant. Aloni files nothing. A days-worked note is worker personal data (rule 5): Bora decides first. | [forin.gr](https://www.forin.gr/articles/article/91140/ua-18047-2026); [taxheaven](https://www.taxheaven.gr/circulars/55399/25291-23-09-2026); [oenet.gr](https://www.oenet.gr/τελευταία-νέα/εργασιακά/item/133135-eefka-se-paragogiki-leitourgia-to-iposistima-ergosimou-oga-sto-neo-ops); [e-ΕΦΚΑ manual](https://www.e-efka.gov.gr/sites/default/files/2026-02/OPSEFKA-ergosimo-ergaton-gis-manual-02022026.pdf) |
| Traceability | Reg. 178/2002 Art. 18: every operator incl. primary production names immediate supplier and customer ("one step back, one step forward"). | Aloni holds planting, sprays, lot code, destination; a lot trace sheet gives the Art. 18 answer. | [legislation.gov.uk](https://www.legislation.gov.uk/eur/2002/178/article/18); [EC guidance](https://food.ec.europa.eu/system/files/2016-10/gfl_req_guidance_rev_8_en.pdf); [UK guidance](https://www.gov.uk/government/publications/food-traceability-for-businesses/food-traceability-for-businesses) |
| Nitrate | Limits in Reg. 2023/915; predecessor 1258/2011: spinach 3,500 mg/kg, rucola 7,000 (1 Oct–31 Mar) / 6,000 (1 Apr–30 Sep). Whether 2023/915 kept them **[unverified]**. | Never in code; at most a source link next to a lab result Bora types; never predicts compliance. | [EUR-Lex 1258/2011](https://eur-lex.europa.eu/eli/reg/2011/1258/oj); [FSAI](https://www.fsai.ie/enforcement-and-legislation/legislation/food-legislation/contamination-of-foodstuff/nitrates) |

### 2.2 What Greek and EU smallholders struggle with

- **Age and digital skills.** 2023: 61 % of EU farm managers over 55, 10.7 % under 40; Greece 7.2 % under 40 in 2020 ([Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php/Farmers_and_the_agricultural_labour_force_-_statistics)). Ageing, limited digital literacy, fragmented land, poor advice, bureaucracy ([CEUR](https://ceur-ws.org/Vol-3930/paper26.pdf)); survey of 1,054 Greek crop farmers: gap between knowing and using technology ([preprint](https://www.preprints.org/manuscript/202610.0798), not peer-reviewed).
- **Labour.** Shortages persist; the Greece–Egypt agreement for 5,000 farm workers began in June 2026 ([Τα Νέα](https://www.tanea.gr/2026/06/02/greece/ksekina-i-ylopoiisi-tis-symfonias-elladas-aigyptoy-gia-5-000-ergates-gis/); [iefimerida](https://www.iefimerida.gr/ellada/symfonias-elladas-aigyptoy-gia-5000-ergates-gis)). Bora's workers speak Hindi (DECISIONS 2026-11-19): instructions short, numeric, picture-led.
- **Water.** Attica water emergency, new boreholes, Εύρυτος project ([The Media Line](https://themedialine.org/headlines/greece-declares-water-emergency-as-nationwide-supply-measures-accelerate); [parapolitika](https://www.parapolitika.gr/oikonomia/article/1634624/o-eurutos-dinei-nero-gia-30-hronia-to-shedio-kuvernisis-kai-eudap-gia-tin-adimetopisi-tis-leipsudrias/)); coastal over-pumping brings salt into groundwater, as in Halkidiki ([Protothema](https://en.protothema.gr/2024/07/21/sea-salt-has-been-devouring-the-freshwater-in-halkidiki/)). Megara data not found [unverified].
- **Software fatigue.** 51 % unfamiliarity, 23 % cost; 22 % of growers very satisfied (2018) ([Purdue](https://ag.purdue.edu/commercialag/home/resource/2019/05/farmer-use-of-ag-data-software); [Farm Progress](https://www.farmprogress.com/technology/why-is-software-such-a-pain-)). Aim: enter once, flow on (orders → cut list → harvest → label → statement).

### 2.3 Competing apps

| App | Offers | Complaints/limits | Lesson |
|---|---|---|---|
| Farmable | Pro $399/farm/yr; spray diary with label/PHI/REI warnings; **QR bin labels linked to field and spray history**; crop stage at spraying. | Crashes, save errors, expensive ([marlvel.ai](https://marlvel.ai/api/llm/apps/productivity/farmable-farm-manager-app), low reliability); Android 3.78★/293 ([chrome-stats](https://chrome-stats.com/d/tech.farmable.farmable)). | Add the trace from the existing label (#4); stay offline-first. |
| Tend | One-click successions; **planner puts field availability next to orders**; seed quantities; tasks from plan; offline sync. | Vendor pages only ([Tend](https://www.tend.com/solutions/microgreens-management), [planner](https://www.tend.com/feature/visual-crop-planner)). | Build only the information half: his own history, no automatic plan. |
| Agrivi | Farm management and finance. | Tax fit, not accounting, no offline, pricey ([Capterra](https://www.capterra.com/p/136084/Agrivi/reviews/)). | Keep the "not official books" ledger with accountant exports. |
| gaiasense (NEUROPUBLIC) | Subscription advice, >18,000 farmers, stations, eco-scheme certified. | Hardware/subscription-centred ([FAO](https://agritechobservatory.review.fao.org/en/gaiasense); [App Store](https://apps.apple.com/gr/app/gaiasense/id1546878452?l=en)). | Aloni's angle: records and the daily crate business. |
| fieldmargin | Maps, shared job lists. | 4.9★/23 ([Capterra](https://www.capterra.com/p/163565/fieldmargin/reviews/)). | Simplicity wins. |
| farmOS Field Kit | Open source offline PWA, to-do view of assigned logs. | Beta ([docs](https://v1.farmos.org/guide/app/)). | Confirms architecture and worker to-do view. |
| Cropwise | Separate apps for operations/finance/scouting. | Spread over many apps ([App Store](https://apps.apple.com/us/app/-/id919636306)). | Do not split Aloni. |
| LiteFarm | Free, open source. | Little evidence ([UBC](https://ubcfarm.ubc.ca/litefarm/)). | A free alternative pilots may know. |

### 2.4 Practical aids for leafy greens

- **Succession sowing:** ~2 weeks common for lettuce/spinach; RHS every 3 weeks early spring, up to weekly in warm moist weather ([ATTRA](https://www.ncat.org/publication/scheduling-vegetable-plantings-for-continuous-harvest/), [RHS](https://www.rhs.org.uk/vegetables/successional-sowing), [Johnny's](https://www.johnnyseeds.com/growers-library/methods-tools-supplies/succession-planting/succession-planting-interval-chart-vegetables.html)) — use his own records; book values only as linked, unsigned reading.
- **Heat:** germination of lettuce and most salad greens drops ~50 % above ~27 °C ([ATTRA](https://attra.ncat.org/?p=119981)) — information next to a planned sowing only.
- **Post-harvest:** spinach keeps ≤~2 weeks at 0 °C; respiration ~doubles 0→5 °C; shelf life ~halves per 10 °C ([UC Davis](https://postharvest.ucdavis.edu/node/8161); [NC State](https://content.ces.ncsu.edu/postharvest-engineering-1-introduction)). `StoreStock` shows age of the oldest crates.
- **Demand peaks:** before Καθαρά Δευτέρα ([powergame](https://www.powergame.gr/ellada/1307885/kathara-deftera-pou-ftanoun-oi-times-gia-to-sarakostiano-trapezi/)), Lent and Easter (farmer review). Next: 15 Mar 2027, 2 May 2027, computable from Easter; Bora picks dates.

### 2.5 Offline and low-literacy UX

- Text-free screens and voice for low-literacy users ([Medhi](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ToCHI2711_Medhi.pdf); [VideoKheti](https://www.microsoft.com/en-us/research/?p=164234)): worker screens lead with crop drawing, a big number and field name (illustrations exist).
- iOS storage: Home Screen apps exempt from the 7-day cap but evicted under low storage or disuse ([WebKit](https://webkit.org/?p=14403); [Apple forum](https://developer.apple.com/forums/thread/710157); [MDN](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) — a backup-age reminder is cheap insurance.

## 3. Existing building blocks (verified in code at fbc0e9d)

| Area | Module |
|---|---|
| Orders | `orders/klouves.ts`, `ui/Customers.tsx`, `orders/tomorrow.ts`, `orders/dispatch.ts` |
| What can be cut | `summary/cutlist.ts`, `orders/available.ts`, `spray/harvest.ts` |
| Harvest | `ui/HarvestForm.tsx`, `stock/destination.ts`, `ui/StoreStock.tsx` |
| Label | `summary/crate-label.ts` (lot code = first 8 chars of harvest id), `ui/CrateLabelSheet.tsx` |
| Sowing history | `ui/SowRing.tsx`, `summary/season-calendar.ts`, `ui/YearCompare.tsx`, `ui/CropPace.tsx`, `ui/SeedCard.tsx` |
| Register | `export/machine.ts`, `export/register-pdf.ts`, `ui/Register.tsx` |
| Money | `money/ledger.ts`, `ui/Money.tsx` |
| Water | `summary/water.ts`, `ui/WaterCard.tsx`, `fieldwork/fieldwork.ts`, `ui/Analyses.tsx` |
| Observations | `ui/ObservationForm.tsx`, `worker/jobs.ts` |
| Weather | `weather/strip.ts`, `ui/WeatherSheet.tsx` |
| Workers | `ui/WorkerApp.tsx`, job board (SQL 0038), `ui/TomorrowNotes.tsx` (SQL 0039), Hindi |

Missing: cut target per worker; sow-to-first-cut statistics; trace view from a lot; customer statement; draft of next week's orders; observations next to the forecast; EC trend from water tests; inputs shopping list; crate weight or waste.

## 4. Small improvements folded into §7

1. Harvest counter shows «παραγγελία 12 · κομμένες 7» when there is an order for that crop today (ar-1c).
2. «Ετικέτα» button right after saving a harvest.
3. Register fill-in codes link to the record to fix (F2).
4. Age of oldest stored crates on Σήμερα only past a day count Bora sets.
5. `YearCompare` and `SowRing` on one 12-month strip (F3).

## 5. Safety-rule screen

- **R1** no invented label data: nothing reads/writes dose, PHI, REI or max-apps; the trace shows stored signed values or «άγνωστο».
- **R2** suggests, never decides: cut list, draft orders and sowing timer are drafts Bora confirms; a draft order never counts in any sum.
- **R3** unsigned [SET] rules: no feature uses a threshold; raw values with source, no notifications.
- **R4** Demo isolation: every new store key follows the `isDemoKey` pattern (ev-7) with a Demo-leak test per slice.
- **R5** personal data: labour-days note (#13) and voice notes (#21) wait for Bora and an updated privacy notice; WhatsApp images only via the phone's share sheet.
- Worker screens never show customers, prices or orders (TECH-SPEC §6).

## 6. Ranked feature table

Value for Bora first, then pilots. Effort in one-PR slices (≤450 lines). "Team" = buildable under the 2026-11-28 delegation; "Bora" = needs SQL/`supabase/**`, money, an agronomist or his decision.

| # | Feature | Problem / frequency | Evidence | Exists | Smallest useful version | Data? | Risks | Needs | Slices | Value/effort |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Morning cut list to workers | Bora, every morning; error-prone (notebook totals 166 vs 174) | PROJECT-HISTORY; farmer review; Tend | orders, cutlist, available, harvest counter, TomorrowNotes | «Κοπή σήμερα»: ordered − cut, free plantings; Bora types crates per field; sent as note + share text | yes | held plantings never offered (QA P0-2); no customers for workers | team (3) + Bora/SQL (target column) | 4 | very high / M |
| 2 | Μητρώο 2027 readiness | once now + after each spray; 1 Jan 2027 | Reg. 2023/564 + 2025/2203 | machine.ts warnings, Register | count, list by record × field, one tap to fix (amending row) | yes | append-only; never auto-filled | team | 2 | very high / S |
| 3 | Sowing timer from own history | weekly in season | ATTRA, RHS, Johnny's, Tend | SowRing, SeasonCalendar, YearCompare, CropPace | days to first cut per crop × sowing month; backwards from target; <2 plantings = «λίγα δεδομένα» | yes | info only; SOW rule untouched | team | 3 | high / M |
| 4 | Lot trace sheet | inspection/complaint; pilots selling to shops | Art. 18; Farmable | lot code, harvests, sprays, destination | lot → planting, field, last-90-day sprays with PHI at cut, destination; print | yes | stored values only; owner-only | team | 2 | high / S–M |
| 5 | Customer statement image | weekly/monthly per buyer | FINANCE idea 7; VAT refund uses buyers' myDATA | ledger, Customers, `share/render.ts` | crates by day, price where known, payments, balance; image; «Δεν είναι τιμολόγιο» | yes | not an invoice; never auto-sent; not for workers | team | 2 | high / S |
| 6 | Next week's orders as draft | weekly | Κλούβες copies previous day; farmer review | Customers | copy last week as «πρόχειρο»; counts only after «Επιβεβαίωση» | yes | never commits volumes | team + one question | 1–2 | high / S |
| 7 | Dew/frost observations next to forecast | cold/wet mornings | farmer review; RULES "show both" | ObservationForm, weather strip | observation next to that night's stored Tmin, model, data age; CSV for agronomist | yes | no threshold/alert/"risk" | team | 2 | medium-high / S |
| 8 | Water: EC trend, m³/month | monthly | farmer review; Attica emergency | Analyses, fieldwork, ParcelYield | EC from his tests over time; m³/month/field | yes | no verdict colour | team | 2 | medium / S |
| 9 | Feast-day demand strip | before Lent/Easter | Καθαρά Δευτέρα peak | order history | computed + typed dates, last year's crates in prior 14 days | yes | display only | team | 1–2 | medium-high / S |
| 10 | Seeds to buy | before a sowing round | Tend seed lists | SeedCard, planned plantings, stock | seed for next 4 weeks − stock; no rate = «άγνωστο» | partly | never invents a rate | team | 1–2 | medium / S |
| 11 | Crate weight/waste sample | occasional | farmer review | TECH-SPEC fields | optional «ζύγισα μία κλούβα»; measured range on crop page | partly | no default weight | team + Bora/SQL if column missing | 2 | medium / S |
| 12 | Time from cut to cold room | daily in summer | UC Davis | store destination | «Στο ψυγείο» stamps a time | partly | does Bora have a cold room? | Bora | 1–2 | medium / S |
| 13 | Labour-days note | monthly | FINANCE idea 8; εργόσημο | done_by, actor_id | days with a record per worker/month, owner only | yes | rule 5 | Bora | 2 | medium / S |
| 14 | Backup-age reminder | Bora | WebKit storage | backup, `warnings.ts` | Σήμερα line when backup old and phone-only records exist | yes | — | team | 1 | medium / XS |
| 15 | Year-end pack | yearly | FINANCE idea 6 | exports | one ZIP for a date range | yes | formula guard stays | team | 2 | medium / S |
| 16 | Cost per crate (info) | seasonal | FINANCE idea 1 | ledger | costs ÷ crates, «ελλιπές» when incomplete | yes | no advice | team | 2 | medium / M |
| 17 | Delivery stop order | daily | dispatch.ts | dispatch | owner sets stop order once | yes | no addresses/tracking | team | 1 | low-medium / XS |
| 18 | Rule sign-off screen + engine wiring | unlocks alerts | TECH-SPEC §3; `notify/rules.ts` | rules-core | only after ev-28…37 | yes | rule 3 | Bora + agronomist | 3+ | high later / L |
| 19 | KML/GeoJSON parcel import (pilot) | once per farm | features.csv | ParcelMap | file import | n/a | myAGRO format [unverified] | team after a sample file | 2 | pilot medium / M |
| 20 | Eco-scheme 31.6 study (pilot) | business case | agrotikianaptixi; gaiasense | register, fertiliser log | research note only | n/a | legal/commercial | Bora | 0 | ? |
| 21 | Voice note on an observation | occasional | Medhi; VideoKheti | photo on observation | audio ≤30 s, no transcription | partly | privacy | Bora | 2 | low-medium / M |

## 7. Build plan for the top 10

Every slice: red test first, 375 px before/after image, glossary rule 5, Demo-leak test, no loosened test. Queue ids `ar-*` (titles in Turkish in `takimlar/aloni-gelistirme/durum.json`). Order: F2 (legal date), F1, F5, F6, F4, F3, F9, F7, F8, F10 — after the evaluation's P0/P1 items. Slices: ar-1a…1c (team) and ar-1d (SQL, Bora); ar-2a, 2b; ar-3a…3c; ar-4a, 4b; ar-5a, 5b; ar-6a; ar-7a, 7b; ar-8a, 8b; ar-9a; ar-10a.

## 8. Decisions only Bora can make

- Daily orders in Κλούβες or in Πελάτες (decides F6 and F1's source).
- Cold room? (#12)
- Labour-days note (#13) yes/no plus privacy-notice line.
- For his accountant: does the ΕΡΓΑΝΗ card apply; do buyers issue purchase invoices to myDATA (F5 wording).
- Pilot: is eco-scheme Π1-31.6 worth exploring?
- Agronomist: the [SET] values in ev-29, ev-30, ev-36, ev-37, then the sign-off screen (#18).

## 9. Sources (all accessed 2026-11-28)

**Legal and administrative:** https://eur-lex.europa.eu/eli/reg_impl/2025/2203/oj · https://eur-lex.europa.eu/eli/reg_impl/2023/564/oj · https://www.oenet.gr/online/dnet/item/130308-proairetiki-i-tirisi-arxeion-se-ilektroniki-morfi-prin-apo-tin-proti-ianouariou-2027 · https://www.daera-ni.gov.uk/news/grace-period-transition-mandatory-digital-record-keeping-plant-protection-products · https://www.legislation.gov.uk/eur/2009/1107/article/67/data.htm · https://www.minagric.gr/images/stories/docs/agrotis/Georgika_Farmaka/elenxoi/FAQPrescription_051017.pdf · https://www.skai.gr/index%2Ephp/news/finance/osde-2026-meso-myagro-i-eniaia-aitisi-enisxysis · https://www.aade.gr/sites/default/files/2026-08/a1161-2026.pdf · https://www.agrotikianaptixi.gr/wp-content/uploads/2024/03/ss_kap_2023-2027_eco_schemes_pylonas_i.pdf · https://www.ypaithros.gr/wp-content/uploads/2023/09/H-πρωτοποριακή-εφαρμογή-ευφυούς-γεωργίας-gaiasense-app-απόκτησε-επίσημη-πιστοποίηση-από-τον-ΟΠΕΚΕΠΕ-στο-πλαίσιο-των-Οικολογικών-Προγραμμάτων.pdf · https://www.taxheaven.gr/news/74261/agrotes-pshfiako-deltio-apostolhs-kai-diabibash-mydata-nees-dieykriniseis-aade · https://www.naftemporiki.gr/finance/economy/2143359/aade-ti-ischyei-gia-tin-psifiaki-ekdosi-parastatikon-diakinisis-apothematon-agrotikon-proionton/ · https://www.aade.gr/sites/default/files/2026-04/dt_01.04.2026_1.pdf · https://www.forin.gr/articles/article/91140/ua-18047-2026 · https://www.taxheaven.gr/circulars/55399/25291-23-09-2026 · https://www.oenet.gr/τελευταία-νέα/εργασιακά/item/133135-eefka-se-paragogiki-leitourgia-to-iposistima-ergosimou-oga-sto-neo-ops · https://www.e-efka.gov.gr/sites/default/files/2026-02/OPSEFKA-ergosimo-ergaton-gis-manual-02022026.pdf · https://www.legislation.gov.uk/eur/2002/178/article/18 · https://food.ec.europa.eu/system/files/2016-10/gfl_req_guidance_rev_8_en.pdf · https://www.gov.uk/government/publications/food-traceability-for-businesses/food-traceability-for-businesses · https://eur-lex.europa.eu/eli/reg/2011/1258/oj · https://www.fsai.ie/enforcement-and-legislation/legislation/food-legislation/contamination-of-foodstuff/nitrates

**Smallholders, labour, water:** https://ec.europa.eu/eurostat/statistics-explained/index.php/Farmers_and_the_agricultural_labour_force_-_statistics · https://ceur-ws.org/Vol-3930/paper26.pdf · https://www.preprints.org/manuscript/202610.0798 · https://www.tanea.gr/2026/06/02/greece/ksekina-i-ylopoiisi-tis-symfonias-elladas-aigyptoy-gia-5-000-ergates-gis/ · https://www.iefimerida.gr/ellada/symfonias-elladas-aigyptoy-gia-5000-ergates-gis · https://ag.purdue.edu/commercialag/home/resource/2019/05/farmer-use-of-ag-data-software · https://www.farmprogress.com/technology/why-is-software-such-a-pain- · https://themedialine.org/headlines/greece-declares-water-emergency-as-nationwide-supply-measures-accelerate · https://www.parapolitika.gr/oikonomia/article/1634624/o-eurutos-dinei-nero-gia-30-hronia-to-shedio-kuvernisis-kai-eudap-gia-tin-adimetopisi-tis-leipsudrias/ · https://en.protothema.gr/2024/07/21/sea-salt-has-been-devouring-the-freshwater-in-halkidiki/

**Competitors:** https://farmable.tech/price/ · https://apps.apple.com/us/app/farmable-farm-manager-app/id1456760199 · https://chrome-stats.com/d/tech.farmable.farmable · https://marlvel.ai/api/llm/apps/productivity/farmable-farm-manager-app (low reliability) · https://www.tend.com/solutions/microgreens-management · https://www.tend.com/feature/visual-crop-planner · https://www.capterra.com/p/136084/Agrivi/reviews/ · https://www.capterra.com/p/163565/fieldmargin/reviews/ · https://agritechobservatory.review.fao.org/en/gaiasense · https://apps.apple.com/gr/app/gaiasense/id1546878452?l=en · https://v1.farmos.org/guide/app/ · https://apps.apple.com/us/app/-/id919636306 · https://ubcfarm.ubc.ca/litefarm/

**Leafy greens practice:** https://www.ncat.org/publication/scheduling-vegetable-plantings-for-continuous-harvest/ · https://attra.ncat.org/?p=119981 · https://www.rhs.org.uk/vegetables/successional-sowing · https://www.johnnyseeds.com/growers-library/methods-tools-supplies/succession-planting/succession-planting-interval-chart-vegetables.html · https://postharvest.ucdavis.edu/node/8161 · https://content.ces.ncsu.edu/postharvest-engineering-1-introduction · https://www.powergame.gr/ellada/1307885/kathara-deftera-pou-ftanoun-oi-times-gia-to-sarakostiano-trapezi/ · https://www.officeholidays.com/holidays/greece/ash-monday · https://www.alfavita.gr/koinonia/513042_pasha-2027-giati-diaferei-i-imerominia-metaxy-orthodoxoy-kai-katholikoy

**UX and offline:** https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ToCHI2711_Medhi.pdf · https://www.microsoft.com/en-us/research/?p=164234 · https://webkit.org/?p=14403 · https://developer.apple.com/forums/thread/710157 · https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria · https://open-meteo.com/en/terms · https://open-meteo.com/en/pricing

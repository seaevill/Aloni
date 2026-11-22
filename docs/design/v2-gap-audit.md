# v2 visual gap audit

Baseline: Aloni `bcb4991` and the checked-in [v2 prototype](../../reference/prototype/index.html), its [sample data](../../reference/prototype/data.json) and [reference captures](../../reference/prototype/screenshots/). The PNGs show the top 950 CSS pixels of two 375 px mobile viewports side by side. I loaded the Greek Demo farm locally, fixed the application clock to 16 November 2026 at 12:00 Athens time, and blocked requests outside the two localhost servers. Differences below the fold were checked against the rendered headings and component source. Scores describe layout, hierarchy and content parity, with 10 meaning close parity within Theme B and the safety boundaries. Scores are inapplicable to screens absent from v2. Colour, contrast, touch targets and 320 px overflow still need explicit checks on each screen PR.

## Σήμερα · 4/10 · [PNG](compare/v2-audit/today.png)

1. [UI] The current first viewport gives the cutting list and work queue priority. v2 starts with a dense weather card, a two-column KPI grid and a wide cutting count, followed by alerts and next actions.
2. [DATA] The weather card needs winds, gusts, humidity, leaf wetness and recent rain with source and freshness. Preserve blanks when inputs are unavailable. The 7/28-day numbers in Aloni are logged crates, while v2 shows an estimate.
3. [RULE: supplyTable] Model forward crates independently of logged cuts and subtract logged amounts from remaining estimates. [RULE: runRules] Feed the alert and next-action sections from eligible outputs, with signed thresholds required for decisions.
4. [SAFETY] Use the current documented-wait distinction in the count and keep the held/unknown note. A missing record is insufficient for the v2 “safe” checkmark. Do not repeat the prototype's spray options or inferred disease diagnosis.

## Καλλιέργειες list · 5/10 · [PNG](compare/v2-audit/crops.png)

1. [UI] Both use crop cards. v2 puts the planting count, estimated seven-day volume, risk tags and detail affordance in each card. Aloni shows individual planting rows and scientific names.
2. [DATA] Add source-backed planting counts and crop-level volume. Clarify zero versus unavailable.
3. [RULE: supplyTable] Aggregate eligible plantings by crop. [RULE: frostNights] Add conditions chips using available weather. Disease chips describe conditions only.

## Καλλιέργειες detail · 3/10 · [PNG](compare/v2-audit/crop-detail.png)

1. [UI] v2 has a crop identity panel, an action area, expandable planting cards, crop risks and a four-week demand comparison. The app has planting records and a last-spray section.
2. [DATA] Bring in growth stage, harvest dates and crates, parcel context, 14 days of weather, irrigation and recorded rotation evidence. Render unknown values where the source is incomplete.
3. [RULE: runRules] Explain PHI holds and rotation history per planting. Missing label scope, application limits or eligibility stay unknown.
4. [SAFETY] The v2 action card proposes a product and dose and shows a positive safety badge. Keep the app's recorded-wait language and omit a product or dose choice.

## Χωράφια list · 5/10 · [PNG](compare/v2-audit/parcels.png)

1. [UI] The list shares the card pattern. v2 makes total area, locality, crop summary and risk chips easier to scan. Add an overview of distinct labelled parcel shapes, an explicit text status and a tap target for each parcel.
2. [DATA] Keep geographic boundaries separate from the v2 fictional sketch type and rotation. A sketch has no surveyed coordinates. Draw real polygons only from recorded boundaries.

## Χωράφια detail · 4/10 · [PNG](compare/v2-audit/parcel-detail.png)

1. [UI] v2 leads with a large sketch and compact facts, then crop, weather, soil and irrigation sections. Aloni leads with facts and a missing-sketch note, and already has a chronological record stream.
2. [DATA] Use `sketch` for the fictional Demo depiction and validated `boundary` for recorded geometry. Add the available soil and irrigation inputs and extend the weather strip to 14 days.
3. [RULE: runRules] A parcel conditions summary should use observed/forecast inputs and exact planting holds. The prototype's suggested operations require the rule approvals and safety gates.

## Produce and orders · 3/10 · [PNG](compare/v2-audit/demand.png)

1. [UI] v2 has a four-week crop-by-week forecast and per-crop comparisons. Aloni has a Κλούβες import entry and current-week cards.
2. [DATA] Use v2 weekly orders in Demo. Keep real imported orders farm-scoped. No inferred multiplier from text notes or constructed client orders.
3. [RULE: supplyTable] Report orders, forecast and short/extra text for each week. [SAFETY] Exclude held or unknown planting supply until eligibility is established. A comparison alone cannot commit order volumes or authorize sowing.

## Αποθήκη · 6/10 · [PNG](compare/v2-audit/stock.png)

1. [UI] Both have product filters and cards. v2 surfaces active substance, group, expiry, registered crops and usage or rotation at the product level. The app separates stock and label details into explicit rows.
2. [RULE: stockHits] Compute low and expiring information only with the relevant approved thresholds. [RULE: runRules] Keep exact scope when showing rotation observations.
3. [SAFETY] Keep registration, unsigned and missing-data warnings. The prototype estimates application needs from illustrative label numbers; no default or rounded label values.

## Άλλα · 6/10 · [PNG](compare/v2-audit/more.png)

1. [UI] Compact icon-led rows in v2 put register, forecast and orders first. Aloni adds worker and farm actions and includes inline settings.
2. [DATA] Preserve app-only links and actual farm scope. Login and sync changes belong to Claude Code.

## Spray form · score inapplicable · [PNG](compare/v2-audit/spray-form.png)

1. [UI] v2 has completed spray cards and recommendation sheets, without an entry form. Use the app's current record form as the baseline.
2. [SAFETY] Preserve explicit product, planting and dose input, label-copy consent, waiting periods, validation and the distinction between logging and recommending a spray.

## Μητρώο · 5/10 · [PNG](compare/v2-audit/register.png)

1. [UI] v2 starts with filters and a short card timeline. Aloni puts disclosure and several export actions above the records; preserve the legal disclosures, then improve hierarchy.
2. [DATA] Keep actual timestamps, fields, product, dose and units visible. Export implementation changes belong to Claude Code.
3. [SAFETY] Keep the Demo banner and any missing-data warnings. Do not infer PHI from the current product label or date alone.

## Worker · score inapplicable · [PNG](compare/v2-audit/worker.png)

1. [UI] v2 has no worker route. Preserve the jobs, observations, harvest and language entry points while applying Theme B consistently.
2. [SAFETY] Keep the worker's product and dose read-only, the exact re-entry hold and the bilingual Hindi safety messages.

Bora onayı bekliyor

## Live parity follow-up · 2026-11-22

Greek Demo in WebKit at 375 × 812, with a fresh context, service workers blocked and a fixed 16 November Athens morning for the comparison. Each image shows the local v2 reference on the left and the live app on the right. Scores assess visible structure and information parity against v2. Product constraints and Bora's simpler list design take precedence over visual imitation.

| Screen | Likeness | Remaining gaps and next correction |
|---|---:|---|
| [Crop list](compare/sprint3/p8/crops.png) | 6/10 | **1 [UI]** Use the approved Φυτά heading and sage header. **2 [UI]** Keep the app's illustration and single chip, with secondary facts behind the row. **3 [SAFETY]** Retain meaningful unknown and waiting statuses in place of prototype decision chips. |
| [Crop detail](compare/sprint3/p8/crop-detail.png) | 5/10 | **1 [UI]** Surface source-linked planting facts, a visible tips affordance and the month ring. **2 [DATA]** Add recorded order and eligible harvest data where available. **3 [SAFETY]** Omit the prototype's product, dose and proposed action. |
| [Parcel list](compare/sprint3/p8/parcels.png) | 6/10 | **1 [UI]** Make the combined sketch and name list work as one selection flow. **2 [DATA]** Only place shapes relative to one another when their polygon coordinates support it. The overview adds navigation beyond v2. |
| [Parcel detail](compare/sprint3/p8/parcel-detail.png) | 6/10 | **1 [UI]** Make weather and crop rows open their source. See #426. **2 [DATA]** Distinguish indicative strips from recorded planting boundaries. Confirm the contract in #430 before recording or rendering those boundaries. **3 [DATA]** Surface analysis history and source-backed weather values where stored. |
| [Stock](compare/sprint3/p8/stock.png) | 6/10 | **1 [UI]** Keep the added harvest section, then simplify product rows around name, status and details. **2 [UI]** Show product information via its dedicated action (#422). **3 [DATA]** Keep missing label facts explicit and take dispatch totals from the current order source under #423. |
| [Register](compare/sprint3/p8/register.png) | 5/10 | **1 [UI]** Align the grouping with the chronological history while retaining the print/export entry points. **2 [SAFETY]** Keep the Demo and draft notices and the recorded label and dose values. |
| [More](compare/sprint3/p8/more.png) | 6/10 | **1 [UI]** Group daily work links ahead of settings and backup without adding a second route. **2 [SAFETY]** Keep customer and worker details in owner-only screens. |
| [Orders and supply](compare/sprint3/p8/demand.png) | 4/10 | **1 [UI]** Expose a per-crop four-week comparison next to dispatch. **2 [DATA]** Tie the figures to confirmed orders and forecast records, with held/unknown excluded. #423 modifies the dispatch path. **3 [SAFETY]** Keep unsigned results informational. |

This PR records the audit and captures. P3 and P5 carry the first corrections. P2 source notes overlap #395, P4 depends on the pending month-ring component in #387, and P6 stock changes overlap #423.

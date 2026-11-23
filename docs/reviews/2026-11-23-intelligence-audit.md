# Agricultural intelligence audit — 2026-11-23

Scope: what the stored records can already answer, what was added in PRs #504–#506, and the smallest safe extension for the rest. Nothing here touches production; SQL PR #500 was read, not changed, not merged.

## 1. What already existed (do not duplicate)
| Capability | Where | Note |
|---|---|---|
| Harvest records (crates, time, planting, destination store/dispatch) | `job_harvest`, `spray/harvest.ts` | deleted = `deleted_at`; there is **no amend chain for harvests** (only sprays have `amends_id`) |
| Parcel timeline: sowing, sprays, harvests, cut/clean | `summary/timeline.ts` | extended in #505 |
| Fertilise / irrigate records (m³, minutes, N form) | `fieldwork/fieldwork.ts` | phone-local (`field_work:<farm>`), server table arrives with 0042 (#500, not applied) |
| Own yield per crop | `summary/crop-stats.ts` | per crop, per planting area — not per parcel |
| Season calendar, year compare | `summary/season-calendar.ts`, `year-compare.ts` | from recorded months |
| Store stock of cut crates (store − loaded out; unknown destination apart) | `stock/store-stock.ts` | the only *verified* crate quantity there is |
| Tomorrow's orders vs crates cut today | `orders/tomorrow.ts` | held/unknown plantings never counted |
| Observations (parcel, kind, note, photo, «reviewed» flag) | `worker/jobs.ts`, `summary/observations.ts` | no expert-review status, no follow-up, no outcome |
| Weekly water need from ET0×Kc (owner Kc) | `summary/water.ts` | information only |

## 2. Added in this sprint
* **#504 Parcel productivity**: crates ÷ parcel area from non-deleted harvests of the parcel's live plantings, exact whole-number division (cut, never rounded); unknown with a reason for: no harvest, no/zero area, any unreadable crate number. Recorded irrigation m³ and m³/στρ.; unknown if any irrigation record has only minutes. Fixture: 0,8 στρ. + 30 + 20 crates = **62,5 crates/στρ.**; 3,5 m³ on 0,5 στρ. = **7 m³/στρ.**
* **#505 Timeline**: fertilise, irrigate, observation events join sowing / spray / harvest / cut. Only stored records; other parcels and deleted observations excluded.
* **#506 (this PR) Unmet-demand RESEARCH PROTOTYPE** `orders/unmet-demand.ts` — tested, **not wired to a screen, not a feature**. It is a calculation only: it never reserves stock, never confirms an order, never tells a customer anything. «Confirmed order» has no meaning in the Klouves data yet (see §4).

## 3. Finance (PR #484 / #485) — can a cost be tied to a parcel, crop, season, operation?
`MoneyEntry` = `{ id, day, dir, category, cents, crop?, note, amends?, void?, at }`, kept on the phone (`money:<farm>`), append-only via `amends`/`void`.
* **Crop**: yes, optional (`crop`).
* **Season**: derivable from `day` (no season entity; a season is a date range the owner must define).
* **Operation**: only the coarse `category` (seed, fertiliser, ppp, labour, water …). No link to a spray/harvest/job row.
* **Parcel**: **no**.
Consequence: a per-parcel or per-crate cost cannot be computed today and **no profit figure may be shown** (costs without a parcel/crop are unallocated). Income `sale` rows have `crop` but no customer or crate quantity.
Smallest safe extension (not implemented; belongs to the F-series owners, needs Bora's yes): add optional `parcel?: string` (and later `ref?: { kind: 'job'|'harvest'; id }`) to `MoneyEntry`, set at entry or by an amending row (the existing append-only rule). Then report per parcel only **allocated** costs and always print «Μη κατανεμημένα: X €» next to it; profit only when 0 unallocated costs exist in the period. Amounts stay integer cents. No second ledger.

## 4. Demand → harvest
Facts: Klouves orders carry crate counts per product per client per day, mapped to crop slugs (`cratesByCrop`); there is **no «confirmed» flag** in the Klouves data — an order is only an order. There is **no yield estimate**, so growing plantings cannot be turned into crates. The only verified quantity is the store stock.
Calculation implemented as prototype: `unmet = max(ordered − max(store − loaded, 0), 0)` per crop. Not counted: records without destination (shown as «unverified»), unreadable numbers (flagged), dispatched crates, plantings still growing or held by a waiting period. Negative store balance is flagged, not netted.
Needed before production: a «confirmed» marker from Klouves (or an owner confirmation row), a decision where it is shown (the «Αύριο φεύγουν» board already shows ordered vs cut today), and a Bora sign-off. No automatic commitments exist or are proposed.

## 5. Agronomist workflow
Today: observation → parcel → kind (dew / frost / disease / pest / other) → note → optional photo → owner «seen». Nothing diagnoses.
Smallest safe extension (proposal, not built): a phone-local `obs_review:<farm>` map `observationId → { status: 'open' | 'sent' | 'answered', expertNote?: string (typed by Bora), followUpJobId?: string, outcome?: string (typed) }`. Statuses are set by Bora only; the app never writes a product, dose, PHI or REI into it; a follow-up task is an ordinary job created through the existing job form (the owner picks the label use). Server sync would follow the 0042 pattern (owner-only table + tombstone trigger) in a separate SQL PR.

## 6. Water
Implemented: totals and m³/στρ. from irrigation records (see #504). Not done and not advised: irrigation rates. A future FAO-56 calculation needs documented inputs (ET0 source + date, crop-stage Kc with source, effective rain rule, soil water capacity/ root depth, irrigation efficiency), stored provenance next to every result and an agronomist's signed approval before it may drive any notification (CLAUDE.md rule 3).

## 7. Archive semantics, scope, water (decisions after the 2026-11-23 release review)
* **Archived plantings count.** In the data model «archive» is the soft-delete flag `plantings.deleted_at` (undoable). It hides the planting from lists; it does not make a harvest that happened untrue. Harvest rows of an archived planting therefore stay in the parcel's cumulative yield, are tagged «αρχειοθετημένη φυτεία», and are summed apart («Περιλαμβάνει N κλούβες από αρχειοθετημένες φυτείες»). A **deleted harvest row** (`job_harvest.deleted_at`) never counts. Limitation: the flag cannot tell «finished season» from «entered by mistake», so a planting archived because it was a typing error would still contribute; the owner sees the tag and can delete the harvest rows themselves.
* **Scope is cumulative and says so**: «Σύνολο όλων των καταγραφών: όλες οι καλλιέργειες και όλες οι εποχές». The per-crop split divides each crop's crates by the PARCEL's area (not the planting's). There is no season entity, so no season-specific yield exists; it is not simulated.
* **The timeline reads the same records**: a unit test proves every harvest event is one productivity source (same ids, same total), with an archived planting included and deleted / other-parcel harvests in neither.
* **Water is «recorded», never «total»**: the card says «Καταγεγραμμένη άρδευση» and «δεν είναι η συνολική κατανάλωση νερού». The app cannot know a watering was never typed in; one record with only minutes makes the per-στρέμμα number unknown.
* **Phone-local warning stays**: fertilise/irrigate records live only on the phone until SQL 0042 is applied through the approved workflow and the sync is written; the card prints this next to the water numbers.

## 8. Unsupported / open
* Harvests have no amendment chain: a wrong crate count can only be deleted and re-entered.
* Phone-local records (fertilise/irrigate) are lost with the phone until 0042 is applied and the sync is written.
* Productivity sums every recorded harvest of the parcel (all seasons, all crops): a season filter needs a season definition.

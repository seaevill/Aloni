# Golden rule fixtures (Demo farm only)

These files turn the prototype's 10 alerts and 7 recommendations (`reference/prototype/data.json`) into machine-readable test cases for the rules engine. They also cover the QA-REPORT lessons as negative cases. One JSON file holds one case. Built 2026-11-17, before M3. The test `app/tests/unit/golden.test.ts` checks the shape of every case and RUNS the ones the engine has code for (9 of 27 on 2026-11-19; the rest are skipped and counted in docs/STATUS.md); see `docs/milestones/golden-fixtures.md`.

**All data is fictional Demo-farm data** (CLAUDE.md safety rule 4). Nothing here may be imported into Bora's real farm. Label values come from the prototype and are illustrative. The `synthetic_inputs` blocks hold TEST-ONLY values; they must never be used as label data.

## Cases (27)

| Type | Files |
|---|---|
| golden (17, one per prototype item) | `A01`–`A10`, `R01`–`R07` |
| derived (1) | `REI-after-r01-spray`: re-entry after the R01 spray |
| negative (9) | `NEG-P0-1-dose-never-rounded`, `NEG-P0-2-phi-lot-not-supply`, `NEG-P0-3-sow-not-on-flagged-parcels`, `NEG-unsigned-rule-info-only`, `NEG-PHI-no-label-row-blocks`, `NEG-PHI-no-end-time-blocks`, `NEG-REG-exclude-unregistered-beds`, `NEG-ROT-unknown-group`, `NEG-N-shared-valve` |

18 cases need `synthetic_inputs`: hourly weather, sun times, cloud cover, topo class, covers, valve map, planned or draft jobs, job times, worker tasks, or label target/max_apps/min_interval.

## Schema (`schema_version: 1`)

| Field | Meaning |
|---|---|
| `id` | Same as the file name. |
| `case_type` | `golden`, `derived` or `negative`. |
| `source_case` / `qa_refs` | Prototype alert/rec id; QA-REPORT ids (`P0-1` …). |
| `rule_id` | The rule under test, using RULES.md ids. `related_rules` lists the arbiter and upstream rules the case touches. |
| `farm` | Always `"demo"`. |
| `as_of` | The snapshot instant. The engine gets this; it never reads a clock. |
| `rule_state` | `status`: `signed_for_test` or `unsigned`. `params`: each `{value, basis}`. The basis says where the number comes from (`v2 placeholder [SET]`, `EST`, `test-only [SET]`). These are **not** approved thresholds. They let the test run the deciding path. Real values come from the agronomist. |
| `inputs` | Only the facts the rule needs, copied from `data.json`. |
| `synthetic_inputs` | `null`, or `{_synthetic: true, why, …}`. Facts the prototype lacks, constructed consistently with `docs/proto/DATA-NOTES.md`. |
| `expected` | See below. |
| `source_text` | The original prototype title/body/action/window/why-rule, or the QA text. |
| `notes` | Deviations from the prototype and why. |

### `expected`

- `mode`: `decide` or `info_only`.
- `kind`: `alert`, `recommendation`, `block`, `warning`, `option`, `flag`, `check`, `suitability` or `info`.
- `category`: a short code such as `frost_conditions`, `spray_window`, `phi_hold` or `supply_gap`.
- `severity` and `confidence`: `high`, `medium` or `low`. `null` or absent means not asserted.
- `targets`: `parcel_ids`, `planting_ids`, `product_ids` and `crop_ids`, plus `*_match`: `exact` (the default) or `include`.
- `window`: `{start, end}` as ISO dates or instants. A missing key is not asserted.
- `values`: exact computed values. Doses and quantities are decimal strings. Crate counts allow `tolerance.crates`.
- `also`: other outputs that must also appear (partial patterns).
- `vetoes`: entries expected in the output's `inputs.vetoed_by` (TECH-SPEC §3 arbiter).
- `must_not`: `{id, match, why}`. **No** output may match the `match` pattern.

### Output view and pattern matching

The harness flattens each engine output to `{rule_id, kind, category, severity, confidence, notify, parcel_ids[], planting_ids[], product_ids[], crop_ids[], window{start,end}, values{}}`. Patterns in `also` and `must_not` are partial and deep:

- A scalar pattern against an array field means "contains".
- An array pattern is matched by position, and `{}` is a wildcard.
- Operators: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$exists`.
- Times are compared as instants.

## Conventions

- **Time:** Europe/Athens, written as `+02:00`. `as_of` is `2026-11-16T06:40:00+02:00` unless the case says otherwise.
- **Daily weather:** the row for date D gives `tmin` and `leafwet_h` for the night that ends on the morning of D (QA P2-5). `leafwet_h` is estimated from RH ≥ 90 %.
- **Decimals:** doses, quantities and areas used in dose maths are strings (`"0.025"`). They are never rounded. Greek display uses a comma (`"0,025"`).
- **Units:** the prototype's `L/στρ` and `kg/στρ` are kept and not converted. M1 decision 3 allows only ml/g units, so the M3 harness must build test `SignedLabelUse` values directly.
- **Label uses:** follow M1 decision 3 (`dose_kind: "single"`, so min = max). Fields the prototype lacks (`target`, `max_apps`, `min_interval_days`, `rainfast_h`) are `null` unless a case's `synthetic_inputs.label_use_extras` sets them for the test.
- **Spray times** come from the job notes (`time_source`). PHI and REI are counted from the spray **time**, not from midnight. REI is counted from `ended_at` (test convention, see the REI case).

## Synthetic hourly weather

Pachi (P3, 13–20 Nov), Κάτω Κάμπος (P1, 17–22 Nov) and Γεράνεια (P4, 20–22 Nov) were built by a script so that:

- daily tmin/tmax, the daily max gust and rain totals stay as in `data.json`;
- the hours with RH ≥ 90 % per night equal `leafwet_h`;
- mornings warm slowly after a clear night.

The script checked these, and also checked the R01 window (Wed 18 11:00–15:00, the first 3 h run), the closed front days and the thaw times (Wed 09:00, Thu 10:00 on P1). Delta-T uses the Stull wet-bulb formula. Daily mean wind is only approximate.

## Main deviations from the prototype (RULES.md wins)

- **Frost (A01, R05):** all nights 16→17, 17→18 and 18→19 and parcels P1, P2 and P5. Confidence is low.
- **R01:** lists the options PR01 and PR03 and chooses none. PR04 is vetoed by ROT.
- **A05:** threshold max(10 %, 3); logged cuts are subtracted.
- **R04:** 405 crates, not 450.
- **R03:** no app dose. The allowed days are 16–18 Nov.
- **A04:** severity is high.

## Adding a case

Copy a similar file. Keep `inputs` minimal. Put anything not in `data.json` under `synthetic_inputs` with a `why`. Add at least one `must_not`. Validate with `python3 -m json.tool`.

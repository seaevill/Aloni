# Golden fixtures: what to wire up in M3 (2026-11-17)

`packages/rules-core/fixtures/golden/` holds 26 JSON cases: the 17 prototype alerts and recommendations, 1 derived REI case and 8 QA negatives. The schema is in that folder's `README.md`. Nothing reads them yet. These are new files only; no config was touched.

## Wire-up (first M3 PR)

1. **Loader and types.** Add `fixtures.test.ts` in rules-core with a typed `GoldenCase` and a check that every file parses and has `farm: "demo"`.
2. **Adapter.** Map `inputs` and `synthetic_inputs` onto the rules-core snapshot types. Build test-only `SignedLabelUse` values from `label_uses` and the `label_use_extras` the case provides, with no unit conversion. `rule_state.status: "unsigned"` must go through the real info-only path.
3. **Runner.** Call `runRules(snapshot, as_of)`. It is pure, so no clock is involved. Flatten the outputs to the README's output view. Then assert `expected`: targets, window, values (with tolerance), `also`, `vetoes`, and that nothing matches any `must_not`.
4. **Gate per rule.** Turn cases on as each rule lands (REG → PHI/REI → STOCK → ROT → weather), with `describe.skip` until then. CI must fail if a landed rule's case is skipped.
5. **Never import fixtures into the app.** Add a lint or test that bans importing `fixtures/` from `app/`.

## Decisions to record in DECISIONS.md before relying on them

- REI (and PHI) counted from `ended_at` (as the fixtures assume) or from `started_at`.
- PHI-GUARD buffer. With a buffer of 1 day or more, R01's mandipropamid is guarded out (safe 2 Dec, harvest 3 Dec).
- ROT: is "max consecutive same group = 1" a block or only a warning?
- How prototype units (`L/στρ`, `kg/στρ`) reach rules-core, given M1 allows only ml/g.
- Whether the agronomist accepts the deviations from the prototype listed in the README.

When a threshold is approved, update the case's `params` basis. Do not change the expected values silently: a changed expectation needs a DECISIONS line and a Greek explanation to Bora.

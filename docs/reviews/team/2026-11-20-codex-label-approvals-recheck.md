# Independent re-review of label approvals (0033)

Reviewed PR #232 at `f4a0fe088e4ccf51c589b179b9f70f4030fc8296`, following the initial review in #234.

## MUST

**M1 — Closed.** `supabase/tests/upgrade.sh:15` now applies through 0033. The upgrade passed locally with the historical spray fingerprint and row counts preserved.

**M2 — Stale-version protection closed; fingerprint agreement remains open.** `supabase/migrations/0033_label_approvals.sql:47–50` checks the submitted version under the same row lock used to snapshot the label. `supabase/tests/m14_approval.sql:77–89` confirms that an authenticated owner's stale approval leaves no ledger row or signature. The current-version path, however, still accepts an arbitrary nonblank fingerprint. The authenticated-owner fixture at lines 67–69 successfully sets `fp-a1`, which cannot match the canonical fingerprint verified by `packages/rules-core/src/label.ts:34–44`. Line 67 of 0033 copies it into the label, and the server gate at `supabase/migrations/0032_planting_gate.sql:20–25` treats the signature as present. Derive or verify the canonical fingerprint for the locked snapshot and add a regression with the current sequence and a mismatched fingerprint.

## SHOULD

The documented stage-2 legacy reconciliation and direct-write guard remain rollout prerequisites for using the ledger as complete approval evidence.

## LOW

No separate low findings.

## Verification

On disposable PostgreSQL 17.11 with PostGIS 3.5.2, `upgrade.sh`, `run.sh plain` and `run.sh supabase` passed. The m14 cases exercise PostgreSQL `authenticated` owner, worker, stranger and other-farm owner through the repository's local Auth stub.

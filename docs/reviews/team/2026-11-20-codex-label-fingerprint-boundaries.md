# Follow-up review of the label fingerprint boundary

PR #232 at `5d141ec1da3ef89c6b3e283cc431ad953e9b2f4d`.

## MUST

**M1 — Closed.** The local upgrade ran through 0033 and preserved the historical checks.

**M2 — The validator still disagrees with the phone on which stored doses are known.** The new SQL comparison rejects an arbitrary fingerprint for supported inputs (`supabase/migrations/0033_label_approvals.sql:68`, regression in `supabase/tests/m14_approval.sql:94–105)). The shared vectors pass in the phone test. The SQL encoder at lines 41–45 still marks every non-null stored dose as known, while the phone parser rejects ambiguous decimal strings at `packages/rules-core/src/decimal.ts:14–21`. In a rollback-only local test, an authenticated owner approved a synthetic label with such a stored dose. The server set the signature and the phone's `readUse` returned `unknown('invalid')` for the same dose. The server planting gate counts the signature as present (`supabase/migrations/0032_planting_gate.sql:20–25`).

Validate parser boundaries before signing. A stored value the phone cannot interpret must stay unsigned. Add paired negative cases to the SQL and TypeScript fixtures, including the decimal ambiguity and the phone's whole-number input range. Preserve the exact recorded dose.

## SHOULD

Retain the stage-2 legacy reconciliation prerequisite from the earlier review.

## LOW

No separate low findings.

## Verification

Disposable PostgreSQL, real `authenticated` owner via the local Auth stub, and the existing Vitest phone parser. The boundary check was performed in a rolled-back transaction with synthetic data.

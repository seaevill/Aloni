# Label approval re-review closure

PR #232 at `0725cb8acb566719a4740a6d5a3005097db4b851`.

## MUST

- **M1 closed.** The local upgrade applies 0033 and retains the historical row and spray checks.
- **M2 closed for the reviewed approval path.** The locked label version, its fingerprint and the values the phone can parse are all checked before an approval can sign it. `supabase/migrations/0033_label_approvals.sql:59–76` rejects ambiguous decimal text and out-of-range whole-number text independently of the fingerprint comparison. `supabase/tests/m14_approval.sql:122–140` exercises the shared negative vectors and verifies that rejected values leave neither a ledger row nor a signature. The app fingerprint golden test passed on the same vectors.

## SHOULD

Retain the documented stage-2 legacy reconciliation and direct-write guard before treating the ledger as complete evidence. This review covers the new approval path.

## LOW

No separate low findings.

## Verification

On disposable local PostgreSQL 17.11 with PostGIS 3.5.2, the full upgrade and plain SQL suite passed, including the PostgreSQL `authenticated` owner and worker cases through the local Auth stub. The app's fingerprint golden test passed at the same revision.

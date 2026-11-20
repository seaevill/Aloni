# Independent review of label approvals (0033)

Reviewed PR #232 at `b9e37a97aadeb3861370cde27b130170acc3f31f`. This is a review of the new ledger and its migration tests. Migrations 0001–0032 are unchanged.

## MUST

**M1 — The upgrade job never applies 0033, but its verifier requires the new table.**  
`supabase/tests/upgrade.sh:15` matches 0010–0029, and line 20 runs `verify_applied.sql`. The PR adds `label_approvals` to the expected tables at `supabase/tests/verify_applied.sql:10`. The CI workflow runs the upgrade script as its first SQL test. In a disposable local database it fails with `table missing: label_approvals` and `FAIL: verify_applied.sql after the upgrade`. Use the ordered set of migrations after 0009 instead of the bounded glob. Keep the row-count and historical spray checks.

**M2 — The approval does not verify that it covers the locked label version.**  
`supabase/migrations/0033_label_approvals.sql:46–57` locks and snapshots the current row. Lines 65–66 mark that row signed with the submitted fingerprint, which only has a nonblank check at line 19. The owner fixture in `supabase/tests/m14_approval.sql:65–68` accepts the placeholder fingerprint `fp-a1` as a successful signature. On the phone, `packages/rules-core/src/label.ts:34–44` requires an exact match to the current values; the server gate at `supabase/migrations/0032_planting_gate.sql:20–25` counts labels by signature presence. An approval prepared for an earlier version can therefore sign the latest row on the server while the phone rejects the signature. Validate the expected version against the locked row before the insert can sign it, and ensure the stored signature uses the contract the phone verifies. Add an authenticated-owner regression for a stale approval, checking that both the ledger and signature remain untouched.

## SHOULD

**S1 — Keep the stage-2 dependency visible.**  
The migration header documents that direct writes of the legacy sign-off columns remain supported. The new ledger cannot yet be treated as the complete evidence of label approval. Track legacy reconciliation and the direct-write guard as rollout prerequisites, with an owner regression that covers the old phone path during the transition.

## LOW

No separate low-severity findings.

## Verification and scope

- Local PostgreSQL 17.11 with PostGIS 3.5.2, on a private Unix socket. Ran the repository's `upgrade.sh` and the `run.sh plain` and `run.sh supabase` test paths used by the CI workflow. The latter layout uses a local Auth stub.
- The m14 fixtures run as PostgreSQL `authenticated` with distinct owner, worker, stranger and other-farm owner identities. The current revision binds audit provenance to the session and rejects non-owner operations before inspecting the label. The owner fixture demonstrates the fingerprint behavior above.

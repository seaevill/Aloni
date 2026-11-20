# Independent review of first-farm creation (0034)

Reviewed PR #236 at `9dd0d71e642047f5232b1dace7a9fdfe30141df4`. Findings concern the proposed migration and its tests.

## MUST

**M1 — The server-wide quota is not serialized across different users.** `supabase/migrations/0034_first_farm.sql:29` serializes by user. The global count at line 38 and the insert at line 41 can still overlap across users. With 19 synthetic creation records in a disposable local database, two distinct confirmed `authenticated` users each made a normal first-farm request in separate transactions, and both succeeded. The committed count was 21. Serialize the quota check and reservation with a server-wide transaction guard, retaining per-user protection. Add a two-session test for one successful request and one quota refusal.

**M2 — The verification exemption bypasses the repository's explicit deny-policy requirement.** `0034_first_farm.sql:18–23` enables RLS and removes caller grants. `supabase/tests/verify_applied.sql:14` then exempts the new table from the policy check. Current role tests confirm the table is closed. To keep the invariant in `CODING_STANDARDS.md`, add an explicit deny policy for `authenticated` and retain the verifier's coverage for the new table.

## SHOULD

Clarify retry behavior for a committed request whose response was lost. A retry by the same caller for the same farm ID currently receives the membership error at `0034_first_farm.sql:34`. The wizard needs a reliable way to confirm that exact farm is already owned by the caller before presenting any error or attempting a new creation.

## LOW

The uniqueness ledger cascades when its Auth account is deleted (`0034_first_farm.sql:13`). Describe the guarantee as one farm per Auth account over its lifetime, including after loss of membership.

## Verification

Used the CI workflow's local upgrade and SQL suite paths against disposable PostgreSQL 17.11 + PostGIS 3.5.2. The repository fixtures exercise confirmed users and existing workers as real PostgreSQL `authenticated` roles with the local Auth stub. The independent two-connection regression above checks the quota boundary under concurrent ordinary requests.

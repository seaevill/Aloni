# First-farm creation re-review

PR #236 at `9a5015f63bdea681ba26d678c8615ac6fd97e26a`.

## MUST

- **M1 closed.** `supabase/migrations/0034_first_farm.sql:41–45` serializes the global count and insertion. The two-connection fixture in `supabase/tests/first_farm_concurrency.sh:11–25` passed locally, with one success, one quota refusal and a count of exactly 20.
- **M2 closed.** `supabase/migrations/0034_first_farm.sql:18–23` adds the explicit deny policy and keeps caller grants revoked. The verifier exemption is removed and the local verifier passed.

## SHOULD

**Replay should check current ownership.** The same-ID replay at `supabase/migrations/0034_first_farm.sql:35` requires an owner role but omits `farm_members.active`. I created a synthetic farm as an authenticated owner, disabled the membership as the local administrator and retried the same ID as that owner. The RPC returned success while `private.has_role(..., array['owner'])` returned false. Require an active owner of a live farm before returning replay success.

## LOW

`supabase/tests/first_farm_concurrency.sh:22` applies `LIKE` to a UUID and suppresses the SQL error. PostgreSQL rejects the operator, so fixture cleanup silently rolls back. Use exact fixture IDs and a test-local directory for the subprocess outputs.

## Verification

The upgrade and extensions-schema SQL suite passed on disposable PostgreSQL 17.11 / PostGIS 3.5.2. It included the ordinary owner and worker cases under `authenticated` via the repository Auth stub, the two-connection quota check, and the separate rollback-only replay check described above.

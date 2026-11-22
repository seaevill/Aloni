# 0038 job board · independent SQL review

Reviewed #427 at `67966dd47f34aa8d037d14ba0cc4fcaaba943b84`. Replayed 0035–0038 using PostgreSQL 17.11 with the repository's authenticated-role fixtures. The attached job-board specification and concurrent claim check passed. The separate 0037 restore harness adjustment was applied only to the throwaway test checkout.

## MUST

1. **Apply membership checks inside both directly callable visibility helpers.** `supabase/migrations/0038_job_board.sql:23–26,86–90` reads job state in SECURITY DEFINER context and does not require membership before returning open status or building the open-job hash. The migration grants authenticated execution for the first helper, and 0019 already grants it for the second. Under the existing distinct other-farm owner fixture (`supabase/tests/m18_job_board.sql:34–39`), my extra local assertion saw zero job rows but observed open state through the first helper and a nonempty job fingerprint through the second. Explicitly constrain both helper branches to member-visible jobs, and assert the two direct helper calls in the same cross-farm role test. Private schema placement limits the API exposure, while the authenticated database privilege still permits direct calls.

## SHOULD

- `supabase/migrations/0038_job_board.sql:13–15` validates the prior bodies only. Include security mode, volatility and function settings in these compatibility preconditions as 0037 does.
- `supabase/tests/m18_job_board.sql:70–76` proves the hash changes for the losing worker. Add the normal `pull` cursor round trip so the test also proves reset and disappearance through the sync contract.

## LOW

None.

MUST var – hazır değil

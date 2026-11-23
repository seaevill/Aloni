# 0041 crop targets · independent SQL review

Reviewed #431 at `f61d4fd2a1f1b620eb1e941948c3d94aafaca5fd`. The stacked local PostgreSQL 17.11 tests passed, including role visibility, contract, generation and restore.

## MUST

None specific to 0041. The upstream migration blockers still govern when this stack can be applied.

## SHOULD

- Define the deterministic precedence key for two target amendments in the same season. `supabase/migrations/0041_crop_targets.sql:2,24–30` says newest wins and indexes `created_at`, which is user-supplied on insert and can tie. Document whether client event time or server ingestion order wins, include a stable secondary key, and test both ties and offline delivery.

## LOW

- Constrain the prerequisite lookup to the intended relation. `supabase/migrations/0041_crop_targets.sql:7` currently checks the constraint name alone. The foreign key itself will reject an absent qualifying key.

MUST yok – yüklemeye hazır

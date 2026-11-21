# Two SQL jobs, designed but NOT built (2026-11-21)

Both need a `0036+` file with real-role tests first, an independent review (Codex) and Bora applying it. Nothing here is merged or applied. Why not built tonight: each needs a phone change AND a migration that must go live together; one half alone would break production sign-off or send nothing.

## 0036 – «Έγκριση γεωπόνου» stage 2 (Codex SHOULD of 2026-11-21)
**Problem.** 0033 added the ledger `label_approvals`, but the older phone path still writes `label_uses.sign_off_*` through `apply_ops`. So the ledger is not yet the COMPLETE history of approvals.
**Design (one migration + one phone change, shipped together):**
1. Phone: «Έγκριση» queues an insert into `label_approvals` (label_seq, approver_name, approved_on, note, photo, the phone's fingerprint) instead of writing `sign_off_*`; the label shows «signed» only after the server answers (offline = «Σε αναμονή υπογραφής», never signed locally). `label_approvals` joins the sync tables (owner-only pull).
2. 0036: a BEFORE INSERT/UPDATE trigger on `label_uses` refuses any change to `sign_off_by/on/fingerprint` unless `apply_label_approval()` sets a transaction-local flag (`set_config('aloni.approval', '1', true)`) first. The refusal text is plain, and the phone shows it in «Ο διακομιστής δεν δέχτηκε…» (B6).
3. Legacy rows (signed before 0036, no ledger row): the migration does NOT invent ledger rows. It adds `verify_applied.sql` lines listing them; Bora re-approves each through the ledger (one tap) or keeps them as «legacy signed» — his choice, because the approver, date and photo cannot be made up.
**Tests first (real `authenticated` owner/worker):** direct update of `sign_off_by` refused for owner and worker; approval through the ledger still signs; a legacy signed label stays readable and keeps gating; stale `label_seq` still refused; the existing m14 suite stays green.
**Risk:** until the phone change is live, applying 0036 would block sign-off. Order: phone release, then 0036.

## 0037 – push sender (M4), signed rules only
**Already built on the phone:** settings screen, quiet hours (21:00–05:30 Athens), opt-in only from settings, `mayNotify` (unsigned rule = never), subscribe/unsubscribe, tests.
**Missing (server):** `push_subscriptions(farm_id, user_id, endpoint, keys, created_at)` (owner only, RLS, endpoint unique, deleted on unsubscribe); an Edge Function on pg_cron that, per farm, evaluates ONLY rules whose `[SET]` values are signed (same signed-rule table as the phone), skips quiet hours and switched-off owners, writes a `notifications_sent` row (rule, day) so one rule fires once per day, and sends Web Push with VAPID keys from Supabase secrets (Bora enters them; Claude never sees them).
**Tests first:** an unsigned rule produces no row and no send (SQL + function unit test); a signed rule fires once per day; quiet hours and «off» send nothing; another farm's subscription is never used.
**Needs from Bora:** VAPID key pair as a Supabase secret (RUNBOOK step to be written with the PR); no money involved.

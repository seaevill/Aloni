# Quality gates (a PR may be merged by autopilot only if ALL are true)

1. (Gate = the CONCLUSION of each required job, never the raw `status` field: on 2026-11-25 GitHub left the `changes` job at status `in_progress` with conclusion `success`, all its steps completed — a platform-side record that never flipped; the aggregate `check` job and every required job were green. `changes` only routes the other jobs.) GitHub checks on the PR head: `check`, `sql`, `static`, `e2e (shard 1/3, 2/3, 3/3)`, `pr-size` green; `Workers Builds` green or explained (preview build). A rerun that turns red→green is NOT proof of a fix: say so in the PR and in REPORT.md.
2. No supabase/** change unless Bora has said in writing to merge that exact SQL PR (2026-11-25: #500 only); merging never applies it — only Bora runs «Supabase migrate (manual)». No applied migration edited, no RLS/safety rule weakened.
3. **Before creating ANY test or source file run `git ls-files <path>`**: never overwrite an existing file with `cat >` (2026-11-24: PR #537 replaced the existing harvest/worker/parcel double-tap safety test by accident; restored in the next PR). Review `git diff --stat` for unexpected deletions before every push.
3b. No test skipped, deleted, loosened or retried more; flaky tests are explained with evidence (CI failure context) or left in BLOCKERS.md.
4. Full local `vitest` + `eslint . --max-warnings 0` + `tsc --noEmit` pass BEFORE pushing (CI `static` runs the tokens/contrast/i18n tests: no lengths/colours outside tokens.css, no JSX text without t()).
5. Zero feature loss: every existing test id/route/translation key still present; the PR body lists what was verified.
6. Mobile: no horizontal scroll at 320/375/390/768 (widths-scan spec), touch targets ≥ 56×44, text ≥ 14 px, axe serious/critical = 0.
7. Small: ≤ 450 changed lines (images excluded).
8. Evidence in the PR: what the owner should notice, before/after screenshots for visual changes, tests run, limitations.
9. Statuses are reported precisely: implemented · tested · merged · **deployed (Cloudflare build ok)** · verified live. «Merged» is never written as «live».

Held PRs and separately gated work are listed in QUEUE.md.

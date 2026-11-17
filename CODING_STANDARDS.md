# CODING_STANDARDS.md – Aloni

Each safety rule from `CLAUDE.md` is paired with the mechanism that enforces it. "Now" = enforced in CI today; "PR n" = lands in that M1 PR (`docs/milestones/M1.md` §5). A rule without a mechanism is only a promise, so the gap is stated.

## Safety rules → enforcement

| Rule (CLAUDE.md) | Mechanism | When |
|---|---|---|
| 1. Never invent label data; missing = blocked | ESLint bans `?? <number>` / `\|\| <number>` in label/dose/spray code and `rules-core`; `Known<T>` + `parseLabelValue()`; deciding functions take only `SignedLabelUse` | ESLint **now**; types PR 3 / PR 12 |
| Doses are never rounded | ESLint bans `Math.round/floor/ceil/trunc` and `toFixed` in those zones; doses are decimal strings, shown with `formatDose()` | ESLint **now**; `formatDose` PR 3 |
| Greek decimals never guessed | `parseDecimal()` rejects `1.000`, `1,000`, `1,000.5`; golden tests | PR 3 |
| 2. The app suggests, never decides/signs | Deciding code accepts only signed inputs (type-level); unsigned rules return `info_only` | PR 12, M3 |
| 3. `[SET]` thresholds are placeholders until signed | `SignedRule` only from `requireSignOff()`; sign-off hash drops on any edit | PR 12, M3 |
| `rules-core` is pure (no clock, no randomness) | ESLint bans `Date.now()`, `new Date()` (no argument), `performance.now()`, `Math.random()` there; `as_of` is a parameter | **Now** |
| 4. Demo data never mixes with real data | `farm_id` on every row; demo never writes to the outbox (test); Demo import only touches the demo farm (test) | import test **now**; outbox test PR 4b |
| 5. No extra personal data, EU only, no tracking | Reviewed per PR (PR template); no analytics dependencies | PR template **now** |
| Append-only spray/harvest/stock | SQL triggers (tested in CI Postgres); Dexie hook throws on update/delete; ESLint bans Dexie writes outside `src/repo/` | SQL **now**; hook + lint PR 4b |
| All UI text is translated (el/tr/en) | ESLint bans JSX text and text attributes outside `t()`; Vitest: every `t('key')` exists in all languages, no dead keys, `{placeholders}` match | **Now** |
| No unhandled promises | `@typescript-eslint/no-floating-promises` | **Now** |
| UX bar (≥56 px targets, ≥14 px text, 375 px) | Playwright `ux-bar.spec`, axe | PR 3 |

**Proof that a ban works:** `app/tests/unit/lint-guards.test.ts` lints seeded violations in `app/tests/fixtures/lint/**` and requires each to be an error (and the clean variants to pass). Change a rule → change its fixture.

## Conventions
- Dynamic i18n keys are not allowed: spell each key out as a string literal (`label: 'tab.today'`) so the dead-key test can see it.
- User-facing text only via `t()`; formats only via the `i18n` helpers (`formatArea`, `formatDate`, later `formatDose`).
- Label values come from `parseLabelValue()`; never construct them by hand.
- Product name only from `app/src/config.ts` (`APP_NAME`); never "Aloni Farm".
- Every PR: ≤ ~400 lines, CI green (typecheck, lint, Vitest, WebKit 375 px, SQL), DECISIONS.md updated, Turkish note ≤ 5 lines, Greek iPhone checklist in the PR body.

## Git (shallow single-branch clone in the cloud session)
- Once per clone: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`
- Send a new branch with `git push -u origin HEAD`.
- The session hook may still warn "unpushed commits … no remote branch" on a shallow clone. That is a **false alarm**: check `git ls-remote --heads origin <branch>` once and move on.
- Existing branch missing its tracking ref: `git fetch --depth=20 origin <b>:refs/remotes/origin/<b>`.
- Never push to `main`; merge by pull request only.

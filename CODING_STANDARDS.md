# CODING_STANDARDS.md – Aloni

Each safety rule from `CLAUDE.md` is paired with the mechanism that enforces it. **"Enforced"** means CI goes red when the rule is broken, and a fixture or test proves it. **"Planned (PR n)"** means it is not enforced yet (`docs/milestones/M1.md` §5). Anything we cannot enforce is listed under *Known limits*; a rule without a mechanism is only a promise.

## Safety rules → enforcement

| Rule (CLAUDE.md) | Mechanism | Status |
|---|---|---|
| 1. Never invent label data; missing = blocked | ESLint bans numeric defaults for missing values: `?? 0`, `\|\| 7`, `?? -1`, `?? DEFAULT`, `{ phi = 7 }`, `dose = 0.5`, `??=`, `\|\|=`, `x == null ? 0 : x` (ids D01–D04, everywhere in `app/src` and `rules-core`) | **Enforced** |
| 1b. Label values are branded types | `Known<T>`, `parseLabelValue()`, `SignedLabelUse` | Planned (PR 3, PR 12) |
| Doses are never rounded | ESLint bans `Math.round/floor/ceil/trunc`, aliasing/destructuring `Math`, `toFixed/toPrecision/toExponential/toLocaleString`, `Intl.NumberFormat`, `x \| 0`, `~~x`, `x % 1`, `parseInt`, `eval`/`Function` (ids R01–R07). Numbers are printed only by `app/src/i18n/format.ts` (`formatDose/formatQty/formatArea`): it never rounds, only swaps the decimal separator; its tests cover 0.625 → «0,625», 2.5 → «2,5» | **Enforced** |
| Greek decimals never guessed | `parseDecimal()` rejects `1.000`, `1,000`, `1,000.5` | Planned (PR 3) |
| 2. The app suggests, never decides/signs | Deciding code takes only signed inputs (types); unsigned rules return `info_only` | Planned (PR 12, M3) |
| 3. `[SET]` thresholds are placeholders until signed | `SignedRule` only from `requireSignOff()`; sign-off hash drops on any edit | Planned (PR 12, M3) |
| `rules-core` is pure (no clock, no randomness) | ESLint bans `Date.now`, `Date()`, `new Date()` without a real argument, bare `Date` aliases, `performance`, timers, `process`, `Temporal.Now`, `Math.random`, `crypto`/`randomUUID`/`getRandomValues` there (ids K01–K03); `as_of` is a parameter | **Enforced** |
| 4. Demo data never mixes with real data | `farm_id` on every row; import only touches the demo farm (test); demo never writes to the outbox | Import test enforced; outbox test planned (PR 4b) |
| 5. No extra personal data, EU only, no tracking | PR template question; no analytics dependencies; **owner/controller details are never committed** (the repo is public): they are entered in the app and live in the database | PR template enforced; the rest is review |
| Append-only spray/harvest/stock | SQL triggers (tested on CI Postgres: update/delete fail); Dexie hook + ESLint ban on Dexie writes outside `src/repo/` | SQL **enforced**; hook and lint planned (PR 4b) |
| All UI text is translated (el/tr/en) | `t(key: I18nKey)` is typed from `el.json` (a typo is a compile error); ESLint bans JSX text, text in children via `'…'`, `` `…` ``, `+`, `concat/join`, text in `aria-label/aria-description/title/placeholder/alt/label`, `dangerouslySetInnerHTML`, `innerHTML/textContent`, `h()/createElement()` (ids U01–U04); Vitest: every `t('key')` exists in all languages, no dead keys, tr/en keys identical to el, `{placeholders}` match — and each check is proven to go red on bad input | **Enforced** |
| No dialogs (alert/confirm/prompt) | ESLint (id U05); undo toast instead | **Enforced** |
| No unhandled promises | `@typescript-eslint/no-floating-promises` | **Enforced** |
| UX bar (≥56 px targets, ≥14 px text, 375 px) | Vitest checks CSS font sizes today; Playwright `ux-bar` + axe later | Partly enforced; Playwright planned (PR 3) |

## Standing process rules (permanent)
1. **A new safety rule never merges without a red-team fixture.** Every ban lives in `eslint/bans.js` with an id. `app/tests/unit/lint-guards.test.ts` lints the files in `app/tests/fixtures/lint/**` and fails if (a) a line marked `@red <id>` is not flagged with that id, (b) a flagged line is not marked, (c) an `@ok` line is flagged, or (d) **any ban id has no fixture proving it red**. A separate "red team" reviewer who did not write the rule tries to escape it; every escape found becomes a fixture and a fix before merge.
2. **A PR over 450 changed lines fails CI** (`scripts/pr-size.sh`; lockfile, generated files, images and test fixtures are not counted). Split it.
3. Every PR: typecheck, lint, Vitest, WebKit 375 px and the SQL job are green; DECISIONS.md updated (dated); a Turkish note of at most 5 lines for Bora; the 7-step Greek iPhone checklist in the PR body (step 1 includes «Προσθήκη στην οθόνη αφετηρίας»).
4. The text of this file must match reality: never write "enforced" for a rule CI does not check.

## Conventions
- No dynamic i18n keys: spell each key out as a string literal (`label: 'tab.today'`) so the dead-key test can see it.
- User-facing text only via `t()`; numbers only via `format.ts`; dates via the `i18n` helpers.
- Label values come from `parseLabelValue()` (when it exists); never construct them by hand.
- Product name only from `app/src/config.ts` (`APP_NAME`); never "Aloni Farm".

## Known limits (be honest about what lint cannot see)
These are syntax rules, not a type system. They cannot see: text kept in a variable and rendered later, a default hidden in another function, arithmetic that rounds through a library, or a clock read passed in from outside `rules-core`. The red-team fixtures list the escape routes we know and block; unknown ones remain possible. Review and the unit tests for each safety branch are the second line of defence.

## Git (shallow single-branch clone in the cloud session)
- Once per clone: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`
- Send a new branch with `git push -u origin HEAD`.
- The session hook may still warn "unpushed commits … no remote branch" on a shallow clone. That is a **false alarm**: check `git ls-remote --heads origin <branch>` once and move on.
- Existing branch missing its tracking ref: `git fetch --depth=20 origin <b>:refs/remotes/origin/<b>`.
- Never push to `main`; merge by pull request only. The repository is `seaevill/Aloni` (renamed from SunField).

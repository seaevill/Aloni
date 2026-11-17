# CODING_STANDARDS.md – Aloni

Each safety rule from `CLAUDE.md` is paired with the mechanism behind it. Status words, from strongest to weakest:

- **Proven** – a test or the type checker fails CI when the rule is broken, and a negative test shows it goes red. No known way around it inside its scope.
- **Lint net** – ESLint patterns that catch the *known* ways of breaking the rule. **This is not a guarantee**: 33 attempts by two red teams are still not caught (see "Known limits"), and a determined author can find more. `// eslint-disable` comments are ignored and `any` is banned in dose and rules-core code, but that only narrows the net.
- **Planned (PR n)** – not in place yet (`docs/milestones/M1.md` §5).

This file must match reality: never write "Proven" for something that is only a net.

## Safety rules → enforcement

| Rule (CLAUDE.md) | Mechanism | Status |
|---|---|---|
| 1. Never invent label data; missing = blocked | **D05**, a type-aware ESLint rule (`eslint/no-numeric-default.js`): no numeric fallback for a number-typed value, whatever its shape: `?? 0`, `\|\| 7`, `?? -1`, `?? DEFAULT`, `?? helper()`, `{ phi = 7 }`, `??=`, `x ? x : 0`, `if (x == null) x = 0`, `switch`/`catch` fallbacks, `.catch(() => 0)`, `{ ...DEFAULTS, ...o }`, text defaults (`s ?? '0'`), comparison guards (`o.phi! > 0 ? o.phi : 0`) and `Number(emptyString)` / `+x` (a silent 0) | **Lint net** |
| 1b. Label values are branded types | `Known<T>`, `parseDecimal()`/`parseWhole()`, `makeDose()` (a dose of 0 is invalid), `SignedLabelUse` only from `requireSignOff()` | **Proven** (types + unit and property tests, `packages/rules-core`) |
| Doses are never rounded | **R01–R08**: `Math.round/floor/ceil/trunc/fround/imul`, aliasing `Math`, `toFixed/toPrecision/toExponential/toLocaleString`, `Intl.NumberFormat` and other number-formatting `Intl`, `x \| 0`, `~~x`, `x & -1`, `x % 1`, `parseInt`, typed arrays/`DataView`, slicing `String(x)`, `eval`, number libraries. Numbers are printed only by `app/src/i18n/format.ts` (`formatDose/formatQty/formatArea`), which never rounds | **Lint net** (`format.ts` itself is **Proven** by its tests: never rounds, 0.625 → «0,625») |
| Greek decimals never guessed | `parseDecimal()` rejects `1.000`, `1,000`, `1,000.5`; label values and quantities are stored as text | **Proven** (decimal tests, round trips, 2000-case property test) |
| 2. The app suggests, never decides/signs | Deciding code takes only `SignedLabelUse` (type); the approval covers values, product, crop and target and drops on any edit; NaN / Invalid Date / missing PHI are «blocked», never «over» | Types, sign-off and waits **Proven** (PR 12a); the deciding code itself arrives in M2/M3 |
| 3. `[SET]` thresholds are placeholders until signed | Sign-off fingerprint drops on any edit (tested, incl. scope); `SignedRule` for `[SET]` thresholds arrives with the rules in M3 | Label sign-off **Proven**; `SignedRule` planned (M3) |
| `rules-core` is pure | **K01–K04**: no `Date.now()/Date()/new Date()` without an argument, `.constructor`, `format()` without a date, `Reflect`, time-zone reads; no globals (timers, `performance`, `process`, `globalThis`, `window`, ..., checked by scope so your own `window`/`process` variable is fine); no `Math.random`/`crypto`; only relative imports (no uuid, dayjs, nanoid) | **Lint net** |
| 4. Demo data never mixes with real data | `farm_id` on every row; import only touches the demo farm (test) | Import test and outbox test (demo never queued) **Proven** |
| 5. No extra personal data, EU only, no tracking | PR template question; no analytics dependencies. **Owner/controller details are never committed** (the repo is public): they are entered in the app and live in the database | PR template question; the rest is review |
| Append-only spray/harvest/stock | SQL triggers (tested on CI Postgres: update/delete fail); Dexie hook + ESLint ban on Dexie writes outside `src/repo/` | SQL triggers, Dexie hook and the atomic `putMany` write **Proven** (tests); lint W01 (no Dexie writes outside `src/repo`) is a **Lint net** |
| All UI text is translated (el/tr/en) | `t(key: I18nKey)` is typed (typo = compile error); **U01–U04** ban JSX text, literals/templates/`+`/`join`/casts in children, text in `aria-label/aria-description/title/placeholder/alt/label`, spread props, `label:`/`title:` text properties, `dangerouslySetInnerHTML`, `innerHTML/textContent`, `h()/createElement()`, `html```; Vitest: used keys exist in all languages, no dead keys, tr/en keys identical to el, `{placeholders}` match, each proven red on bad input | **Proven** for keys (typed `t()`, tests with negative cases); **Lint net** for hard-coded text |
| No dialogs (alert/confirm/prompt) | **U05**, scope-aware (a variable called `alert` is fine) | **Lint net** |
| No unhandled promises | `@typescript-eslint/no-floating-promises` | **Lint rule** (standard typed rule, no known escapes) |
| UX bar (≥56 px targets, ≥14 px text, 375 px) | Vitest checks CSS font sizes today; Playwright `ux-bar` + axe later | CSS sizes, contrast, 375 px overflow, tap targets and axe on every screen and form **Proven** by Playwright (WebKit in CI) |

## Standing process rules (permanent)
1. **A new safety rule never merges without a red-team fixture.** Every ban lives in `eslint/bans.js` (or a custom rule) with an id. `app/tests/unit/lint-guards.test.ts` lints `app/tests/fixtures/lint/**` and fails if (a) a line marked `@red <id>` is not flagged with that id, (b) a flagged line is not marked, (c) an `@ok` line is flagged, or (d) **any ban id has no fixture proving it red**. A reviewer who did not write the rule (a separate "red team") tries to escape it; every escape becomes a fixture and a fix before merge.
2. **A PR over 450 changed lines fails CI** (`scripts/pr-size.sh`; lockfile, generated files, images and test fixtures are not counted). Split it.
3. Every PR: typecheck, lint, Vitest, WebKit 375 px and the SQL job green; DECISIONS.md updated (dated); a Turkish note of at most 5 lines for Bora; the 7-step Greek iPhone checklist in the PR body.
4. **Add files by name** (`git add path …`), never `git add -A` in a folder that has local links: a `node_modules` symlink was once committed that way (DECISIONS.md, 2026-11-17).

5. **Permanent condition (Bora, 2026-11-17): no code that computes or shows PHI, REI or a dose merges until all of these are on `main`:** (a) the types `Known<T>`, `SignedLabelUse` and `parseDecimal`; (b) safe-side tests: NaN, an invalid date (`Invalid Date`) and a missing PHI give **«blocked»**, never «passed»; (c) a **property test** proving that a computed PHI/REI never gets shorter than the label says and is never rounded. It applies to screens, `rules-core` and notifications. `formatDose` accepts only `Known<Decimal>`.

## Conventions
- No dynamic i18n keys: spell each key out as a string literal so the dead-key test can see it.
- User-facing text only via `t()`; numbers only via `format.ts`; dates via the `i18n` helpers.
- Product name only from `app/src/config.ts` (`APP_NAME`); never "Aloni Farm".

## Known limits (what lint cannot see)
Two red-team rounds (about 330 attempts by reviewers who did not write the rules) found holes; every real one was closed. **33 attempts are still not red** and are marked `@limit` in the fixtures. They are, in this order of seriousness:
1. Text kept in a **variable, prop or data** and rendered later; arbitrary custom props (`<Comp text="…">`); spread props built by a call; a component that returns a bare string.
2. A numeric default built **indirectly**: through a generic helper (`orElse<T>`), an array of `[maybeMissing, 0]`, or `Object.fromEntries`; a number mixed into a template literal.
3. **Computed property names** on `any` (`g['Da'+'te']`), reflective access (`Reflect.get(Number.prototype,'toFixed')`), a method on an `Intl` instance obtained elsewhere, fractional milliseconds.
4. **Aliases** and uses of an already-banned import (the alias/import line itself is red).

Lint is a safety net, not a proof. The real guarantee comes from types (`Known<T>`, `SignedLabelUse`, `parseDecimal`, planned PR 3 and PR 12) and a unit test for every safety branch. Raising `MAX_KNOWN_LIMITS` in `lint-guards.test.ts` needs a DECISIONS.md line.

## Git (shallow single-branch clone in the cloud session)
- Once per clone: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`; send a new branch with `git push -u origin HEAD`.
- The session hook may warn "unpushed commits … no remote branch" on a shallow clone: a **false alarm**. Check `git ls-remote --heads origin <branch>` once and move on.
- Never push to `main`; merge by pull request only. The repository is `seaevill/Aloni` (renamed from SunField).

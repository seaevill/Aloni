# Tooling research: making autonomous Claude Code cloud sessions more effective on Aloni

Date: 2026-11-20. Scope: repo `seaevill/Aloni` (Preact+TS+Vite PWA, Dexie, Workbox, Vitest, Playwright WebKit 375 px, ESLint; Supabase migrations + RLS + SQL tests in CI; Deno Edge Functions; Cloudflare deploy; i18n el/tr/en/hi).
Everything below was checked against official docs or the tool's own repo on this date. Where I could not confirm something, it says **UNVERIFIED**.

---

## 0. Three facts that change most recommendations

1. **Repo-declared plugins do not load in cloud sessions.** The cloud-environments doc says a cloud session "doesn't install the plugins a repository turns on under `enabledPlugins`", while repo `CLAUDE.md`, `.claude/settings.json` hooks + permission rules, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, and `.mcp.json` **do** load (single-repo session). Plugins reach cloud sessions only when enabled on the claude.ai account (synced plugins). Note: the security-guidance doc says the opposite (declare in `.claude/settings.json` for cloud). **The docs conflict; test once before relying on it.**
   Sources: https://code.claude.com/docs/en/cloud-environments.md ("What carries over from your setup"), https://code.claude.com/docs/en/security-guidance.md, https://code.claude.com/docs/en/discover-plugins.md
2. **In a claude.ai *Project* (coordinator + threads), even less loads:** threads read root `CLAUDE.md` and root `.claude/rules/`, but **not** hooks, `.claude/settings.json`, repo skills, `.mcp.json`, or path-scoped rules. Plugins must be added in Project settings → Plugins. So if Bora runs work via Projects, **every guardrail must live in CI or in root CLAUDE.md/rules**, not hooks. Source: https://code.claude.com/docs/en/claude-projects.md
3. **The cloud GitHub proxy rejects GraphQL `gh` subcommands** (`gh pr`, `gh issue`); `gh api` (REST) works. Any helper script that calls `gh pr merge --auto` etc. will fail in a cloud session. Source: https://code.claude.com/docs/en/cloud-environments.md (GitHub proxy section)

Also observed in *this* environment: the claude.ai account has a **Supabase connector with write tools attached** (`apply_migration`, `execute_sql`, `delete_branch`, `pause_project`, `create_project`, ...) and a **Cloudflare Workers Bindings connector that self-reports as deprecated**. See section 2.1 and the don't-install list.

---

## 1. Anthropic plugins, hooks and settings

Official marketplace: `claude-plugins-official` (auto-added; repo https://github.com/anthropics/claude-plugins-official). Demo marketplace `claude-code-plugins` lives in https://github.com/anthropics/claude-code/tree/main/plugins. Install: `/plugin install <name>@claude-plugins-official` (terminal CLI only; `/plugin` is not available in cloud sessions, so for cloud enable the plugin on claude.ai). Docs warn: "Plugins and marketplaces are highly trusted components that can execute arbitrary code." https://code.claude.com/docs/en/discover-plugins.md

| Item | What it is (verified) | Install / config | Cost | Risk | Cloud fit |
|---|---|---|---|---|---|
| **security-guidance** | Hook-based plugin: per-edit regex check (no model call), end-of-turn background security review of the turn's git diff, deeper agentic review on each `git commit`/`git push` Claude runs. Project rules via `.claude/claude-security-guidance.md` (model guidance, 8 KB cap) and `.claude/security-patterns.json` (deterministic regex with `paths:` globs). | `/plugin install security-guidance@claude-plugins-official`; for cloud: claude.ai-enabled plugin (or `enabledPlugins` in `.claude/settings.json`, see conflict above). Needs Python ≥3.10 + pip network on first run. | Per-edit free; end-of-turn + commit reviews use extra model calls (Opus 4.7 by default; override with `SECURITY_REVIEW_MODEL`, `SG_AGENTIC_MODEL`). Caps: 3 consecutive re-prompts, 20 commit reviews/hour. | First-party. Doesn't block, only re-prompts. Installs Agent SDK into `~/.claude/security/` (pip download). | Partial: works in plain cloud sessions if the plugin loads; not in Project threads (no hooks). |
| **code-review** (demo marketplace `claude-code-plugins`) | "Automated PR code review using multiple specialized agents with confidence-based scoring to filter false positives." `/code-review` also built into Claude Code on any plan. | `/plugin install code-review@claude-code-plugins` or GitHub Action with `plugins: "code-review@claude-code-plugins"`. | Model tokens per run (multi-agent = expensive). | Low. | Yes (`/code-review` command). |
| **pr-review-toolkit** | Specialized review agents (comments, tests, error handling, type design, code quality, simplification). | `/plugin install pr-review-toolkit@claude-plugins-official` | High token use (several agents). | Low. | Yes via claude.ai sync. **This is the same pattern that is already burning tokens.** |
| **commit-commands** | `/commit-commands:commit`, push, PR creation. | `/plugin install commit-commands@claude-plugins-official` | Small. | Low. | Low value: PR creation path uses `gh pr` (GraphQL) which the cloud proxy blocks – **UNVERIFIED** whether it falls back. |
| **hookify** | Creates custom hooks from conversation patterns/instructions. | `/plugin install hookify@claude-plugins-official` | Small. | Low. | Low value; write the 2–3 hooks by hand instead. |
| **frontend-design** | Guidance for distinctive UI. | `/plugin install frontend-design@claude-plugins-official` | Context tokens. | Low. | Not needed: the UI is defined by the prototype. |
| **typescript-lsp** | LSP diagnostics after every edit. | `/plugin install typescript-lsp@claude-plugins-official` + `typescript-language-server` binary. | Free. | Low. | **No**: "In cloud sessions, Claude Code doesn't start plugin language servers." |
| **supabase** (external integration plugin) | Bundles the Supabase MCP server. | `/plugin install supabase@claude-plugins-official` | Free. | Same as Supabase MCP (2.1). | Yes via claude.ai. |
| `/security-review` (built-in) + **claude-code-security-review** Action | One-pass security review of current branch; Action posts PR comments. Action README: "not hardened against prompt injection attacks", trusted PRs only. | Action: `anthropics/claude-code-security-review@main` with `claude-api-key`, `custom-security-scan-instructions` file. https://github.com/anthropics/claude-code-security-review | API key billing per PR. | Needs an API key secret; `@main` not pinned. | N/A (runs in Actions). |
| **Claude Code GitHub Action** (`anthropics/claude-code-action@v1`, `@claude` in PRs) | Runs Claude in Actions; interactive (`@claude`) or automation (`prompt:`) mode; can run plugins/skills. | `/install-github-app` or copy `examples/claude.yml`; secret `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`). https://code.claude.com/docs/en/github-actions.md | GitHub minutes + API tokens (or subscription with OAuth token). | Claude GitHub App has broad permissions (Contents/Workflows/Actions write…). Bora must create the secret. | Adds a *second* Claude, which conflicts with "Claude Code is sole integrator". |
| **Code Review** (managed) | Multi-agent PR review on Anthropic infra, `REVIEW.md` customisation, `@claude review`. | Org Owner setup. | Billed per review. | Low. | **Team/Enterprise plans only** – likely not available to Bora. https://code.claude.com/docs/en/code-review.md |
| **Auto-fix PRs** | Cloud session subscribes to PR CI failures/review comments and pushes fixes. | Claude GitHub App installed; toggle Auto-fix on the PR in the Changes card. https://code.claude.com/docs/en/claude-code-on-the-web | Plan usage. | Replies post under Bora's GitHub account (labelled). Doesn't react to merge conflicts. | Yes – directly addresses flaky-CI babysitting. |

### Hooks and settings (no install, committed to repo)

Hook docs: https://code.claude.com/docs/en/hooks.md. Hooks in `.claude/settings.json` run in single-repo cloud sessions (not in Project threads). `CLAUDE_CODE_REMOTE="true"` in cloud. PostToolUse exit 2 → stderr shown to Claude (non-blocking); Stop exit 2 → Claude keeps working. `async`/`asyncRewake` exist.

Suggested hooks (all free, local scripts, no supply-chain surface):

```json
{
  "hooks": {
    "SessionStart": [{ "matcher": "startup|resume", "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/claude/session-start.sh", "timeout": 300 } ] }],
    "PostToolUse": [{ "matcher": "Edit|Write", "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/claude/post-edit.sh" } ] }],
    "Stop": [{ "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/claude/pre-stop.sh" } ] }]
  }
}
```
- `session-start.sh`: exit unless `CLAUDE_CODE_REMOTE=true`; `npm ci` if `node_modules` stale; print the branch-naming rule and current open-PR list (REST via `gh api`). Prevents branch collisions by making Claude pick `claude/<milestone>-<slug>-<short-sha>`.
- `post-edit.sh`: by path – `*.ts(x)` → `tsc --noEmit -p` on the affected package (fast incremental) + eslint on the file; `supabase/migrations/*.sql` → grep checks for the known bug class (new table without `enable row level security`, `security definer` without `set search_path`, policy missing on an append-only table); `app/src/i18n/*.json` → key-parity check. Exit 2 with the message so Claude fixes it in the same turn.
- `pre-stop.sh` (language guard, cheap): if a `docs/**/*.md` or report file changed this turn, run a tiny heuristic (share of Turkish/Greek characters vs. ASCII words) against the per-path language table and exit 2 with "file X must be in Turkish". **This is the only deterministic fix for "reports in the wrong language".**

Language settings:
- `language` setting key exists: "Claude Code passes the value verbatim to Claude as an instruction to always respond in that language." https://code.claude.com/docs/en/settings-reference — **too blunt** here (Bora wants Turkish chat, English research docs, Greek checklists, el/tr/en UI). Don't set it repo-wide.
- Better: a short **language table** at the top of `CLAUDE.md` (destination → language) plus path-scoped rules, e.g. `.claude/rules/docs-language.md` with `paths: ["docs/**", "RUNBOOK.md"]`. Path-scoped rules load only when matching files are touched; keep CLAUDE.md < 200 lines. https://code.claude.com/docs/en/memory.md. Caveat: Project threads don't load path-scoped rules → put the table in root CLAUDE.md as well.
- `outputStyle` exists but changes tone/role, not a fix for language.

---

## 2. Supabase

### 2.1 Supabase MCP (official)
- What: hosted MCP `https://mcp.supabase.com/mcp`; params `read_only=true` (read-only Postgres user), `project_ref=<id>` (one project, disables account-level tools), `features=database,docs,...`.
- Install (project scope, committed `.mcp.json` → loads in single-repo cloud sessions):
  `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<DEV_REF>&read_only=true&features=database,docs,debugging"`
- Cost: free. Risk: Supabase's own doc lists prompt injection, "don't connect to production", use read-only + project scoping + feature groups + branching; server runs with the developer's permissions. https://supabase.com/docs/guides/ai-tools/mcp.md
- Cloud fit: needs OAuth – interactive login in a cloud VM is not supported (cloud-environments: "Interactive auth ... Not supported"); the claude.ai **connector** route is what works. **Action for Bora:** the Supabase connector currently attached to his claude.ai account exposes write/destructive tools. Either scope it to the dev project + read-only, or disconnect it until there is a non-production project. Do not let an autonomous session hold `apply_migration`/`pause_project` on the real farm DB.
- Best use for Aloni: `get_advisors` (security advisors) and `list_tables` against a **dev/branch** project after a migration PR. Not needed day-to-day while everything runs locally.

### 2.2 Supabase agent skills
- What: `supabase` and `supabase-postgres-best-practices` skills; the second explicitly covers "RLS policies and their tests ... rows visible to the wrong tenant".
- Install: `npx skills add supabase/agent-skills` (or `--skill supabase-postgres-best-practices`). https://supabase.com/docs/guides/getting-started/ai-skills.md
- Cost: free; context tokens only when the skill triggers.
- Risk: `npx skills` is a third-party CLI fetched from npm at run time; **UNVERIFIED** which directory it writes to (must end up under `.claude/skills/` to load in cloud sessions). Prefer: run once, review the files, commit them, pin by commit. In Project threads, repo skills don't load – enable on claude.ai instead.
- Fit: good, directly targets the recurring RLS bug class. Cheap.

### 2.3 Supabase CLI checks (CI)
- `supabase test db` – runs pgTAP tests against local DB. CI recipe: `supabase/setup-cli@v1` → `supabase db start` → `supabase test db`. https://supabase.com/docs/guides/deployment/ci/testing
- `supabase db lint` – plpgsql_check: types, unused vars, dead code, missing RETURN, `EXECUTE` injection risk. Flags `--level`, `--fail-on`, `-s`. https://supabase.com/docs/guides/local-development/cli/testing-and-linting.md
- **`supabase db advisors`** – runs the security/performance advisors (the Splinter lints) against the **local** DB by default: `--type security --fail-on warn`. https://supabase.com/docs/reference/cli/supabase-db-advisors. This is the cheapest deterministic catch for "RLS disabled in public", "RLS enabled no policy", "policy exists RLS disabled", "security definer view", "function search_path mutable", "rls references user_metadata", "auth users exposed". Minimum CLI version not stated – **pin a recent CLI version** and verify the command exists in it.
- Branching: preview branches billed from ~$0.01344/h (Micro), not covered by Spend Cap. https://supabase.com/docs/guides/platform/manage-your-usage/branching.md. Costs money → ask Bora; not needed while CI uses local `supabase db start`.
- Cloud-session fit: Docker and PostgreSQL 16 are pre-installed in the cloud VM; `supabase start` pulls images (Docker Hub is on the Trusted list; images also come from other registries – **UNVERIFIED** whether all are allowed). Pre-pull in the environment setup script so the cache keeps them. https://code.claude.com/docs/en/cloud-environments.md

---

## 3. Postgres migration linters / security

| Tool | Verdict |
|---|---|
| **Splinter** (https://github.com/supabase/splinter) | The lint SQL behind Supabase advisors; run via `supabase db advisors` rather than vendoring `splinter.sql`. Lint list: https://supabase.github.io/splinter/0013_rls_disabled_in_public. High value. |
| **pgTAP via `supabase test db`** | Already in use (pgTAP-like). Upgrade: one **table-driven RLS matrix test** – for every table in `public`, assert RLS enabled, and for each role (anon, worker, owner, other-farm owner) assert allowed/denied SELECT/INSERT/UPDATE/DELETE; plus a PHI-gate test per planting. A new table without a row in the matrix fails CI. This converts the recurring external-review finding into a gate. No new dependency. |
| **squawk** (https://github.com/sbdchd/squawk, `npm i -g squawk-cli`, Apache-2.0/MIT, Action `sbdchd/squawk-action`) | Lints migrations for **locking/zero-downtime** issues (concurrent index, NOT VALID constraints, bigint). Doesn't check RLS. Low value at Aloni's data size; optional. |
| **plpgsql_check** (via `supabase db lint`) | Cheap, worth a `--fail-on error` step for functions/triggers. |
| **sqlfluff** | Style/formatting linter; no security value; adds Python toolchain. Skip. |

---

## 4. Testing / browser

- **Playwright config for flakiness** (https://playwright.dev/docs/api/class-testconfig, https://playwright.dev/docs/test-cli):
  `retries: process.env.CI ? 2 : 0`, `trace: 'on-first-retry'`, `forbidOnly: !!process.env.CI`, `fullyParallel: true`. Keep a separate nightly job with `--fail-on-flaky-tests` / `failOnFlakyTests` (added v1.52) and `--repeat-each 5` on suspected tests so flakes are surfaced without blocking merges.
- **Quarantine**: no built-in quarantine feature (verified docs mention none). Use a `@quarantine` tag: PR job runs `--grep-invert @quarantine`, nightly job runs `--grep @quarantine`; each quarantined test gets an issue and a 7-day expiry note. (Tag/grep options: **UNVERIFIED** in the pages I fetched, but `--grep`/`--grep-invert` are standard CLI flags in test-cli docs.)
- **Sharding**: `--shard=i/n` with `blob` reporter + `merge-reports` job. https://playwright.dev/docs/test-sharding. With one browser project at 375 px, 2–3 shards should cut e2e wall time roughly proportionally; costs more runner minutes (free on public repos for standard runners).
- **Browser install/caching**: Playwright docs: "Caching browser binaries is not recommended" (restore ≈ download; OS deps can't be cached). Install only WebKit: `npx playwright install --with-deps webkit` (single-browser install – **UNVERIFIED** on the page fetched, standard CLI), or run the job in `mcr.microsoft.com/playwright:v<version>-noble`. https://playwright.dev/docs/ci
- **`--only-changed[=ref]`** runs only changed test files; `--last-failed` re-runs failures – useful for the agent locally, not as the CI gate.
- **Playwright MCP** (`claude mcp add playwright npx @playwright/mcp@latest`, https://playwright.dev/mcp/clients/claude-code): lets Claude drive a browser. Token-heavy (schemas + snapshots). Microsoft now offers **Playwright CLI for agents** (`npm i -g @playwright/cli`), described as token-efficient vs MCP, supports WebKit. https://playwright.dev/agent-cli/introduction. For Aloni, the existing Playwright test suite is the better tool; use CLI only for ad-hoc "look at the screen" checks.
- Cloud fit: browser download hosts for Playwright are not in the default Trusted allowlist I grepped (only npm, GitHub, Docker, etc.) – **UNVERIFIED**; if `playwright install` fails in a cloud session, add Playwright's CDN host to a custom allowlist or bake WebKit into the environment setup script.

---

## 5. GitHub speed and hygiene

- **Native merge queue**: "available in any public repository owned by an organization". https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request-with-a-merge-queue. If `seaevill` is a personal account, it is **not available** unless the repo moves to a (free) organization – an irreversible-ish, owner-only step; ask Bora. Workflows must add `on: merge_group`, otherwise required checks never report. https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- **Without a merge queue, the biggest lever is the "Require branches to be up to date before merging" setting** (https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). With it on, each of the ~8 queued PRs must rebase and re-run 10–15 min CI after every merge → serial O(n × CI). Options: (a) turn it off and keep a post-merge `push: main` CI run as backstop (Claude is sole integrator, PRs are small, conflicts show up as git conflicts anyway); or (b) batch: Claude stacks several small PRs into one integration branch, CI once, merge. Owner decision, free.
- **Path filters without blocking required checks**: workflow-level `paths-ignore` leaves required checks "Pending" and blocks merging; a job skipped by `if:` reports "Success". https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks. Pattern: one always-running `changes` job (`dorny/paths-filter`, pin by SHA) → heavy jobs (`e2e`, `db`) use `if: needs.changes.outputs.app == 'true'`; a final `ci-ok` job (`if: always()`) aggregates and is the single required check. Docs-only PRs then finish in ~1 min.
- **Concurrency cancel**: `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` on PR workflows (not on `main`).
- **npm cache**: `actions/setup-node` with `cache: npm` (https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching). Don't cache Playwright browsers (see 4).
- **actionlint** (https://github.com/rhysd/actionlint, docs/usage.md): lints workflow YAML incl. shellcheck; run via `docker://rhysd/actionlint:<version>` or download script. Free, catches the `merge_group`/`if:` mistakes above before they cost a CI round.
- **Pin third-party actions by commit SHA**: the 2025 `tj-actions/changed-files` compromise (CVE-2025-30066) leaked CI secrets via a moved tag. https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066
- **Dependabot** (`.github/dependabot.yml`, ecosystems `npm` + `github-actions`, `groups`, weekly): default 3-day cooldown since July 2026; security updates not delayed. https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/ , https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference. Group updates or it adds to the PR queue.
- **Renovate**: more powerful, but a second bot app with broad permissions and more PRs; Dependabot is enough.
- **CodeQL default setup**: free on public repos, no workflow file; covers JS/TS and GitHub Actions workflows. Does **not** analyse SQL/RLS. https://docs.github.com/en/code-security/how-tos/scan-code-for-vulnerabilities/configure-code-scanning/configuring-default-setup-for-code-scanning. Low effort; runs in parallel, not a required check.
- **Claude Code GitHub Action**: see section 1 – not recommended as a second integrator.

---

## 6. i18n, accessibility, performance

- **@lingual/i18n-check** (`npm i -D @lingual/i18n-check`; `i18n-check -l app/src/i18n -s el -f i18next`): missing keys, type mismatches, and with `--unused <src>` unused/undefined keys. https://github.com/lingualdev/i18n-check. Licence not stated on README (**check LICENSE**). Alternative with zero deps: a 30-line script comparing key sets of `el/tr/en/hi.json` + placeholder parity (`{n}` present in all). Given placeholders/plurals matter (crates, στρέμματα), the script is enough and has no supply-chain cost.
- **@axe-core/playwright** (Deque, https://www.npmjs.com/package/@axe-core/playwright): `new AxeBuilder({ page }).analyze()` inside existing WebKit tests on 3–4 key screens. Cheap, catches contrast/label issues important for outdoor phone use.
- **Lighthouse CI** (`treosh/lighthouse-ci-action`, https://github.com/treosh/lighthouse-ci-action): Chrome-only, slow, noisy for a PWA behind a login. Defer until store launch.

---

## TOP 8 for Aloni (impact per effort, low risk)

1. **Remove the "up-to-date branch" serial bottleneck** – turn off "Require branches to be up to date" (with post-merge `main` CI), or move the repo to a free org to get native merge queue + `merge_group`. Owner decision; free; biggest wall-clock win for the ~8-PR queue.
2. **Path-filtered CI with one aggregate required check + `concurrency: cancel-in-progress` + `cache: npm`** – docs-only/i18n-only PRs skip e2e and DB jobs without leaving checks Pending. ~1 hour of YAML; validate with **actionlint**.
3. **Deterministic RLS gate in CI: `supabase db advisors --type security --fail-on warn` + `supabase db lint --fail-on error` + a table-driven pgTAP RLS/PHI matrix test** – turns the repeated external-review findings into a failing check. Free, local DB.
4. **Playwright flake handling**: `retries: 2` + `trace: on-first-retry` on PRs, `@quarantine` tag excluded from PR runs, nightly `--fail-on-flaky-tests --repeat-each`, WebKit-only install, 2–3 shards. Free.
5. **Repo hooks in `.claude/settings.json`**: SessionStart (deps + branch-name convention `claude/<mX>-<slug>-<sha7>` + open-PR list via `gh api`), PostToolUse (tsc/eslint, SQL RLS grep, i18n key parity), Stop (language-per-path check). Free; works in single-repo cloud sessions (not in Project threads).
6. **Language table in root CLAUDE.md + path-scoped `.claude/rules/`** (docs/** = English, Bora-facing summaries/RUNBOOK = Turkish, checklists = Greek). Don't use the global `language` setting. 15 minutes.
7. **Replace per-PR reviewer subagents with tiered review**: deterministic gates (3, 5) on every PR; `/code-review` or `/security-review` only when a PR touches `supabase/migrations/**` or `supabase/functions/**`; turn on **Auto-fix** for PR CI failures. Commit the Supabase `supabase-postgres-best-practices` skill (reviewed, pinned) so RLS knowledge is loaded only when relevant. Cuts most reviewer tokens.
8. **Supply-chain + secrets hygiene**: pin all third-party actions by SHA, Dependabot (`npm` + `github-actions`, grouped, weekly), CodeQL default setup; and **re-scope or disconnect the claude.ai Supabase connector** (read-only, dev `project_ref` only). Free, ~30 min.

For the hand-relay problem (not in the top 8 because it is a workflow choice, not a tool): Claude **Projects** (public beta, Pro/Max) give one coordinator conversation where threads report back and project memory carries decisions – but threads skip hooks/settings/.mcp.json, so adopt it only after items 2–4 are CI-enforced. Lighter alternative: `claude -p "<msg>" --cloud <session-id>` queues a message into an existing cloud session. https://code.claude.com/docs/en/claude-projects.md , https://code.claude.com/docs/en/claude-code-on-the-web

## Don't install (or not now)

- **pr-review-toolkit / multi-agent review on every PR** – same token pattern that is already the problem.
- **Claude Code GitHub Action (`@claude`) and claude-code-security-review Action** – a second Claude integrator with its own API-key secret and broad GitHub App permissions; conflicts with "Claude Code is sole integrator"; Action is "not hardened against prompt injection".
- **Managed Code Review** – Team/Enterprise only.
- **typescript-lsp** – LSP servers don't start in cloud sessions; use a tsc PostToolUse hook.
- **security-guidance plugin as a blanket default** – useful, but adds an Opus-class review on every turn and commit (token cost), needs pip at first run, and cloud loading is contradictory in the docs. Trial it for one milestone with `SECURITY_REVIEW_MODEL` set to a cheaper model, then decide.
- **Playwright MCP** – token-heavy; the existing test suite (plus Playwright CLI ad hoc) covers it.
- **Supabase MCP with write access / unscoped, or against Bora's real project** – Supabase's own docs advise against; violates "no irreversible actions without asking".
- **Supabase branching** – costs money per branch-hour, outside Spend Cap; local `supabase db start` is enough now.
- **Cloudflare "Workers Bindings" MCP connector** – self-reports deprecated (successor: `https://mcp.cloudflare.com/mcp`); deploys should go through CI, not an agent connector.
- **hookify, commit-commands, frontend-design** – little value here; `commit-commands` PR flow likely hits the cloud proxy's GraphQL block (**UNVERIFIED**).
- **Renovate** – Dependabot suffices; fewer bot permissions.
- **sqlfluff, Lighthouse CI** – style/perf noise relative to the actual bottlenecks; revisit before store launch.
- **squawk** – optional; locking rules don't address the RLS bug class.

## Sources (main)
- https://code.claude.com/docs/en/cloud-environments.md · https://code.claude.com/docs/en/claude-code-on-the-web · https://code.claude.com/docs/en/claude-projects.md
- https://code.claude.com/docs/en/hooks.md · https://code.claude.com/docs/en/memory.md · https://code.claude.com/docs/en/settings-reference
- https://code.claude.com/docs/en/discover-plugins.md · https://github.com/anthropics/claude-plugins-official · https://github.com/anthropics/claude-code/tree/main/plugins
- https://code.claude.com/docs/en/security-guidance.md · https://code.claude.com/docs/en/code-review.md · https://code.claude.com/docs/en/github-actions.md · https://github.com/anthropics/claude-code-security-review
- https://supabase.com/docs/guides/ai-tools/mcp.md · https://supabase.com/docs/guides/getting-started/ai-skills.md · https://supabase.com/docs/reference/cli/supabase-db-advisors · https://supabase.com/docs/guides/local-development/cli/testing-and-linting.md · https://supabase.com/docs/guides/deployment/ci/testing · https://github.com/supabase/splinter · https://supabase.com/docs/guides/platform/manage-your-usage/branching.md
- https://github.com/sbdchd/squawk
- https://playwright.dev/docs/api/class-testconfig · https://playwright.dev/docs/test-cli · https://playwright.dev/docs/test-sharding · https://playwright.dev/docs/ci · https://playwright.dev/mcp/clients/claude-code · https://playwright.dev/agent-cli/introduction
- https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request-with-a-merge-queue · https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks · https://github.com/rhysd/actionlint/blob/main/docs/usage.md · https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/ · https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066
- https://github.com/lingualdev/i18n-check · https://www.npmjs.com/package/@axe-core/playwright · https://github.com/treosh/lighthouse-ci-action

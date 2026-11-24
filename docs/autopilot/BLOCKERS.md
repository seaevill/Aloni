# Blockers (need an action outside autopilot)

| Date | Blocker | Needed from | Evidence |
|---|---|---|---|
| 2026-11-24 | The public **preview URL** of a PR build is not exposed by the Workers Builds check (only the dashboard build link). To report clickable previews we need the account's workers.dev subdomain | Bora: Cloudflare dashboard → Workers & Pages → aloni → Settings → Domains & Routes → copy the `*.workers.dev` address (and, if shown, the preview URL pattern) into `docs/autopilot/REPORT.md` header | check-run `details_url` = dash.cloudflare.com/…/previews/<branch>/builds/<id> |
| 2026-11-24 | Live site cannot be fetched from the agent environment (egress proxy refuses aloni.pages.dev / workers.dev) → «verified live» can only come from Bora | Bora | proxy 403 on aloni.pages.dev |
| 2026-11-24 | WebKit cannot be installed locally (download blocked); WebKit evidence = CI only | — | `playwright install webkit` fails |
| 2026-11-24 | `labeluse.spec.ts:118` failed once on main (2/2 attempts), 5 later runs passed; cause not found | new failure context | docs/DEVLOG-2026-11-24.md |
| held | #500 SQL 0042, #460, #484/#485, #504/#507/#508 | Bora / independent Codex review | STATUS.md |

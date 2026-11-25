# Codex review request — parcel productivity, timeline, unmet-demand prototype (2026-11-23)

Independent review, **read-only**: do not push to these branches, do not merge, do not touch `supabase/`. Report findings as a PR comment (MUST / SHOULD / NIT, each with file:line and a failing input).

PRs: #504 (`claude/intel-1`), #507 (`claude/intel-2b`, stacked on #504), #508 (`claude/intel-3b`, research prototype).

Please try to break, with concrete inputs:
1. `app/src/summary/parcel-yield.ts` — `ratio()` (whole-number division, cut after 6 decimals): any input where `String(crates)` / canonical decimals give a wrong digit, a negative, `NaN`, or a divide by zero. Is `parseDecimal` accepting «0,8» / «0.8» / «.8» consistently?
2. **Archive rule**: harvests of archived plantings (`plantings.deleted_at`) count and are tagged; deleted harvest rows (`job_harvest.deleted_at`) never count. Find a record shape where a harvest is counted twice, or counted on the wrong parcel (cross-parcel isolation: `plantings.parcel_id`, planting ids that look alike, a planting moved to another parcel).
3. **Scope**: is anywhere on screen or in the i18n text (`ui.yield.*`, `ui.water.*`, el/en/tr) cumulative yield presented as crop- or season-specific, or recorded irrigation presented as total water use? `ui.water.value` must read «recorded».
4. `app/src/summary/timeline.ts` — same harvest set as productivity (unit test `timeline.test.ts` last describe). Ordering across Europe/Athens (date-only `day` vs ISO instants, DST days 2026-03-29 and 2026-10-25). Events of other parcels, deleted observations.
5. `app/src/orders/unmet-demand.ts` — a prototype: confirm it can never count unknown-destination, unreadable, dispatched or growing/held crates as available, and that nothing in the app uses it as a commitment.
6. Lint rules of this repo (R01/R06/D05/U01–U03) are satisfied without disabling them.

Rules to keep in mind: CLAUDE.md «Safety rules for the code»; no kilograms from crates; unknown = «άγνωστο – reason», never 0; phone-local fieldwork records are lost with the phone until SQL 0042 (#500) is applied through the approved workflow — that warning must stay visible.

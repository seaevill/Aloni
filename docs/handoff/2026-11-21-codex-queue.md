# Codex queue handoff

## 2026-11-21

- **SQL review.** No open PR for 0036 or 0037 at the time of the check. The review of 0035 is in #279. Migration 0035 still owns the shared SQL runner in #271.
- **Golden rules.** #281 owns the engine and golden runner. Baseline 9679da3 runs 15 of 27 cases. GAP enables two more when #281 lands. Resume in a fresh branch and update STATUS after the remaining cases land. #275 currently owns STATUS.
- **Planting gate.** The shared SQL test entry point is already changed by #271. Wire the shared fixture into the SQL and phone suites after coordinating the runner change. Preserve separate checks for PHI and REI, signed and unknown labels, crop-specific gates, corrections, and Athens midnight.
- **Clock.** #283 covers the timeline at both Athens boundary times and with a UTC phone, and migrates the focused harvest and timezone scenarios. Remaining real-clock calls include worker flows and undo, order and dispatch fixtures, weather and analysis fixtures, and the unit demo supply test. Audit changes to the browser clock and Node fixture time together.
- **Hindi.** #282 still owns the dictionary. Audit worker-reachable keys after merge, including labels used by shared components and worker flows enabled by the live build.
- **Accessibility.** #284 found no serious or critical axe violations on the three Hindi demo worker tabs at 375 px. Existing owner and demo worker checks remain in place. The live sign-in, invite, and worker panels still need explicit inventory and scanner coverage.
- **Performance.** #285 gates the shipped entry script and HTML module preloads at baseline plus 10%. It reports emitted gzip chunk sizes in the PR. Source-module attribution and runtime-triggered imports are outside the reported measurement.
- **Κλούβες.** #286 covers the import edge cases. Claude Code follow-up: a duplicate client ID is retained in client metadata, although the parser counts its order once. Decide how to report or resolve duplicate metadata. A persisted nonempty unknown crop slug currently passes through `cratesByCrop`. Validate persisted mappings against the crop catalog before counting them.

The regular handoff file is owned by #281. This dated supplement avoids an overlapping edit.

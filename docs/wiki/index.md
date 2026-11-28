# Aloni company wiki

Long-lived memory of how this repo is run. English. Started 2026-11-28.

**Rule for every page:** every claim carries a date and a source (PR number, commit, or file path with the commit it was read at). Never write «currently» or «now» without a date. When something changes, add a new dated line; do not rewrite history. Decisions still go to `docs/DECISIONS.md`; this wiki explains and links, it does not replace it.

## Operations

- [management-loop.md](management-loop.md): the one scheduled runner «Aloni yönetici», the `lock/aloni` lock, one decision per run, bekçi verdict bound to a SHA, record PRs (as of 2026-11-28).
- [recurring-problems.md](recurring-problems.md): problems that came back more than once (45-minute rule vs the main session's own PRs, proxy 403s, the MMDD branch hook, bekçi catching unapproved scope, stale STATUS numbers) and the known workaround for each.

## People

- [owner-preferences.md](owner-preferences.md): what Bora wants from the team, dated: autonomy with hard stops, plain Turkish reports, farmer feedback of 2026-11-27.

## Evaluations

- [evaluation-2026-11-28.md](evaluation-2026-11-28.md): five-part independent evaluation of main 682c32d, scores and where its findings went (queue items ev-1 … ev-54).

## Research

- [research-2026-11-28.md](research-2026-11-28.md): product research of 2026-11-28 (what to improve and add for the farmer), top five features, where the `ar-*` queue items came from.

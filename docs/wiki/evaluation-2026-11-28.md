# Evaluation 2026-11-28

On 2026-11-28 five independent, read-only reviewers evaluated main 682c32d. Full summary, scores and the merged ranked list: [../reviews/team/2026-11-28-evaluation/SUMMARY.md](../reviews/team/2026-11-28-evaluation/SUMMARY.md).

| Dimension | Score (2026-11-28) |
|---|---|
| Usability | 5.5 / 10 |
| Interface | 7 / 10 |
| Decision engine | no score; 17 confirmed bugs (P0 2, P1 4, P2 8, P3 3), latent because `runRules` is not wired into a screen |
| Accuracy | no score; mutation 68.1 %, harvestGuard 0/7, coverage 95.10 % / 91.04 % |
| Data integrity | 5 / 10 |

Most important as of 2026-11-28:

1. A worker can record a harvest from an unsown (planned) planting, and «Σήμερα έγιναν» mislabels a fresh harvest (usability U1, U2).
2. The engine's two P0s (running PHI without a harvest veto; first label row only) must be fixed before `runRules` reaches any screen (engine BUG-1, BUG-2, BUG-3; queue ev-3, ev-4).
3. Switching sync on (`VITE_LIVE`) would break signed labels, corrections and backup restores on day one; fix ev-5 … ev-7 first (data F1–F4).
4. Guards with gaps let defects through: an undefined CSS variable, 1.36:1 contrast, a UX-bar test that never opens a detail screen, harvestGuard with 0 % mutation score (interface ENV-1..4, accuracy 3c).

Where the findings went: queue items ev-1 … ev-54 in `takimlar/aloni-gelistirme/durum.json` (ev-1 … ev-38 and ev-39 … ev-54 arrive in two PRs because of the 450-line gate). Seven of them are `bora-bekliyor` (SQL or agronomist values). Bora delegated every other decision from this evaluation to the team on 2026-11-28 (DECISIONS row of that date).

Evidence in the repo (2026-11-28): the five reports verbatim, 8 screenshots, and the reviewers' probe tests under `docs/reviews/team/2026-11-28-evaluation/` (probes are evidence, not part of any suite).

# Theme decision (2026-11-18) – for the final "look" pass

Status: **reference only**. Apply after the features are done (Bora's decision 2026-11-18: safety → features → theme last). Do not restyle screens before that.

## How it was chosen
Three directions were drawn (`options.jpg`: 1 = frosted glass, 2 = bright & bold iOS-like, 3 = dark green glass). An internal panel voted on 2026-11-18:

| Voter | Vote | Scores 1 / 2 / 3 |
|---|---|---|
| Megara grower (sun, gloves) | 2 | 6 / 8 / 5 |
| Farm worker (dim screen) | 2 | 6 / 9 / 7 |
| Accessibility (AAA, glare, colour-blind) | 2 | 6 / 8 / 5 |
| Senior front-end (perf, theming) | 2 | 4 / 9 / 6 |
| App Store / brand | 1 | 8 / 7 / 6 |

**Winner: 2 (`winner-B.html`, tokens and contrast in `winner-B.md`).**

## Borrow from the others
- From 1: the sync line under worker actions – «Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα».
- From 1 (owner likes translucency): keep glass only on tab bar, top bar and action tray; optionally a subtle forest gradient in the hero card. Never text on glass over busy backgrounds.
- From 3: the big −/+ crate counter (72 px, number ≥40 px, «κλούβες κομμένες»), and the bold red «ΑΠΟΚΛΕΙΣΜΕΝΟ» card.
- From 2's risk notes: lime only as a fill behind dark text, never as text; statuses differ by word + icon + fill, not colour alone.

## Rules when applying
- All colours, sizes, radii, shadows from CSS variables in one file (tokens in `winner-B.md`).
- Font: Commissioner (SIL OFL), self-hosted woff2, Greek + Latin subsets, no Google Fonts CDN.
- Keep existing tests: text contrast ≥7:1, worker buttons 72 px, 375 px no horizontal scroll, Greek-only UI test, glossary test.
- Logic, data and wording unchanged; look only. First restyle «Σήμερα», show Bora a screenshot, then the rest.

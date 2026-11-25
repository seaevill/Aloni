# Field Atelier P0 — what changed and where every feature went (2026-11-24)

Reference: `ALONI_FIELD_ATELIER_DESIGN_HANDOFF.md` + the interactive HTML (design reference only: its simulated data and logic are not used). Scope of this PR = handoff **P0 first step**: design tokens, bottom navigation, Σήμερα hierarchy. No feature, route, test id, data model, migration or translation key was removed; the prototype's demo data and fake logic are not imported.

## Changes
| Area | Before | After | Files |
|---|---|---|---|
| Canvas / cards | `#edf2e8` / `#fff` | ivory `#F5F2E9` / warm white `#FFFEFA`; ink `#15251B`; forest `#0B3525`; lime `#D5F36B`; sage `#DCE6D8` (calm chips); card line warm `#D9D6C8` | `ui/tokens.css` |
| Bottom nav | white bar, lime pill behind the icon | same 5 destinations and labels; current tab also gets a leaf-green marker bar (≥3:1 on the bar, tested) | `ui/styles.css`, tokens |
| Σήμερα order | urgent · **weather** · numbers · buttons · work … | urgent · numbers · two capture buttons · work (cut list, jobs) · **weather (quiet light card)** · tomorrow · KPIs | `ui/Today.tsx`, `ui/styles.css` |
| Weather card | dark forest block | warm-white card with sage tiles (same content, same test ids, same sheet) | `ui/styles.css` |

## Feature map (nothing dropped)
All 5 tabs (Σήμερα, Φυτά, Χωράφια, Αποθήκη, Άλλα) with the same ids/routes; Σήμερα: urgent card + «Δείτε γιατί», numbers, «Νέος ψεκασμός», «Καταγραφή συγκομιδής», quick «＋» (spray, harvest, observation, job), cut list, jobs (all kinds, overdue/today/upcoming/done), «Ανάθεση δουλειάς», tomorrow board, weather strip → weather sheet, KPIs, who/what was done, Ιστορικό. Full per-file list of test ids: `docs/design/feature-inventory-2026-11-24.md` (#521). The e2e suite asserts these ids.

## Not in this PR (handoff P0 remainder / P1 / P2)
Evidence ribbon, Sun/Glove mode, crop/parcel/stock/More redesign, Field Passport, Morning Brief, Crate Bridge, photo cards. The remaining screens only inherit the new palette from the tokens; their layouts are unchanged.

## Handoff rules kept
Commissioner stays (local font); no external CDN; lime is a fill behind dark text only; the prototype's muted grey `#788176` (fails AA) was NOT adopted — the existing 7:1 text tokens stay; safety wording unchanged («άγνωστο», blocked states).

# Aloni M1 – UX quality bar & QA (2026-11-17)

Off-bar today: M0 tab labels 13 px, `.badge` 12 px; prototype `8-today-greek.png` shows an English toast in the Greek UI.

## 1. UX bar (every PR, all screens)
- **Tap targets ≥ 56×56 px** (gloves); primary action at the bottom.
- **Text:** body ≥ 16 px, helper text ≥ 14 px, nothing smaller (badges included). Contrast ≥ 7:1 for text, ≥ 3:1 for borders and icons (sun). Colour is never the only signal: always add an icon or a word.
- **Greek-first lengths:** design with EL strings, which run ~30 % longer than EN. Buttons wrap to at most 2 lines and never truncate a dose, PHI or name.
- **Formats** come only from the `i18n` helpers: `0,6 στρ.`, `Δευ 16 Νοε`, Europe/Athens. Doses and stock print as stored, never rounded (QA P0-1). A missing label value shows `—  άγνωστο` and blocks.
- **Inputs:** `inputmode="decimal"` that accepts a comma. Units are always visible next to the field.
- **Offline/sync:** a global chip shows Εκτός σύνδεσης / N μη συγχρονισμένα. Each unsynced record has a dot marker.
- **States:** every list has an empty state with one action and an error state that says what to do next.
- **No confirm dialogs.** Save immediately and show an undo toast for 5 s. Append-only records get "Διόρθωση" (amending row).

## 2. CI checks (Playwright WebKit 375×667 unless noted)
1. `ux-bar.spec.ts`, every M1 route + empty state × el/tr/en, asserts:
   - `scrollWidth ≤ 375`;
   - every visible `button, a, input, select, [role=button]` box ≥ 56 px high and ≥ 44 px wide;
   - computed `font-size ≥ 14px` on every visible text node.
2. **axe:** `@axe-core/playwright` on each route, failing on serious or critical issues. Plus a 7:1 check on text colour tokens.
3. **i18n (Vitest):** keeps the existing key-parity test. Adds:
   - placeholders (`{n}`) match across languages;
   - no hard-coded user-facing strings in `src/ui/**` (lint for JSX text / string literals outside `t()`);
   - EL label length ≤ 1.5× EN (warning).
4. **Formats/doses:** unit tests for `formatDose(0.025) === '0,025'`, and that a missing dose renders unknown.
5. **Offline e2e:** `context.setOffline(true)` → add a parcel, planting and stock entry → the unsynced chip shows 3 → reload → the data is still there.
6. **Undo:** delete or archive a record → undo → the record is back. Asserts there is no `dialog` event.
7. **Screenshots:** `screens.spec.ts` saves full-page PNGs per route × language (and offline/empty) to `app/screenshots/`. CI **always** uploads them as artifact `screens-<PR#>`, not only on failure. No pixel diffs yet.

## 3. Per-PR iPhone checklist (Greek template, in PR body)
```
### Έλεγχος στο iPhone (Safari, από το εικονίδιο)
1. Ανοίξτε <οθόνη>. Όλα τα κουμπιά πατιούνται εύκολα, χωρίς πλάγια κύλιση;
2. Προσθέστε <εγγραφή> με δεκαδικό (π.χ. 0,025). Εμφανίζεται ακριβώς έτσι;
3. Στον ήλιο: διαβάζονται όλα τα κείμενα;
4. Λειτουργία αεροπλάνου → προσθέστε <εγγραφή>. Φαίνεται «μη συγχρονισμένο»;
5. Κλείστε/ανοίξτε την εφαρμογή. Τα δεδομένα είναι εκεί;
6. Διαγράψτε κάτι → «Αναίρεση». Επιστρέφει;
7. Αλλάξτε σε TR και EN. Κανένα κείμενο κομμένο ή αμετάφραστο;
Απάντηση: «όλα ΟΚ» ή αριθμός βήματος + στιγμιότυπο.
```
**Reporting to Bora (Turkish), one comment per PR:**
- **Ne değişti:** 2 lines.
- **Ne test etmelisin:** the step numbers above.
- **Otomatik kontroller:** ✓/✗ in plain words.
- **Ekran görüntüleri:** link to the CI artifact, plus 2–3 key PNGs embedded inline.

Bora's bug reports become failing tests first.

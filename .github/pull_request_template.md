## Ne değişti / What changed
<!-- 2 lines. -->

## Safety rules touched? (CLAUDE.md)
- [ ] Label values / doses / PHI / REI (no rounding, no defaults, missing = blocked)
- [ ] Rules or sign-off (unsigned = info only)
- [ ] Demo farm isolation (never in outbox, never mixed with real data)
- [ ] None of the above

## Checklist
- [ ] el / tr / en keys added (no hard-coded UI text)
- [ ] 375 px WebKit e2e for the screens touched
- [ ] Unit test for every safety branch added/changed
- [ ] `docs/DECISIONS.md` updated (dated)
- [ ] Turkish note for Bora (≤ 5 lines) in a PR comment
- [ ] Diff ≤ 450 changed lines (CI enforces it; lockfile, generated files and test fixtures excluded)
- [ ] A new safety rule comes with a red-team fixture (`app/tests/fixtures/lint/`)

### Έλεγχος στο iPhone (Safari, από το εικονίδιο)
1. Προσθέστε την εφαρμογή στην **Οθόνη Αφετηρίας** (Κοινοποίηση → Προσθήκη στην οθόνη αφετηρίας) και ανοίξτε <οθόνη> από το εικονίδιο. Όλα τα κουμπιά πατιούνται εύκολα, χωρίς πλάγια κύλιση;
2. Προσθέστε <εγγραφή> με δεκαδικό (π.χ. 0,025). Εμφανίζεται ακριβώς έτσι;
3. Στον ήλιο: διαβάζονται όλα τα κείμενα;
4. Λειτουργία αεροπλάνου → προσθέστε <εγγραφή>. Φαίνεται «μη συγχρονισμένο»;
5. Κλείστε/ανοίξτε την εφαρμογή. Τα δεδομένα είναι εκεί;
6. Διαγράψτε κάτι → «Αναίρεση». Επιστρέφει;
7. Αλλάξτε σε TR και EN. Κανένα κείμενο κομμένο ή αμετάφραστο;
Απάντηση: «όλα ΟΚ» ή αριθμός βήματος + στιγμιότυπο.

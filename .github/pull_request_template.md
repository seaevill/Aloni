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
- [ ] Diff ≈ 400 lines or less

### Έλεγχος στο iPhone (Safari, από το εικονίδιο)
1. Προσθέστε την εφαρμογή στην **Οθόνη Αφετηρίας** (Κοινοποίηση → Προσθήκη στην οθόνη αφετηρίας) και ανοίξτε την από το εικονίδιο.
2. Ανοίξτε <οθόνη>. Όλα τα κουμπιά πατιούνται εύκολα, χωρίς πλάγια κύλιση;
3. Προσθέστε <εγγραφή> με δεκαδικό (π.χ. 0,025). Εμφανίζεται ακριβώς έτσι;
4. Στον ήλιο: διαβάζονται όλα τα κείμενα;
5. Λειτουργία αεροπλάνου → προσθέστε <εγγραφή>. Φαίνεται «μη συγχρονισμένο»;
6. Κλείστε/ανοίξτε την εφαρμογή. Τα δεδομένα είναι εκεί;
7. Διαγράψτε κάτι → «Αναίρεση». Επιστρέφει;
8. Αλλάξτε σε TR και EN. Κανένα κείμενο κομμένο ή αμετάφραστο;
Απάντηση: «όλα ΟΚ» ή αριθμός βήματος + στιγμιότυπο.

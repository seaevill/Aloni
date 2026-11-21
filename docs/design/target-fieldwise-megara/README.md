# TARGET LAYOUT – «FieldWise · Megara example» (Bora, 2026-11-21)

On 2026-11-21 Bora said the app does not match the design he wanted: **this canvas** (4 phone screens, sample data, made 2026-11-16). It is now the **layout target** for Phase 1 and supersedes "prototype likeness" scores. Colours/font stay **theme B** (Commissioner, forest/lime, `tokens.css`); only the layout, navigation and content follow this canvas. The four `.dc.html` files here are the original artboards (390×844, fictional sample data, reference only – not app code).

Bora's two concrete complaints:
1. **No visible separation of fields/parcels** – he expects to *see* his parcels as distinct shapes (Field.dc.html header) and tap one.
2. **No tab where he sees total produce vs orders** – Plan.dc.html ("Orders → sowing").

## Navigation (target)
Bottom tabs: **Σήμερα · Χωράφια · Ψεκασμοί · Πλάνο** (+ **Άλλα** as 5th tab or header menu). Καλλιέργειες merge into Χωράφια (field detail lists its plantings). Αποθήκη moves under Άλλα (or a header shortcut).

## Screen mapping
| Canvas | App target | Notes |
|---|---|---|
| Main (Today) | Σήμερα | Dark header: date, greeting, 4 weather tiles (temp/night, wind+dir, humidity+dew, last rain); farm line. «Τι κάνουμε σήμερα» task cards with coloured chip + field·crop + 1-line reason + 2 actions. |
| Field | Χωράφια → detail; Χωράφια list = overview sketch of all parcels | Top: sketch of parcels as shapes from drawn polygons (no tile provider needed; plain background), selected parcel outlined + label. Title «Βόρειο · Σπανάκι», area στρ., elevation, sowing date (day N). 3 tiles: last rain, soil moisture (only if measured – else hide), harvest estimate. «Καλύτερες μέρες αυτή την εβδομάδα» 7-day grid (spray / leaf feed / soil fert.). Why-card. «Καταγραφή εργασίας», «Φωτογραφία». |
| Spray | Ψεκασμοί | «Πότε κόβεται» list per planting (product, date, PHI → days left / «Έτοιμο»); rotation warning card; recent entries table (date, field·product·dose, weather at spray time); «＋ Νέα καταγραφή», «Εξαγωγή για έλεγχο». |
| Plan | Πλάνο | Per crop, next 4 weeks: weekly orders (Κλούβες) vs expected harvest (bar + marker), short/extra text; «Προτεινόμενη σπορά» card (date, crop, στρ., parcel, reason) + follow-up rhythm. Also links to daily dispatch (T10) and «Αύριο φεύγουν». |

## Safety deviations from the canvas (CLAUDE.md wins)
- Never "safe": «SAFE HARVEST» → «Κοπή από …» / «Έτοιμο για κοπή».
- «Downy mildew risk high» → «Ευνοϊκές συνθήκες για περονόσπορο – έλεγξε τα κάτω φύλλα». No diagnosis from weather.
- «ideal for the fungicide» → «Παράθυρο ψεκασμού» without naming a product; unsigned [SET] thresholds = «πληροφοριακό, χωρίς υπογραφή γεωπόνου», no decision, no notification.
- Doses never invented (canvas shows `[dose]`): show the recorded dose exactly or «—».
- Harvest estimate (°C·days), soil moisture, sowing suggestion: show only from real data/rules; missing = hidden or «άγνωστο», never a placeholder number.
- Demo farm keeps fictional data, clearly labelled «Επίδειξη».

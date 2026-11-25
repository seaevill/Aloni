# Field Atelier P1 step — Χωράφια (Fields): feature map (2026-11-24)

Change: the five field sketch tiles carried the same long sentence («Τελευταίος ψεκασμός … · Κοπή από …») that the list rows below repeat. Tiles now show the **short state chip** (Έτοιμο για κοπή / Σε αναμονή / Άγνωστη αναμονή: the same three words as the crop chips, from the same wait data); the full sentence stays on the row. The Demo screen is ~180 px shorter and scannable at a glance.

| Existing function | Where it is now | Verified by |
|---|---|---|
| Sketch overview (outline per field, colour = wait state) | unchanged | parcels-v2, planting-sketch |
| Tile → field detail | unchanged (tile still opens the field) | parcels-tiles |
| Full wait sentence: last spray, «Κοπή από …» / unknown | list row `parcel-wait` (unchanged text) | cards-wait, parcels-tiles |
| Row → field detail, area, archive/undo, add field (real farm), search | unchanged | parcels, parcel specs |
| Demo note, sync mark | unchanged | parcels specs |
| Wait state meaning (unknown stays unknown) | same data (`parcelWait`), chip keys reused from the crop list | unit tests of wait |

Not changed: Φυτά (the earlier idea of a planting count/area line breaks the approved «six rows in the first screen» rule and was dropped). Safety: the chip words are the existing ones; the sentence that says why (last spray, date, «άγνωστο») is still on screen directly below each tile's field row.

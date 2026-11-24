# Field Atelier — Αποθήκη (Stock) usability step: feature map (2026-11-24)

Measured on the Demo farm at 375 px (17 products): page height **8293 px → 7219 px (−1074 px, −13 %)**; first card now shows its name, the ⓘ button and the beginning of its details on the first screen.

| Change | Why |
|---|---|
| The ⓘ (product information) button moves from its own 56 px row UP to the name row (name left, ⓘ right) | it opened the same sheet as the name and cost ~64 px per card (17 × 64 ≈ 1090 px) |
| The balance line («Υπόλοιπο: …») is 16 px / weight 800 | it was the smallest line of the card; it is the number that decides the day |

| Existing function | Status | Verified by |
|---|---|---|
| Product name → product sheet (label facts, calculator, sources) | unchanged (`product-source-open`) | stock-card, s2-product-source |
| ⓘ → same sheet | unchanged (`product-info`), ≥56×56 | stock-card |
| Filters (Όλα, Λίπασμα, Μυκητοκτόνο …), search | unchanged | stock-v2, stock-view |
| Active substance, group, type, reg. no. tags, «no registration number» warning, quantity, balance, expiry, PHI line, label photo, sync mark | unchanged text and order | stock, stock-v2 |
| «Απόθεμα» (lots, receive, adjust) and «Στοιχεία ετικέτας» (label uses, sign-off) | unchanged buttons | stock, labeluse |
| Archive (real farm) | unchanged | products |
| Crates in the store (Συγκομιδή στην αποθήκη), tomorrow line, notes | unchanged | store-stock |

Not changed on purpose: the amber «missing registration number» warning stays on every product that lacks it (it is the safety signal); the explanatory paragraphs keep their ids (`product-demo-note`).

## Second pass — balance first (night mission A, 2026-11-24)
Before/after (Demo farm, first 1900 px, same state): `docs/design/screenshots-2026-11-24/stock-p3/{before,after}-{320,375,390}.png`. No horizontal scroll at 320/375/390 (scrollWidth = viewport).
- «Υπόλοιπο: …» is now the first line under the product name at heading size (22 px / 800), above active substance, tags, registration warning and pack size. Only the visual order changes (CSS `order`); DOM order, ids and texts are unchanged.
- Page height 375 px: 7219 → ~7400 px (a bigger balance line costs a few px per card; deliberate trade for readability).
- Not changed: the amber «missing registration number» warning (safety signal), every action, filters, lots, label uses, archive.
- Tests: `stock-card.spec.ts` now also asserts balance ≥ 22 px, directly under the name and above the tags.

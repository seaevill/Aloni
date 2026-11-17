# Aloni M1 – product brief (2026-11-17)

## 1. Bora's first real week: 3 stories

**S1 – Monday, at the farm gate (offline):** Bora adds his 5 parcels: **Pin + type στρ.** first (≤30 s each). He then splits each into lots: "Σπανάκι, lot A, 0,6 στρ., sown 3 Nov".
**S2 – Tuesday, in the store room:** he photographs the label of each product on his shelf, types the key label values for *his* crops and receives his stock (batch, expiry, qty).
**S3 – Friday:** he photographs the soil/water lab reports, types pH, EC, CaCO3, NO3, and confirms it all survives airplane mode.

| Entity | Week 1 (required) | Later |
|---|---|---|
| Parcel | name, pin or shape, area στρ | ΟΣΔΕ code, elevation confirm, topo class, valves/sectors, water source |
| Planting | parcel, crop chip, lot label, area στρ, sown_on, status | variety + resistances, harvest window, est. crates, 3-yr history |
| Product | trade name, reg. no., type, unit, label photo | active ingredient, FRAC/IRAC/HRAC code (needed before M2 rotation) |
| Label use (per crop) | crop, dose min/max per στρ, PHI d, REI h, max apps, source | target, water L/στρ, min interval, sign-off |
| Stock lot | product, batch, expiry, qty | prescription photo/ref |
| Soil/water test | date, lab, photo, pH, EC | CaCO3, OM, NO3-N, P, K, Cl |

## 2. Data-entry rules (farmer's view)

- Chips, steppers, last-used defaults; 56 px targets, actions at the bottom, 5 s undo.
- Greek first: στρ. with decimal comma (0,6), crates, Δευ 16 Νοε, expiry **with year**.
- **Label: no defaults, ever.** Each value is empty, entered, or explicitly "δεν αναγράφεται" (not on label). Empty or unknown = the product/crop pair shows **Blocked**. No crop row = "not registered". Doses stored and shown exactly as typed (0,025, never rounded).
- **Sign-off badge** on every manual label use: "Μη εγκεκριμένο" until Bora records agronomist name + date; edits reset it.
- **Fast label entry:** photo of label first, then one screen per crop: reg. no., dose range, PHI, REI, max apps, numeric keypads. No OCR auto-fill in M1.
- Every save works offline; sync badge visible.

## 3. Bora prepares now

1. Parcel list: names, rough στρ, ΟΣΔΕ codes.
2. What is planted now per parcel: crop, lot, area, sowing date, variety.
3. Every shelf product: label photos (all pages), reg. no., batch, expiry, quantity, prescriptions.
4. Soil and water lab reports (photos).
5. 3-year crop history per parcel.
6. Crate kg per crop, by season.
7. Book 1 hour with the agronomist to check label values for his crops.

## 4. M1 must NOT

- Log sprays, harvests or decrement stock by jobs (M2); no PHI/REI countdowns.
- Fetch weather, run rules or send notifications (M3/M4).
- Prefill label values from the prototype, the web or "typical" doses; no OCR auto-fill.
- Mix Demo farm data with the real farm.
- Build worker accounts, costs, Κλούβες sync or sensors.
- Require map drawing or ΟΣΔΕ code to save a parcel.

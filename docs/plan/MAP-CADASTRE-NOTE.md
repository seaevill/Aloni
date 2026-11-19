# Map PR 9 — plan note: the cadastre as an OPTIONAL layer (2026-11-19, NOT implemented)

Status: research notes for Bora's decision. Nothing here is built. «Unverified» = I did not read the primary page (the build machine could not open EUR-Lex; for the cadastre only search results were read).

## What exists
- **Hellenic Cadastre INSPIRE view service for cadastral parcels** (WMS 1.3.0). Listed in the national INSPIRE metadata (geoportal.ypen.gr). Endpoint named there: `gis.ktimanet.gr/inspire/rest/services/cadastralparcels/CadastralParcelWMS/MapServer` (INSPIRE view path). Parcel outlines draw only at scale 1:9000 or larger (hidden when zoomed out).
- **Terms:** the metadata points to the terms of use at `ktimanet.gr/geoportal/INSPIRE_Terms_of_use_EN_EL.htm` (English + Greek). Access constraint is listed as «other restrictions»; the Greek metadata says there are no restrictions on public access. **Unverified:** the exact conditions (attribution, commercial use, redistribution of tiles or caching) — the page must be read before anything ships.
- **No legal validity:** the metadata says the parcel data have no legal validity and may not show the current state of the operating cadastre. The app must say so next to the layer.
- **myAGRO / ΟΣΔΕ:** I found no public API for a farmer's parcel list. The rules (2026): ΚΑΕΚ overlap of the digitised parcel ≥ 55 %; for parcels up to 10 στρ. ΑΤΑΚ may replace ΚΑΕΚ. So the ΟΣΔΕ parcel id / ΑΤΑΚ / ΚΑΕΚ are things the OWNER types in, once, per parcel.

## Proposal (provisional – Bora to approve)
1. The cadastre is an **optional background layer, OFF by default**, switched on per phone. The tile requests go from the phone straight to the Cadastre (its server sees the phone's address and the visible area): that is third-party contact, so it is OFF until the owner turns it on and the screen says who receives the requests (CLAUDE.md: no tracking; EU hosting is about OUR data). It needs the host in `img-src` of `public/_headers`.
2. A parcel gets an optional text field **ΚΑΕΚ** (and, for the register of 2d, **ΟΣΔΕ parcel id** / **ΑΤΑΚ**), typed by the owner, validated for shape only (ΚΑΕΚ = 12 digits; never «looked up»).
3. **The owner's name and any owner data are NEVER fetched or stored** (no GetFeatureInfo that returns ownership; the layer is used as a picture only).
4. Attribution + «no legal validity» note shown on the layer (wording from the terms page once read).
5. Offline: the layer is not cached for offline use (terms unknown); the parcel's own outline (drawn by the owner) stays the source of truth.

## Open questions
- Read the terms page (and Cadastre's «oroi-xrisis» for orthophotos) and record the conditions here.
- Which satellite/orthophoto tile provider (CLAUDE.md open decision) — the Cadastre orthophotos are old (2007–2009 per a third-party catalogue: unverified), so they are not a substitute.

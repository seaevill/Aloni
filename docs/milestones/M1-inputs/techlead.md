# Tech lead: progress without accounts (2026-11-17, main@645e6f5)

## 1. Build now (one small PR each)
First: `docs/milestones/M1.md`, Bora's OK.

0. **Guardrails** (§2).
1. **Local schema v2.** Dexie mirrors the SQL with snake_case, `farm_id`, client UUIDs and timestamps. Rows get proper types. Demo IDs become UUIDv5. Wipe the v1 DB.
2. **Outbox.** One write path, `repo.put()`, writes the row and its outbox entry in one transaction. Append-only tables accept insert/amend only. **The demo farm never writes to the outbox.** Add the `apply_ops` and pull SQL, tested in CI Postgres. 
3. **Parcels.** Ship "Pin + type στρ." first. Then MapLibre/Terra Draw tap-corners and walk, with turf area in στρ. Tiles come from one `TILE_SOURCE` config. For now it points at OSM raster for dev only,. The provider decision stays open. Elevation is manual and nullable.
4. **Plantings.**
5. **Products and label_uses.** Bora records the agronomist's sign-off. Missing values stay `null`. No row means not registered.
6. **Stock.** Lots and movements; balance is the sum of movements. Expiry flags. Photos are stored as Blobs until upload exists.
7. **Soil/water tests.**
8. **Golden fixtures.** Turn the 17 prose cases into structured JSON.
9. **Rules, one per PR:** REG → PHI/REI → STOCK → ROT → weather. Unsigned rules or `[SET]` placeholder rules return `info_only`.

## 2. Guardrails first
- **`CODING_STANDARDS.md`:** each safety rule paired with the mechanism that enforces it.
- **Branded types.** Label values (`DosePerStr`, `PhiDays`, `ReiHours`) are created only by `parseLabelValue(): Known<T>`. Deciding functions accept only `SignedLabelUse`/`SignedRule`, which only `requireSignOff()` can produce. Doses are decimal strings with scaled-integer math. `formatDose()` keeps full precision.
- **ESLint in CI.** Ban:
  - `Math.round/floor/ceil`, `toFixed` and `?? <number>` in label, dose and spray code and in rules-core;
  - clock calls in rules-core;
  - JSX literals, so all text goes through `t()`.
  Also require `no-floating-promises`.
- **i18n test:** every used `t()` key exists in el/tr/en, and there are no dead keys.
- **Test helpers:** factories on fake-indexeddb, and a Playwright `iphone()` helper (375 px WebKit; checks ≥56 px targets, no horizontal scroll, no console errors).
- **Demo-isolation test:** demo writes leave the outbox empty and `main` untouched.
- **PR template:** safety rules touched? · el/tr/en · 375 px e2e · DECISIONS · Turkish note.

## 3. Done per PR
- Typecheck, lint, Vitest and WebKit 375 px tests are green.
- There is a Greek e2e flow per screen.
- There is a unit test for every safety branch (null label value → blocked; unsigned → info-only).
- The diff is about 400 lines or less.
- DECISIONS.md is updated.
- **Bora gets a Turkish note of 5 lines or fewer:** what changed, what to test (or "testable after Cloudflare"), and any question for him.
- M1 ends with the Greek iPhone checklist.

## 4. Fix before M1
1. **The Dexie DB is named `aloni-farm`,** and "Aloni Farm" is the banned name. Rename it now; later costs data.
2. **`uid = farmId:id` (`P1`) conflicts with the spec's UUID PKs** and would break sync.
3. **There is no lint;** the safety rules rest on review alone.
4. **`apply_ops`/outbox SQL is missing,** although it is testable today.
5. **The golden cases are prose** that mixes [SET] placeholders with estimates, and the prototype has no hourly weather. Spray-window and leaf-wet have no golden inputs.
6. **The prototype has a single dose, but label_uses has min/max.** Decide the mapping explicitly; don't silently set min = max.
7. **Small fixes:**
   - `More.tsx` hard-codes `0.0.0 (M0)`.
   - Playwright's `executablePath` is hard-coded.
   - `npm test` reaches rules-core only through the app's Vitest config.
8. **OSM tiles can't be cached offline, and photos need Supabase Storage.** Flag both in Bora's checklist.
9. **Workers on own phones vs a shared phone is still open.** It affects `device_id` and PIN.

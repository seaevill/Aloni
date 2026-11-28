# Evaluation probes, 2026-11-28 (evidence only)

These files are the reviewers' probe tests, copied as evidence. They are **not** part of any test suite: no Vitest, tsc or ESLint config in the repo includes `docs/**` (checked 2026-11-28 with `npx eslint` on this folder: all files ignored).

| File | Report | What it shows |
|---|---|---|
| `engine/bugs-engine.test.ts` (was `bugs.test.ts`) + `engine/helpers.ts` | 3-engine.md §3 | 17 minimal failing tests, one per engine bug BUG-1..BUG-17; label values in `helpers.ts` are TEST-ONLY and fictional |
| `data/data.test.ts` | 5-data.md | probes D1–D12 (fake-indexeddb); every probe except D9 is red on 682c32d |
| `data/roundtrip.test.ts`, `data/time.test.ts` | 5-data.md F1 | D14 (signed label reads «blocked» after a server-shaped pull), D13 (timestamp formats) |
| `sql/s_probe.sql`, `sql/rls_scan.sql`, `sql/s_parcel.sql` | 5-data.md F2, F3, F13 | run only against a throwaway local Postgres + PostGIS, never Supabase or production |

Imports are verbatim: they point at the reviewers' scratch checkout of main 682c32d (`/tmp/.../scratchpad/eval/Aloni/...`). To re-run, replace that prefix with a checkout of the same commit and use the commands in the reports. When a queue item (`ev-*` in `takimlar/aloni-gelistirme/durum.json`) fixes a bug, its red test is written in the real suite; these copies stay unchanged as the historical record.
